-- Observabilidade — agregador de saúde dos cron jobs críticos.
--
-- Lê cron.job_run_details, avalia se cada job crítico rodou dentro da janela
-- esperada, grava o resultado em cron_execution_log e envia um check-in ao
-- Sentry Cron Monitor `mx-critical-jobs-health` via pg_net.
--
-- O DSN usado é a chave pública do projeto Sentry — o mesmo valor que já vai no
-- bundle do frontend. Não é secret; a chave privada nunca entra aqui.

-- ---------------------------------------------------------------------------
-- Catálogo dos jobs críticos e da tolerância de atraso de cada um
-- ---------------------------------------------------------------------------

create table if not exists public.critical_cron_job (
    job_name text primary key,
    max_age_minutes integer not null check (max_age_minutes > 0),
    description text,
    active boolean not null default true
);

alter table public.critical_cron_job enable row level security;
revoke all on public.critical_cron_job from anon;
grant select on public.critical_cron_job to authenticated;

drop policy if exists critical_cron_job_admin_select on public.critical_cron_job;
create policy critical_cron_job_admin_select
    on public.critical_cron_job
    for select
    to authenticated
    using (public.eh_administrador_mx());

-- Tolerâncias derivadas do schedule real de cada job, com folga para atraso de
-- fila. Snapshots são horários; relatórios são diários ou mensais.
insert into public.critical_cron_job (job_name, max_age_minutes, description) values
    ('mx-refresh-seller-routine-snapshots',  120, 'Snapshot de rotina do vendedor (schedule 15 * * * *)'),
    ('mx-refresh-manager-routine-snapshots', 120, 'Snapshot de rotina do gerente (schedule 25 * * * *)'),
    ('mx-refresh-store-target-plans',        120, 'Planos de meta por loja (schedule 5 * * * *)'),
    ('mx-consolidate-d1-0931',               120, 'Consolidação D1 (schedule 31 * * * *)'),
    ('mx-google-meet-ata',                    90, 'Atas do Google Meet (schedule */30 * * * *)'),
    ('mx-matinal-report',                   1560, 'Relatório matinal (schedule 30 11 * * *)'),
    ('mx-weekly-feedback',                 11520, 'Feedback semanal (schedule 30 15 * * 1)'),
    ('mx-monthly-report',                  46080, 'Relatório mensal (schedule 30 13 1 * *)')
on conflict (job_name) do update
    set max_age_minutes = excluded.max_age_minutes,
        description     = excluded.description;

-- ---------------------------------------------------------------------------
-- Agregador
-- ---------------------------------------------------------------------------

create or replace function public.mx_critical_jobs_health()
returns jsonb
language plpgsql
security definer
set search_path = public, cron, pg_catalog
as $$
declare
    v_correlation_id text := gen_random_uuid()::text;
    v_environment text := 'production';
    v_release text;
    v_started_at timestamptz := clock_timestamp();
    v_job record;
    v_total integer := 0;
    v_late integer := 0;
    v_failed integer := 0;
    v_overall text;
    v_duration integer;
    v_summary jsonb := '[]'::jsonb;
begin
    select release into v_release
    from public.release_health_log
    order by created_at desc
    limit 1;

    for v_job in
        select
            c.job_name,
            c.max_age_minutes,
            d.last_success,
            d.last_status,
            d.last_end
        from public.critical_cron_job c
        left join lateral (
            select
                max(r.end_time) filter (where r.status = 'succeeded') as last_success,
                (array_agg(r.status order by r.start_time desc))[1]    as last_status,
                max(r.end_time)                                        as last_end
            from cron.job j
            join cron.job_run_details r on r.jobid = j.jobid
            where j.jobname = c.job_name
        ) d on true
        where c.active
    loop
        v_total := v_total + 1;

        declare
            v_age_minutes numeric;
            v_status text;
        begin
            v_age_minutes := case
                when v_job.last_success is null then null
                else extract(epoch from (now() - v_job.last_success)) / 60
            end;

            v_status := case
                when v_job.last_success is null then 'error'
                when v_age_minutes > v_job.max_age_minutes then 'error'
                when v_job.last_status is distinct from 'succeeded' then 'error'
                else 'ok'
            end;

            if v_status = 'error' then
                if v_job.last_success is null or v_age_minutes > v_job.max_age_minutes then
                    v_late := v_late + 1;
                else
                    v_failed := v_failed + 1;
                end if;
            end if;

            insert into public.cron_execution_log (
                environment, release, correlation_id, job_name,
                finished_at, status, duration_ms, error_code, safe_message, metadata
            )
            values (
                v_environment, v_release, v_correlation_id, v_job.job_name,
                v_job.last_end,
                case when v_status = 'ok' then 'ok' else 'error' end,
                null,
                case when v_status = 'ok' then null else 'cron_stale_or_failed' end,
                case
                    when v_job.last_success is null then 'Nenhuma execução bem-sucedida registrada'
                    when v_age_minutes > v_job.max_age_minutes then 'Última execução fora da janela tolerada'
                    when v_job.last_status is distinct from 'succeeded' then 'Última execução não terminou com sucesso'
                    else null
                end,
                jsonb_build_object(
                    'age_minutes', round(coalesce(v_age_minutes, -1)),
                    'max_age_minutes', v_job.max_age_minutes,
                    'last_status', v_job.last_status
                )
            );

            v_summary := v_summary || jsonb_build_object(
                'job_name', v_job.job_name,
                'status', v_status,
                'age_minutes', round(coalesce(v_age_minutes, -1))
            );
        end;
    end loop;

    v_duration := (extract(epoch from (clock_timestamp() - v_started_at)) * 1000)::integer;
    v_overall := case when (v_late + v_failed) = 0 then 'ok' else 'error' end;

    -- Linha agregada: é ela que /api/health enxerga como "cron crítico rodou".
    insert into public.cron_execution_log (
        environment, release, correlation_id, job_name,
        started_at, finished_at, status, processed_count, failed_count,
        duration_ms, error_code, safe_message, metadata
    )
    values (
        v_environment, v_release, v_correlation_id, 'mx-critical-jobs-health',
        v_started_at, clock_timestamp(), v_overall, v_total, v_late + v_failed,
        v_duration,
        case when v_overall = 'ok' then null else 'critical_cron_degraded' end,
        case when v_overall = 'ok' then null
             else format('%s de %s jobs críticos fora da janela', v_late + v_failed, v_total) end,
        jsonb_build_object('jobs', v_summary)
    );

    -- O check-in no Sentry não sai daqui. O protocolo de check-in usa envelope
    -- (corpo texto delimitado por linha) e pg_net só envia corpo JSON, então
    -- quem publica é a Edge Function mx-critical-jobs-health, que chama esta
    -- função e traduz o resultado para o envelope.
    return jsonb_build_object(
        'status', v_overall,
        'correlation_id', v_correlation_id,
        'total', v_total,
        'degraded', v_late + v_failed,
        'duration_ms', v_duration,
        'jobs', v_summary
    );
end;
$$;

revoke all on function public.mx_critical_jobs_health() from public, anon, authenticated;
grant execute on function public.mx_critical_jobs_health() to service_role;

-- ---------------------------------------------------------------------------
-- Agendamento — de hora em hora, no minuto 45 (depois dos snapshots)
-- ---------------------------------------------------------------------------
--
-- O job chama a Edge Function mx-critical-jobs-health, que executa o agregador
-- e publica o check-in no Sentry. A autenticação segue exatamente o padrão já
-- usado por mx-matinal-report: service role key lida do Vault, nunca literal na
-- migration.

do $$
begin
    perform cron.unschedule('mx-critical-jobs-health');
exception
    when others then
        null; -- job ainda não existia
end
$$;

select cron.schedule(
    'mx-critical-jobs-health',
    '45 * * * *',
    $$
    select net.http_post(
        url := 'https://fbhcmzzgwjdgkctlfvbo.supabase.co/functions/v1/mx-critical-jobs-health',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'mx-service-role-key' limit 1)
        ),
        body := jsonb_build_object('source', 'pg_cron')
    );
    $$
);

-- Substitui a metrica de saude de cron por uma agregacao por job.
--
-- Diagnostico (2026-07-29): `mx_critical_cron_age_seconds` retornava
-- `max(finished_at)` sobre TODOS os jobs juntos. Bastava um unico cron saudavel para
-- a idade global ficar baixa e o health reportar `critical_crons: ok` -- mesmo com
-- todos os demais jobs parados. Combinado ao limiar de 26h em `api/health.ts`, um cron
-- de 30 minutos podia ficar quebrado um dia inteiro sem sinal algum. Foi exatamente
-- assim que `mx-google-meet-ata` acumulou 401 em toda execucao sem disparar alerta.
--
-- A funcao nova avalia cada job contra a periodicidade do proprio agendamento e
-- reporta o pior caso. Nao expoe dado de negocio: so nomes de job, contagens e idades.

-- `language sql` valida o corpo no momento da criacao, e o corpo le `cron.job`. Em
-- banco efemero de CI, que sobe sem `pg_cron`, isso derrubaria o bootstrap. O corpo vai
-- por EXECUTE e so quando a extensao existe; sem ela, cria-se um stub que responde
-- `unknown` para `/api/health` nao interpretar ausencia de cron como falha.
do $$
begin
if exists (select 1 from pg_extension where extname = 'pg_cron') then
  execute $ddl$
create or replace function public.mx_critical_cron_status()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $fn$
  with expected as (
    select
      j.jobname,
      case
        when j.schedule ~ '^\*/([0-9]+) '                      -- a cada N minutos
          then (substring(j.schedule from '^\*/([0-9]+) ')::int) * interval '1 minute'
        when j.schedule ~ '^[0-9,\-/*]+ \*'                    -- de hora em hora
          then interval '1 hour'
        when j.schedule ~ '^[0-9]+ [0-9]+ \* \* [0-9]'         -- semanal
          then interval '7 days'
        when j.schedule ~ '^[0-9]+ [0-9]+ [0-9]+ '             -- mensal
          then interval '1 month'
        else interval '1 day'                                  -- diario / desconhecido
      end as period
    from cron.job j
    where j.active
  ),
  last_ok as (
    select job_name, max(finished_at) as finished_at
    from public.cron_execution_log
    where status = 'ok' and finished_at is not null
    group by job_name
  ),
  judged as (
    select
      e.jobname,
      l.finished_at,
      extract(epoch from (now() - l.finished_at))::bigint as age_seconds,
      -- Tolerancia: dois periodos mais 10 minutos de folga de fila.
      -- Piso de 2h porque `cron_execution_log` so e alimentado pelo snapshot horario
      -- de `mx-critical-jobs-health`. Sem esse piso, um job de 30 minutos aparece
      -- atrasado so pela resolucao do proprio registro.
      greatest(
        extract(epoch from (e.period * 2 + interval '10 minutes'))::bigint,
        extract(epoch from interval '2 hours')::bigint
      ) as max_age_seconds
    from expected e
    left join last_ok l on l.job_name = e.jobname
  ),
  ranked as (
    select
      j.*,
      (j.finished_at is null or j.age_seconds > j.max_age_seconds) as is_degraded,
      row_number() over (
        order by (j.finished_at is null) desc,
                 (j.age_seconds::numeric / nullif(j.max_age_seconds, 0)) desc nulls last
      ) as rn
    from judged j
  )
  select jsonb_build_object(
    'status',            case when count(*) filter (where is_degraded) = 0 then 'ok' else 'degraded' end,
    'total',             count(*),
    'degraded',          count(*) filter (where is_degraded),
    -- worst_job e worst_age_seconds descrevem o MESMO job, o de pior folga relativa.
    'worst_job',         min(jobname)    filter (where rn = 1),
    'worst_age_seconds', coalesce(min(age_seconds) filter (where rn = 1), -1)
  )
  from ranked;
$fn$
  $ddl$;
else
  raise notice 'pg_cron ausente — criando stub de mx_critical_cron_status (esperado fora de producao)';
  execute $ddl$
create or replace function public.mx_critical_cron_status()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $fn$
  select jsonb_build_object('status', 'unknown', 'total', 0, 'degraded', 0);
$fn$
  $ddl$;
end if;
end $$;

comment on function public.mx_critical_cron_status() is
  'Saude de cron agregada por job, cada um comparado ao proprio schedule. Usada por /api/health.';

revoke all on function public.mx_critical_cron_status() from public;
grant execute on function public.mx_critical_cron_status() to anon, authenticated, service_role;

-- ============================================================
-- DOWN
-- ============================================================
-- mx_critical_cron_age_seconds permanece intacta e volta a servir de fallback.
-- BEGIN;
-- drop function if exists public.mx_critical_cron_status();
-- COMMIT;

-- Observabilidade — logs persistentes e saúde de cron.
--
-- Cria apenas o que ainda não existe no schema. As tabelas de auditoria e de
-- erro de RPC já presentes (logs_auditoria, rpc_error_log) são reaproveitadas e
-- não são alteradas aqui.
--
-- Regras aplicadas a todas as tabelas criadas:
--   * RLS habilitada
--   * anon sem nenhum acesso
--   * escrita apenas por rotinas SECURITY DEFINER do próprio banco
--   * leitura restrita ao Admin MX
--   * índices por data, status e correlation_id
--   * nenhuma coluna de PII; mensagens já chegam sanitizadas

-- ---------------------------------------------------------------------------
-- Colunas comuns
-- ---------------------------------------------------------------------------

create table if not exists public.system_health_log (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    environment text not null,
    release text,
    correlation_id text,
    trace_id text,
    component text not null,
    operation text,
    status text not null check (status in ('ok', 'degraded', 'error')),
    duration_ms integer,
    error_code text,
    safe_message text,
    metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.cron_execution_log (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    environment text not null,
    release text,
    correlation_id text,
    trace_id text,
    job_name text not null,
    scheduled_at timestamptz,
    started_at timestamptz,
    finished_at timestamptz,
    status text not null check (status in ('in_progress', 'ok', 'error')),
    processed_count integer,
    failed_count integer,
    duration_ms integer,
    error_code text,
    safe_message text,
    metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.integration_error_log (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    environment text not null,
    release text,
    correlation_id text,
    trace_id text,
    integration text not null,
    operation text,
    status text not null check (status in ('ok', 'degraded', 'error')),
    duration_ms integer,
    error_code text,
    http_status integer,
    safe_message text,
    metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.notification_delivery_log (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    environment text not null,
    release text,
    correlation_id text,
    trace_id text,
    channel text not null,
    operation text,
    status text not null check (status in ('queued', 'sent', 'failed')),
    duration_ms integer,
    error_code text,
    safe_message text,
    metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.release_health_log (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    environment text not null,
    release text not null,
    deployment_id text,
    correlation_id text,
    status text not null check (status in ('ok', 'degraded', 'error')),
    error_code text,
    safe_message text,
    metadata jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

create index if not exists system_health_log_created_at_idx on public.system_health_log (created_at desc);
create index if not exists system_health_log_status_idx on public.system_health_log (status, created_at desc);
create index if not exists system_health_log_correlation_idx on public.system_health_log (correlation_id) where correlation_id is not null;

create index if not exists cron_execution_log_created_at_idx on public.cron_execution_log (created_at desc);
create index if not exists cron_execution_log_job_status_idx on public.cron_execution_log (job_name, status, created_at desc);
create index if not exists cron_execution_log_correlation_idx on public.cron_execution_log (correlation_id) where correlation_id is not null;

create index if not exists integration_error_log_created_at_idx on public.integration_error_log (created_at desc);
create index if not exists integration_error_log_status_idx on public.integration_error_log (integration, status, created_at desc);
create index if not exists integration_error_log_correlation_idx on public.integration_error_log (correlation_id) where correlation_id is not null;

create index if not exists notification_delivery_log_created_at_idx on public.notification_delivery_log (created_at desc);
create index if not exists notification_delivery_log_status_idx on public.notification_delivery_log (channel, status, created_at desc);
create index if not exists notification_delivery_log_correlation_idx on public.notification_delivery_log (correlation_id) where correlation_id is not null;

create index if not exists release_health_log_created_at_idx on public.release_health_log (created_at desc);
create index if not exists release_health_log_release_idx on public.release_health_log (release, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.system_health_log enable row level security;
alter table public.cron_execution_log enable row level security;
alter table public.integration_error_log enable row level security;
alter table public.notification_delivery_log enable row level security;
alter table public.release_health_log enable row level security;

-- anon nunca acessa telemetria.
revoke all on public.system_health_log from anon;
revoke all on public.cron_execution_log from anon;
revoke all on public.integration_error_log from anon;
revoke all on public.notification_delivery_log from anon;
revoke all on public.release_health_log from anon;

-- authenticated recebe apenas select; a policy abaixo restringe ao Admin MX.
grant select on public.system_health_log to authenticated;
grant select on public.cron_execution_log to authenticated;
grant select on public.integration_error_log to authenticated;
grant select on public.notification_delivery_log to authenticated;
grant select on public.release_health_log to authenticated;

-- Leitura restrita ao Admin MX. Reaproveita eh_administrador_mx(), a mesma
-- função já usada pelas policies de logs_auditoria e rpc_error_log — não há
-- razão para introduzir uma segunda definição de "quem é admin".

do $$
declare
    tbl text;
begin
    foreach tbl in array array[
        'system_health_log',
        'cron_execution_log',
        'integration_error_log',
        'notification_delivery_log',
        'release_health_log'
    ]
    loop
        execute format(
            'drop policy if exists %I on public.%I',
            tbl || '_admin_select', tbl
        );
        execute format(
            'create policy %I on public.%I for select to authenticated using (public.eh_administrador_mx())',
            tbl || '_admin_select', tbl
        );
    end loop;
end
$$;

-- Escrita: nenhuma policy de insert/update/delete é criada. Gravação acontece
-- exclusivamente pelas funções SECURITY DEFINER abaixo, o que impede que um
-- cliente autenticado forje registros de telemetria.

-- ---------------------------------------------------------------------------
-- Escrita controlada
-- ---------------------------------------------------------------------------

create or replace function public.record_system_health(
    p_environment text,
    p_component text,
    p_status text,
    p_release text default null,
    p_correlation_id text default null,
    p_trace_id text default null,
    p_operation text default null,
    p_duration_ms integer default null,
    p_error_code text default null,
    p_safe_message text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
    v_id uuid;
begin
    insert into public.system_health_log (
        environment, release, correlation_id, trace_id, component,
        operation, status, duration_ms, error_code, safe_message, metadata
    )
    values (
        p_environment, p_release, p_correlation_id, p_trace_id, p_component,
        p_operation, p_status, p_duration_ms, p_error_code,
        left(coalesce(p_safe_message, ''), 500), coalesce(p_metadata, '{}'::jsonb)
    )
    returning id into v_id;

    return v_id;
end;
$$;

revoke all on function public.record_system_health(text, text, text, text, text, text, text, integer, text, text, jsonb) from public, anon;
grant execute on function public.record_system_health(text, text, text, text, text, text, text, integer, text, text, jsonb) to service_role;

create or replace function public.record_cron_execution(
    p_environment text,
    p_job_name text,
    p_status text,
    p_release text default null,
    p_correlation_id text default null,
    p_trace_id text default null,
    p_scheduled_at timestamptz default null,
    p_started_at timestamptz default null,
    p_finished_at timestamptz default null,
    p_processed_count integer default null,
    p_failed_count integer default null,
    p_duration_ms integer default null,
    p_error_code text default null,
    p_safe_message text default null,
    p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
    v_id uuid;
begin
    insert into public.cron_execution_log (
        environment, release, correlation_id, trace_id, job_name,
        scheduled_at, started_at, finished_at, status,
        processed_count, failed_count, duration_ms, error_code, safe_message, metadata
    )
    values (
        p_environment, p_release, p_correlation_id, p_trace_id, p_job_name,
        p_scheduled_at, p_started_at, p_finished_at, p_status,
        p_processed_count, p_failed_count, p_duration_ms, p_error_code,
        left(coalesce(p_safe_message, ''), 500), coalesce(p_metadata, '{}'::jsonb)
    )
    returning id into v_id;

    return v_id;
end;
$$;

revoke all on function public.record_cron_execution(text, text, text, text, text, text, timestamptz, timestamptz, timestamptz, integer, integer, integer, text, text, jsonb) from public, anon;
grant execute on function public.record_cron_execution(text, text, text, text, text, text, timestamptz, timestamptz, timestamptz, integer, integer, integer, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Idade do cron crítico — consumida por /api/health
-- ---------------------------------------------------------------------------

/**
 * Segundos desde a última execução bem-sucedida de qualquer cron crítico.
 *
 * Retorna apenas um número: nenhum nome de job, mensagem ou metadado vaza para
 * o chamador anônimo do endpoint de saúde. Sem execução registrada, devolve um
 * valor sentinela alto para que o health acuse degradação em vez de silêncio.
 */
create or replace function public.mx_critical_cron_age_seconds()
returns integer
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
    select coalesce(
        (
            select extract(epoch from (now() - max(finished_at)))::integer
            from public.cron_execution_log
            where status = 'ok'
              and finished_at is not null
        ),
        2147483647
    );
$$;

revoke all on function public.mx_critical_cron_age_seconds() from public;
grant execute on function public.mx_critical_cron_age_seconds() to anon, authenticated, service_role;

comment on function public.mx_critical_cron_age_seconds() is
    'Idade em segundos da última execução de cron crítica bem-sucedida. Exposta a anon de propósito: alimenta GET /api/health e retorna somente um inteiro.';

-- ---------------------------------------------------------------------------
-- Retenção — 90 dias
-- ---------------------------------------------------------------------------

create or replace function public.prune_observability_logs(p_retention_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
    v_cutoff timestamptz := now() - make_interval(days => greatest(p_retention_days, 7));
    v_deleted integer := 0;
    v_count integer;
begin
    delete from public.system_health_log where created_at < v_cutoff;
    get diagnostics v_count = row_count; v_deleted := v_deleted + v_count;

    delete from public.cron_execution_log where created_at < v_cutoff;
    get diagnostics v_count = row_count; v_deleted := v_deleted + v_count;

    delete from public.integration_error_log where created_at < v_cutoff;
    get diagnostics v_count = row_count; v_deleted := v_deleted + v_count;

    delete from public.notification_delivery_log where created_at < v_cutoff;
    get diagnostics v_count = row_count; v_deleted := v_deleted + v_count;

    delete from public.release_health_log where created_at < v_cutoff;
    get diagnostics v_count = row_count; v_deleted := v_deleted + v_count;

    return v_deleted;
end;
$$;

revoke all on function public.prune_observability_logs(integer) from public, anon, authenticated;
grant execute on function public.prune_observability_logs(integer) to service_role;

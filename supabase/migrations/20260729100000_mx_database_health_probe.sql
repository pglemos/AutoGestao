-- Sonda de saude do banco que nao gera erro nos logs.
--
-- Diagnostico (2026-07-29): `/api/health` consultava
-- `/rest/v1/system_health_log?select=id&limit=1` com a chave anon e tratava `401/403`
-- como sinal de banco saudavel. Isso gravava `permission denied for table
-- system_health_log` no Postgres a cada sondagem, poluindo os logs, e passou a ser
-- ainda mais enganoso depois do lockdown de telemetria: a sonda retornaria "ok" mesmo
-- com o banco inacessivel, ja que 401 e indistinguivel de negacao por falta de grant.
--
-- Esta funcao existe so para provar que PostgREST e Postgres respondem. Nao le tabela
-- alguma, nao retorna dado de negocio e nao pode vazar PII.

create or replace function public.mx_database_health()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select true;
$$;

comment on function public.mx_database_health() is
  'Sonda de liveness para /api/health. Retorna sempre true. Nao le dados.';

revoke all on function public.mx_database_health() from public;
grant execute on function public.mx_database_health() to anon, authenticated, service_role;

-- ROLLBACK:
--   drop function if exists public.mx_database_health();
--   (exige reverter tambem `api/health.ts` para a sonda anterior)

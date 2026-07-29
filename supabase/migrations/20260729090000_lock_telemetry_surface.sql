-- Fecha a superficie de falsificacao de telemetria.
--
-- Diagnostico (2026-07-29): `record_system_health` e `record_cron_execution` sao
-- SECURITY DEFINER e estavam executaveis por `authenticated`. As tabelas
-- `system_health_log` e `cron_execution_log` davam INSERT/UPDATE/DELETE direto a
-- `authenticated`. Qualquer usuario logado (vendedor, gerente, dono) podia gravar
-- telemetria falsa ou apagar historico de saude.
--
-- A migration `20260729050000_observability_persistent_logs` ja revogava de
-- `public, anon`, mas nao de `authenticated`. O grant reaparecia porque o
-- `pg_default_acl` do owner `postgres` concede `authenticated=X` em toda funcao nova
-- de `public` e `authenticated=arwdm` em toda tabela nova. A remediacao de
-- 2026-07-17 tratou as tabelas entao existentes, mas nao o default de FUNCTIONS.
--
-- Escopo desta migration: apenas os objetos de telemetria. O default ACL global NAO e
-- alterado aqui de proposito -- virar o default de FUNCTIONS afetaria toda RPC futura
-- do produto e exige avaliacao propria. Fica registrado como risco residual.

-- 1. Funcoes de telemetria: somente service_role executa.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('record_system_health', 'record_cron_execution')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
  end loop;
end $$;

-- 2. Tabelas de telemetria: `authenticated` perde escrita e leitura direta.
--    A leitura para paineis administrativos deve passar por RPC com escopo, nao por
--    acesso direto via PostgREST.
revoke all on table public.system_health_log   from anon, authenticated;
revoke all on table public.cron_execution_log  from anon, authenticated;

grant select, insert, update, delete on table public.system_health_log  to service_role;
grant select, insert, update, delete on table public.cron_execution_log to service_role;

-- ============================================================
-- DOWN
-- ============================================================
-- BEGIN;
-- grant execute on function public.record_system_health(text,text,text,text,text,text,text,integer,text,text,jsonb) to authenticated;
-- grant execute on function public.record_cron_execution(text,text,text,text,text,text,timestamptz,timestamptz,timestamptz,integer,integer,integer,text,text,jsonb) to authenticated;
-- grant select, insert, update, delete on table public.system_health_log to authenticated;
-- grant select, insert, update, delete on table public.cron_execution_log to authenticated;
-- COMMIT;

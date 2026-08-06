-- C0.4/C0.5 — Remover superfície de execução anônima/pública de funções.
--
-- Contexto da auditoria de 2026-08-06 (plan: C0.4 RLS, C0.5 SECURITY DEFINER):
--
--   1. Inventário de tabelas: 158 tabelas em `public`, todas com RLS ativo.
--      A única sem policy é `backup_is_venda_loja_20260805`, sem grants para
--      nenhum papel — mantida inacessível por design (ver COMMIT abaixo).
--
--   2. Inventário de funções (pg_proc.proacl):
--       90  {authenticated, service_role}              <- correto
--       78  {PUBLIC(=X), anon, authenticated, service_role}  <- PUBLIC executável
--       34  {service_role}                             <- correto
--       17  {postgres}                                 <- correto
--       11  {anon, authenticated, service_role}        <- anon nominal (ver abaixo)
--
--   Os 78 grants PUBLIC (`=X/postgres`) vêm do default do PostgreSQL: toda
--   função nova nasce executável por PUBLIC. Combinado com SECURITY DEFINER,
--   qualquer chamador anônimo pode disparar RPC — mesmo que os corpos barrem
--   `auth.uid() IS NULL`/roles internamente, a superfície não deve existir.
--
--   As 11 funções com grant nominal a `anon` foram auditadas corpo a corpo e
--   todos os consumidores reais são sessões `authenticated` (src/) ou Edge
--   Functions com `service_role`:
--     check_and_increment_recovery_rate_limit  (edge functions, service_role)
--     compute_individual_score_mvp             (src, authenticated)
--     get_owner_consultant_contact             (src, authenticated)
--     get_owner_consulting_program_summary     (src, authenticated)
--     get_owner_network_cockpit                (src, authenticated; valida dono)
--     lojas_valida_hierarquia                  (trigger, owner)
--     mx_critical_cron_age_seconds             (src, authenticated)
--     mx_critical_cron_status                  (src, authenticated)
--     mx_database_health                       (src, authenticated)
--     pode_ler_cliente_por_oportunidade        (policy helper, owner)
--     registrar_status_acao_cadencia           (src, authenticated)
--
--   Nenhuma função do schema `public` exige execução anônima legítima.
--
-- Executado em produção: 2026-08-06 (SHAs 0aa57b49..4e9bda89).

-- 1) Remove o grant nominal a `anon` das 11 funções identificadas.
REVOKE ALL ON FUNCTION public.check_and_increment_recovery_rate_limit(text, integer, integer) FROM anon;
REVOKE ALL ON FUNCTION public.compute_individual_score_mvp(uuid, date) FROM anon;
REVOKE ALL ON FUNCTION public.get_owner_consultant_contact(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_owner_consulting_program_summary(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_owner_network_cockpit(date, date) FROM anon;
REVOKE ALL ON FUNCTION public.lojas_valida_hierarquia() FROM anon;
REVOKE ALL ON FUNCTION public.mx_critical_cron_age_seconds() FROM anon;
REVOKE ALL ON FUNCTION public.mx_critical_cron_status() FROM anon;
REVOKE ALL ON FUNCTION public.mx_database_health() FROM anon;
REVOKE ALL ON FUNCTION public.pode_ler_cliente_por_oportunidade(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.registrar_status_acao_cadencia(uuid, text, text, text) FROM anon;

-- 2) Remove o grant PUBLIC (default) de todas as funções do schema `public`.
--    `authenticated` e `service_role` mantêm EXECUTE (grants nominais).
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- 3) O `ALTER DEFAULT PRIVILEGES` do projeto concede EXECUTE nominal a `anon`
--    em toda função nova (mesmo padrão documentado em 20260805230000). Sem
--    este passo o revoke de PUBLIC acima não desfaz o grant direto a `anon`.
--    Verificado após aplicar os passos 1-2: 78 funções ainda com `anon=X`.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 4) Default privileges: novas funções não podem voltar a nascer com PUBLIC
--    nem com grant nominal a `anon`. O padrão do repo é grant explícito a
--    `authenticated`/`service_role` por migration (ver 20260805230000).
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;

-- 5) Documenta a decisão da tabela de backup sem policy (C0.4):
--    inacessível por design — RLS ativo sem policies + zero grants.
COMMENT ON TABLE public.backup_is_venda_loja_20260805 IS
  'Tabela de backup criada em 2026-08-05. Mantida inacessível por design (RLS ativo sem policies e sem grants): recuperação via service_role/psql somente. Decisão registrada em C0.4 do plano de execução autônoma 2026-08-06.';

-- DOWN (compensatória, forward-only):
--   NÃO reexecutar grants anônimos: restauraria a superfície que esta
--   migration removeu. Se uma função nova precisar de acesso público, deve
--   nascer com corpo que valida o uso e grant nominal e revisado.

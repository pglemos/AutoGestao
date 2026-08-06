-- Corrige a exposição a `anon` das RPCs de CRM criadas em 20260805224000.
--
-- Causa: `ALTER DEFAULT PRIVILEGES` do projeto concede EXECUTE em toda função
-- nova diretamente aos papéis anon/authenticated/service_role. Um
-- `REVOKE ... FROM PUBLIC` não desfaz uma concessão explícita a `anon` — a
-- migration anterior revogou de PUBLIC e o grant nominal continuou de pé.
--
-- Verificado após aplicar 20260805224000:
--   criar_oportunidade_crm            anon=X/postgres  ← executável sem login
--   criar_agendamento_crm             anon=X/postgres
--   atualizar_etapa_oportunidade_crm  anon=X/postgres
--   atualizar_status_agendamento_crm  anon=X/postgres
--   crm_assert_store_access           anon=X/postgres
--
-- Na prática cada função já barra `auth.uid() IS NULL`, então não havia
-- caminho de escrita anônima — mas a superfície não pode existir.
-- `submit_checkin` não é afetada: já estava com anon revogado desde
-- 20260717230000.

REVOKE ALL ON FUNCTION public.criar_oportunidade_crm(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.atualizar_etapa_oportunidade_crm(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.criar_agendamento_crm(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.atualizar_status_agendamento_crm(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.crm_assert_store_access(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.crm_evento_de_agendamento(public.crm_agendamento_tipo) FROM anon;

-- `authenticated` permanece com EXECUTE: é o papel real do vendedor logado.
GRANT EXECUTE ON FUNCTION public.criar_oportunidade_crm(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_etapa_oportunidade_crm(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_agendamento_crm(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_agendamento_crm(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_evento_de_agendamento(public.crm_agendamento_tipo) TO authenticated;

-- DOWN (compensatória, forward-only):
-- GRANT EXECUTE ON FUNCTION public.criar_oportunidade_crm(jsonb) TO anon; (não fazer)
-- Restaurar o acesso anônimo seria reintroduzir a exposição; o rollback real
-- desta migration é remover as funções (ver DOWN de 20260805224000).

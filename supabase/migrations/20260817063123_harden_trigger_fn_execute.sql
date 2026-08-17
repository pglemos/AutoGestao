-- Harden: revoga EXECUTE PUBLIC de funções de trigger SECURITY DEFINER.
--
-- criar_matriz_padrao_cliente() e registrar_snapshot_ativacao() são funções de
-- trigger (RETURNS trigger) usadas apenas por triggers em clientes_consultoria.
-- Elas ficaram com EXECUTE concedido a PUBLIC (anon), permitindo invocação via
-- /rest/v1/rpc/<fn> sem autenticação. Triggers não dependem de EXECUTE direto:
-- o fire é feito pelo executor do DML. Revogar não afeta os triggers.

REVOKE ALL ON FUNCTION public.criar_matriz_padrao_cliente() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.registrar_snapshot_ativacao() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.criar_matriz_padrao_cliente() TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_snapshot_ativacao() TO authenticated;

GRANT EXECUTE ON FUNCTION public.criar_matriz_padrao_cliente() TO service_role;
GRANT EXECUTE ON FUNCTION public.registrar_snapshot_ativacao() TO service_role;

COMMENT ON FUNCTION public.criar_matriz_padrao_cliente() IS
  'Trigger-only (SECURITY DEFINER). Execução direta restrita a authenticated/service_role; anon sem acesso.';
COMMENT ON FUNCTION public.registrar_snapshot_ativacao() IS
  'Trigger-only (SECURITY DEFINER). Execução direta restrita a authenticated/service_role; anon sem acesso.';

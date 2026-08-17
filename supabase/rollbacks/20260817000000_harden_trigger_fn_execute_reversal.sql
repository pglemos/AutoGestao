-- Reversão de 20260817000000_harden_trigger_fn_execute.sql
-- Restaura EXECUTE PUBLIC nas funções de trigger (comportamento original).

GRANT EXECUTE ON FUNCTION public.criar_matriz_padrao_cliente() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_snapshot_ativacao() TO PUBLIC;

REVOKE EXECUTE ON FUNCTION public.criar_matriz_padrao_cliente() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.registrar_snapshot_ativacao() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.criar_matriz_padrao_cliente() FROM service_role;
REVOKE EXECUTE ON FUNCTION public.registrar_snapshot_ativacao() FROM service_role;

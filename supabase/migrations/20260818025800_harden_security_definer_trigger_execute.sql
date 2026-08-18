-- Hardening de funções SECURITY DEFINER usadas exclusivamente por triggers.
--
-- Funções RETURNS trigger são executadas internamente pelo PostgreSQL quando o
-- evento do trigger ocorre. Não precisam estar expostas como RPC para usuários
-- autenticados. Mantemos service_role por compatibilidade administrativa.

BEGIN;

REVOKE ALL ON FUNCTION public.criar_matriz_padrao_cliente()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lojas_valida_hierarquia()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_snapshot_ativacao()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_sincronizar_jornada_consultoria_visita()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_consulting_request_scope()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.criar_matriz_padrao_cliente() TO service_role;
GRANT EXECUTE ON FUNCTION public.lojas_valida_hierarquia() TO service_role;
GRANT EXECUTE ON FUNCTION public.registrar_snapshot_ativacao() TO service_role;
GRANT EXECUTE ON FUNCTION public.trg_sincronizar_jornada_consultoria_visita() TO service_role;
GRANT EXECUTE ON FUNCTION public.validate_consulting_request_scope() TO service_role;

COMMIT;

-- DOWN
-- Não reabrir RPC pública para funções de trigger. Se alguma integração futura
-- precisar invocar comportamento equivalente, criar uma RPC explícita com
-- autenticação/autorização própria em nova migration forward-only.

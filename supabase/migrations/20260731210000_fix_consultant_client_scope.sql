-- Escopo do consultor em clientes_consultoria.
--
-- `can_access_consulting_client` verifica a atribuição em
-- `public.consulting_assignments`, tabela que NÃO EXISTE neste banco — o nome
-- em uso é `public.atribuicoes_consultoria`, renomeado na migração para
-- português. Uma função STABLE que referencia relação inexistente não filtra
-- nada de útil, e o efeito observado é o consultor lendo cliente que não lhe
-- foi atribuído.
--
-- Evidência (2026-07-31, sessão real de consultor_mx via /auth/v1/token):
--   GET /rest/v1/clientes_consultoria → 200 com o cliente atribuído E com o
--   cliente não atribuído a ninguém.
--   docs/audits/2026-07-31-escopo-consultor-clientes.md
--
-- Esta migração aponta a função para a tabela real. Administradores mantêm
-- acesso total; o consultor passa a ver apenas o que lhe foi atribuído e está
-- ativo.

CREATE OR REPLACE FUNCTION public.can_access_consulting_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.eh_administrador_mx(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.atribuicoes_consultoria ca
      WHERE ca.client_id = p_client_id
        AND ca.user_id = auth.uid()
        AND ca.active = true
    )
$$;

COMMENT ON FUNCTION public.can_access_consulting_client(uuid) IS
  'Administrador MX acessa toda a carteira; consultor acessa apenas clientes com atribuição ativa em atribuicoes_consultoria.';

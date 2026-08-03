-- DOWN — restaura o fail-safe de acesso administrativo enquanto o schema legado
-- de atribuições não estiver disponível. Aplicar somente como rollback de
-- emergência, pois ele retira o acesso do consultor até a função ser corrigida.

CREATE OR REPLACE FUNCTION public.can_access_consulting_client(p_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.eh_administrador_mx(auth.uid())
$$;

COMMENT ON FUNCTION public.can_access_consulting_client(uuid) IS
  'Rollback de emergência: somente administrador MX acessa clientes de consultoria até a reconciliação do schema de atribuições.';

REVOKE EXECUTE ON FUNCTION public.can_access_consulting_client(uuid) FROM anon;

-- DOWN

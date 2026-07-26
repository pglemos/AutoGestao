-- Rollback: restaura o helper anterior, mantendo department/process restritos
-- a perfis internos MX até o próximo mapeamento de escopo.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_access_mx_scope(
  p_scope_type public.score_scope_type,
  p_scope_id uuid,
  uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF uid IS NULL OR p_scope_id IS NULL THEN
    RETURN false;
  END IF;
  IF public.user_has_role(ARRAY['admin_mx', 'consultant'], uid)
     OR public.eh_area_interna_mx(uid) THEN
    RETURN true;
  END IF;
  IF p_scope_type = 'store'::public.score_scope_type THEN
    RETURN public.user_is_master_loja(p_scope_id, uid)
      OR public.tem_papel_loja(p_scope_id, ARRAY['dono', 'gerente'], uid)
      OR public.is_owner_of(p_scope_id)
      OR public.is_manager_of(p_scope_id);
  END IF;
  IF p_scope_type = 'individual'::public.score_scope_type THEN
    RETURN p_scope_id = uid
      OR EXISTS (
        SELECT 1
        FROM public.vinculos_loja meu
        JOIN public.vinculos_loja alvo ON alvo.store_id = meu.store_id
        WHERE meu.user_id = uid
          AND alvo.user_id = p_scope_id
          AND meu.role IN ('dono', 'gerente')
      );
  END IF;
  RETURN false;
END;
$$;

COMMIT;

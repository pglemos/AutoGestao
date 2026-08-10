-- RLS helper privileges after the public EXECUTE hardening.
--
-- 20260806150000_revoke_anon_public_execute_functions.sql correctly removed
-- the implicit PUBLIC/anon surface, but predicates run as the querying role.
-- Helpers referenced by authenticated RLS policies therefore need an
-- explicit authenticated grant.  Keep this list limited to predicate
-- helpers; application RPCs must retain their own migration-owned grants.

BEGIN;

DO $grant_authenticated_rls_helpers$
DECLARE
  signature text;
BEGIN
  FOR signature IN
    SELECT unnest(ARRAY[
      'public.can_access_consulting_client(uuid)',
      'public.can_access_mx_scope(public.score_scope_type, uuid, uuid)',
      'public.check_user_role_in_store(uuid, text[])',
      'public.consulting_client_module_enabled(uuid, text)',
      'public.current_user_role_code(uuid)',
      'public.eh_area_interna_mx(uuid)',
      'public.eh_administrador_mx(uuid)',
      'public.is_admin()',
      'public.is_admin(uuid)',
      'public.is_manager_of(uuid)',
      'public.is_member_of(uuid)',
      'public.is_owner_of(uuid)',
      'public.mx_can_read_funnel_metrics(uuid, uuid)',
      'public.mx_can_read_score_calculation(uuid)',
      'public.mx_can_read_score_scope(public.score_scope_type, uuid)',
      'public.normalize_mx_role(text)',
      'public.pode_lancar_checkin(uuid, uuid, date, uuid)',
      'public.pode_ler_cliente_por_oportunidade(uuid)',
      'public.pode_ver_usuario(uuid, uuid)',
      'public.tem_papel_loja(uuid, text[], uuid)',
      'public.user_has_role(text[], uuid)',
      'public.user_is_master_loja(uuid, uuid)'
    ])
  LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', signature);
    END IF;
  END LOOP;
END;
$grant_authenticated_rls_helpers$;

COMMIT;

-- DOWN (compensatory): remove only the explicit authenticated grants above.
-- Keep PUBLIC/anon revoked; restoring implicit execution would reopen the
-- privilege surface closed by 20260806150000.

-- RLS helper privileges after the public EXECUTE hardening.
--
-- 20260806150000_revoke_anon_public_execute_functions.sql correctly removed
-- the implicit PUBLIC/anon surface, but predicates run as the querying role.
-- Helpers referenced by authenticated RLS policies therefore need an
-- explicit authenticated grant.  Keep this list limited to predicate
-- helpers; application RPCs must retain their own migration-owned grants.

BEGIN;

REVOKE ALL ON FUNCTION public.can_access_consulting_client(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_mx_scope(public.score_scope_type, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.check_user_role_in_store(uuid, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consulting_client_module_enabled(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_role_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eh_area_interna_mx(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.eh_administrador_mx(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_member_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_owner_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mx_can_read_funnel_metrics(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mx_can_read_score_calculation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mx_can_read_score_scope(public.score_scope_type, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.normalize_mx_role(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_lancar_checkin(uuid, uuid, date, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_ler_cliente_por_oportunidade(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pode_ver_usuario(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tem_papel_loja(uuid, text[], uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_has_role(text[], uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_is_master_loja(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_access_consulting_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_mx_scope(public.score_scope_type, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_role_in_store(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consulting_client_module_enabled(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_area_interna_mx(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_administrador_mx(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mx_can_read_funnel_metrics(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mx_can_read_score_calculation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mx_can_read_score_scope(public.score_scope_type, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_mx_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_lancar_checkin(uuid, uuid, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_ler_cliente_por_oportunidade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_ver_usuario(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_papel_loja(uuid, text[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(text[], uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_master_loja(uuid, uuid) TO authenticated;

COMMIT;

-- DOWN (compensatory): remove only the explicit authenticated grants above.
-- Keep PUBLIC/anon revoked; restoring implicit execution would reopen the
-- privilege surface closed by 20260806150000.

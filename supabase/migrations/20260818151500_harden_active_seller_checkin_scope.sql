-- Migration: 20260818151500_harden_active_seller_checkin_scope.sql
-- Description: Garante que vendedores ativos (is_active = true) tenham escopo completo
-- para lançamentos de check-in e validações operacionais na sua loja, sem bloqueio
-- por data de onboarding recente (started_at).

CREATE OR REPLACE FUNCTION public.pode_lancar_checkin(
  p_store_id uuid,
  p_seller_id uuid,
  p_reference_date date DEFAULT CURRENT_DATE,
  uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    uid = p_seller_id
    AND EXISTS (
      SELECT 1
      FROM public.usuarios u
      JOIN public.vinculos_loja v
        ON v.user_id = u.id
       AND v.store_id = p_store_id
       AND v.role = 'vendedor'
       AND coalesce(v.is_active, true) = true
      JOIN public.vendedores_loja vl
        ON vl.seller_user_id = u.id
       AND vl.store_id = p_store_id
      WHERE u.id = uid
        AND u.active = true
        AND u.role = 'vendedor'
        AND vl.is_active = true
        AND (vl.ended_at IS NULL OR vl.ended_at >= p_reference_date)
    );
$function$;

GRANT EXECUTE ON FUNCTION public.pode_lancar_checkin(uuid, uuid, date, uuid) TO authenticated, service_role;

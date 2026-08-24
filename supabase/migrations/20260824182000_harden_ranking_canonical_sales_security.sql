-- Follow-up for 20260824173308.
-- The canonical-sales migration is already applied in production; keep this
-- hardening in a new migration so the remote schema receives it exactly once.

BEGIN;

ALTER FUNCTION public.get_vendas_oficiais_periodo(date, date, uuid, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION public.consolidate_store_target_plan(uuid, date)
  SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.admin_store_live_overview(
  p_store_id uuid,
  p_reference_date date DEFAULT NULL
)
RETURNS TABLE (
  seller_user_id uuid,
  seller_name text,
  reference_date date,
  closing_status text,
  submission_status text,
  submitted_at timestamptz,
  submitted_late boolean,
  discipline_score numeric,
  live_leads bigint,
  live_appointments bigint,
  live_attendances bigint,
  live_sales bigint,
  declared_leads bigint,
  declared_appointments bigint,
  declared_attendances bigint,
  declared_sales bigint,
  has_divergence boolean,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_role text;
  v_reference_date date := coalesce(p_reference_date, timezone('America/Sao_Paulo', now())::date);
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  SELECT role INTO v_role
    FROM public.usuarios
   WHERE id = v_caller_id AND active = true;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;
  IF v_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
     AND NOT public.is_manager_of(p_store_id)
     AND NOT public.is_owner_of(p_store_id) THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  RETURN QUERY
  WITH canonical_sales AS (
    SELECT v.seller_user_id, count(*)::bigint AS live_sales
      FROM public.vendas_oficiais_deduplicadas_periodo(
        v_reference_date, v_reference_date, p_store_id, NULL
      ) v
     GROUP BY v.seller_user_id
  )
  SELECT a.seller_user_id, a.seller_name, a.reference_date, a.closing_status,
         a.submission_status, a.submitted_at, a.submitted_late, a.discipline_score,
         a.live_leads, a.live_appointments, a.live_attendances,
         coalesce(c.live_sales, 0)::bigint,
         a.declared_leads, a.declared_appointments, a.declared_attendances, a.declared_sales,
         CASE
           WHEN a.submitted_at IS NULL OR a.submission_status = 'draft' THEN false
           ELSE a.live_leads <> a.declared_leads
             OR a.live_appointments <> a.declared_appointments
             OR a.live_attendances <> a.declared_attendances
             OR coalesce(c.live_sales, 0) <> a.declared_sales
         END,
         a.last_activity_at
    FROM public.admin_store_live_overview_legacy(p_store_id, v_reference_date) a
    LEFT JOIN canonical_sales c ON c.seller_user_id = a.seller_user_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_store_live_overview(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_store_live_overview(uuid, date) TO authenticated;

COMMIT;

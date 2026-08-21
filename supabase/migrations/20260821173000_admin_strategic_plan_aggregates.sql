-- Agregações usadas pelo painel Admin MX sem depender do limite padrão do PostgREST.

CREATE OR REPLACE FUNCTION public.get_admin_indicator_target_aggregates(p_year integer)
RETURNS TABLE(metric_key text, target_count bigint, annual_target numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    metric_key,
    COUNT(*)::bigint AS target_count,
    COALESCE(SUM(target_value), 0)::numeric AS annual_target
  FROM public.metas_metricas_cliente
  WHERE reference_month >= make_date(p_year, 1, 1)
    AND reference_month < make_date(p_year + 1, 1, 1)
  GROUP BY metric_key;
$$;

CREATE OR REPLACE FUNCTION public.get_strategic_plan_indicator_counts(p_cycle_ids uuid[])
RETURNS TABLE(cycle_id uuid, indicator_count bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ciclo_id AS cycle_id,
    COUNT(DISTINCT indicator_code)::bigint AS indicator_count
  FROM public.valores_indicadores_planejamento
  WHERE ciclo_id = ANY (p_cycle_ids)
  GROUP BY ciclo_id;
$$;

REVOKE ALL ON FUNCTION public.get_admin_indicator_target_aggregates(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_indicator_target_aggregates(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.get_strategic_plan_indicator_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_strategic_plan_indicator_counts(uuid[]) TO authenticated;

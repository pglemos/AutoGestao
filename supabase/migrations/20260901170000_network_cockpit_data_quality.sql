-- Qualidade explícita do cockpit de rede.
--
-- A leitura operacional só considera fechamentos diários enviados, não rascunhos
-- nem linhas vazias sem justificativa. Isso permite distinguir no frontend:
--   - fechamento válido com vendas = leitura disponível;
--   - fechamento válido com zero e zero_reason = zero confirmado;
--   - ausência de fechamento válido = sem dado;
--   - monthly_goal nulo/zero = meta não configurada.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_resumo_rede_periodo(
  p_start_date date,
  p_end_date date,
  p_scope text DEFAULT 'daily'::text
)
RETURNS TABLE(store_id uuid, sales bigint, leads bigint, agd bigint, vis bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_scope public.checkin_scope := coalesce(nullif(p_scope, ''), 'daily')::public.checkin_scope;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING errcode = 'P0001';
  END IF;
  IF NOT public.eh_area_interna_mx() THEN
    RAISE EXCEPTION 'forbidden_global_read' USING errcode = 'P0001';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'invalid_date_range' USING errcode = '22007';
  END IF;
  IF (p_end_date - p_start_date) > 366 THEN
    RAISE EXCEPTION 'date_range_too_large' USING errcode = '22023';
  END IF;

  RETURN QUERY
  WITH sales_by_store AS (
    SELECT v.store_id, sum(v.vendas)::bigint AS sales
      FROM public.vendas_oficiais_deduplicadas_periodo(
        p_start_date, p_end_date, NULL, NULL
      ) v
     GROUP BY v.store_id
  ), official_closings AS (
    SELECT l.store_id,
           l.leads_prev_day,
           l.agd_net_today,
           l.agd_cart_today,
           l.visit_prev_day
      FROM public.lancamentos_diarios l
     WHERE l.metric_scope = v_scope
       AND l.reference_date BETWEEN p_start_date AND p_end_date
       AND l.submitted_at IS NOT NULL
       AND coalesce(l.submission_status, '') <> 'draft'
       AND (
         coalesce(l.leads_prev_day, 0) + coalesce(l.agd_cart_prev_day, 0)
         + coalesce(l.agd_net_prev_day, 0) + coalesce(l.agd_cart_today, 0)
         + coalesce(l.agd_net_today, 0) + coalesce(l.vnd_porta_prev_day, 0)
         + coalesce(l.vnd_cart_prev_day, 0) + coalesce(l.vnd_net_prev_day, 0)
         + coalesce(l.visit_prev_day, 0) > 0
         OR nullif(trim(coalesce(l.zero_reason, '')), '') IS NOT NULL
       )
  ), activity_by_store AS (
    SELECT l.store_id,
           coalesce(sum(coalesce(l.leads_prev_day, 0)), 0)::bigint AS leads,
           coalesce(sum(coalesce(l.agd_net_today, 0) + coalesce(l.agd_cart_today, 0)), 0)::bigint AS agd,
           coalesce(sum(coalesce(l.visit_prev_day, 0)), 0)::bigint AS vis
      FROM official_closings l
     GROUP BY l.store_id
  )
  SELECT coalesce(s.store_id, a.store_id) AS store_id,
         coalesce(s.sales, 0) AS sales,
         coalesce(a.leads, 0) AS leads,
         coalesce(a.agd, 0) AS agd,
         coalesce(a.vis, 0) AS vis
    FROM sales_by_store s
    FULL OUTER JOIN activity_by_store a ON a.store_id = s.store_id
   ORDER BY coalesce(s.store_id, a.store_id);
EXCEPTION WHEN others THEN
  PERFORM public.log_rpc_error(
    'get_resumo_rede_periodo', SQLSTATE, SQLERRM, v_caller_id,
    jsonb_build_object('start', p_start_date, 'end', p_end_date, 'scope', p_scope)
  );
  RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_resumo_rede_periodo(date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resumo_rede_periodo(date, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.patch_network_cockpit_sales(
  p_payload jsonb,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH payload_stores AS (
    SELECT stores.store,
           (stores.store->>'id')::uuid AS store_id
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p_payload->'stores') = 'array' THEN p_payload->'stores'
          ELSE '[]'::jsonb
        END
      ) AS stores(store)
  ),
  sales_by_store AS (
    SELECT v.store_id, sum(v.vendas)::numeric AS sales
      FROM public.get_vendas_oficiais_periodo(
        p_start_date, p_end_date, NULL, NULL
      ) v
     GROUP BY v.store_id
  ),
  store_quality AS (
    SELECT p.store_id,
           EXISTS (
             SELECT 1
               FROM public.lancamentos_diarios l
              WHERE l.store_id = p.store_id
                AND l.metric_scope = 'daily'::public.checkin_scope
                AND l.reference_date BETWEEN p_start_date AND p_end_date
                AND l.submitted_at IS NOT NULL
                AND coalesce(l.submission_status, '') <> 'draft'
                AND (
                  coalesce(l.leads_prev_day, 0) + coalesce(l.agd_cart_prev_day, 0)
                  + coalesce(l.agd_net_prev_day, 0) + coalesce(l.agd_cart_today, 0)
                  + coalesce(l.agd_net_today, 0) + coalesce(l.vnd_porta_prev_day, 0)
                  + coalesce(l.vnd_cart_prev_day, 0) + coalesce(l.vnd_net_prev_day, 0)
                  + coalesce(l.visit_prev_day, 0) > 0
                  OR nullif(trim(coalesce(l.zero_reason, '')), '') IS NOT NULL
                )
           ) AS has_closing,
           EXISTS (
             SELECT 1
               FROM public.regras_metas_loja rm
              WHERE rm.store_id = p.store_id
                AND coalesce(rm.monthly_goal, 0) > 0
           ) AS has_goal,
           EXISTS (
             SELECT 1
               FROM public.vendedores_loja vl
               JOIN public.usuarios u ON u.id = vl.seller_user_id AND u.active
              WHERE vl.store_id = p.store_id
                AND coalesce(vl.is_active, true)
           ) AS has_seller
      FROM payload_stores p
  ),
  items AS (
    SELECT p.store,
           p.store_id,
           coalesce(s.sales, 0)::numeric AS sales,
           q.has_closing,
           q.has_goal,
           q.has_seller
      FROM payload_stores p
      LEFT JOIN sales_by_store s ON s.store_id = p.store_id
      LEFT JOIN store_quality q ON q.store_id = p.store_id
  )
  SELECT jsonb_build_object(
    'period', coalesce(p_payload->'period', jsonb_build_object('start', p_start_date, 'end', p_end_date)),
    'stores', coalesce(jsonb_agg(
      jsonb_set(
        CASE
          WHEN jsonb_typeof(item.store->'ownerEvolution') = 'object' THEN
            jsonb_set(
              jsonb_set(item.store, '{sales}', to_jsonb(item.sales), true),
              '{ownerEvolution,metrics,sales,value}', to_jsonb(item.sales), true
            )
          ELSE jsonb_set(item.store, '{sales}', to_jsonb(item.sales), true)
        END,
        '{dataQuality}',
        jsonb_build_object(
          'operational', (item.has_closing OR item.sales > 0),
          'goal', item.has_goal,
          'discipline', (item.has_seller AND item.has_closing)
        ),
        true
      )
      ORDER BY item.sales DESC, item.store->>'name'
    ), '[]'::jsonb)
  )
  FROM items item;
$function$;

REVOKE ALL ON FUNCTION public.patch_network_cockpit_sales(jsonb, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patch_network_cockpit_sales(jsonb, date, date) TO authenticated;

COMMENT ON FUNCTION public.patch_network_cockpit_sales(jsonb, date, date) IS
  'Corrige vendas pelo read model canônico e expõe dataQuality operacional, meta e disciplina para o cockpit.';

NOTIFY pgrst, 'reload schema';

COMMIT;

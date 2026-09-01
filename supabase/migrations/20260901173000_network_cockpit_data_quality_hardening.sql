-- Hardening posterior ao contrato de qualidade do cockpit de rede.
--
-- A migration 20260901170000 já está aplicada em produção e permanece
-- imutável. Este patch corrige duas divergências descobertas na validação:
--   1. a fonte deduplicada retorna uma linha por venda, portanto a rede deve
--      contar linhas, como os demais consumidores canônicos;
--   2. patch_network_cockpit_sales só pode recalcular lojas autorizadas pelo
--      usuário autenticado, mesmo sendo SECURITY DEFINER.

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
    SELECT v.store_id, count(*)::bigint AS sales
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
           CASE
             WHEN jsonb_typeof(stores.store) = 'object'
               AND stores.store->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             THEN (stores.store->>'id')::uuid
             ELSE NULL::uuid
           END AS store_id
      FROM jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(p_payload->'stores') = 'array' THEN p_payload->'stores'
          ELSE '[]'::jsonb
        END
      ) AS stores(store)
  ),
  authorization_state AS (
    SELECT public.eh_area_interna_mx() AS is_internal
  ),
  authorized_stores AS (
    SELECT DISTINCT ON (p.store_id) p.store,
           p.store_id
      FROM payload_stores p
      CROSS JOIN authorization_state a
      JOIN public.lojas l ON l.id = p.store_id AND l.active
     WHERE p.store_id IS NOT NULL
       AND (
         a.is_internal
         OR (
           public.is_owner_of(p.store_id)
           AND EXISTS (
             SELECT 1
               FROM public.vinculos_loja v
              WHERE v.store_id = p.store_id
                AND v.user_id = auth.uid()
                AND v.role = 'dono'
                AND v.is_active
                AND v.ended_at IS NULL
           )
         )
       )
     ORDER BY p.store_id, p.store->>'name'
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
      FROM authorized_stores p
  ),
  items AS (
    SELECT p.store,
           p.store_id,
           coalesce(s.sales, 0)::numeric AS sales,
           q.has_closing,
           q.has_goal,
           q.has_seller
      FROM authorized_stores p
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
  'Corrige vendas pelo read model canônico, restringe lojas autorizadas e expõe dataQuality para o cockpit.';

NOTIFY pgrst, 'reload schema';

COMMIT;

-- DOWN
-- Reaplicar a definição da migration 20260901170000_network_cockpit_data_quality.sql
-- restaura o contrato anterior; os fatos de vendas não devem ser apagados.

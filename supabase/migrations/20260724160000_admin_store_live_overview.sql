BEGIN;

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
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_role text;
  v_reference_date date := coalesce(p_reference_date, timezone('America/Sao_Paulo', now())::date);
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT u.role INTO v_role
  FROM public.usuarios u
  WHERE u.id = v_caller_id AND u.active = true;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0001';
  END IF;

  IF v_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
     AND NOT public.is_manager_of(p_store_id)
     AND NOT public.is_owner_of(p_store_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
  WITH active_sellers AS (
    SELECT DISTINCT vl.seller_user_id, u.name
    FROM public.vendedores_loja vl
    JOIN public.vinculos_loja vinc
      ON vinc.store_id = vl.store_id
     AND vinc.user_id = vl.seller_user_id
     AND vinc.role = 'vendedor'
     AND vinc.is_active = true
     AND vinc.ended_at IS NULL
    JOIN public.usuarios u
      ON u.id = vl.seller_user_id
     AND u.active = true
     AND u.role = 'vendedor'
    WHERE vl.store_id = p_store_id
      AND vl.is_active = true
      AND vl.ended_at IS NULL
  ), ranked_closings AS (
    SELECT ld.*,
           row_number() OVER (
             PARTITION BY ld.seller_user_id
             ORDER BY
               CASE WHEN ld.submitted_at IS NOT NULL THEN 0 ELSE 1 END,
               ld.submitted_at DESC NULLS LAST,
               ld.updated_at DESC NULLS LAST,
               ld.created_at DESC NULLS LAST
           ) AS rn
    FROM public.lancamentos_diarios ld
    WHERE ld.store_id = p_store_id
      AND ld.reference_date = v_reference_date
      AND ld.metric_scope = 'daily'
  ), latest_closing AS (
    SELECT * FROM ranked_closings WHERE rn = 1
  ), crm_metrics AS (
    SELECT s.seller_user_id,
      (SELECT count(*)::bigint
         FROM public.clientes c
        WHERE c.loja_id = p_store_id
          AND c.seller_user_id = s.seller_user_id
          AND coalesce(c.data_competencia, timezone('America/Sao_Paulo', c.created_at)::date) = v_reference_date
      ) AS live_leads,
      (SELECT count(*)::bigint
         FROM public.agendamentos a
        WHERE a.loja_id = p_store_id
          AND a.seller_user_id = s.seller_user_id
          AND timezone('America/Sao_Paulo', a.data_hora)::date = v_reference_date + 1
      ) AS live_appointments,
      (SELECT count(*)::bigint
         FROM public.atendimentos atd
        WHERE atd.loja_id = p_store_id
          AND atd.seller_user_id = s.seller_user_id
          AND atd.data = v_reference_date
      ) AS live_attendances,
      (SELECT count(*)::bigint
         FROM public.oportunidades o
        WHERE o.loja_id = p_store_id
          AND o.seller_user_id = s.seller_user_id
          AND o.etapa::text = 'ganho'
          AND coalesce(o.data_competencia, timezone('America/Sao_Paulo', o.closed_at)::date) = v_reference_date
      ) AS live_sales,
      (SELECT max(activity_at)
         FROM (
           SELECT max(c.updated_at) AS activity_at
             FROM public.clientes c
            WHERE c.loja_id = p_store_id AND c.seller_user_id = s.seller_user_id
           UNION ALL
           SELECT max(a.updated_at)
             FROM public.agendamentos a
            WHERE a.loja_id = p_store_id AND a.seller_user_id = s.seller_user_id
           UNION ALL
           SELECT max(atd.created_at)
             FROM public.atendimentos atd
            WHERE atd.loja_id = p_store_id AND atd.seller_user_id = s.seller_user_id
           UNION ALL
           SELECT max(o.updated_at)
             FROM public.oportunidades o
            WHERE o.loja_id = p_store_id AND o.seller_user_id = s.seller_user_id
           UNION ALL
           SELECT max(ec.created_at)
             FROM public.eventos_comerciais ec
            WHERE ec.loja_id = p_store_id AND ec.seller_user_id = s.seller_user_id
         ) activity
      ) AS last_activity_at
    FROM active_sellers s
  )
  SELECT
    s.seller_user_id,
    s.name::text,
    v_reference_date,
    CASE
      WHEN lc.id IS NULL THEN 'not_started'
      WHEN lc.submitted_at IS NULL OR lc.submission_status::text = 'draft' THEN 'draft'
      WHEN coalesce(lc.submitted_late, false) OR lc.submission_status::text = 'late' THEN 'submitted_late'
      ELSE 'submitted_on_time'
    END::text,
    lc.submission_status::text,
    lc.submitted_at,
    coalesce(lc.submitted_late, false),
    lc.pontuacao_disciplina_final,
    cm.live_leads,
    cm.live_appointments,
    cm.live_attendances,
    cm.live_sales,
    coalesce(lc.leads, 0)::bigint,
    (coalesce(lc.agd_cart, 0) + coalesce(lc.agd_net, 0))::bigint,
    coalesce(lc.visitas, 0)::bigint,
    (coalesce(lc.vnd_porta, 0) + coalesce(lc.vnd_cart, 0) + coalesce(lc.vnd_net, 0))::bigint,
    CASE
      WHEN lc.submitted_at IS NULL OR lc.submission_status::text = 'draft' THEN false
      ELSE cm.live_leads <> coalesce(lc.leads, 0)
        OR cm.live_appointments <> (coalesce(lc.agd_cart, 0) + coalesce(lc.agd_net, 0))
        OR cm.live_attendances <> coalesce(lc.visitas, 0)
        OR cm.live_sales <> (coalesce(lc.vnd_porta, 0) + coalesce(lc.vnd_cart, 0) + coalesce(lc.vnd_net, 0))
    END,
    cm.last_activity_at
  FROM active_sellers s
  LEFT JOIN latest_closing lc ON lc.seller_user_id = s.seller_user_id
  JOIN crm_metrics cm ON cm.seller_user_id = s.seller_user_id
  ORDER BY
    CASE
      WHEN lc.id IS NULL THEN 0
      WHEN lc.submitted_at IS NULL OR lc.submission_status::text = 'draft' THEN 1
      WHEN coalesce(lc.submitted_late, false) OR lc.submission_status::text = 'late' THEN 2
      ELSE 3
    END,
    s.name;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_store_live_overview(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_store_live_overview(uuid, date) TO authenticated;

DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['clientes', 'agendamentos', 'atendimentos', 'oportunidades']
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END;
$$;

COMMIT;

-- Ranking oficial: deduplicação por oportunidade e competência única.
--
-- A migration 20260824163327 eliminou o fallback temporal, mas ainda agregava
-- cada evento venda_realizada. Uma oportunidade com dois eventos continuava
-- valendo duas vendas. Este helper vira a fonte única dos agregados oficiais:
--   evento.data_competencia -> oportunidade.data_competencia -> sale_date
--   oportunidade cancelada ou competência nula -> excluída
--   oportunidade repetida -> uma única linha, com prioridade para o evento
--   que possui competência explícita e, depois, para o evento mais recente.

CREATE OR REPLACE FUNCTION public.vendas_oficiais_deduplicadas_periodo(
  p_start_date date,
  p_end_date date,
  p_store_id uuid DEFAULT NULL,
  p_seller_id uuid DEFAULT NULL
)
RETURNS TABLE (
  evento_id uuid,
  oportunidade_id uuid,
  seller_user_id uuid,
  store_id uuid,
  competencia date,
  valor_negociado numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  WITH candidates AS (
    SELECT ec.id AS evento_id,
           ec.oportunidade_id,
           ec.seller_user_id,
           ec.loja_id AS store_id,
           public.venda_competencia_canonica(
             ec.data_competencia,
             o.data_competencia,
             o.sale_date
           ) AS competencia,
           coalesce(o.valor_negociado, 0)::numeric AS valor_negociado,
           (ec.data_competencia IS NOT NULL) AS tem_competencia_evento,
           ec.data_evento,
           ec.created_at
      FROM public.eventos_comerciais ec
      LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id
     WHERE ec.tipo_evento = 'venda_realizada'
       AND o.etapa IS DISTINCT FROM 'cancelada'
       AND (p_store_id IS NULL OR ec.loja_id = p_store_id)
       AND (p_seller_id IS NULL OR ec.seller_user_id = p_seller_id)
       AND public.venda_competencia_canonica(
             ec.data_competencia,
             o.data_competencia,
             o.sale_date
           ) BETWEEN p_start_date AND p_end_date
  ), ranked AS (
    SELECT c.*,
           row_number() OVER (
             PARTITION BY coalesce(c.oportunidade_id, c.evento_id)
             ORDER BY c.tem_competencia_evento DESC,
                      c.data_evento DESC NULLS LAST,
                      c.created_at DESC NULLS LAST,
                      c.evento_id DESC
           ) AS occurrence_number
      FROM candidates c
  )
  SELECT r.evento_id,
         r.oportunidade_id,
         r.seller_user_id,
         r.store_id,
         r.competencia,
         r.valor_negociado
    FROM ranked r
   WHERE r.occurrence_number = 1;
$function$;

COMMENT ON FUNCTION public.vendas_oficiais_deduplicadas_periodo(date, date, uuid, uuid) IS
  'Fonte interna de vendas oficiais: competência evento -> oportunidade -> sale_date, sem canceladas, sem competência e sem duplicar oportunidade.';

REVOKE ALL ON FUNCTION public.vendas_oficiais_deduplicadas_periodo(date, date, uuid, uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_vendas_oficiais_periodo(
  p_start_date date,
  p_end_date date,
  p_store_id uuid DEFAULT NULL,
  p_seller_id uuid DEFAULT NULL
)
RETURNS TABLE (seller_user_id uuid, store_id uuid, competencia date, vendas bigint, faturamento numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_role text;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Período inválido.';
  END IF;
  IF (p_end_date - p_start_date) > 366 THEN
    RAISE EXCEPTION 'Período máximo de 366 dias.';
  END IF;
  SELECT role INTO v_role FROM public.usuarios WHERE id = v_caller_id AND active = true;
  IF v_role IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF v_role = 'vendedor' AND p_seller_id IS NOT NULL AND p_seller_id <> v_caller_id THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;
  IF p_store_id IS NOT NULL
     AND v_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx', 'vendedor')
     AND NOT public.is_manager_of(p_store_id) AND NOT public.is_owner_of(p_store_id) THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  RETURN QUERY
  SELECT v.seller_user_id,
         v.store_id,
         v.competencia,
         count(*)::bigint,
         coalesce(sum(v.valor_negociado), 0)::numeric
    FROM public.vendas_oficiais_deduplicadas_periodo(
      p_start_date, p_end_date, p_store_id, p_seller_id
    ) v
   WHERE (
       v_role IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
       OR (v_role = 'vendedor' AND v.seller_user_id = v_caller_id)
       OR (v_role <> 'vendedor' AND (public.is_manager_of(v.store_id) OR public.is_owner_of(v.store_id)))
   )
   GROUP BY v.seller_user_id, v.store_id, v.competencia;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_vendas_oficiais_periodo(date, date, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vendas_oficiais_periodo(date, date, uuid, uuid) TO authenticated;

-- Mudança de etapa para ganho: o legado não retorna evento_id. Localize o
-- último evento da oportunidade e atualize a competência nele explicitamente.
CREATE OR REPLACE FUNCTION public.atualizar_etapa_oportunidade_crm(
  p_oportunidade_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_result jsonb;
  v_competencia date := NULLIF(p_payload->>'data_competencia', '')::date;
  v_sale_date date := NULLIF(p_payload->>'sale_date', '')::date;
  v_oportunidade_competencia date;
  v_oportunidade_sale_date date;
  v_evento_id uuid;
  v_competencia_efetiva date;
BEGIN
  v_result := public.atualizar_etapa_oportunidade_crm_legacy(p_oportunidade_id, p_payload);
  IF COALESCE((v_result->>'ok')::boolean, false)
     AND COALESCE(p_payload->>'etapa', '') = 'ganho' THEN
    SELECT o.data_competencia, o.sale_date
      INTO v_oportunidade_competencia, v_oportunidade_sale_date
      FROM public.oportunidades o
     WHERE o.id = p_oportunidade_id;

    v_competencia_efetiva := coalesce(
      v_competencia,
      v_sale_date,
      v_oportunidade_competencia,
      v_oportunidade_sale_date
    );

    IF v_competencia_efetiva IS NOT NULL THEN
      UPDATE public.oportunidades
         SET data_competencia = coalesce(v_competencia, data_competencia, v_sale_date, sale_date),
             sale_date = coalesce(v_sale_date, sale_date, v_competencia, data_competencia)
       WHERE id = p_oportunidade_id;

      SELECT ec.id
        INTO v_evento_id
        FROM public.eventos_comerciais ec
       WHERE ec.oportunidade_id = p_oportunidade_id
         AND ec.tipo_evento = 'venda_realizada'
       ORDER BY ec.data_evento DESC NULLS LAST,
                ec.created_at DESC NULLS LAST,
                ec.id DESC
       LIMIT 1;

      IF v_evento_id IS NOT NULL THEN
        UPDATE public.eventos_comerciais ec
           SET data_competencia = coalesce(
             v_competencia,
             ec.data_competencia,
             v_sale_date,
             v_oportunidade_competencia,
             v_oportunidade_sale_date
           )
         WHERE ec.id = v_evento_id;
      END IF;
    END IF;
  END IF;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.atualizar_etapa_oportunidade_crm(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_etapa_oportunidade_crm(uuid, jsonb) TO authenticated;

-- Performance oficial: a CTE de vendas só recebe linhas do helper deduplicado.
CREATE OR REPLACE FUNCTION public.vendedor_performance_oficial(
  p_start_date date,
  p_end_date date,
  p_store_id uuid DEFAULT NULL,
  p_seller_id uuid DEFAULT NULL
)
RETURNS TABLE (
  seller_user_id uuid,
  seller_name text,
  store_id uuid,
  store_name text,
  vendas_realizadas bigint,
  vendas_ultimo_dia bigint,
  vendas_projetadas numeric,
  faturamento_realizado numeric,
  meta numeric,
  atingimento numeric,
  comissao_realizada numeric,
  comissao_projetada numeric,
  disciplina numeric,
  leads bigint,
  atendimentos bigint,
  agendamentos bigint,
  regularizacoes_pendentes bigint,
  regularizacoes_aprovadas bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_role text;
  v_today date := timezone('America/Sao_Paulo', now())::date;
  v_elapsed integer;
  v_total_days integer;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Período inválido.';
  END IF;
  SELECT role INTO v_role FROM public.usuarios WHERE id = v_caller_id AND active;
  IF v_role IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF v_role = 'vendedor' AND p_seller_id IS NOT NULL AND p_seller_id <> v_caller_id THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;
  IF p_store_id IS NOT NULL
     AND v_role NOT IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
     AND v_role <> 'vendedor'
     AND NOT public.is_manager_of(p_store_id)
     AND NOT public.is_owner_of(p_store_id) THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  v_total_days := greatest(1, p_end_date - p_start_date + 1);
  v_elapsed := greatest(1, least(p_end_date, greatest(p_start_date, v_today)) - p_start_date + 1);

  RETURN QUERY
  WITH sellers AS (
    SELECT vl.seller_user_id, vl.store_id, u.name AS seller_name, l.name AS store_name,
           u.is_venda_loja
      FROM public.vendedores_loja vl
      JOIN public.usuarios u ON u.id = vl.seller_user_id AND u.active
      JOIN public.lojas l ON l.id = vl.store_id
     WHERE coalesce(vl.is_active, true)
       AND (p_store_id IS NULL OR vl.store_id = p_store_id)
       AND (p_seller_id IS NULL OR vl.seller_user_id = p_seller_id)
       AND (
         v_role IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
         OR (v_role = 'vendedor' AND vl.seller_user_id = v_caller_id)
         OR (v_role <> 'vendedor' AND (public.is_manager_of(vl.store_id) OR public.is_owner_of(vl.store_id)))
       )
  ), sales AS (
    SELECT v.seller_user_id,
           v.store_id,
           count(*)::bigint AS vendas,
           count(*) FILTER (WHERE v.competencia = p_end_date)::bigint AS vendas_dia,
           coalesce(sum(v.valor_negociado), 0)::numeric AS faturamento
      FROM public.vendas_oficiais_deduplicadas_periodo(
        p_start_date, p_end_date, p_store_id, p_seller_id
      ) v
     GROUP BY v.seller_user_id, v.store_id
  ), official_closings AS (
    SELECT ld.*
      FROM public.lancamentos_diarios ld
     WHERE ld.metric_scope = 'daily'
       AND ld.reference_date BETWEEN p_start_date AND p_end_date
       AND ld.submitted_at IS NOT NULL
       AND coalesce(ld.submission_status, '') <> 'draft'
       AND (
         coalesce(ld.leads_prev_day, 0) + coalesce(ld.agd_cart_prev_day, 0) + coalesce(ld.agd_net_prev_day, 0)
         + coalesce(ld.agd_cart_today, 0) + coalesce(ld.agd_net_today, 0) + coalesce(ld.vnd_porta_prev_day, 0)
         + coalesce(ld.vnd_cart_prev_day, 0) + coalesce(ld.vnd_net_prev_day, 0) + coalesce(ld.visit_prev_day, 0) > 0
         OR nullif(trim(coalesce(ld.zero_reason, '')), '') IS NOT NULL
       )
  ), closing_metrics AS (
    SELECT oc.seller_user_id, oc.store_id,
           coalesce(sum(oc.leads_prev_day), 0)::bigint AS leads,
           coalesce(sum(oc.visit_prev_day), 0)::bigint AS atendimentos,
           coalesce(sum(oc.agd_cart_today + oc.agd_net_today), 0)::bigint AS agendamentos,
           coalesce(avg(oc.pontuacao_disciplina_final), 0)::numeric AS disciplina
      FROM official_closings oc GROUP BY oc.seller_user_id, oc.store_id
  ), regularizations AS (
    SELECT scr.seller_id, scr.store_id,
           count(*) FILTER (WHERE scr.status = 'pending')::bigint AS pendentes,
           count(*) FILTER (WHERE scr.status = 'approved' AND scr.applied_at IS NOT NULL)::bigint AS aprovadas
      FROM public.solicitacoes_correcao_lancamento scr
      JOIN public.lancamentos_diarios ld ON ld.id = scr.checkin_id
     WHERE ld.reference_date BETWEEN p_start_date AND p_end_date
     GROUP BY scr.seller_id, scr.store_id
  ), store_rules AS (
    SELECT rm.store_id,
           coalesce(rm.monthly_goal, 0)::numeric AS monthly_goal,
           rm.individual_goal_mode,
           greatest(1, (SELECT count(*) FROM sellers sx WHERE sx.store_id = rm.store_id AND NOT coalesce(sx.is_venda_loja, false))) AS seller_count
      FROM public.regras_metas_loja rm
  ), commissions AS (
    SELECT rr.loja_id, coalesce(sum(rr.valor) FILTER (WHERE rr.tipo = 'comissao_por_venda' AND rr.ativo), 0)::numeric AS per_sale
      FROM public.remuneracao_regras rr GROUP BY rr.loja_id
  )
  SELECT s.seller_user_id, s.seller_name, s.store_id, s.store_name,
         coalesce(sa.vendas, 0), coalesce(sa.vendas_dia, 0),
         round(coalesce(sa.vendas, 0)::numeric / v_elapsed * v_total_days, 2),
         coalesce(sa.faturamento, 0),
         CASE
           WHEN coalesce(s.is_venda_loja, false) THEN 0
           WHEN sr.individual_goal_mode = 'custom' THEN
             coalesce((SELECT m.target FROM public.metas m
                       WHERE m.user_id = s.seller_user_id AND m.store_id = s.store_id
                         AND m.month = EXTRACT(MONTH FROM p_start_date)
                         AND m.year = EXTRACT(YEAR FROM p_start_date)), sr.monthly_goal / sr.seller_count, 0)
           ELSE sr.monthly_goal / sr.seller_count
         END,
         CASE
           WHEN coalesce(s.is_venda_loja, false) THEN 0
           WHEN sr.individual_goal_mode = 'custom' THEN
             CASE WHEN coalesce((SELECT m.target FROM public.metas m
                                 WHERE m.user_id = s.seller_user_id AND m.store_id = s.store_id
                                   AND m.month = EXTRACT(MONTH FROM p_start_date)
                                   AND m.year = EXTRACT(YEAR FROM p_start_date)), sr.monthly_goal / sr.seller_count, 0) > 0
                  THEN round(coalesce(sa.vendas, 0)::numeric / coalesce((SELECT m.target FROM public.metas m
                    WHERE m.user_id = s.seller_user_id AND m.store_id = s.store_id
                      AND m.month = EXTRACT(MONTH FROM p_start_date)
                      AND m.year = EXTRACT(YEAR FROM p_start_date)), sr.monthly_goal / sr.seller_count, 0) * 100, 2)
                  ELSE 0 END
           ELSE CASE WHEN sr.monthly_goal / sr.seller_count > 0
                     THEN round(coalesce(sa.vendas, 0)::numeric / (sr.monthly_goal / sr.seller_count) * 100, 2)
                     ELSE 0 END
         END,
         coalesce(sa.vendas, 0)::numeric * coalesce(co.per_sale, 0),
         round(coalesce(sa.vendas, 0)::numeric / v_elapsed * v_total_days, 2) * coalesce(co.per_sale, 0),
         coalesce(cm.disciplina, 0), coalesce(cm.leads, 0), coalesce(cm.atendimentos, 0), coalesce(cm.agendamentos, 0),
         coalesce(rg.pendentes, 0), coalesce(rg.aprovadas, 0)
    FROM sellers s
    LEFT JOIN sales sa ON sa.seller_user_id = s.seller_user_id AND sa.store_id = s.store_id
    LEFT JOIN closing_metrics cm ON cm.seller_user_id = s.seller_user_id AND cm.store_id = s.store_id
    LEFT JOIN regularizations rg ON rg.seller_id = s.seller_user_id AND rg.store_id = s.store_id
    LEFT JOIN store_rules sr ON sr.store_id = s.store_id
    LEFT JOIN commissions co ON co.loja_id = s.store_id
   ORDER BY coalesce(sa.vendas, 0) DESC, s.seller_name;
END;
$function$;

REVOKE ALL ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) TO authenticated;

-- Overview diário: usa o mesmo helper e não replica oportunidades.
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

-- Meta da loja: realizado e histórico de vendas vêm do helper oficial.
CREATE OR REPLACE FUNCTION public.consolidate_store_target_plan(p_store_id uuid, p_reference_date date DEFAULT NULL::date)
 RETURNS SETOF store_target_plans
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  caller_id uuid := auth.uid();
  target_reference_date date := COALESCE(p_reference_date, timezone('America/Sao_Paulo',now())::date);
  month_start date := date_trunc('month',target_reference_date)::date;
  month_end date := (date_trunc('month',target_reference_date) + interval '1 month - 1 day')::date;
  monthly_goal_value numeric(12,4);
  configured_ratio numeric(12,4) := 3;
  projection_mode_value text := 'calendar';
  realized_value numeric(12,4) := 0;
  month_gap_value numeric(12,4);
  projected_sales_value numeric(12,4);
  proportional_goal_value numeric(12,4);
  business_days_total_value integer := 0;
  business_days_elapsed_value integer := 0;
  business_days_remaining_value integer := 0;
  history_start_value date;
  history_sales_value numeric(12,4) := 0;
  history_appointments_value numeric(12,4) := 0;
  history_visits_value numeric(12,4) := 0;
  appointments_per_sale_value numeric(12,4);
  operational_basis_value text;
  horizon_key text;
  horizon_start_value date;
  horizon_end_value date;
  horizon_days_value integer;
  required_sales_value numeric(12,4);
  required_pace_value numeric(12,4);
  operational_need_value numeric(12,4);
  pace_label_value text;
  focus_message_value text;
  calculated_source_hash text;
  latest_source_hash text;
  next_version integer;
  existing_row public.store_target_plans;
  inserted_row public.store_target_plans;
BEGIN
  IF caller_id IS NOT NULL
     AND NOT public.eh_administrador_mx(caller_id)
     AND NOT public.is_manager_of(p_store_id)
     AND NOT public.is_owner_of(p_store_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.vendedores_loja vl
       WHERE vl.store_id = p_store_id
         AND vl.seller_user_id = caller_id
         AND (
           coalesce(vl.is_active, true) = true
           OR (vl.started_at <= target_reference_date AND (vl.ended_at IS NULL OR vl.ended_at >= target_reference_date))
         )
     ) THEN
    RAISE EXCEPTION 'Usuário sem escopo nesta loja.' USING ERRCODE='42501';
  END IF;

  SELECT rml.monthly_goal, rml.appointments_per_sale, COALESCE(rml.projection_mode,'calendar')
  INTO monthly_goal_value, configured_ratio, projection_mode_value
  FROM public.regras_metas_loja rml
  WHERE rml.store_id = p_store_id;

  IF NOT FOUND THEN
    monthly_goal_value := NULL;
    configured_ratio := 3;
    projection_mode_value := 'calendar';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE public.is_store_operational_date(p_store_id,d::date))::integer,
    COUNT(*) FILTER (
      WHERE d::date <= target_reference_date
        AND public.is_store_operational_date(p_store_id,d::date)
    )::integer,
    COUNT(*) FILTER (
      WHERE d::date >= target_reference_date
        AND public.is_store_operational_date(p_store_id,d::date)
    )::integer
  INTO business_days_total_value,business_days_elapsed_value,business_days_remaining_value
  FROM generate_series(month_start,month_end,interval '1 day') d;

  SELECT count(*)::numeric
    INTO realized_value
    FROM public.vendas_oficiais_deduplicadas_periodo(
      month_start, target_reference_date, p_store_id, NULL
    );

  proportional_goal_value := CASE
    WHEN monthly_goal_value IS NOT NULL AND business_days_total_value > 0
      THEN monthly_goal_value * business_days_elapsed_value / business_days_total_value
    ELSE NULL
  END;
  month_gap_value := CASE
    WHEN monthly_goal_value IS NULL THEN NULL
    ELSE GREATEST(monthly_goal_value-realized_value,0)
  END;
  projected_sales_value := CASE
    WHEN business_days_elapsed_value > 0
      THEN realized_value / business_days_elapsed_value * business_days_total_value
    ELSE 0
  END;

  history_start_value := target_reference_date - 29;
  SELECT count(*)::numeric
    INTO history_sales_value
    FROM public.vendas_oficiais_deduplicadas_periodo(
      history_start_value, target_reference_date, p_store_id, NULL
    );
  SELECT
    COALESCE(SUM(ld.agd_cart_today+ld.agd_net_today),0)::numeric,
    COALESCE(SUM(ld.visit_prev_day),0)::numeric
  INTO history_appointments_value,history_visits_value
  FROM public.lancamentos_diarios ld
  WHERE ld.store_id=p_store_id
    AND ld.metric_scope='daily'
    AND ld.reference_date BETWEEN history_start_value AND target_reference_date
    AND (
      ld.submission_status='on_time'
      OR EXISTS (
        SELECT 1 FROM public.solicitacoes_correcao_lancamento scr
        WHERE scr.checkin_id=ld.id AND scr.status='approved'
      )
    );

  IF history_sales_value > 0 AND history_appointments_value > 0 THEN
    appointments_per_sale_value := history_appointments_value/history_sales_value;
    operational_basis_value := 'historico_30_dias_agendamentos';
  ELSE
    history_start_value := target_reference_date - 89;
    SELECT count(*)::numeric
      INTO history_sales_value
      FROM public.vendas_oficiais_deduplicadas_periodo(
        history_start_value, target_reference_date, p_store_id, NULL
      );
    SELECT
      COALESCE(SUM(ld.agd_cart_today+ld.agd_net_today),0)::numeric,
      COALESCE(SUM(ld.visit_prev_day),0)::numeric
    INTO history_appointments_value,history_visits_value
    FROM public.lancamentos_diarios ld
    WHERE ld.store_id=p_store_id
      AND ld.metric_scope='daily'
      AND ld.reference_date BETWEEN history_start_value AND target_reference_date
      AND (
        ld.submission_status='on_time'
        OR EXISTS (
          SELECT 1 FROM public.solicitacoes_correcao_lancamento scr
          WHERE scr.checkin_id=ld.id AND scr.status='approved'
        )
      );

    IF history_sales_value > 0 AND history_appointments_value > 0 THEN
      appointments_per_sale_value := history_appointments_value/history_sales_value;
      operational_basis_value := 'historico_90_dias_agendamentos';
    ELSIF history_sales_value > 0 AND history_visits_value > 0 THEN
      appointments_per_sale_value := history_visits_value/history_sales_value;
      operational_basis_value := 'historico_90_dias_atendimentos';
    ELSE
      appointments_per_sale_value := configured_ratio;
      operational_basis_value := 'fallback_configurado';
    END IF;
  END IF;

  FOR horizon_key IN
    SELECT unnest(ARRAY['hoje','esta_semana','esta_dezena','este_mes']::text[])
  LOOP
    horizon_start_value := target_reference_date;
    horizon_end_value := CASE horizon_key
      WHEN 'hoje' THEN target_reference_date
      WHEN 'esta_semana' THEN target_reference_date + ((6-EXTRACT(DOW FROM target_reference_date)::integer+7)%7)
      WHEN 'esta_dezena' THEN CASE
        WHEN EXTRACT(DAY FROM target_reference_date)::integer <= 10
          THEN make_date(EXTRACT(YEAR FROM target_reference_date)::integer,EXTRACT(MONTH FROM target_reference_date)::integer,10)
        WHEN EXTRACT(DAY FROM target_reference_date)::integer <= 20
          THEN make_date(EXTRACT(YEAR FROM target_reference_date)::integer,EXTRACT(MONTH FROM target_reference_date)::integer,20)
        ELSE month_end
      END
      ELSE month_end
    END;

    SELECT COUNT(*) FILTER (
      WHERE public.is_store_operational_date(p_store_id,d::date)
    )::integer
    INTO horizon_days_value
    FROM generate_series(horizon_start_value,horizon_end_value,interval '1 day') d;

    IF monthly_goal_value IS NULL OR monthly_goal_value <= 0 THEN
      required_sales_value := NULL;
      required_pace_value := NULL;
      operational_need_value := NULL;
      pace_label_value := NULL;
      focus_message_value := 'Meta ainda não cadastrada.';
    ELSE
      required_sales_value := CASE
        WHEN horizon_key='este_mes' THEN month_gap_value
        WHEN business_days_remaining_value > 0
          THEN LEAST(
            month_gap_value,
            CEIL(month_gap_value*horizon_days_value/business_days_remaining_value)
          )
        ELSE month_gap_value
      END;
      required_pace_value := CASE
        WHEN horizon_days_value > 0 THEN required_sales_value/horizon_days_value
        ELSE 0
      END;
      operational_need_value := CEIL(required_sales_value*appointments_per_sale_value);
      pace_label_value := CASE
        WHEN required_sales_value <= 0 THEN 'Objetivo atingido'
        WHEN required_pace_value > 0 AND required_pace_value < 1 THEN
          '1 venda a cada ' || trim(to_char(ROUND(1/required_pace_value,1),'FM999990D0')) || ' dias úteis'
        ELSE trim(to_char(ROUND(required_pace_value,1),'FM999990D0')) ||
          CASE WHEN ROUND(required_pace_value,1)=1
            THEN ' venda por dia útil'
            ELSE ' vendas por dia útil'
          END
      END;
      focus_message_value := CASE
        WHEN required_sales_value <= 0 THEN CASE horizon_key
          WHEN 'hoje' THEN 'Objetivo de hoje atingido. Proteja a agenda e antecipe o próximo objetivo.'
          WHEN 'esta_semana' THEN 'Objetivo da semana atingido. Mantenha o ritmo para garantir a meta mensal.'
          WHEN 'esta_dezena' THEN 'Objetivo da dezena atingido. Mantenha consistência até o fechamento.'
          ELSE 'Meta do mês atingida. Sustente o resultado e antecipe oportunidades.'
        END
        WHEN horizon_key='hoje' THEN 'Foco de hoje: elevar a agenda e proteger as negociações prioritárias.'
        WHEN horizon_key='esta_semana' THEN 'Foco da semana: distribuir a necessidade pelos dias úteis restantes.'
        WHEN horizon_key='esta_dezena' THEN 'Foco da dezena: recuperar o ritmo sem transferir todo o déficit para o fim do mês.'
        ELSE 'Foco do mês: manter o ritmo necessário até o fechamento da meta mensal.'
      END;
    END IF;

    calculated_source_hash := md5(concat_ws('|',
      p_store_id::text,target_reference_date::text,horizon_key,
      horizon_start_value::text,horizon_end_value::text,
      COALESCE(monthly_goal_value::text,'null'),realized_value::text,
      COALESCE(required_sales_value::text,'null'),
      COALESCE(required_pace_value::text,'null'),
      COALESCE(appointments_per_sale_value::text,'null'),
      business_days_total_value::text,business_days_elapsed_value::text,
      business_days_remaining_value::text,operational_basis_value,projection_mode_value
    ));

    SELECT stp.source_hash
    INTO latest_source_hash
    FROM public.store_target_plans stp
    WHERE stp.store_id=p_store_id
      AND stp.reference_date=target_reference_date
      AND stp.horizon=horizon_key
    ORDER BY stp.version DESC
    LIMIT 1;

    IF latest_source_hash = calculated_source_hash THEN
      SELECT * INTO existing_row
      FROM public.store_target_plans stp
      WHERE stp.store_id=p_store_id
        AND stp.reference_date=target_reference_date
        AND stp.horizon=horizon_key
      ORDER BY stp.version DESC
      LIMIT 1;
      RETURN NEXT existing_row;
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX(stp.version),0)+1
    INTO next_version
    FROM public.store_target_plans stp
    WHERE stp.store_id=p_store_id
      AND stp.reference_date=target_reference_date
      AND stp.horizon=horizon_key;

    INSERT INTO public.store_target_plans (
      store_id,reference_date,horizon,period_start,period_end,version,
      monthly_goal,realized,required_sales,required_pace,appointments_per_sale,
      operational_need,focus_message,business_days_elapsed,business_days_remaining,
      business_days_total,proportional_goal,monthly_gap,projected_sales,pace_label,
      operational_basis,source_hash,source_payload
    ) VALUES (
      p_store_id,target_reference_date,horizon_key,horizon_start_value,horizon_end_value,next_version,
      monthly_goal_value,realized_value,required_sales_value,required_pace_value,
      appointments_per_sale_value,operational_need_value,focus_message_value,
      business_days_elapsed_value,business_days_remaining_value,business_days_total_value,
      proportional_goal_value,month_gap_value,projected_sales_value,pace_label_value,
      operational_basis_value,calculated_source_hash,
      jsonb_build_object(
        'projection_mode',projection_mode_value,
        'historical_window_start',history_start_value,
        'historical_sales',history_sales_value,
        'historical_appointments',history_appointments_value,
        'historical_visits',history_visits_value,
        'sales_source','vendas_oficiais_deduplicadas_periodo'
      )
    ) RETURNING * INTO inserted_row;

    RETURN NEXT inserted_row;
  END LOOP;

  RETURN;
EXCEPTION WHEN others THEN
  PERFORM public.log_rpc_error(
    'consolidate_store_target_plan',SQLSTATE,SQLERRM,caller_id,
    jsonb_build_object('store_id',p_store_id,'reference_date',target_reference_date)
  );
  RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.consolidate_store_target_plan(uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consolidate_store_target_plan(uuid,date) TO authenticated, service_role;

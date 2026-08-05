-- Cockpit de rede do dono: mesma estrutura do cockpit interno, porém restrito
-- às lojas onde o próprio chamador tem vínculo ativo de dono.
--
-- Motivação: o dono precisa de visão consolidada de matriz e filiais, mas
-- get_internal_mx_network_cockpit devolve TODAS as lojas ativas e é guardada por
-- eh_area_interna_mx — expô-la ao dono vazaria a rede inteira.
--
-- Como não existe hierarquia matriz/filial em `lojas` (sem parent_id nem
-- empresa_id), a rede do dono é definida pelos vínculos ativos dele.

CREATE OR REPLACE FUNCTION public.get_owner_network_cockpit(p_start_date date, p_end_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := timezone('America/Sao_Paulo', now())::date;
  v_total_days integer;
  v_elapsed_days integer;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.vinculos_loja v
    WHERE v.user_id = auth.uid() AND v.role = 'dono' AND v.is_active AND v.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Sem permissão para consultar o cockpit das suas lojas.' USING ERRCODE = '42501';
  END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Período inválido.' USING ERRCODE = '22007';
  END IF;
  IF (p_end_date - p_start_date) > 366 THEN
    RAISE EXCEPTION 'Período máximo de 366 dias.' USING ERRCODE = '22023';
  END IF;

  v_total_days := GREATEST(1, p_end_date - p_start_date + 1);
  v_elapsed_days := GREATEST(1, LEAST(p_end_date, GREATEST(p_start_date, v_today)) - p_start_date + 1);

  WITH
  active_stores AS (
    SELECT l.id, l.name
    FROM public.lojas l
    WHERE l.active = true
      AND EXISTS (
        SELECT 1 FROM public.vinculos_loja v
        WHERE v.store_id = l.id
          AND v.user_id = auth.uid()
          AND v.role = 'dono'
          AND v.is_active
          AND v.ended_at IS NULL
      )
  ),
  -- Mesma agregação de get_resumo_rede_periodo, porém restrita a active_stores.
  -- Aquela função é guardada por eh_area_interna_mx porque devolve a rede
  -- inteira; chamá-la aqui abortaria com forbidden_global_read. Afrouxar a
  -- guarda dela deixaria qualquer autenticado ler todas as lojas — por isso a
  -- consulta é replicada com escopo, e não a permissão relaxada.
  owner_sales AS (
    SELECT ec.loja_id AS store_id, count(*)::bigint AS sales
    FROM public.eventos_comerciais ec
    LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id
    WHERE ec.tipo_evento = 'venda_realizada'
      AND o.etapa IS DISTINCT FROM 'cancelada'
      AND coalesce(ec.data_competencia, (ec.data_evento AT TIME ZONE 'America/Sao_Paulo')::date)
          BETWEEN p_start_date AND p_end_date
      AND ec.loja_id IN (SELECT id FROM active_stores)
    GROUP BY ec.loja_id
  ),
  owner_activity AS (
    SELECT l.store_id,
           coalesce(sum(coalesce(l.leads_prev_day, 0)), 0)::bigint AS leads,
           coalesce(sum(coalesce(l.agd_net_today, 0) + coalesce(l.agd_cart_today, 0)), 0)::bigint AS agd,
           coalesce(sum(coalesce(l.visit_prev_day, 0)), 0)::bigint AS vis
    FROM public.lancamentos_diarios l
    WHERE l.metric_scope = 'daily'::public.checkin_scope
      AND l.reference_date BETWEEN p_start_date AND p_end_date
      AND l.store_id IN (SELECT id FROM active_stores)
    GROUP BY l.store_id
  ),
  operational_summary AS (
    SELECT
      coalesce(s.store_id, a.store_id) AS store_id,
      coalesce(s.sales, 0) AS sales,
      coalesce(a.leads, 0) AS leads,
      coalesce(a.agd, 0) AS agd,
      coalesce(a.vis, 0) AS vis
    FROM owner_sales s
    FULL OUTER JOIN owner_activity a ON a.store_id = s.store_id
  ),
  seller_performance AS (
    SELECT *
    FROM public.vendedor_performance_oficial(p_start_date, p_end_date, NULL, NULL)
  ),
  latest_seller_snapshot AS (
    SELECT DISTINCT ON (srs.seller_user_id, srs.store_id)
      srs.seller_user_id, srs.store_id, srs.execution_score, srs.routine_status,
      srs.reference_date, srs.version
    FROM public.seller_routine_snapshots srs
    WHERE srs.reference_date BETWEEN p_start_date AND p_end_date
    ORDER BY srs.seller_user_id, srs.store_id, srs.reference_date DESC, srs.version DESC
  ),
  seller_group AS (
    SELECT
      sp.store_id,
      count(*)::integer AS seller_count,
      COALESCE(avg(sp.disciplina), 0)::numeric AS discipline_pct,
      COALESCE(sum(sp.vendas_projetadas), 0)::numeric AS projected_sales,
      jsonb_agg(jsonb_build_object(
        'userId', sp.seller_user_id,
        'name', sp.seller_name,
        'role', 'vendedor',
        'status', CASE
          WHEN COALESCE(lss.execution_score, sp.disciplina, 0) < 40 OR COALESCE(sp.atingimento, 0) < 40 THEN 'critical'
          WHEN COALESCE(lss.execution_score, sp.disciplina, 0) < 70 OR COALESCE(sp.atingimento, 0) < 80 THEN 'attention'
          ELSE 'healthy'
        END,
        'metrics', jsonb_build_object(
          'sales', jsonb_build_object('value', sp.vendas_realizadas, 'universe', sp.meta, 'percentage', sp.atingimento, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'vendedor_performance_oficial'),
          'projectedSales', jsonb_build_object('value', sp.vendas_projetadas, 'universe', sp.meta, 'percentage', CASE WHEN sp.meta > 0 THEN round(sp.vendas_projetadas / sp.meta * 100, 2) ELSE NULL END, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'vendedor_performance_oficial'),
          'discipline', jsonb_build_object('value', sp.disciplina, 'universe', 100, 'percentage', sp.disciplina, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'lancamentos_diarios'),
          'routineExecution', jsonb_build_object('value', lss.execution_score, 'universe', 100, 'percentage', lss.execution_score, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'seller_routine_snapshots'),
          'leads', jsonb_build_object('value', sp.leads, 'universe', NULL, 'percentage', NULL, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'lancamentos_diarios'),
          'appointments', jsonb_build_object('value', sp.agendamentos, 'universe', sp.leads, 'percentage', CASE WHEN sp.leads > 0 THEN round(sp.agendamentos::numeric / sp.leads * 100, 2) ELSE NULL END, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'lancamentos_diarios')
        ),
        'reasons', to_jsonb(array_remove(ARRAY[
          CASE WHEN COALESCE(lss.execution_score, sp.disciplina, 0) < 70 THEN 'Execução de rotina abaixo de 70%' END,
          CASE WHEN COALESCE(sp.atingimento, 0) < 80 THEN 'Atingimento abaixo de 80%' END,
          CASE WHEN COALESCE(sp.regularizacoes_pendentes, 0) > 0 THEN sp.regularizacoes_pendentes::text || ' regularização(ões) pendente(s)' END
        ]::text[], NULL))
      ) ORDER BY sp.vendas_realizadas DESC, sp.seller_name) AS sellers_evolution
    FROM seller_performance sp
    LEFT JOIN latest_seller_snapshot lss ON lss.seller_user_id = sp.seller_user_id AND lss.store_id = sp.store_id
    GROUP BY sp.store_id
  ),
  closure_summary AS (
    SELECT ld.store_id, count(DISTINCT ld.seller_user_id)::integer AS submitted_closures
    FROM public.lancamentos_diarios ld
    WHERE ld.metric_scope = 'daily'
      AND ld.reference_date = p_end_date
      AND ld.submitted_at IS NOT NULL
      AND COALESCE(ld.submission_status, '') <> 'draft'
    GROUP BY ld.store_id
  ),
  latest_manager_snapshot AS (
    SELECT DISTINCT ON (mrs.manager_user_id, mrs.store_id)
      mrs.manager_user_id, mrs.store_id, mrs.execution_score, mrs.final_status,
      mrs.eligible_tasks, mrs.completed_tasks, mrs.overdue_tasks, mrs.consolidated_at,
      u.name AS manager_name
    FROM public.manager_routine_snapshots mrs
    JOIN public.usuarios u ON u.id = mrs.manager_user_id
    WHERE mrs.reference_date BETWEEN p_start_date AND p_end_date
    ORDER BY mrs.manager_user_id, mrs.store_id, mrs.reference_date DESC, mrs.version DESC
  ),
  manager_group AS (
    SELECT
      lms.store_id,
      jsonb_agg(jsonb_build_object(
        'userId', lms.manager_user_id,
        'name', lms.manager_name,
        'role', 'gerente',
        'status', CASE
          WHEN lms.final_status = 'critico' THEN 'critical'
          WHEN lms.final_status IN ('atencao', 'nao_consolidado') THEN 'attention'
          WHEN lms.final_status = 'em_dia' THEN 'healthy'
          ELSE 'without_data'
        END,
        'metrics', jsonb_build_object(
          'execution', jsonb_build_object('value', lms.execution_score, 'universe', 100, 'percentage', lms.execution_score, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'manager_routine_snapshots'),
          'tasks', jsonb_build_object('value', lms.completed_tasks, 'universe', lms.eligible_tasks, 'percentage', CASE WHEN lms.eligible_tasks > 0 THEN round(lms.completed_tasks::numeric / lms.eligible_tasks * 100, 2) ELSE NULL END, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'manager_routine_snapshots'),
          'overdueTasks', jsonb_build_object('value', lms.overdue_tasks, 'universe', lms.eligible_tasks, 'percentage', NULL, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'manager_routine_snapshots')
        ),
        'reasons', CASE WHEN lms.overdue_tasks > 0 THEN jsonb_build_array(lms.overdue_tasks::text || ' tarefa(s) vencida(s)') ELSE '[]'::jsonb END
      ) ORDER BY lms.manager_name) AS managers_evolution
    FROM latest_manager_snapshot lms
    GROUP BY lms.store_id
  ),
  action_summary AS (
    SELECT
      pa.scope_id AS store_id,
      count(*) FILTER (WHERE pa.status <> 'cancelada')::integer AS total_actions,
      count(*) FILTER (WHERE pa.status = 'concluido')::integer AS completed_actions,
      count(*) FILTER (WHERE pa.status = 'bloqueada')::integer AS blocked_actions,
      count(*) FILTER (WHERE pa.status = 'validando_eficacia')::integer AS awaiting_validation_actions,
      count(*) FILTER (WHERE pa.prazo < v_today AND pa.status NOT IN ('concluido', 'cancelada'))::integer AS overdue_actions
    FROM public.planos_acao pa
    WHERE pa.scope_type = 'store'
    GROUP BY pa.scope_id
  ),
  strategic_summary AS (
    SELECT
      s.id AS store_id,
      (SELECT count(*) FROM public.catalogo_indicadores_planejamento c WHERE c.active)::integer AS total_indicators,
      count(DISTINCT vip.indicator_code) FILTER (WHERE vip.realizado IS NOT NULL)::integer AS completed_indicators
    FROM active_stores s
    LEFT JOIN public.valores_indicadores_planejamento vip
      ON vip.loja_id = s.id
     AND vip.year BETWEEN EXTRACT(YEAR FROM p_start_date)::integer AND EXTRACT(YEAR FROM p_end_date)::integer
    GROUP BY s.id
  ),
  consulting_clients AS (
    SELECT DISTINCT ON (c.primary_store_id)
      c.id AS client_id,
      c.primary_store_id AS store_id,
      c.program_template_key
    FROM public.clientes_consultoria c
    WHERE c.status = 'ativo'
      AND c.primary_store_id IS NOT NULL
    ORDER BY c.primary_store_id, c.updated_at DESC
  ),
  consulting_visit_summary AS (
    SELECT cc.store_id, COALESCE(p.total_visits, count(v.id))::integer AS total_visits,
      count(v.id) FILTER (WHERE v.status = 'concluida')::integer AS completed_visits
    FROM consulting_clients cc
    LEFT JOIN public.programas_visita_consultoria p ON p.program_key = cc.program_template_key
    LEFT JOIN public.visitas_consultoria v ON v.client_id = cc.client_id
    GROUP BY cc.store_id, p.total_visits
  ),
  consulting_delivery_summary AS (
    SELECT cc.store_id,
      count(ci.id) FILTER (WHERE ci.required)::integer AS required_delivery,
      count(ci.id) FILTER (WHERE ci.required AND ci.status = 'completed')::integer AS completed_delivery
    FROM consulting_clients cc
    LEFT JOIN public.visitas_consultoria v ON v.client_id = cc.client_id
    LEFT JOIN public.consultoria_itens_entrega ci ON ci.visit_id = v.id
    GROUP BY cc.store_id
  ),
  consulting_evidence_summary AS (
    SELECT cc.store_id,
      count(ev.id) FILTER (WHERE ev.status IN ('pendente','enviada','em_analise','devolvida'))::integer AS evidence_pending
    FROM consulting_clients cc
    LEFT JOIN public.visitas_consultoria v ON v.client_id = cc.client_id
    LEFT JOIN public.evidencias_visita ev ON ev.visita_id = v.id
    GROUP BY cc.store_id
  ),
  consulting_participant_summary AS (
    SELECT cc.store_id,
      count(cp.id) FILTER (WHERE cp.required AND NOT cp.confirmed)::integer AS participants_pending
    FROM consulting_clients cc
    LEFT JOIN public.visitas_consultoria v ON v.client_id = cc.client_id
    LEFT JOIN public.consultoria_participantes_encontro cp ON cp.visit_id = v.id
    GROUP BY cc.store_id
  ),
  consulting_summary AS (
    SELECT cc.store_id,
      COALESCE(cv.total_visits, 0)::integer AS total_visits,
      COALESCE(cv.completed_visits, 0)::integer AS completed_visits,
      COALESCE(cd.required_delivery, 0)::integer AS required_delivery,
      COALESCE(cd.completed_delivery, 0)::integer AS completed_delivery,
      COALESCE(ce.evidence_pending, 0)::integer AS evidence_pending,
      COALESCE(cp.participants_pending, 0)::integer AS participants_pending
    FROM consulting_clients cc
    LEFT JOIN consulting_visit_summary cv ON cv.store_id = cc.store_id
    LEFT JOIN consulting_delivery_summary cd ON cd.store_id = cc.store_id
    LEFT JOIN consulting_evidence_summary ce ON ce.store_id = cc.store_id
    LEFT JOIN consulting_participant_summary cp ON cp.store_id = cc.store_id
  ),
  owners AS (
    SELECT DISTINCT ON (vl.store_id)
      vl.store_id, vl.user_id, u.name
    FROM public.vinculos_loja vl
    JOIN public.usuarios u ON u.id = vl.user_id AND u.active
    WHERE vl.role = 'dono'
    ORDER BY vl.store_id, vl.user_id
  ),
  store_rows AS (
    SELECT
      s.id,
      s.name,
      COALESCE(o.sales, 0)::numeric AS sales,
      COALESCE(o.leads, 0)::numeric AS leads,
      COALESCE(o.agd, 0)::numeric AS agd,
      COALESCE(o.vis, 0)::numeric AS vis,
      COALESCE(rm.monthly_goal, 0)::numeric AS goal,
      COALESCE(sg.seller_count, 0)::integer AS sellers,
      COALESCE(cs.submitted_closures, 0)::integer AS checked_in,
      COALESCE(sg.discipline_pct, 0)::numeric AS discipline_pct,
      COALESCE(sg.projected_sales, 0)::numeric AS projected_sales,
      COALESCE(a.total_actions, 0)::integer AS total_actions,
      COALESCE(a.completed_actions, 0)::integer AS completed_actions,
      COALESCE(a.blocked_actions, 0)::integer AS blocked_actions,
      COALESCE(a.awaiting_validation_actions, 0)::integer AS awaiting_validation_actions,
      COALESCE(a.overdue_actions, 0)::integer AS overdue_actions,
      COALESCE(ss.total_indicators, 0)::integer AS total_indicators,
      COALESCE(ss.completed_indicators, 0)::integer AS completed_indicators,
      COALESCE(con.total_visits, 0)::integer AS total_visits,
      COALESCE(con.completed_visits, 0)::integer AS completed_visits,
      COALESCE(con.required_delivery, 0)::integer AS required_delivery,
      COALESCE(con.completed_delivery, 0)::integer AS completed_delivery,
      COALESCE(con.evidence_pending, 0)::integer AS evidence_pending,
      COALESCE(con.participants_pending, 0)::integer AS participants_pending,
      COALESCE(sg.sellers_evolution, '[]'::jsonb) AS sellers_evolution,
      COALESCE(mg.managers_evolution, '[]'::jsonb) AS managers_evolution,
      ow.user_id AS owner_id,
      ow.name AS owner_name
    FROM active_stores s
    LEFT JOIN operational_summary o ON o.store_id = s.id
    LEFT JOIN public.regras_metas_loja rm ON rm.store_id = s.id
    LEFT JOIN seller_group sg ON sg.store_id = s.id
    LEFT JOIN closure_summary cs ON cs.store_id = s.id
    LEFT JOIN manager_group mg ON mg.store_id = s.id
    LEFT JOIN action_summary a ON a.store_id = s.id
    LEFT JOIN strategic_summary ss ON ss.store_id = s.id
    LEFT JOIN consulting_summary con ON con.store_id = s.id
    LEFT JOIN owners ow ON ow.store_id = s.id
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('start', p_start_date, 'end', p_end_date),
    'stores', COALESCE(jsonb_agg(jsonb_build_object(
      'id', sr.id,
      'name', sr.name,
      'sales', sr.sales,
      'leads', sr.leads,
      'agd', sr.agd,
      'vis', sr.vis,
      'goal', sr.goal,
      'projectedSales', sr.projected_sales,
      'sellerCount', sr.sellers,
      'checkedInToday', sr.checked_in,
      'pendingClosures', GREATEST(0, sr.sellers - sr.checked_in),
      'disciplinePct', sr.discipline_pct,
      'actions', jsonb_build_object('total', sr.total_actions, 'completed', sr.completed_actions, 'overdue', sr.overdue_actions, 'blocked', sr.blocked_actions, 'awaitingValidation', sr.awaiting_validation_actions),
      'strategic', jsonb_build_object('completed', sr.completed_indicators, 'total', sr.total_indicators),
      'consulting', jsonb_build_object('completed', sr.completed_visits, 'total', sr.total_visits, 'deliveryCompleted', sr.completed_delivery, 'deliveryTotal', sr.required_delivery, 'evidencePending', sr.evidence_pending, 'participantsPending', sr.participants_pending),
      'sellersEvolution', sr.sellers_evolution,
      'managersEvolution', sr.managers_evolution,
      'ownerEvolution', CASE WHEN sr.owner_id IS NULL THEN NULL ELSE jsonb_build_object(
        'userId', sr.owner_id,
        'name', sr.owner_name,
        'role', 'dono',
        'status', CASE
          WHEN sr.goal > 0 AND sr.sales / sr.goal * 100 < 50 THEN 'critical'
          WHEN sr.overdue_actions > 0 OR sr.participants_pending > 0 OR sr.evidence_pending > 0 THEN 'attention'
          ELSE 'healthy'
        END,
        'metrics', jsonb_build_object(
          'sales', jsonb_build_object('value', sr.sales, 'universe', sr.goal, 'percentage', CASE WHEN sr.goal > 0 THEN round(sr.sales / sr.goal * 100, 2) ELSE NULL END, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'get_resumo_rede_periodo'),
          'strategicProgress', jsonb_build_object('value', sr.completed_indicators, 'universe', sr.total_indicators, 'percentage', CASE WHEN sr.total_indicators > 0 THEN round(sr.completed_indicators::numeric / sr.total_indicators * 100, 2) ELSE NULL END, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'valores_indicadores_planejamento'),
          'consultingProgress', jsonb_build_object('value', sr.completed_visits, 'universe', sr.total_visits, 'percentage', CASE WHEN sr.total_visits > 0 THEN round(sr.completed_visits::numeric / sr.total_visits * 100, 2) ELSE NULL END, 'periodStart', p_start_date, 'periodEnd', p_end_date, 'source', 'visitas_consultoria')
        ),
        'reasons', to_jsonb(array_remove(ARRAY[
          CASE WHEN sr.overdue_actions > 0 THEN sr.overdue_actions::text || ' ação(ões) atrasada(s)' END,
          CASE WHEN sr.evidence_pending > 0 THEN sr.evidence_pending::text || ' evidência(s) pendente(s)' END,
          CASE WHEN sr.participants_pending > 0 THEN sr.participants_pending::text || ' participante(s) sem confirmação' END
        ]::text[], NULL))
      ) END,
      'sources', jsonb_build_object(
        'operational', 'get_resumo_rede_periodo',
        'seller', 'vendedor_performance_oficial',
        'manager', 'manager_routine_snapshots',
        'actions', 'planos_acao',
        'strategic', 'valores_indicadores_planejamento',
        'consulting', 'visitas_consultoria/consultoria_itens_entrega/evidencias_visita/consultoria_participantes_encontro'
      )
    ) ORDER BY sr.sales DESC, sr.name), '[]'::jsonb)
  ) INTO v_result
  FROM store_rows sr;

  RETURN v_result;
END;
$function$
;

REVOKE ALL ON FUNCTION public.get_owner_network_cockpit(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_network_cockpit(date, date) TO authenticated;

COMMENT ON FUNCTION public.get_owner_network_cockpit(date, date) IS
  'Cockpit consolidado das lojas do dono chamador (vinculos_loja role=dono ativo). Espelha get_internal_mx_network_cockpit com escopo restrito.';

-- DOWN
-- drop function if exists public.get_owner_network_cockpit(date, date);

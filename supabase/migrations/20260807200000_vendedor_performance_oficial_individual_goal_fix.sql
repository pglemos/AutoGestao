-- Migration: 20260807200000_vendedor_performance_oficial_individual_goal_fix.sql
-- Correção da meta individual do vendedor na RPC vendedor_performance_oficial.
-- 1. store_rules contava vendedores ativos a partir da CTE sellers (que quando chamada com p_seller_id possuía apenas 1 linha),
--    fazendo com que a meta individual do vendedor ficasse igual à meta total da loja (seller_count = 1).
-- 2. Adiciona suporte a regras_metas_loja.individual_goal_mode = 'custom' buscando da tabela public.metas quando existente.

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
SET search_path = public
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
  ), all_store_sellers AS (
    SELECT vl.seller_user_id, vl.store_id, u.is_venda_loja
      FROM public.vendedores_loja vl
      JOIN public.usuarios u ON u.id = vl.seller_user_id AND u.active
     WHERE coalesce(vl.is_active, true)
       AND (p_store_id IS NULL OR vl.store_id = p_store_id)
  ), sales AS (
    SELECT ec.seller_user_id, ec.loja_id,
           count(*)::bigint AS vendas,
           count(*) FILTER (WHERE coalesce(ec.data_competencia, timezone('America/Sao_Paulo', ec.data_evento)::date) = p_end_date)::bigint AS vendas_dia,
           coalesce(sum(o.valor_negociado), 0)::numeric AS faturamento
      FROM public.eventos_comerciais ec
      LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id
     WHERE ec.tipo_evento = 'venda_realizada'
       AND o.etapa IS DISTINCT FROM 'cancelada'
       AND coalesce(ec.data_competencia, timezone('America/Sao_Paulo', ec.data_evento)::date) BETWEEN p_start_date AND p_end_date
     GROUP BY ec.seller_user_id, ec.loja_id
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
    SELECT rm.store_id, coalesce(rm.monthly_goal, 0)::numeric AS monthly_goal,
           rm.individual_goal_mode,
           greatest(1, (SELECT count(*) FROM all_store_sellers ax WHERE ax.store_id = rm.store_id AND NOT coalesce(ax.is_venda_loja, false))) AS seller_count
      FROM public.regras_metas_loja rm
  ), custom_goals AS (
    SELECT m.store_id, m.user_id, m.target
      FROM public.metas m
     WHERE m.month = extract(month FROM p_start_date)::integer
       AND m.year = extract(year FROM p_start_date)::integer
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
           WHEN sr.individual_goal_mode = 'custom' AND cg.target IS NOT NULL AND cg.target > 0 THEN cg.target
           ELSE coalesce(sr.monthly_goal / sr.seller_count, 0)
         END AS meta,
         CASE
           WHEN (
             CASE
               WHEN coalesce(s.is_venda_loja, false) THEN 0
               WHEN sr.individual_goal_mode = 'custom' AND cg.target IS NOT NULL AND cg.target > 0 THEN cg.target
               ELSE coalesce(sr.monthly_goal / sr.seller_count, 0)
             END
           ) > 0
           THEN round(coalesce(sa.vendas, 0)::numeric / (
             CASE
               WHEN coalesce(s.is_venda_loja, false) THEN 0
               WHEN sr.individual_goal_mode = 'custom' AND cg.target IS NOT NULL AND cg.target > 0 THEN cg.target
               ELSE coalesce(sr.monthly_goal / sr.seller_count, 0)
             END
           ) * 100, 2)
           ELSE 0
         END AS atingimento,
         coalesce(sa.vendas, 0)::numeric * coalesce(co.per_sale, 0),
         round(coalesce(sa.vendas, 0)::numeric / v_elapsed * v_total_days, 2) * coalesce(co.per_sale, 0),
         coalesce(cm.disciplina, 0), coalesce(cm.leads, 0), coalesce(cm.atendimentos, 0), coalesce(cm.agendamentos, 0),
         coalesce(rg.pendentes, 0), coalesce(rg.aprovadas, 0)
    FROM sellers s
    LEFT JOIN sales sa ON sa.seller_user_id = s.seller_user_id AND sa.loja_id = s.store_id
    LEFT JOIN closing_metrics cm ON cm.seller_user_id = s.seller_user_id AND cm.store_id = s.store_id
    LEFT JOIN regularizations rg ON rg.seller_id = s.seller_user_id AND rg.store_id = s.store_id
    LEFT JOIN store_rules sr ON sr.store_id = s.store_id
    LEFT JOIN custom_goals cg ON cg.store_id = s.store_id AND cg.user_id = s.seller_user_id
    LEFT JOIN commissions co ON co.loja_id = s.store_id
   ORDER BY coalesce(sa.vendas, 0) DESC, s.seller_name;
END;
$function$;

REVOKE ALL ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

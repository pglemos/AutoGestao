-- Ranking oficial: competência comercial canônica.
--
-- Regra única para toda a rede:
--   eventos_comerciais.data_competencia
--   -> oportunidades.data_competencia
--   -> oportunidades.sale_date
--   -> sem competência: não contar.
--
-- created_at, updated_at, closed_at e data_evento são instantes de auditoria;
-- nenhum deles pode decidir em qual mês a venda entra.

CREATE OR REPLACE FUNCTION public.venda_competencia_canonica(
  p_evento_competencia date,
  p_oportunidade_competencia date,
  p_sale_date date
)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT coalesce(p_evento_competencia, p_oportunidade_competencia, p_sale_date);
$function$;

COMMENT ON FUNCTION public.venda_competencia_canonica(date, date, date) IS
  'Competência oficial de venda: evento -> oportunidade -> sale_date; sem fallback temporal.';

UPDATE public.eventos_comerciais ec
   SET data_competencia = public.venda_competencia_canonica(
     ec.data_competencia, o.data_competencia, o.sale_date
   )
  FROM public.oportunidades o
 WHERE ec.oportunidade_id = o.id
   AND ec.tipo_evento = 'venda_realizada'
   AND ec.data_competencia IS NULL
   AND public.venda_competencia_canonica(ec.data_competencia, o.data_competencia, o.sale_date) IS NOT NULL;

INSERT INTO public.eventos_comerciais (
  cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento, canal,
  data_evento, data_competencia, origem_modulo, observacao, created_by, idempotency_key
)
SELECT o.cliente_id, o.id, o.loja_id, o.seller_user_id, 'venda_realizada', o.canal,
       ((c.competencia::text || 'T12:00:00-03:00')::timestamptz), c.competencia,
       'backfill_venda_competencia',
       'Evento oficial recuperado a partir da oportunidade com competência explícita.',
       o.created_by, 'backfill:venda:competencia:' || o.id::text
  FROM public.oportunidades o
  CROSS JOIN LATERAL (
    SELECT public.venda_competencia_canonica(NULL, o.data_competencia, o.sale_date) AS competencia
  ) c
 WHERE o.etapa = 'ganho'
   AND c.competencia IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.eventos_comerciais ec
      WHERE ec.oportunidade_id = o.id AND ec.tipo_evento = 'venda_realizada'
   )
 ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_evento_competencia_canonica()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_competencia date;
BEGIN
  IF NEW.data_competencia IS NULL THEN
    NEW.data_competencia := NULLIF(NEW.metadata->>'data_competencia', '')::date;
  END IF;
  IF NEW.data_competencia IS NULL AND NEW.oportunidade_id IS NOT NULL THEN
    SELECT public.venda_competencia_canonica(NULL, o.data_competencia, o.sale_date)
      INTO v_competencia
      FROM public.oportunidades o
     WHERE o.id = NEW.oportunidade_id;
    NEW.data_competencia := v_competencia;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_eventos_comerciais_competencia_canonica ON public.eventos_comerciais;
CREATE TRIGGER trg_eventos_comerciais_competencia_canonica
BEFORE INSERT OR UPDATE OF oportunidade_id, data_competencia, metadata
ON public.eventos_comerciais
FOR EACH ROW EXECUTE FUNCTION public.sync_evento_competencia_canonica();

CREATE OR REPLACE FUNCTION public.sync_oportunidade_competencia_canonica()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.data_competencia IS NULL THEN NEW.data_competencia := NEW.sale_date; END IF;
  IF NEW.sale_date IS NULL AND NEW.etapa = 'ganho' THEN NEW.sale_date := NEW.data_competencia; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_oportunidades_competencia_canonica ON public.oportunidades;
CREATE TRIGGER trg_oportunidades_competencia_canonica
BEFORE INSERT OR UPDATE OF etapa, data_competencia, sale_date
ON public.oportunidades
FOR EACH ROW EXECUTE FUNCTION public.sync_oportunidade_competencia_canonica();

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
SET search_path = public
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
  SELECT ec.seller_user_id,
         ec.loja_id,
         public.venda_competencia_canonica(ec.data_competencia, o.data_competencia, o.sale_date),
         count(*)::bigint,
         coalesce(sum(o.valor_negociado), 0)::numeric
    FROM public.eventos_comerciais ec
    LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id
   WHERE ec.tipo_evento = 'venda_realizada'
     AND o.etapa IS DISTINCT FROM 'cancelada'
     AND public.venda_competencia_canonica(ec.data_competencia, o.data_competencia, o.sale_date)
           BETWEEN p_start_date AND p_end_date
     AND (p_store_id IS NULL OR ec.loja_id = p_store_id)
     AND (p_seller_id IS NULL OR ec.seller_user_id = p_seller_id)
     AND (
       v_role IN ('administrador_geral', 'administrador_mx', 'consultor_mx')
       OR (v_role = 'vendedor' AND ec.seller_user_id = v_caller_id)
       OR (v_role <> 'vendedor' AND (public.is_manager_of(ec.loja_id) OR public.is_owner_of(ec.loja_id)))
     )
   GROUP BY ec.seller_user_id, ec.loja_id,
            public.venda_competencia_canonica(ec.data_competencia, o.data_competencia, o.sale_date);
END;
$function$;

REVOKE ALL ON FUNCTION public.venda_competencia_canonica(date, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_vendas_oficiais_periodo(date, date, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_vendas_oficiais_periodo(date, date, uuid, uuid) TO authenticated;

-- A implementação anterior da Carteira ignorava data_venda/data_competencia.
-- O wrapper mantém toda a lógica de segurança/idempotência existente e grava a
-- competência nas três entidades retornadas pela operação.
ALTER FUNCTION public.carteira_salvar_cliente(jsonb, text) RENAME TO carteira_salvar_cliente_legacy;

CREATE OR REPLACE FUNCTION public.carteira_salvar_cliente(
  p_payload jsonb,
  p_idempotency_key text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_result jsonb;
  v_competencia date := NULLIF(p_payload->>'data_competencia', '')::date;
  v_sale_date date := COALESCE(NULLIF(p_payload->>'sale_date', '')::date, v_competencia);
  v_cliente_id uuid;
  v_oportunidade_id uuid;
  v_evento_id uuid;
BEGIN
  v_result := public.carteira_salvar_cliente_legacy(p_payload, p_idempotency_key);
  IF COALESCE((v_result->>'ok')::boolean, false) AND v_competencia IS NOT NULL THEN
    v_cliente_id := NULLIF(v_result->>'cliente_id', '')::uuid;
    v_oportunidade_id := NULLIF(v_result->>'oportunidade_id', '')::uuid;
    v_evento_id := NULLIF(v_result->>'evento_id', '')::uuid;

    IF v_cliente_id IS NOT NULL THEN
      UPDATE public.clientes SET data_competencia = v_competencia WHERE id = v_cliente_id;
    END IF;
    IF v_oportunidade_id IS NOT NULL THEN
      UPDATE public.oportunidades
         SET data_competencia = v_competencia,
             sale_date = COALESCE(v_sale_date, sale_date)
       WHERE id = v_oportunidade_id;
    END IF;
    IF v_evento_id IS NOT NULL THEN
      UPDATE public.eventos_comerciais SET data_competencia = v_competencia WHERE id = v_evento_id;
    END IF;
  END IF;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.carteira_salvar_cliente(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.carteira_salvar_cliente(jsonb, text) TO authenticated;

-- Mudança de etapa para ganho recebe a competência sem usar closed_at.
ALTER FUNCTION public.atualizar_etapa_oportunidade_crm(uuid, jsonb) RENAME TO atualizar_etapa_oportunidade_crm_legacy;

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
  v_evento_id uuid;
BEGIN
  v_result := public.atualizar_etapa_oportunidade_crm_legacy(p_oportunidade_id, p_payload);
  IF COALESCE((v_result->>'ok')::boolean, false)
     AND COALESCE(p_payload->>'etapa', '') = 'ganho' THEN
    IF v_competencia IS NOT NULL OR v_sale_date IS NOT NULL THEN
      UPDATE public.oportunidades
         SET data_competencia = COALESCE(v_competencia, sale_date),
             sale_date = COALESCE(v_sale_date, data_competencia, sale_date)
       WHERE id = p_oportunidade_id;
    END IF;
    v_evento_id := NULLIF(v_result->'data'->>'evento_id', '')::uuid;
    IF v_evento_id IS NOT NULL AND v_competencia IS NOT NULL THEN
      UPDATE public.eventos_comerciais SET data_competencia = v_competencia WHERE id = v_evento_id;
    END IF;
  END IF;
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.atualizar_etapa_oportunidade_crm(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_etapa_oportunidade_crm(uuid, jsonb) TO authenticated;

-- Painel de rede usa exatamente o mesmo read model, sem vendas declaradas no
-- fechamento diário e sem fallback para data_evento.
CREATE OR REPLACE FUNCTION public.get_resumo_rede_periodo(
  p_start_date date,
  p_end_date date,
  p_scope text DEFAULT 'daily'
)
RETURNS TABLE (store_id uuid, sales bigint, leads bigint, agd bigint, vis bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_scope public.checkin_scope := coalesce(nullif(p_scope, ''), 'daily')::public.checkin_scope;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'unauthenticated' USING errcode = 'P0001'; END IF;
  IF NOT public.eh_area_interna_mx() THEN RAISE EXCEPTION 'forbidden_global_read' USING errcode = 'P0001'; END IF;
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'invalid_date_range' USING errcode = '22007';
  END IF;
  IF (p_end_date - p_start_date) > 366 THEN
    RAISE EXCEPTION 'date_range_too_large' USING errcode = '22023';
  END IF;

  RETURN QUERY
  WITH sales_by_store AS (
    SELECT v.store_id, sum(v.vendas)::bigint AS sales
      FROM public.get_vendas_oficiais_periodo(p_start_date, p_end_date, NULL, NULL) v
     GROUP BY v.store_id
  ), activity_by_store AS (
    SELECT l.store_id,
           coalesce(sum(coalesce(l.leads_prev_day, 0)), 0)::bigint AS leads,
           coalesce(sum(coalesce(l.agd_net_today, 0) + coalesce(l.agd_cart_today, 0)), 0)::bigint AS agd,
           coalesce(sum(coalesce(l.visit_prev_day, 0)), 0)::bigint AS vis
      FROM public.lancamentos_diarios l
     WHERE l.metric_scope = v_scope
       AND l.reference_date BETWEEN p_start_date AND p_end_date
     GROUP BY l.store_id
  )
  SELECT coalesce(s.store_id, a.store_id), coalesce(s.sales, 0), coalesce(a.leads, 0),
         coalesce(a.agd, 0), coalesce(a.vis, 0)
    FROM sales_by_store s
    FULL OUTER JOIN activity_by_store a ON a.store_id = s.store_id
   ORDER BY coalesce(s.store_id, a.store_id);
EXCEPTION WHEN others THEN
  PERFORM public.log_rpc_error('get_resumo_rede_periodo', SQLSTATE, SQLERRM, v_caller_id,
    jsonb_build_object('start', p_start_date, 'end', p_end_date, 'scope', p_scope));
  RAISE;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_resumo_rede_periodo(date, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resumo_rede_periodo(date, date, text) TO authenticated;

-- Última versão da RPC oficial, agora sem fallback para data_evento.
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
  ), sales AS (
    SELECT ec.seller_user_id, ec.loja_id,
           count(*)::bigint AS vendas,
           count(*) FILTER (WHERE public.venda_competencia_canonica(ec.data_competencia, o.data_competencia, o.sale_date) = p_end_date)::bigint AS vendas_dia,
           coalesce(sum(o.valor_negociado), 0)::numeric AS faturamento
      FROM public.eventos_comerciais ec
      LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id
     WHERE ec.tipo_evento = 'venda_realizada'
       AND o.etapa IS DISTINCT FROM 'cancelada'
       AND public.venda_competencia_canonica(ec.data_competencia, o.data_competencia, o.sale_date)
             BETWEEN p_start_date AND p_end_date
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
    LEFT JOIN sales sa ON sa.seller_user_id = s.seller_user_id AND sa.loja_id = s.store_id
    LEFT JOIN closing_metrics cm ON cm.seller_user_id = s.seller_user_id AND cm.store_id = s.store_id
    LEFT JOIN regularizations rg ON rg.seller_id = s.seller_user_id AND rg.store_id = s.store_id
    LEFT JOIN store_rules sr ON sr.store_id = s.store_id
    LEFT JOIN commissions co ON co.loja_id = s.store_id
   ORDER BY coalesce(sa.vendas, 0) DESC, s.seller_name;
END;
$function$;

REVOKE ALL ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) TO authenticated;

-- Live overview: corrige somente a métrica de vendas, preservando o restante
-- do contrato e da divergência com o fechamento diário.
ALTER FUNCTION public.admin_store_live_overview(uuid, date) RENAME TO admin_store_live_overview_legacy;

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
AS $function$
DECLARE
  v_reference_date date := coalesce(p_reference_date, timezone('America/Sao_Paulo', now())::date);
BEGIN
  RETURN QUERY
  WITH canonical_sales AS (
    SELECT ec.seller_user_id, count(*)::bigint AS live_sales
      FROM public.eventos_comerciais ec
      LEFT JOIN public.oportunidades o ON o.id = ec.oportunidade_id
     WHERE ec.loja_id = p_store_id
       AND ec.tipo_evento = 'venda_realizada'
       AND o.etapa IS DISTINCT FROM 'cancelada'
       AND public.venda_competencia_canonica(ec.data_competencia, o.data_competencia, o.sale_date) = v_reference_date
     GROUP BY ec.seller_user_id
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

-- Os cockpits antigos montavam a coluna operacional diretamente de
-- eventos_comerciais. Reaproveitamos todo o payload já estável e substituímos
-- a venda por loja pelo read model canônico.
CREATE OR REPLACE FUNCTION public.patch_network_cockpit_sales(
  p_payload jsonb,
  p_start_date date,
  p_end_date date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT jsonb_build_object(
    'period', coalesce(p_payload->'period', jsonb_build_object('start', p_start_date, 'end', p_end_date)),
    'stores', coalesce(jsonb_agg(
      CASE
        WHEN jsonb_typeof(item.store->'ownerEvolution') = 'object' THEN
          jsonb_set(
            jsonb_set(item.store, '{sales}', to_jsonb(item.sales), true),
            '{ownerEvolution,metrics,sales,value}', to_jsonb(item.sales), true
          )
        ELSE jsonb_set(item.store, '{sales}', to_jsonb(item.sales), true)
      END
      ORDER BY item.sales DESC, item.store->>'name'
    ), '[]'::jsonb)
  )
  FROM (
    SELECT stores.store,
           coalesce((SELECT sum(v.vendas)::numeric
                       FROM public.get_vendas_oficiais_periodo(
                         p_start_date, p_end_date, (stores.store->>'id')::uuid, NULL
                       ) v), 0)::numeric AS sales
      FROM jsonb_array_elements(coalesce(p_payload->'stores', '[]'::jsonb)) stores(store)
  ) item;
$function$;

REVOKE ALL ON FUNCTION public.patch_network_cockpit_sales(jsonb, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.patch_network_cockpit_sales(jsonb, date, date) TO authenticated;

ALTER FUNCTION public.get_internal_mx_network_cockpit(date, date) RENAME TO get_internal_mx_network_cockpit_legacy;
CREATE OR REPLACE FUNCTION public.get_internal_mx_network_cockpit(p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN public.patch_network_cockpit_sales(
    public.get_internal_mx_network_cockpit_legacy(p_start_date, p_end_date), p_start_date, p_end_date
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_internal_mx_network_cockpit(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_internal_mx_network_cockpit(date, date) TO authenticated;

ALTER FUNCTION public.get_owner_network_cockpit(date, date) RENAME TO get_owner_network_cockpit_legacy;
CREATE OR REPLACE FUNCTION public.get_owner_network_cockpit(p_start_date date, p_end_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN public.patch_network_cockpit_sales(
    public.get_owner_network_cockpit_legacy(p_start_date, p_end_date), p_start_date, p_end_date
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_owner_network_cockpit(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_owner_network_cockpit(date, date) TO authenticated;

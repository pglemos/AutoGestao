-- Revive os motores de alertas e de score.
--
-- `gerar_alertas_loja` e `mx_score_recalcular_loja` comparam e gravam
-- `scope_type = 'loja'`. A coluna é do enum `score_scope_type`, cujos rótulos são
-- ('store', 'department', 'individual', 'process'). 'loja' não existe nele.
--
-- Consequência: as duas funções levantam
--   invalid input value for enum score_scope_type: "loja"
-- em toda chamada, para qualquer loja. Confirmado em produção antes desta
-- migration. Nenhum alerta foi gerado e nenhum score foi recalculado por elas
-- desde que foram criadas, em 29/05/2026.
--
-- São 16 ocorrências entre comparações e inserções, todas do mesmo rótulo, todas
-- trocadas para 'store'. O corpo das funções é o original, com essa única
-- substituição — gerado por script a partir da migration de origem para não
-- introduzir diferença acidental.

BEGIN;

CREATE OR REPLACE FUNCTION public.gerar_alertas_loja(
  p_store_id uuid,
  p_period   date DEFAULT CURRENT_DATE
)
RETURNS TABLE (alert_id uuid, rule_code text, type public.alert_type)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version       text := 'central-mx-alerts-2026.05.29';
  v_score         numeric;
  v_dim_resultado numeric;
  v_overdue_count integer;
  v_no_checkin_count integer;
  v_new_id        uuid;
BEGIN
  -- Authorization (mesma escala dos RPCs de alerta existentes)
  IF NOT public.user_has_role(ARRAY['master','director','sales_manager','consultant','admin_mx']) THEN
    RAISE EXCEPTION 'insuficiente: requer role operacional'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  ------------------------------------------------------------------
  -- Captura insumos (mais recente <= período solicitado)
  ------------------------------------------------------------------
  SELECT sc.value, sc.dim_resultado
    INTO v_score, v_dim_resultado
  FROM public.score_calculations sc
  WHERE sc.scope_type = 'store'
    AND sc.scope_id   = p_store_id
    AND sc.period    <= p_period
  ORDER BY sc.period DESC, sc.computed_at DESC
  LIMIT 1;

  SELECT COUNT(*)
    INTO v_overdue_count
  FROM public.planos_acao
  WHERE scope_type = 'store'
    AND scope_id   = p_store_id
    AND status     = 'atrasado';

  -- Vendedores ativos da loja sem check-in nos últimos 3 dias
  SELECT COUNT(*)
    INTO v_no_checkin_count
  FROM public.vendedores_loja v
  WHERE v.store_id = p_store_id
    AND v.is_active = true
    AND NOT EXISTS (
      SELECT 1
      FROM public.lancamentos_diarios c
      WHERE c.seller_user_id = v.seller_user_id
        AND c.reference_date >= p_period - INTERVAL '3 days'
    );

  ------------------------------------------------------------------
  -- R1: Score crítico
  ------------------------------------------------------------------
  IF v_score IS NOT NULL AND v_score < 60 THEN
    INSERT INTO public.alerts (
      scope_type, scope_id, type,
      problem, impact, recommendation, quick_action_label,
      rule_version, metadata
    )
    SELECT 'store', p_store_id, 'critical',
           'MX Score da loja abaixo de 60.',
           'Performance crítica — risco direto de receita e de churn da loja.',
           'Abrir Plano de Ação imediato com foco em ritmo de vendas, disciplina e ' ||
             'qualidade do funil. Acionar consultoria designada.',
           'Abrir Plano de Ação',
           v_version,
           jsonb_build_object(
             'rule_code', 'R1_score_critico',
             'period',     p_period,
             'value',      v_score
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alerts a
      WHERE a.scope_type = 'store'
        AND a.scope_id   = p_store_id
        AND a.rule_version = v_version
        AND a.metadata ->> 'rule_code' = 'R1_score_critico'
        AND (a.metadata ->> 'period')::date = p_period
    )
    RETURNING id INTO v_new_id;
    IF v_new_id IS NOT NULL THEN
      alert_id := v_new_id; rule_code := 'R1_score_critico'; type := 'critical'; RETURN NEXT;
    END IF;
    v_new_id := NULL;
  END IF;

  ------------------------------------------------------------------
  -- R2: Dimensão Resultado abaixo
  ------------------------------------------------------------------
  IF v_dim_resultado IS NOT NULL AND v_dim_resultado < 60 THEN
    INSERT INTO public.alerts (
      scope_type, scope_id, type,
      problem, impact, recommendation, quick_action_label,
      rule_version, metadata
    )
    SELECT 'store', p_store_id, 'warning',
           'Dimensão Resultado do MX Score abaixo de 60.',
           'Vendas, margem ou volume estratégico não estão entregando — meta do mês em risco.',
           'Revisar funil comercial, ritmo de agendamentos e ações da semana com o gerente comercial.',
           'Ver Funil',
           v_version,
           jsonb_build_object(
             'rule_code', 'R2_dim_resultado',
             'period',     p_period,
             'value',      v_dim_resultado
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alerts a
      WHERE a.scope_type = 'store'
        AND a.scope_id   = p_store_id
        AND a.rule_version = v_version
        AND a.metadata ->> 'rule_code' = 'R2_dim_resultado'
        AND (a.metadata ->> 'period')::date = p_period
    )
    RETURNING id INTO v_new_id;
    IF v_new_id IS NOT NULL THEN
      alert_id := v_new_id; rule_code := 'R2_dim_resultado'; type := 'warning'; RETURN NEXT;
    END IF;
    v_new_id := NULL;
  END IF;

  ------------------------------------------------------------------
  -- R3: Planos de ação atrasados
  ------------------------------------------------------------------
  IF v_overdue_count > 0 THEN
    INSERT INTO public.alerts (
      scope_type, scope_id, type,
      problem, impact, recommendation, quick_action_label,
      rule_version, metadata
    )
    SELECT 'store', p_store_id, 'warning',
           v_overdue_count::text || ' plano(s) de ação atrasado(s) no escopo da loja.',
           'Cobranças pendentes acumulam dívida operacional e travam evolução do MX Score.',
           'Reabrir cada plano atrasado, ajustar prazo realista e marcar quem é o responsável atual.',
           'Ver Plano de Ação',
           v_version,
           jsonb_build_object(
             'rule_code', 'R3_planos_atrasados',
             'period',     p_period,
             'count',      v_overdue_count
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alerts a
      WHERE a.scope_type = 'store'
        AND a.scope_id   = p_store_id
        AND a.rule_version = v_version
        AND a.metadata ->> 'rule_code' = 'R3_planos_atrasados'
        AND (a.metadata ->> 'period')::date = p_period
    )
    RETURNING id INTO v_new_id;
    IF v_new_id IS NOT NULL THEN
      alert_id := v_new_id; rule_code := 'R3_planos_atrasados'; type := 'warning'; RETURN NEXT;
    END IF;
    v_new_id := NULL;
  END IF;

  ------------------------------------------------------------------
  -- R4: Vendedores sem check-in há 3+ dias
  ------------------------------------------------------------------
  IF v_no_checkin_count > 0 THEN
    INSERT INTO public.alerts (
      scope_type, scope_id, type,
      problem, impact, recommendation, quick_action_label,
      rule_version, metadata
    )
    SELECT 'store', p_store_id, 'warning',
           v_no_checkin_count::text || ' vendedor(es) sem lançamento diário há 3 dias ou mais.',
           'Sem disciplina de lançamento, perdemos visibilidade do funil e a trava operacional ' ||
             'do vendedor não é eficaz (regra N3 da ata 2026-05-22).',
           'Cobrar lançamento via gerente; reforçar regra "sem lançamento, sem leads" e abrir ' ||
             'feedback individual com quem ficou três dias sem registrar.',
           'Ver Equipe',
           v_version,
           jsonb_build_object(
             'rule_code', 'R4_vendedor_sem_checkin',
             'period',     p_period,
             'count',      v_no_checkin_count
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alerts a
      WHERE a.scope_type = 'store'
        AND a.scope_id   = p_store_id
        AND a.rule_version = v_version
        AND a.metadata ->> 'rule_code' = 'R4_vendedor_sem_checkin'
        AND (a.metadata ->> 'period')::date = p_period
    )
    RETURNING id INTO v_new_id;
    IF v_new_id IS NOT NULL THEN
      alert_id := v_new_id; rule_code := 'R4_vendedor_sem_checkin'; type := 'warning'; RETURN NEXT;
    END IF;
    v_new_id := NULL;
  END IF;

  ------------------------------------------------------------------
  -- R5: Reforço positivo
  ------------------------------------------------------------------
  IF v_score IS NOT NULL AND v_score >= 90 THEN
    INSERT INTO public.alerts (
      scope_type, scope_id, type,
      problem, impact, recommendation, quick_action_label,
      rule_version, metadata
    )
    SELECT 'store', p_store_id, 'positive',
           'MX Score da loja em zona Elite (>= 90).',
           'Performance consistente — referência para replicação na rede.',
           'Documentar boas práticas no banco de soluções e replicar para lojas com score abaixo.',
           'Ver Score',
           v_version,
           jsonb_build_object(
             'rule_code', 'R5_score_elite',
             'period',     p_period,
             'value',      v_score
           )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alerts a
      WHERE a.scope_type = 'store'
        AND a.scope_id   = p_store_id
        AND a.rule_version = v_version
        AND a.metadata ->> 'rule_code' = 'R5_score_elite'
        AND (a.metadata ->> 'period')::date = p_period
    )
    RETURNING id INTO v_new_id;
    IF v_new_id IS NOT NULL THEN
      alert_id := v_new_id; rule_code := 'R5_score_elite'; type := 'positive'; RETURN NEXT;
    END IF;
  END IF;

  RETURN;
END;
$$;

COMMENT ON FUNCTION public.gerar_alertas_loja(uuid, date) IS
  'Engine rules-based v1 da Central MX — gera alertas determinísticos a partir de score, '
  'planos atrasados e disciplina de check-in. Idempotente por (scope, rule_code, period).';

GRANT EXECUTE ON FUNCTION public.gerar_alertas_loja(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.mx_score_recalcular_loja(
  p_store_id uuid,
  p_period   date DEFAULT CURRENT_DATE
)
RETURNS public.score_calculations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version       text := 'central-mx-score-2026.05.29';
  v_dim_resultado numeric;
  v_dim_processo  numeric;
  v_dim_discipline numeric;
  v_score         numeric;
  v_band          public.score_band;
  v_row           public.score_calculations;
  v_total_planos  integer;
  v_concluidos    integer;
  v_total_vend    integer;
  v_checkin_7d    integer;
BEGIN
  IF NOT public.user_has_role(ARRAY['master','director','sales_manager','consultant','admin_mx']) THEN
    RAISE EXCEPTION 'insuficiente: requer role operacional'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Dim Resultado: preserva último valor conhecido (ou neutral 60)
  SELECT COALESCE(sc.dim_resultado, sc.value, 60)
    INTO v_dim_resultado
  FROM public.score_calculations sc
  WHERE sc.scope_type = 'store'
    AND sc.scope_id   = p_store_id
    AND sc.period    <= p_period
  ORDER BY sc.period DESC, sc.computed_at DESC
  LIMIT 1;
  v_dim_resultado := COALESCE(v_dim_resultado, 60);

  -- Dim Processo: % planos concluídos nos últimos 30 dias
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'concluido')
  INTO v_total_planos, v_concluidos
  FROM public.planos_acao
  WHERE scope_type = 'store'
    AND scope_id   = p_store_id
    AND created_at >= p_period - INTERVAL '30 days';

  v_dim_processo := CASE
    WHEN v_total_planos = 0 THEN 70  -- neutro positivo quando não há planos no período
    ELSE LEAST(100, ROUND((v_concluidos::numeric / v_total_planos) * 100, 2))
  END;

  -- Dim Disciplina: % vendedores com check-in nos últimos 7 dias
  SELECT
    COUNT(*),
    COUNT(*) FILTER (
      WHERE EXISTS (
        SELECT 1
        FROM public.lancamentos_diarios c
        WHERE c.seller_user_id = v.seller_user_id
          AND c.reference_date >= p_period - INTERVAL '7 days'
      )
    )
  INTO v_total_vend, v_checkin_7d
  FROM public.vendedores_loja v
  WHERE v.store_id = p_store_id
    AND v.is_active = true;

  v_dim_discipline := CASE
    WHEN v_total_vend = 0 THEN 60
    ELSE LEAST(100, ROUND((v_checkin_7d::numeric / v_total_vend) * 100, 2))
  END;

  -- Score final ponderado
  v_score := ROUND(
    (v_dim_resultado * 0.5)
    + (v_dim_processo  * 0.3)
    + (v_dim_discipline * 0.2),
    2
  );
  v_score := LEAST(100, GREATEST(0, v_score));
  v_band  := public.classify_score(v_score);

  INSERT INTO public.score_calculations (
    scope_type, scope_id, period,
    value, band,
    dim_resultado, dim_processo, dim_disciplina,
    calculation_version
  )
  VALUES (
    'store', p_store_id, p_period,
    v_score, v_band,
    v_dim_resultado, v_dim_processo, v_dim_discipline,
    v_version
  )
  ON CONFLICT (scope_type, scope_id, period, calculation_version) DO NOTHING
  RETURNING * INTO v_row;

  -- Se o INSERT foi ignorado (re-execução), retorna o registro existente
  IF v_row.id IS NULL THEN
    SELECT * INTO v_row
    FROM public.score_calculations
    WHERE scope_type = 'store'
      AND scope_id   = p_store_id
      AND period     = p_period
      AND calculation_version = v_version
    LIMIT 1;
  END IF;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.mx_score_recalcular_loja(uuid, date) IS
  'Recálculo automático do MX Score da loja (rules v1). Score = 0.5*resultado + 0.3*processo + 0.2*disciplina. '
  'Append-only via INSERT ON CONFLICT — preserva imutabilidade do score_calculations.';

GRANT EXECUTE ON FUNCTION public.mx_score_recalcular_loja(uuid, date) TO authenticated;

COMMIT;

-- DOWN
-- Reverter recria as funções com o rótulo 'loja', que não resolve para o enum.

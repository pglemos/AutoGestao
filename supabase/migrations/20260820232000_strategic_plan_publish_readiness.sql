-- Prontidão do plano estratégico calculada no banco a partir do snapshot do
-- pacote, das unidades ativas e dos valores da versão do ciclo.

BEGIN;

ALTER TABLE public.catalogo_metricas_consultoria
  ADD COLUMN IF NOT EXISTS unit_entry_mode text,
  ADD COLUMN IF NOT EXISTS unit_rollup_method text,
  ADD COLUMN IF NOT EXISTS weight_indicator_code text;

ALTER TABLE public.pacotes_indicadores_itens
  ADD COLUMN IF NOT EXISTS unit_entry_mode_snapshot text,
  ADD COLUMN IF NOT EXISTS unit_rollup_method_snapshot text,
  ADD COLUMN IF NOT EXISTS weight_indicator_code_snapshot text;

ALTER TABLE public.catalogo_metricas_consultoria
  DROP CONSTRAINT IF EXISTS catalogo_metricas_unit_entry_mode_check;
ALTER TABLE public.catalogo_metricas_consultoria
  ADD CONSTRAINT catalogo_metricas_unit_entry_mode_check CHECK (
    unit_entry_mode IS NULL OR unit_entry_mode IN (
      'PER_UNIT_REQUIRED', 'PER_UNIT_OPTIONAL', 'COMPANY_ONLY', 'SHARED_COMPANY_VALUE'
    )
  );
ALTER TABLE public.catalogo_metricas_consultoria
  DROP CONSTRAINT IF EXISTS catalogo_metricas_unit_rollup_method_check;
ALTER TABLE public.catalogo_metricas_consultoria
  ADD CONSTRAINT catalogo_metricas_unit_rollup_method_check CHECK (
    unit_rollup_method IS NULL OR unit_rollup_method IN (
      'SUM', 'RECALCULATE_FROM_BASES', 'WEIGHTED_AVERAGE',
      'AVERAGE_VALID_VALUES', 'LAST_VALID_VALUE', 'SHARED_NO_SUM',
      'COMPANY_VALUE', 'MANUAL_CONSOLIDATED'
    )
  );

-- Fonte canônica atual: UNIT_POLICY_DEFAULTS do módulo estratégico. Persistir a
-- política elimina a dependência de uma constante do navegador para publicar.
UPDATE public.catalogo_metricas_consultoria
SET unit_entry_mode = CASE
      WHEN metric_key IN ('instagram_followers', 'google_rating', 'content_quality')
        THEN 'COMPANY_ONLY'
      WHEN metric_key IN (
        'avg_stock_price', 'avg_stock_km', 'avg_fipe_delta',
        'avg_stock_age_days', 'trade_in_avg_margin', 'avg_margin'
      ) THEN 'PER_UNIT_OPTIONAL'
      ELSE 'PER_UNIT_REQUIRED'
    END,
    unit_rollup_method = CASE
      WHEN metric_key IN ('instagram_followers', 'google_rating', 'content_quality')
        THEN 'COMPANY_VALUE'
      WHEN metric_key IN (
        'avg_stock_price', 'avg_stock_km', 'avg_fipe_delta',
        'avg_stock_age_days', 'trade_in_avg_margin', 'avg_margin'
      ) THEN 'WEIGHTED_AVERAGE'
      WHEN metric_key IN (
        'goal_achievement_rate', 'active_sellers_rate', 'avg_sales_per_seller',
        'avg_leads_per_seller', 'appointments_per_sale',
        'lead_to_appointment_rate', 'internet_sales_share',
        'appointment_to_visit_rate', 'visit_to_sale_rate', 'no_show_rate',
        'crm_follow_up_rate', 'internet_cost_per_sale', 'cost_per_lead',
        'stock_turnover', 'stock_over_90_rate', 'trade_in_to_sales_rate',
        'gross_margin_rate', 'fixed_expense_rate', 'training_completion_rate'
      ) THEN 'RECALCULATE_FROM_BASES'
      ELSE 'SUM'
    END,
    weight_indicator_code = CASE metric_key
      WHEN 'avg_stock_price' THEN 'stock_total'
      WHEN 'avg_stock_km' THEN 'stock_total'
      WHEN 'avg_fipe_delta' THEN 'stock_total'
      WHEN 'avg_stock_age_days' THEN 'stock_total'
      WHEN 'trade_in_avg_margin' THEN 'trade_in_volume'
      WHEN 'avg_margin' THEN 'sales_total'
      ELSE NULL
    END
WHERE metric_key IN (
  'sales_goal', 'sales_total', 'sales_door_flow', 'sales_referral',
  'sales_company_wallet', 'sales_seller_wallet', 'sales_internet', 'sales_other',
  'seller_count', 'leads_received', 'appointments', 'visits',
  'internet_investment', 'inventory_investment', 'stock_total', 'active_stock',
  'trade_in_volume', 'gross_revenue', 'net_revenue', 'net_profit',
  'preparation_cost', 'post_sale_cost', 'goal_achievement_rate',
  'active_sellers_rate', 'avg_sales_per_seller', 'avg_leads_per_seller',
  'appointments_per_sale', 'lead_to_appointment_rate', 'internet_sales_share',
  'appointment_to_visit_rate', 'visit_to_sale_rate', 'no_show_rate',
  'crm_follow_up_rate', 'internet_cost_per_sale', 'cost_per_lead',
  'stock_turnover', 'stock_over_90_rate', 'trade_in_to_sales_rate',
  'gross_margin_rate', 'fixed_expense_rate', 'training_completion_rate',
  'avg_stock_price', 'avg_stock_km', 'avg_fipe_delta', 'avg_stock_age_days',
  'trade_in_avg_margin', 'avg_margin', 'instagram_followers', 'google_rating',
  'content_quality'
);

UPDATE public.pacotes_indicadores_itens pii
SET unit_entry_mode_snapshot = cm.unit_entry_mode,
    unit_rollup_method_snapshot = cm.unit_rollup_method,
    weight_indicator_code_snapshot = cm.weight_indicator_code,
    input_mode_snapshot = CASE
      WHEN coalesce(
        nullif(trim(cm.formula_key), ''),
        nullif(trim(cm.formula_expression), '')
      ) IS NULL
        THEN 'manual'
      ELSE 'calculado'
    END,
    updated_at = now()
FROM public.catalogo_metricas_consultoria cm
WHERE cm.metric_key = pii.metric_key
  AND (pii.unit_entry_mode_snapshot IS NULL OR pii.unit_rollup_method_snapshot IS NULL);

CREATE OR REPLACE FUNCTION public.validar_ciclo_plano_estrategico(p_cycle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle public.ciclos_plano_estrategico;
  v_primary_store_id uuid;
  v_roster_count integer := 0;
  v_unit_count integer := 0;
  v_ready integer := 0;
  v_issues jsonb := '[]'::jsonb;
  v_item record;
  v_unit record;
  v_month integer;
  v_missing boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT public.eh_area_interna_mx(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para validar o plano estratégico.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cycle FROM public.ciclos_plano_estrategico WHERE id = p_cycle_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo do plano estratégico não encontrado.'; END IF;

  SELECT primary_store_id INTO v_primary_store_id
  FROM public.clientes_consultoria WHERE id = v_cycle.client_id;
  IF v_primary_store_id IS NULL THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type', 'CLIENTE_SEM_MATRIZ', 'severity', 'critico',
      'message', 'Cliente sem loja matriz para resolver as unidades do plano.'
    ));
  END IF;

  SELECT count(*) INTO v_unit_count
  FROM public.lojas
  WHERE active = true
    AND (id = v_primary_store_id OR parent_loja_id = v_primary_store_id);
  IF v_unit_count = 0 THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type', 'UNIDADES_AUSENTES', 'severity', 'critico',
      'message', 'O cliente não possui unidades ativas no ciclo.'
    ));
  END IF;

  IF v_cycle.package_version_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.pacotes_indicadores_versoes
    WHERE id = v_cycle.package_version_id AND status = 'publicada'
  ) THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type', 'PACOTE_INVALIDO', 'severity', 'critico',
      'message', 'O ciclo não possui uma versão publicada de pacote congelada.'
    ));
  END IF;

  SELECT count(*) INTO v_roster_count
  FROM public.pacotes_indicadores_itens
  WHERE version_id = v_cycle.package_version_id;

  IF v_roster_count = 0 THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type', 'PLANO_VAZIO', 'severity', 'critico',
      'message', 'Plano sem indicadores no pacote contratado.'
    ));
  ELSIF v_roster_count < 3 THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object(
      'type', 'PLANO_INCOMPLETO', 'severity', 'critico',
      'message', format('Plano com apenas %s indicador(es).', v_roster_count)
    ));
  END IF;

  FOR v_item IN
    SELECT * FROM public.pacotes_indicadores_itens
    WHERE version_id = v_cycle.package_version_id
    ORDER BY ordem_snapshot NULLS LAST, metric_key
  LOOP
    v_missing := false;
    IF v_item.unit_entry_mode_snapshot IS NULL OR v_item.unit_rollup_method_snapshot IS NULL THEN
      v_issues := v_issues || jsonb_build_array(jsonb_build_object(
        'type', 'POLITICA_AUSENTE', 'severity', 'critico',
        'indicatorCode', v_item.metric_key,
        'message', format('%s: sem política de consolidação definida.', v_item.metric_key)
      ));
      CONTINUE;
    END IF;

    -- Indicador calculado depende das bases; ausência de meta digitada não é uma
    -- pendência própria. A política continua obrigatória para consolidá-lo.
    IF lower(coalesce(v_item.input_mode_snapshot, 'manual')) IN ('calculado', 'calculated') THEN
      v_ready := v_ready + 1;
      CONTINUE;
    END IF;

    FOR v_month IN 1..12 LOOP
      IF v_item.unit_entry_mode_snapshot IN ('COMPANY_ONLY', 'SHARED_COMPANY_VALUE') THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.valores_indicadores_planejamento vip
          WHERE vip.ciclo_id = v_cycle.id
            AND vip.loja_id = v_primary_store_id
            AND vip.indicator_code = v_item.metric_key
            AND vip.year = v_cycle.year AND vip.month = v_month
            AND vip.meta IS NOT NULL
        ) THEN
          v_missing := true;
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'type', 'MES_SEM_META', 'severity', 'pendencia',
            'indicatorCode', v_item.metric_key, 'unitId', v_primary_store_id,
            'month', v_month,
            'message', format('%s — mês %s: meta empresarial não preenchida.', v_item.metric_key, v_month)
          ));
        END IF;
      ELSIF v_item.unit_entry_mode_snapshot = 'PER_UNIT_OPTIONAL' THEN
        IF NOT EXISTS (
          SELECT 1
          FROM public.valores_indicadores_planejamento vip
          JOIN public.lojas l ON l.id = vip.loja_id
          WHERE vip.ciclo_id = v_cycle.id
            AND (l.id = v_primary_store_id OR l.parent_loja_id = v_primary_store_id)
            AND l.active = true
            AND vip.indicator_code = v_item.metric_key
            AND vip.year = v_cycle.year AND vip.month = v_month
            AND vip.meta IS NOT NULL
        ) THEN
          v_missing := true;
          v_issues := v_issues || jsonb_build_array(jsonb_build_object(
            'type', 'MES_SEM_META', 'severity', 'pendencia',
            'indicatorCode', v_item.metric_key, 'month', v_month,
            'message', format('%s — mês %s: nenhuma unidade possui meta.', v_item.metric_key, v_month)
          ));
        END IF;
      ELSE
        FOR v_unit IN
          SELECT id FROM public.lojas
          WHERE active = true
            AND (id = v_primary_store_id OR parent_loja_id = v_primary_store_id)
        LOOP
          IF NOT EXISTS (
            SELECT 1 FROM public.valores_indicadores_planejamento vip
            WHERE vip.ciclo_id = v_cycle.id
              AND vip.loja_id = v_unit.id
              AND vip.indicator_code = v_item.metric_key
              AND vip.year = v_cycle.year AND vip.month = v_month
              AND vip.meta IS NOT NULL
          ) THEN
            v_missing := true;
            v_issues := v_issues || jsonb_build_array(jsonb_build_object(
              'type', 'MES_SEM_META', 'severity', 'pendencia',
              'indicatorCode', v_item.metric_key, 'unitId', v_unit.id,
              'month', v_month,
              'message', format('%s — mês %s: meta da unidade não preenchida.', v_item.metric_key, v_month)
            ));
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    IF NOT v_missing THEN v_ready := v_ready + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'total', v_roster_count,
    'ready', v_ready,
    'pending', jsonb_array_length(v_issues),
    'issues', v_issues,
    'canPublish', jsonb_array_length(v_issues) = 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.bloquear_publicacao_plano_incompleto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_readiness jsonb;
BEGIN
  IF NEW.status = 'publicado' AND OLD.status <> 'publicado' THEN
    v_readiness := public.validar_ciclo_plano_estrategico(NEW.id);
    IF COALESCE((v_readiness ->> 'canPublish')::boolean, false) = false THEN
      RAISE EXCEPTION 'Plano estratégico incompleto: %', v_readiness::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bloquear_publicacao_plano_incompleto
  ON public.ciclos_plano_estrategico;
CREATE TRIGGER trg_bloquear_publicacao_plano_incompleto
  BEFORE UPDATE OF status ON public.ciclos_plano_estrategico
  FOR EACH ROW
  EXECUTE FUNCTION public.bloquear_publicacao_plano_incompleto();

REVOKE ALL ON FUNCTION public.validar_ciclo_plano_estrategico(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validar_ciclo_plano_estrategico(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.bloquear_publicacao_plano_incompleto() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.validar_ciclo_plano_estrategico(uuid) IS
  'Prontidão autoritativa do ciclo: pacote congelado, política e metas por escopo/unidade.';

COMMIT;

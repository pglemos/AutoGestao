-- Indicadores oficiais calculados não podem ser cobrados como manuais
-- só porque o snapshot do roster ficou "manual" na inclusão tardia.

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
  v_entry_mode text;
  v_rollup_method text;
  v_calculation_mode text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.eh_area_interna_mx(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para validar o plano estratégico.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_cycle FROM public.ciclos_plano_estrategico WHERE id = p_cycle_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo do plano estratégico não encontrado.'; END IF;
  SELECT primary_store_id INTO v_primary_store_id FROM public.clientes_consultoria WHERE id = v_cycle.client_id;
  IF v_primary_store_id IS NULL THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'CLIENTE_SEM_MATRIZ', 'severity', 'critico', 'message', 'Cliente sem loja matriz para resolver as unidades do plano.'));
  END IF;
  SELECT count(*) INTO v_unit_count FROM public.lojas WHERE active = true AND (id = v_primary_store_id OR parent_loja_id = v_primary_store_id);
  IF v_unit_count = 0 THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'UNIDADES_AUSENTES', 'severity', 'critico', 'message', 'O cliente não possui unidades ativas no ciclo.'));
  END IF;
  IF v_cycle.package_version_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.pacotes_indicadores_versoes WHERE id = v_cycle.package_version_id AND status = 'publicada') THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'PACOTE_INVALIDO', 'severity', 'critico', 'message', 'O ciclo não possui uma versão publicada de pacote congelada.'));
  END IF;

  SELECT count(*) INTO v_roster_count FROM public.ciclos_plano_estrategico_indicadores WHERE ciclo_id = p_cycle_id AND enabled = true;
  IF v_roster_count = 0 THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'PLANO_VAZIO', 'severity', 'critico', 'message', 'Plano sem indicadores no roster do ciclo.'));
  ELSIF v_roster_count < 3 THEN
    v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'PLANO_INCOMPLETO', 'severity', 'critico', 'message', format('Plano com apenas %s indicador(es).', v_roster_count)));
  END IF;

  FOR v_item IN
    SELECT roster.*, catalog.target_calculation_mode, catalog.formula_expression,
      catalog.unit_entry_mode AS catalog_entry_mode,
      catalog.unit_rollup_method AS catalog_rollup_method
    FROM public.ciclos_plano_estrategico_indicadores roster
    LEFT JOIN LATERAL (
      SELECT target_calculation_mode, formula_expression, unit_entry_mode, unit_rollup_method
      FROM public.catalogo_metricas_consultoria
      WHERE metric_key = roster.metric_key
         OR lower(metric_key) = lower(roster.metric_key)
      ORDER BY CASE WHEN metric_key = roster.metric_key THEN 0 ELSE 1 END
      LIMIT 1
    ) catalog ON true
    WHERE roster.ciclo_id = p_cycle_id AND roster.enabled = true
    ORDER BY roster.display_order NULLS LAST, roster.metric_key
  LOOP
    v_entry_mode := COALESCE(v_item.unit_entry_mode_snapshot, v_item.catalog_entry_mode);
    v_rollup_method := COALESCE(v_item.unit_rollup_method_snapshot, v_item.catalog_rollup_method);
    v_calculation_mode := lower(COALESCE(
      CASE
        WHEN v_item.target_calculation_mode ILIKE 'CALCULATED%' THEN v_item.target_calculation_mode
        WHEN v_item.formula_expression IS NOT NULL AND length(trim(v_item.formula_expression)) > 0 THEN 'calculated'
        ELSE NULL
      END,
      v_item.calculation_mode_snapshot,
      v_item.target_calculation_mode,
      'manual'
    ));
    IF v_calculation_mode IN ('calculado', 'calculated', 'calculated_locked', 'calculated_adjustable') THEN
      v_ready := v_ready + 1;
      CONTINUE;
    END IF;
    IF v_entry_mode IS NULL OR v_rollup_method IS NULL THEN
      v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'POLITICA_AUSENTE', 'severity', 'critico', 'indicatorCode', v_item.metric_key, 'message', format('%s: sem política de consolidação definida.', v_item.metric_key)));
      CONTINUE;
    END IF;

    v_missing := false;
    FOR v_month IN 1..12 LOOP
      IF v_entry_mode IN ('COMPANY_ONLY', 'SHARED_COMPANY_VALUE') THEN
        IF NOT EXISTS (SELECT 1 FROM public.valores_indicadores_planejamento vip WHERE vip.ciclo_id = v_cycle.id AND vip.loja_id = v_primary_store_id AND vip.indicator_code = v_item.metric_key AND vip.year = v_cycle.year AND vip.month = v_month AND vip.meta IS NOT NULL) THEN
          v_missing := true;
          v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'MES_SEM_META', 'severity', 'pendencia', 'indicatorCode', v_item.metric_key, 'unitId', v_primary_store_id, 'month', v_month, 'message', format('%s — mês %s: meta empresarial não preenchida.', v_item.metric_key, v_month)));
        END IF;
      ELSIF v_entry_mode = 'PER_UNIT_OPTIONAL' THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.valores_indicadores_planejamento vip JOIN public.lojas loja ON loja.id = vip.loja_id
          WHERE vip.ciclo_id = v_cycle.id AND (loja.id = v_primary_store_id OR loja.parent_loja_id = v_primary_store_id)
            AND loja.active = true AND vip.indicator_code = v_item.metric_key AND vip.year = v_cycle.year AND vip.month = v_month AND vip.meta IS NOT NULL
        ) THEN
          v_missing := true;
          v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'MES_SEM_META', 'severity', 'pendencia', 'indicatorCode', v_item.metric_key, 'month', v_month, 'message', format('%s — mês %s: nenhuma unidade possui meta.', v_item.metric_key, v_month)));
        END IF;
      ELSE
        FOR v_unit IN SELECT id FROM public.lojas WHERE active = true AND (id = v_primary_store_id OR parent_loja_id = v_primary_store_id) LOOP
          IF NOT EXISTS (SELECT 1 FROM public.valores_indicadores_planejamento vip WHERE vip.ciclo_id = v_cycle.id AND vip.loja_id = v_unit.id AND vip.indicator_code = v_item.metric_key AND vip.year = v_cycle.year AND vip.month = v_month AND vip.meta IS NOT NULL) THEN
            v_missing := true;
            v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'MES_SEM_META', 'severity', 'pendencia', 'indicatorCode', v_item.metric_key, 'unitId', v_unit.id, 'month', v_month, 'message', format('%s — mês %s: meta da unidade não preenchida.', v_item.metric_key, v_month)));
          END IF;
        END LOOP;
      END IF;
    END LOOP;
    IF NOT v_missing THEN v_ready := v_ready + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('total', v_roster_count, 'ready', v_ready, 'pending', jsonb_array_length(v_issues), 'issues', v_issues, 'canPublish', jsonb_array_length(v_issues) = 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.validar_ciclo_plano_estrategico(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.validar_ciclo_plano_estrategico(uuid) FROM PUBLIC, anon;

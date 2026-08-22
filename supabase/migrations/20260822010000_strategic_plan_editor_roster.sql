-- Paridade funcional do editor administrativo do Plano Estratégico.
--
-- O pacote do produto continua global e imutável. Este roster é o snapshot por
-- ciclo que permite adicionar um indicador e controlar sua visibilidade no Dono
-- sem alterar todos os clientes que usam o mesmo pacote.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ciclos_plano_estrategico_indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id uuid NOT NULL REFERENCES public.ciclos_plano_estrategico(id) ON DELETE CASCADE,
  metric_key text NOT NULL REFERENCES public.catalogo_metricas_consultoria(metric_key) ON DELETE RESTRICT,
  label_snapshot text,
  area_snapshot text,
  value_type_snapshot text,
  calculation_mode_snapshot text,
  unit_entry_mode_snapshot text,
  unit_rollup_method_snapshot text,
  weight_indicator_code_snapshot text,
  enabled boolean NOT NULL DEFAULT true,
  visible_to_owner boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 9999,
  origin text NOT NULL DEFAULT 'pacote' CHECK (origin IN ('pacote', 'adicionado_mx')),
  created_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ciclo_id, metric_key)
);

CREATE INDEX IF NOT EXISTS ciclos_plano_indicadores_cycle_order_idx
  ON public.ciclos_plano_estrategico_indicadores(ciclo_id, enabled, display_order);

DROP TRIGGER IF EXISTS trg_ciclos_plano_indicadores_touch
  ON public.ciclos_plano_estrategico_indicadores;
CREATE TRIGGER trg_ciclos_plano_indicadores_touch
  BEFORE UPDATE ON public.ciclos_plano_estrategico_indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_mx_executive_updated_at();

ALTER TABLE public.ciclos_plano_estrategico_indicadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ciclos_plano_indicadores_interna_all ON public.ciclos_plano_estrategico_indicadores;
CREATE POLICY ciclos_plano_indicadores_interna_all
  ON public.ciclos_plano_estrategico_indicadores
  FOR ALL TO authenticated
  USING (public.eh_area_interna_mx(auth.uid()))
  WITH CHECK (public.eh_area_interna_mx(auth.uid()));

DROP POLICY IF EXISTS ciclos_plano_indicadores_cliente_select ON public.ciclos_plano_estrategico_indicadores;
CREATE POLICY ciclos_plano_indicadores_cliente_select
  ON public.ciclos_plano_estrategico_indicadores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.ciclos_plano_estrategico ciclo
      WHERE ciclo.id = ciclos_plano_estrategico_indicadores.ciclo_id
        AND ciclo.status = 'publicado'
        AND public.pode_acessar_cliente_consultoria(ciclo.client_id)
    )
  );

REVOKE ALL ON public.ciclos_plano_estrategico_indicadores FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ciclos_plano_estrategico_indicadores TO authenticated;

-- Materializa o pacote no ciclo no momento em que o ciclo nasce. Revisões
-- copiam o roster anterior para conservar customizações e visibilidade.
CREATE OR REPLACE FUNCTION public.seed_ciclo_plano_estrategico_indicadores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.revised_from_id IS NOT NULL THEN
    INSERT INTO public.ciclos_plano_estrategico_indicadores(
      ciclo_id, metric_key, label_snapshot, area_snapshot, value_type_snapshot,
      calculation_mode_snapshot, unit_entry_mode_snapshot, unit_rollup_method_snapshot,
      weight_indicator_code_snapshot, enabled, visible_to_owner, display_order, origin, created_by
    )
    SELECT
      NEW.id, metric_key, label_snapshot, area_snapshot, value_type_snapshot,
      calculation_mode_snapshot, unit_entry_mode_snapshot, unit_rollup_method_snapshot,
      weight_indicator_code_snapshot, enabled, visible_to_owner, display_order, origin, auth.uid()
    FROM public.ciclos_plano_estrategico_indicadores
    WHERE ciclo_id = NEW.revised_from_id;
  ELSE
    INSERT INTO public.ciclos_plano_estrategico_indicadores(
      ciclo_id, metric_key, label_snapshot, area_snapshot, value_type_snapshot,
      calculation_mode_snapshot, unit_entry_mode_snapshot, unit_rollup_method_snapshot,
      weight_indicator_code_snapshot, enabled, visible_to_owner, display_order, origin, created_by
    )
    SELECT
      NEW.id, item.metric_key, COALESCE(item.label_snapshot, catalog.label),
      COALESCE(item.area_snapshot, catalog.area), catalog.value_type,
      COALESCE(item.input_mode_snapshot, catalog.target_calculation_mode),
      catalog.unit_entry_mode, catalog.unit_rollup_method, catalog.weight_indicator_code,
      true, COALESCE(catalog.visivel_dono, true), COALESCE(item.ordem_snapshot, catalog.sort_order, 9999),
      'pacote', auth.uid()
    FROM public.pacotes_indicadores_itens item
    JOIN public.catalogo_metricas_consultoria catalog ON catalog.metric_key = item.metric_key
    WHERE item.version_id = NEW.package_version_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_ciclo_plano_estrategico_indicadores() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seed_ciclo_plano_estrategico_indicadores
  ON public.ciclos_plano_estrategico;
CREATE TRIGGER trg_seed_ciclo_plano_estrategico_indicadores
  AFTER INSERT ON public.ciclos_plano_estrategico
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_ciclo_plano_estrategico_indicadores();

-- Backfill idempotente para ciclos criados antes desta migration.
INSERT INTO public.ciclos_plano_estrategico_indicadores(
  ciclo_id, metric_key, label_snapshot, area_snapshot, value_type_snapshot,
  calculation_mode_snapshot, unit_entry_mode_snapshot, unit_rollup_method_snapshot,
  weight_indicator_code_snapshot, enabled, visible_to_owner, display_order, origin
)
SELECT
  ciclo.id, item.metric_key, COALESCE(item.label_snapshot, catalog.label),
  COALESCE(item.area_snapshot, catalog.area), catalog.value_type,
  COALESCE(item.input_mode_snapshot, catalog.target_calculation_mode),
  catalog.unit_entry_mode, catalog.unit_rollup_method, catalog.weight_indicator_code,
  true, COALESCE(catalog.visivel_dono, true), COALESCE(item.ordem_snapshot, catalog.sort_order, 9999), 'pacote'
FROM public.ciclos_plano_estrategico ciclo
JOIN public.pacotes_indicadores_itens item ON item.version_id = ciclo.package_version_id
JOIN public.catalogo_metricas_consultoria catalog ON catalog.metric_key = item.metric_key
WHERE ciclo.status <> 'revisado'
ON CONFLICT (ciclo_id, metric_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.adicionar_indicador_ciclo_plano(
  p_cycle_id uuid,
  p_metric_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle public.ciclos_plano_estrategico;
  v_catalog public.catalogo_metricas_consultoria;
  v_row public.ciclos_plano_estrategico_indicadores;
  v_order integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.eh_area_interna_mx(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para adicionar indicador ao plano.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_cycle FROM public.ciclos_plano_estrategico WHERE id = p_cycle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo do plano estratégico não encontrado.'; END IF;
  IF v_cycle.status NOT IN ('rascunho', 'em_validacao') THEN
    RAISE EXCEPTION 'Indicadores só podem ser adicionados em ciclo aberto.';
  END IF;

  SELECT * INTO v_catalog
  FROM public.catalogo_metricas_consultoria
  WHERE metric_key = p_metric_key AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Indicador ativo não encontrado no catálogo.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.ciclos_plano_estrategico_indicadores
    WHERE ciclo_id = p_cycle_id AND metric_key = p_metric_key
  ) THEN
    RAISE EXCEPTION 'Este indicador já faz parte do Plano Estratégico.' USING ERRCODE = '23505';
  END IF;

  SELECT COALESCE(MAX(display_order), 0) + 10 INTO v_order
  FROM public.ciclos_plano_estrategico_indicadores WHERE ciclo_id = p_cycle_id;

  INSERT INTO public.ciclos_plano_estrategico_indicadores(
    ciclo_id, metric_key, label_snapshot, area_snapshot, value_type_snapshot,
    calculation_mode_snapshot, unit_entry_mode_snapshot, unit_rollup_method_snapshot,
    weight_indicator_code_snapshot, display_order, visible_to_owner, origin, created_by
  ) VALUES (
    p_cycle_id, v_catalog.metric_key, v_catalog.label, v_catalog.area, v_catalog.value_type,
    v_catalog.target_calculation_mode, v_catalog.unit_entry_mode, v_catalog.unit_rollup_method,
    v_catalog.weight_indicator_code, v_order, COALESCE(v_catalog.visivel_dono, true), 'adicionado_mx', auth.uid()
  ) RETURNING * INTO v_row;

  RETURN jsonb_build_object('id', v_row.id, 'cycleId', v_row.ciclo_id, 'metricKey', v_row.metric_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_visibilidade_indicador_ciclo(
  p_cycle_id uuid,
  p_metric_key text,
  p_visible boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle public.ciclos_plano_estrategico;
BEGIN
  IF auth.uid() IS NULL OR NOT public.eh_area_interna_mx(auth.uid()) THEN
    RAISE EXCEPTION 'Sem permissão para alterar a visibilidade do indicador.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_cycle FROM public.ciclos_plano_estrategico WHERE id = p_cycle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ciclo do plano estratégico não encontrado.'; END IF;
  IF v_cycle.status NOT IN ('rascunho', 'em_validacao') THEN
    RAISE EXCEPTION 'O roster de um ciclo publicado é imutável. Crie uma revisão para alterar a visibilidade.';
  END IF;
  UPDATE public.ciclos_plano_estrategico_indicadores
  SET visible_to_owner = p_visible, updated_at = now()
  WHERE ciclo_id = p_cycle_id AND metric_key = p_metric_key;
  IF NOT FOUND THEN RAISE EXCEPTION 'Indicador não pertence a este ciclo.'; END IF;
  RETURN jsonb_build_object('cycleId', p_cycle_id, 'metricKey', p_metric_key, 'visibleToOwner', p_visible);
END;
$$;

-- O ano anterior é um campo editável de referência, com histórico próprio.
ALTER TABLE public.historico_valores_indicadores_planejamento
  DROP CONSTRAINT IF EXISTS historico_valores_indicadores_planejamento_field_check;
ALTER TABLE public.historico_valores_indicadores_planejamento
  ADD CONSTRAINT historico_valores_indicadores_planejamento_field_check
  CHECK (field IN ('meta', 'realizado', 'ano_anterior'));

CREATE OR REPLACE FUNCTION public.salvar_ano_anterior_indicador_planejamento(
  p_store_id uuid,
  p_indicator_code text,
  p_year integer,
  p_values jsonb,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous jsonb;
  v_month integer;
  v_value numeric;
  v_matriz_id uuid;
  v_client_id uuid;
  v_cycle public.ciclos_plano_estrategico;
BEGIN
  IF NOT public.pode_gerir_metas_planejamento(p_store_id) THEN
    RAISE EXCEPTION 'Sem permissão para editar o ano anterior estratégico.' USING ERRCODE = '42501';
  END IF;
  IF p_year NOT BETWEEN 2020 AND 2100 THEN RAISE EXCEPTION 'Ano inválido.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.catalogo_indicadores_planejamento WHERE code = p_indicator_code AND active = true) THEN
    RAISE EXCEPTION 'Indicador estratégico inválido.';
  END IF;
  IF jsonb_typeof(p_values) <> 'array' OR jsonb_array_length(p_values) <> 12 THEN
    RAISE EXCEPTION 'Informe exatamente 12 valores mensais.';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_values) value WHERE jsonb_typeof(value) NOT IN ('number', 'null')) THEN
    RAISE EXCEPTION 'O ano anterior deve conter apenas números ou nulos.';
  END IF;

  SELECT COALESCE(parent_loja_id, id) INTO v_matriz_id FROM public.lojas WHERE id = p_store_id;
  IF v_matriz_id IS NULL THEN RAISE EXCEPTION 'Loja não encontrada.'; END IF;
  SELECT id INTO v_client_id FROM public.clientes_consultoria WHERE primary_store_id = v_matriz_id;
  IF v_client_id IS NULL THEN RAISE EXCEPTION 'A loja não está vinculada a um cliente da consultoria.'; END IF;
  SELECT * INTO v_cycle FROM public.ciclos_plano_estrategico
  WHERE client_id = v_client_id AND year = p_year AND status <> 'revisado' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inicie o ciclo do plano estratégico antes de registrar o ano anterior.'; END IF;
  IF v_cycle.status = 'publicado' THEN
    RAISE EXCEPTION 'Plano publicado é imutável. Crie uma revisão para alterar o ano anterior.';
  END IF;

  SELECT COALESCE(jsonb_agg(ano_anterior ORDER BY month), '[]'::jsonb) INTO v_previous
  FROM (
    SELECT months.month, vip.ano_anterior
    FROM generate_series(1, 12) AS months(month)
    LEFT JOIN public.valores_indicadores_planejamento vip
      ON vip.ciclo_id = v_cycle.id AND vip.loja_id = p_store_id
      AND vip.indicator_code = p_indicator_code AND vip.year = p_year AND vip.month = months.month
  ) current_values;

  INSERT INTO public.historico_valores_indicadores_planejamento(
    ciclo_id, loja_id, indicator_code, year, field, previous_values, new_values, note, changed_by
  ) VALUES (
    v_cycle.id, p_store_id, p_indicator_code, p_year, 'ano_anterior', v_previous, p_values,
    nullif(trim(p_note), ''), auth.uid()
  );

  FOR v_month IN 1..12 LOOP
    v_value := CASE WHEN jsonb_typeof(p_values -> (v_month - 1)) = 'null' THEN NULL ELSE (p_values ->> (v_month - 1))::numeric END;
    INSERT INTO public.valores_indicadores_planejamento(
      ciclo_id, loja_id, indicator_code, year, month, ano_anterior, source, source_ref, created_by
    ) VALUES (
      v_cycle.id, p_store_id, p_indicator_code, p_year, v_month, v_value, 'manual',
      jsonb_build_object('operation', 'strategic_previous_year_update', 'cycleId', v_cycle.id), auth.uid()
    )
    ON CONFLICT (ciclo_id, loja_id, indicator_code, year, (COALESCE(month, 0))) WHERE ciclo_id IS NOT NULL
    DO UPDATE SET ano_anterior = EXCLUDED.ano_anterior, source = EXCLUDED.source,
      source_ref = EXCLUDED.source_ref, created_by = COALESCE(public.valores_indicadores_planejamento.created_by, auth.uid()), updated_at = now();
  END LOOP;

  RETURN jsonb_build_object('cycleId', v_cycle.id, 'storeId', p_store_id, 'indicatorCode', p_indicator_code, 'year', p_year, 'values', p_values);
END;
$$;

-- Restauração respeita o campo original, inclusive Ano anterior.
CREATE OR REPLACE FUNCTION public.restaurar_metas_indicador_planejamento(
  p_history_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_history public.historico_valores_indicadores_planejamento;
BEGIN
  SELECT * INTO v_history FROM public.historico_valores_indicadores_planejamento WHERE id = p_history_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Versão não encontrada.'; END IF;
  IF NOT public.pode_gerir_metas_planejamento(v_history.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para restaurar valores estratégicos.' USING ERRCODE = '42501';
  END IF;
  IF v_history.field = 'realizado' THEN
    RETURN public.salvar_realizado_indicador_planejamento(v_history.loja_id, v_history.indicator_code, v_history.year, v_history.previous_values, 'manual', COALESCE(nullif(trim(p_note), ''), 'Restauração da versão ' || v_history.id::text));
  ELSIF v_history.field = 'ano_anterior' THEN
    RETURN public.salvar_ano_anterior_indicador_planejamento(v_history.loja_id, v_history.indicator_code, v_history.year, v_history.previous_values, COALESCE(nullif(trim(p_note), ''), 'Restauração da versão ' || v_history.id::text));
  END IF;
  RETURN public.salvar_metas_indicador_planejamento(v_history.loja_id, v_history.indicator_code, v_history.year, v_history.previous_values, COALESCE(nullif(trim(p_note), ''), 'Restauração da versão ' || v_history.id::text));
END;
$$;

-- A prontidão agora lê o roster efetivo do ciclo, que inclui indicadores
-- adicionados pela MX e respeita todas as unidades ativas da matriz.
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
    SELECT roster.*, catalog.target_calculation_mode, catalog.unit_entry_mode AS catalog_entry_mode,
      catalog.unit_rollup_method AS catalog_rollup_method
    FROM public.ciclos_plano_estrategico_indicadores roster
    LEFT JOIN public.catalogo_metricas_consultoria catalog ON catalog.metric_key = roster.metric_key
    WHERE roster.ciclo_id = p_cycle_id AND roster.enabled = true
    ORDER BY roster.display_order NULLS LAST, roster.metric_key
  LOOP
    v_entry_mode := COALESCE(v_item.unit_entry_mode_snapshot, v_item.catalog_entry_mode);
    v_rollup_method := COALESCE(v_item.unit_rollup_method_snapshot, v_item.catalog_rollup_method);
    v_calculation_mode := lower(COALESCE(v_item.calculation_mode_snapshot, v_item.target_calculation_mode, 'manual'));
    IF v_entry_mode IS NULL OR v_rollup_method IS NULL THEN
      v_issues := v_issues || jsonb_build_array(jsonb_build_object('type', 'POLITICA_AUSENTE', 'severity', 'critico', 'indicatorCode', v_item.metric_key, 'message', format('%s: sem política de consolidação definida.', v_item.metric_key)));
      CONTINUE;
    END IF;
    IF v_calculation_mode IN ('calculado', 'calculated', 'calculated_locked', 'calculated_adjustable') THEN
      v_ready := v_ready + 1;
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

GRANT EXECUTE ON FUNCTION public.adicionar_indicador_ciclo_plano(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_visibilidade_indicador_ciclo(uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_ano_anterior_indicador_planejamento(uuid, text, integer, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_ciclo_plano_estrategico(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.adicionar_indicador_ciclo_plano(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.atualizar_visibilidade_indicador_ciclo(uuid, text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.salvar_ano_anterior_indicador_planejamento(uuid, text, integer, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restaurar_metas_indicador_planejamento(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validar_ciclo_plano_estrategico(uuid) FROM PUBLIC, anon;

COMMIT;

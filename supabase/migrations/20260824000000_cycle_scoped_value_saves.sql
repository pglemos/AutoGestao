-- Ciclos por unidade: um cliente pode ter mais de um ciclo no mesmo ano
-- (matriz + filiais). Os RPCs de salvamento resolviam o ciclo por
-- (client_id, year) e podiam pegar o ciclo PUBLICADO de outra unidade,
-- bloqueando a edição do ciclo rascunho com "Plano publicado é imutável".
-- p_ciclo_id opcional: quando informado, grava no ciclo do editor.
-- Fallback legado: ciclo rascunho mais recente do cliente/ano.

CREATE OR REPLACE FUNCTION public.salvar_metas_indicador_planejamento(
  p_store_id uuid,
  p_indicator_code text,
  p_year integer,
  p_values jsonb,
  p_note text DEFAULT NULL,
  p_ciclo_id uuid DEFAULT NULL
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
    RAISE EXCEPTION 'Sem permissão para editar metas estratégicas.' USING ERRCODE = '42501';
  END IF;
  IF p_year NOT BETWEEN 2020 AND 2100 THEN RAISE EXCEPTION 'Ano inválido.'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.catalogo_indicadores_planejamento
    WHERE code = p_indicator_code AND active = true
  ) THEN RAISE EXCEPTION 'Indicador estratégico inválido.'; END IF;
  IF jsonb_typeof(p_values) <> 'array' OR jsonb_array_length(p_values) <> 12 THEN
    RAISE EXCEPTION 'Informe exatamente 12 valores mensais.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_values) value
    WHERE jsonb_typeof(value) NOT IN ('number', 'null')
  ) THEN RAISE EXCEPTION 'As metas devem conter apenas números ou nulos.'; END IF;

  SELECT COALESCE(parent_loja_id, id) INTO v_matriz_id
  FROM public.lojas WHERE id = p_store_id;
  IF v_matriz_id IS NULL THEN RAISE EXCEPTION 'Loja não encontrada.'; END IF;

  SELECT id INTO v_client_id
  FROM public.clientes_consultoria
  WHERE primary_store_id = v_matriz_id;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'A loja não está vinculada a um cliente da consultoria.';
  END IF;

  IF p_ciclo_id IS NOT NULL THEN
    SELECT * INTO v_cycle
    FROM public.ciclos_plano_estrategico
    WHERE id = p_ciclo_id AND client_id = v_client_id AND year = p_year
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ciclo informado não pertence ao cliente/ano do plano.';
    END IF;
  ELSE
    SELECT * INTO v_cycle
    FROM public.ciclos_plano_estrategico
    WHERE client_id = v_client_id AND year = p_year AND status <> 'revisado'
    ORDER BY (status = 'rascunho') DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inicie o ciclo do plano estratégico antes de editar metas.';
    END IF;
  END IF;
  IF v_cycle.status = 'publicado' THEN
    RAISE EXCEPTION 'Plano publicado é imutável. Crie uma revisão para alterar metas.';
  END IF;

  SELECT COALESCE(jsonb_agg(meta ORDER BY month), '[]'::jsonb)
  INTO v_previous
  FROM (
    SELECT months.month, vip.meta
    FROM generate_series(1, 12) AS months(month)
    LEFT JOIN public.valores_indicadores_planejamento vip
      ON vip.ciclo_id = v_cycle.id
     AND vip.loja_id = p_store_id
     AND vip.indicator_code = p_indicator_code
     AND vip.year = p_year
     AND vip.month = months.month
  ) current_values;

  INSERT INTO public.historico_valores_indicadores_planejamento(
    ciclo_id, loja_id, indicator_code, year, previous_values, new_values,
    note, changed_by
  ) VALUES (
    v_cycle.id, p_store_id, p_indicator_code, p_year, v_previous, p_values,
    nullif(trim(p_note), ''), auth.uid()
  );

  FOR v_month IN 1..12 LOOP
    v_value := CASE
      WHEN jsonb_typeof(p_values -> (v_month - 1)) = 'null' THEN NULL
      ELSE (p_values ->> (v_month - 1))::numeric
    END;

    INSERT INTO public.valores_indicadores_planejamento(
      ciclo_id, loja_id, indicator_code, year, month, meta, source,
      source_ref, created_by
    ) VALUES (
      v_cycle.id, p_store_id, p_indicator_code, p_year, v_month, v_value,
      'manual', jsonb_build_object(
        'operation', 'strategic_target_update', 'cycleId', v_cycle.id
      ), auth.uid()
    )
    ON CONFLICT (ciclo_id, loja_id, indicator_code, year, (COALESCE(month, 0)))
      WHERE ciclo_id IS NOT NULL
    DO UPDATE SET
      meta = EXCLUDED.meta,
      source = EXCLUDED.source,
      source_ref = EXCLUDED.source_ref,
      created_by = COALESCE(public.valores_indicadores_planejamento.created_by, auth.uid()),
      updated_at = now();
  END LOOP;

  RETURN jsonb_build_object(
    'cycleId', v_cycle.id,
    'storeId', p_store_id,
    'indicatorCode', p_indicator_code,
    'year', p_year,
    'values', p_values
  );
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_metas_indicador_planejamento(uuid, text, integer, jsonb, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_metas_indicador_planejamento(uuid, text, integer, jsonb, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.salvar_realizado_indicador_planejamento(
  p_store_id uuid,
  p_indicator_code text,
  p_year integer,
  p_values jsonb,
  p_source text DEFAULT 'manual',
  p_note text DEFAULT NULL,
  p_ciclo_id uuid DEFAULT NULL
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
    RAISE EXCEPTION 'Sem permissão para editar o realizado estratégico.' USING ERRCODE = '42501';
  END IF;
  IF p_year NOT BETWEEN 2020 AND 2100 THEN RAISE EXCEPTION 'Ano inválido.'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.catalogo_indicadores_planejamento
    WHERE code = p_indicator_code AND active = true
  ) THEN RAISE EXCEPTION 'Indicador estratégico inválido.'; END IF;
  IF jsonb_typeof(p_values) <> 'array' OR jsonb_array_length(p_values) <> 12 THEN
    RAISE EXCEPTION 'Informe exatamente 12 valores mensais.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_values) value
    WHERE jsonb_typeof(value) NOT IN ('number', 'null')
  ) THEN RAISE EXCEPTION 'O realizado deve conter apenas números ou nulos.'; END IF;
  IF p_source NOT IN ('manual', 'importacao', 'dre', 'funil', 'score', 'sistema') THEN
    RAISE EXCEPTION 'Origem do realizado inválida.';
  END IF;

  SELECT COALESCE(parent_loja_id, id) INTO v_matriz_id
  FROM public.lojas WHERE id = p_store_id;
  IF v_matriz_id IS NULL THEN RAISE EXCEPTION 'Loja não encontrada.'; END IF;

  SELECT id INTO v_client_id
  FROM public.clientes_consultoria
  WHERE primary_store_id = v_matriz_id;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'A loja não está vinculada a um cliente da consultoria.';
  END IF;

  IF p_ciclo_id IS NOT NULL THEN
    SELECT * INTO v_cycle
    FROM public.ciclos_plano_estrategico
    WHERE id = p_ciclo_id AND client_id = v_client_id AND year = p_year
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ciclo informado não pertence ao cliente/ano do plano.';
    END IF;
  ELSE
    SELECT * INTO v_cycle
    FROM public.ciclos_plano_estrategico
    WHERE client_id = v_client_id AND year = p_year AND status <> 'revisado'
    ORDER BY (status = 'rascunho') DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Inicie o ciclo do plano estratégico antes de registrar o realizado.';
    END IF;
  END IF;
  -- Sem bloqueio de status aqui: realizado publicado continua editável,
  -- é o único jeito de lançar o resultado do mês contra a meta já fechada.

  SELECT COALESCE(jsonb_agg(realizado ORDER BY month), '[]'::jsonb)
  INTO v_previous
  FROM (
    SELECT months.month, vip.realizado
    FROM generate_series(1, 12) AS months(month)
    LEFT JOIN public.valores_indicadores_planejamento vip
      ON vip.ciclo_id = v_cycle.id
     AND vip.loja_id = p_store_id
     AND vip.indicator_code = p_indicator_code
     AND vip.year = p_year
     AND vip.month = months.month
  ) current_values;

  INSERT INTO public.historico_valores_indicadores_planejamento(
    ciclo_id, loja_id, indicator_code, year, field, previous_values, new_values,
    note, changed_by
  ) VALUES (
    v_cycle.id, p_store_id, p_indicator_code, p_year, 'realizado', v_previous, p_values,
    nullif(trim(p_note), ''), auth.uid()
  );

  FOR v_month IN 1..12 LOOP
    v_value := CASE
      WHEN jsonb_typeof(p_values -> (v_month - 1)) = 'null' THEN NULL
      ELSE (p_values ->> (v_month - 1))::numeric
    END;

    INSERT INTO public.valores_indicadores_planejamento(
      ciclo_id, loja_id, indicator_code, year, month, realizado, source,
      source_ref, created_by
    ) VALUES (
      v_cycle.id, p_store_id, p_indicator_code, p_year, v_month, v_value, p_source,
      jsonb_build_object(
        'operation', 'strategic_actual_update', 'cycleId', v_cycle.id
      ), auth.uid()
    )
    ON CONFLICT (ciclo_id, loja_id, indicator_code, year, (COALESCE(month, 0)))
      WHERE ciclo_id IS NOT NULL
    DO UPDATE SET
      realizado = EXCLUDED.realizado,
      source = EXCLUDED.source,
      source_ref = EXCLUDED.source_ref,
      created_by = COALESCE(public.valores_indicadores_planejamento.created_by, auth.uid()),
      updated_at = now();
  END LOOP;

  RETURN jsonb_build_object(
    'cycleId', v_cycle.id,
    'storeId', p_store_id,
    'indicatorCode', p_indicator_code,
    'year', p_year,
    'values', p_values,
    'source', p_source
  );
END;
$$;

REVOKE ALL ON FUNCTION public.salvar_realizado_indicador_planejamento(uuid, text, integer, jsonb, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_realizado_indicador_planejamento(uuid, text, integer, jsonb, text, text, uuid) TO authenticated;

-- Metas estratégicas persistidas, histórico restaurável e criação idempotente
-- de Plano de Ação por loja/indicador/ano.
BEGIN;

CREATE TABLE IF NOT EXISTS public.historico_valores_indicadores_planejamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  indicator_code text NOT NULL REFERENCES public.catalogo_indicadores_planejamento(code) ON DELETE RESTRICT,
  year integer NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  previous_values jsonb NOT NULL CHECK (jsonb_typeof(previous_values) = 'array'),
  new_values jsonb NOT NULL CHECK (jsonb_typeof(new_values) = 'array'),
  note text,
  changed_by uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hist_valores_planejamento_scope
  ON public.historico_valores_indicadores_planejamento(loja_id, indicator_code, year, created_at DESC);

ALTER TABLE public.historico_valores_indicadores_planejamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS historico_valores_planejamento_select ON public.historico_valores_indicadores_planejamento;
CREATE POLICY historico_valores_planejamento_select
  ON public.historico_valores_indicadores_planejamento
  FOR SELECT TO authenticated
  USING (
    public.eh_area_interna_mx(auth.uid())
    OR public.user_is_master_loja(loja_id, auth.uid())
    OR public.tem_papel_loja(loja_id, ARRAY['dono'], auth.uid())
  );

CREATE OR REPLACE FUNCTION public.pode_gerir_metas_planejamento(
  p_store_id uuid,
  uid uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT uid IS NOT NULL AND (
    public.eh_area_interna_mx(uid)
    OR public.user_is_master_loja(p_store_id, uid)
    OR public.tem_papel_loja(p_store_id, ARRAY['dono'], uid)
  )
$$;

CREATE OR REPLACE FUNCTION public.salvar_metas_indicador_planejamento(
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
  IF p_indicator_code = 'sales_volume' AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_values) value
    WHERE jsonb_typeof(value) = 'number'
      AND (value #>> '{}')::numeric < 0
  ) THEN RAISE EXCEPTION 'A meta de vendas não pode ser negativa.'; END IF;

  SELECT COALESCE(jsonb_agg(meta ORDER BY month), '[]'::jsonb)
  INTO v_previous
  FROM (
    SELECT months.month,
      vip.meta
    FROM generate_series(1, 12) AS months(month)
    LEFT JOIN public.valores_indicadores_planejamento vip
      ON vip.loja_id = p_store_id
     AND vip.indicator_code = p_indicator_code
     AND vip.year = p_year
     AND vip.month = months.month
    ORDER BY months.month
  ) current_values;

  INSERT INTO public.historico_valores_indicadores_planejamento(
    loja_id, indicator_code, year, previous_values, new_values, note, changed_by
  ) VALUES (
    p_store_id, p_indicator_code, p_year, v_previous, p_values, nullif(trim(p_note), ''), auth.uid()
  );

  FOR v_month IN 1..12 LOOP
    v_value := CASE
      WHEN jsonb_typeof(p_values -> (v_month - 1)) = 'null' THEN NULL
      ELSE (p_values ->> (v_month - 1))::numeric
    END;

    UPDATE public.valores_indicadores_planejamento
    SET meta = v_value,
        source = 'manual',
        source_ref = jsonb_build_object('operation', 'strategic_target_update'),
        created_by = COALESCE(created_by, auth.uid()),
        updated_at = now()
    WHERE loja_id = p_store_id
      AND indicator_code = p_indicator_code
      AND year = p_year
      AND month = v_month;

    IF NOT FOUND THEN
      INSERT INTO public.valores_indicadores_planejamento(
        loja_id, indicator_code, year, month, meta, source, source_ref, created_by
      ) VALUES (
        p_store_id, p_indicator_code, p_year, v_month, v_value, 'manual',
        jsonb_build_object('operation', 'strategic_target_update'), auth.uid()
      );
    END IF;
  END LOOP;

  IF p_indicator_code = 'sales_volume' THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_values) value
      WHERE jsonb_typeof(value) = 'null'
    ) OR (
      SELECT count(DISTINCT (value #>> '{}')::numeric)
      FROM jsonb_array_elements(p_values) value
      WHERE jsonb_typeof(value) = 'number'
    ) <> 1 THEN
      RAISE EXCEPTION 'A meta de vendas da loja deve ser igual nos 12 meses.';
    END IF;

    INSERT INTO public.regras_metas_loja(store_id, monthly_goal, updated_by, updated_at)
    VALUES (p_store_id, (p_values ->> 0)::numeric, auth.uid(), now())
    ON CONFLICT (store_id) DO UPDATE
    SET monthly_goal = EXCLUDED.monthly_goal,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at;
  END IF;

  RETURN jsonb_build_object(
    'storeId', p_store_id,
    'indicatorCode', p_indicator_code,
    'year', p_year,
    'values', p_values
  );
END;
$$;

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
  SELECT * INTO v_history
  FROM public.historico_valores_indicadores_planejamento
  WHERE id = p_history_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Versão de metas não encontrada.'; END IF;
  IF NOT public.pode_gerir_metas_planejamento(v_history.loja_id) THEN
    RAISE EXCEPTION 'Sem permissão para restaurar metas estratégicas.' USING ERRCODE = '42501';
  END IF;

  RETURN public.salvar_metas_indicador_planejamento(
    v_history.loja_id,
    v_history.indicator_code,
    v_history.year,
    v_history.previous_values,
    COALESCE(nullif(trim(p_note), ''), 'Restauração da versão ' || v_history.id::text)
  );
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_planos_acao_strategic_indicator_active
  ON public.planos_acao(
    scope_id,
    (transition_metadata ->> 'strategic_indicator_code'),
    (transition_metadata ->> 'strategic_year')
  )
  WHERE scope_type = 'store'
    AND status <> 'cancelada'
    AND transition_metadata ? 'strategic_indicator_code';

CREATE OR REPLACE FUNCTION public.criar_plano_acao_planejamento_unico(
  p_store_id uuid,
  p_indicator_code text,
  p_year integer,
  p_title text,
  p_problem text,
  p_action text,
  p_area text DEFAULT 'general',
  p_responsible_name text DEFAULT NULL,
  p_deadline date DEFAULT NULL,
  p_priority text DEFAULT 'medium',
  p_note text DEFAULT NULL
)
RETURNS public.planos_acao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.planos_acao;
  v_created public.planos_acao;
  v_responsible_id uuid;
  v_priority public.action_priority;
BEGIN
  IF NOT public.pode_gerir_metas_planejamento(p_store_id) THEN
    RAISE EXCEPTION 'Sem permissão para criar ação estratégica.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.catalogo_indicadores_planejamento
    WHERE code = p_indicator_code AND active = true
  ) THEN RAISE EXCEPTION 'Indicador estratégico inválido.'; END IF;

  SELECT * INTO v_existing
  FROM public.planos_acao
  WHERE scope_type = 'store'
    AND scope_id = p_store_id
    AND status <> 'cancelada'
    AND transition_metadata ->> 'strategic_indicator_code' = p_indicator_code
    AND transition_metadata ->> 'strategic_year' = p_year::text
  ORDER BY created_at DESC
  LIMIT 1;
  IF FOUND THEN RETURN v_existing; END IF;

  IF nullif(trim(p_responsible_name), '') IS NOT NULL THEN
    SELECT u.id INTO v_responsible_id
    FROM public.usuarios u
    JOIN public.vinculos_loja vl ON vl.user_id = u.id
    WHERE vl.store_id = p_store_id
      AND vl.is_active = true
      AND u.active = true
      AND lower(trim(u.name)) = lower(trim(p_responsible_name))
    ORDER BY CASE vl.role WHEN 'gerente' THEN 1 WHEN 'dono' THEN 2 ELSE 3 END
    LIMIT 1;
  END IF;

  v_priority := CASE lower(coalesce(p_priority, 'medium'))
    WHEN 'critical' THEN 'critica'::public.action_priority
    WHEN 'high' THEN 'alta'::public.action_priority
    WHEN 'low' THEN 'baixa'::public.action_priority
    ELSE 'media'::public.action_priority
  END;

  BEGIN
    v_created := public.criar_plano_acao_v2(
      'store'::public.score_scope_type,
      p_store_id,
      nullif(trim(p_title), ''),
      COALESCE(nullif(trim(p_area), ''), 'general'),
      p_indicator_code,
      COALESCE(nullif(trim(p_problem), ''), 'Desvio estratégico identificado'),
      COALESCE(nullif(trim(p_action), ''), nullif(trim(p_title), ''), 'Executar ação estratégica'),
      nullif(trim(p_note), ''),
      v_responsible_id,
      p_deadline,
      v_priority,
      'manual'::public.action_origin
    );

    UPDATE public.planos_acao
    SET origem_ref_table = 'catalogo_indicadores_planejamento',
        transition_metadata = COALESCE(transition_metadata, '{}'::jsonb) || jsonb_build_object(
          'eventType', 'strategic_action_created',
          'strategic_indicator_code', p_indicator_code,
          'strategic_year', p_year
        )
    WHERE id = v_created.id
    RETURNING * INTO v_created;
    RETURN v_created;
  EXCEPTION WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.planos_acao
    WHERE scope_type = 'store'
      AND scope_id = p_store_id
      AND status <> 'cancelada'
      AND transition_metadata ->> 'strategic_indicator_code' = p_indicator_code
      AND transition_metadata ->> 'strategic_year' = p_year::text
    ORDER BY created_at DESC
    LIMIT 1;
    IF FOUND THEN RETURN v_existing; END IF;
    RAISE;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.pode_gerir_metas_planejamento(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.salvar_metas_indicador_planejamento(uuid, text, integer, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restaurar_metas_indicador_planejamento(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.criar_plano_acao_planejamento_unico(uuid, text, integer, text, text, text, text, text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerir_metas_planejamento(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_metas_indicador_planejamento(uuid, text, integer, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restaurar_metas_indicador_planejamento(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_plano_acao_planejamento_unico(uuid, text, integer, text, text, text, text, text, date, text, text) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'historico_valores_indicadores_planejamento'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.historico_valores_indicadores_planejamento;
  END IF;
END;
$$;

COMMIT;

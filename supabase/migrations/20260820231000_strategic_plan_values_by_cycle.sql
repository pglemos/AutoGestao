-- As metas pertencem a uma versão do ciclo, não apenas a loja+ano.
--
-- Sem esta referência, revisar o plano reutiliza as mesmas linhas e uma edição
-- posterior altera retroativamente o que já foi publicado. A revisão passa a
-- copiar o snapshot mensal; o ciclo publicado fica imutável.

BEGIN;

ALTER TABLE public.valores_indicadores_planejamento
  ADD COLUMN IF NOT EXISTS ciclo_id uuid
  REFERENCES public.ciclos_plano_estrategico(id) ON DELETE CASCADE;

ALTER TABLE public.historico_valores_indicadores_planejamento
  ADD COLUMN IF NOT EXISTS ciclo_id uuid
  REFERENCES public.ciclos_plano_estrategico(id) ON DELETE CASCADE;

-- Associa dados legados apenas quando existe um ciclo vigente inequívoco para a
-- matriz do cliente e o mesmo ano. Linhas sem ciclo continuam legadas e não são
-- tratadas como parte de um plano publicado.
UPDATE public.valores_indicadores_planejamento vip
SET ciclo_id = c.id
FROM public.lojas l
JOIN public.clientes_consultoria cc
  ON cc.primary_store_id = COALESCE(l.parent_loja_id, l.id)
JOIN public.ciclos_plano_estrategico c
  ON c.client_id = cc.id AND c.status <> 'revisado'
WHERE vip.loja_id = l.id
  AND vip.year = c.year
  AND vip.ciclo_id IS NULL;

UPDATE public.historico_valores_indicadores_planejamento h
SET ciclo_id = c.id
FROM public.lojas l
JOIN public.clientes_consultoria cc
  ON cc.primary_store_id = COALESCE(l.parent_loja_id, l.id)
JOIN public.ciclos_plano_estrategico c
  ON c.client_id = cc.id AND c.status <> 'revisado'
WHERE h.loja_id = l.id
  AND h.year = c.year
  AND h.ciclo_id IS NULL;

DROP INDEX IF EXISTS public.idx_valores_planejamento_unique_period;
CREATE UNIQUE INDEX IF NOT EXISTS valores_planejamento_cycle_period_uidx
  ON public.valores_indicadores_planejamento(
    ciclo_id, loja_id, indicator_code, year, COALESCE(month, 0)
  )
  WHERE ciclo_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS valores_planejamento_legacy_period_uidx
  ON public.valores_indicadores_planejamento(
    loja_id, indicator_code, year, COALESCE(month, 0)
  )
  WHERE ciclo_id IS NULL;

CREATE INDEX IF NOT EXISTS valores_planejamento_ciclo_idx
  ON public.valores_indicadores_planejamento(ciclo_id, loja_id, indicator_code, month);
CREATE INDEX IF NOT EXISTS historico_valores_planejamento_ciclo_idx
  ON public.historico_valores_indicadores_planejamento(ciclo_id, created_at DESC);

CREATE OR REPLACE VIEW public.valores_indicadores_planejamento_vigentes
WITH (security_invoker = true)
AS
SELECT vip.*
FROM public.valores_indicadores_planejamento vip
JOIN public.lojas l ON l.id = vip.loja_id
LEFT JOIN public.clientes_consultoria cc
  ON cc.primary_store_id = COALESCE(l.parent_loja_id, l.id)
LEFT JOIN public.ciclos_plano_estrategico c
  ON c.client_id = cc.id AND c.year = vip.year AND c.status <> 'revisado'
WHERE vip.ciclo_id = c.id
   OR (c.id IS NULL AND vip.ciclo_id IS NULL);

REVOKE ALL ON public.valores_indicadores_planejamento_vigentes FROM PUBLIC, anon;
GRANT SELECT ON public.valores_indicadores_planejamento_vigentes TO authenticated;

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

  SELECT * INTO v_cycle
  FROM public.ciclos_plano_estrategico
  WHERE client_id = v_client_id AND year = p_year AND status <> 'revisado'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inicie o ciclo do plano estratégico antes de editar metas.';
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

CREATE OR REPLACE FUNCTION public.copiar_valores_revisao_plano_estrategico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.revised_from_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.valores_indicadores_planejamento(
    ciclo_id, loja_id, indicator_code, year, month, meta, realizado,
    ano_anterior, source, source_ref, created_by, created_at, updated_at
  )
  SELECT
    NEW.id, loja_id, indicator_code, year, month, meta, realizado,
    ano_anterior, source,
    COALESCE(source_ref, '{}'::jsonb) || jsonb_build_object(
      'operation', 'strategic_plan_revision_copy',
      'revisedFromCycleId', NEW.revised_from_id
    ),
    auth.uid(), now(), now()
  FROM public.valores_indicadores_planejamento
  WHERE ciclo_id = NEW.revised_from_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_copiar_valores_revisao_plano_estrategico
  ON public.ciclos_plano_estrategico;
CREATE TRIGGER trg_copiar_valores_revisao_plano_estrategico
  AFTER INSERT ON public.ciclos_plano_estrategico
  FOR EACH ROW
  WHEN (NEW.revised_from_id IS NOT NULL)
  EXECUTE FUNCTION public.copiar_valores_revisao_plano_estrategico();

COMMENT ON COLUMN public.valores_indicadores_planejamento.ciclo_id IS
  'Versão do ciclo a que o valor pertence; impede edição retroativa de plano publicado.';
COMMENT ON VIEW public.valores_indicadores_planejamento_vigentes IS
  'Valores do ciclo vigente por cliente/ano; usa legado sem ciclo apenas quando ainda não existe ciclo.';

COMMIT;

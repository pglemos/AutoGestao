-- Conversão idempotente e atômica de sugestão em plano de ação.
-- Evita a janela do frontend antigo: INSERT do plano seguido de UPDATE da
-- sugestão, que podia deixar plano órfão e duplicar no retry.

BEGIN;

CREATE OR REPLACE FUNCTION public.convert_action_plan_suggestion(
  p_suggestion_id uuid,
  p_departamento text,
  p_indicador text,
  p_prazo date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_suggestion public.consultor_solucoes%ROWTYPE;
  v_plan_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.eh_area_interna_mx() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_suggestion
  FROM public.consultor_solucoes
  WHERE id = p_suggestion_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUGGESTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_plan_id := COALESCE(v_suggestion.source_plano_id, v_suggestion.converted_plano_id);
  IF v_plan_id IS NOT NULL THEN
    RETURN v_plan_id;
  END IF;

  IF v_suggestion.status = 'descartada' THEN
    RAISE EXCEPTION 'SUGGESTION_DISMISSED' USING ERRCODE = 'P0001';
  END IF;
  IF v_suggestion.scope_id IS NULL OR v_suggestion.scope_type IS NULL THEN
    RAISE EXCEPTION 'SUGGESTION_SCOPE_REQUIRED' USING ERRCODE = '23502';
  END IF;
  IF NULLIF(BTRIM(v_suggestion.recommendation), '') IS NULL THEN
    RAISE EXCEPTION 'SUGGESTION_RECOMMENDATION_REQUIRED' USING ERRCODE = '23502';
  END IF;

  INSERT INTO public.planos_acao (
    scope_type,
    scope_id,
    departamento,
    indicador,
    problema,
    acao,
    como,
    prazo,
    prioridade,
    origem,
    origem_ref_id,
    origem_ref_table,
    created_by,
    transition_metadata
  ) VALUES (
    v_suggestion.scope_type,
    v_suggestion.scope_id,
    COALESCE(NULLIF(BTRIM(p_departamento), ''), 'Geral'),
    COALESCE(NULLIF(BTRIM(p_indicador), ''), 'Não definido'),
    COALESCE(NULLIF(BTRIM(v_suggestion.problem), ''), 'Problema identificado pelo motor de regras.'),
    BTRIM(v_suggestion.recommendation),
    NULLIF(BTRIM(v_suggestion.rationale), ''),
    p_prazo,
    COALESCE(v_suggestion.priority, 'media'::public.action_priority),
    'consultor'::public.action_origin,
    v_suggestion.id,
    'consultor_solucoes',
    auth.uid(),
    jsonb_build_object(
      'eventType', 'suggestion_converted',
      'suggestion_id', v_suggestion.id,
      'converted_at', now()
    )
  ) RETURNING id INTO v_plan_id;

  UPDATE public.consultor_solucoes
  SET source_plano_id = v_plan_id,
      converted_plano_id = v_plan_id,
      status = 'convertida'
  WHERE id = v_suggestion.id;

  RETURN v_plan_id;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_action_plan_suggestion(uuid, text, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.convert_action_plan_suggestion(uuid, text, text, date) TO authenticated;

COMMENT ON FUNCTION public.convert_action_plan_suggestion(uuid, text, text, date) IS
  'Converte uma sugestão em plano de ação sob lock, retornando o plano existente em retries.';

COMMIT;

-- DOWN
-- DROP FUNCTION IF EXISTS public.convert_action_plan_suggestion(uuid, text, text, date);

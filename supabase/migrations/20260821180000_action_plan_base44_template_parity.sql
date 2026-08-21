-- Paridade Base44 dos campos de template do Plano de Ação.
-- Mantém o contrato MX por unidades, mas preserva direção e papéis
-- recomendados da biblioteca original para filtros, revisão e aplicação.

BEGIN;

ALTER TABLE public.planos_acao_templates
  ADD COLUMN IF NOT EXISTS default_responsible_role text;

ALTER TABLE public.planos_acao_templates
  DROP CONSTRAINT IF EXISTS planos_acao_templates_improvement_direction_check;

ALTER TABLE public.planos_acao_templates
  ADD CONSTRAINT planos_acao_templates_improvement_direction_check
  CHECK (
    improvement_direction IS NULL
    OR improvement_direction IN ('aumentar', 'reduzir', 'manter', 'faixa', 'corrigir_processo')
  );

ALTER TABLE public.planos_acao_template_versoes
  ADD COLUMN IF NOT EXISTS improvement_direction text,
  ADD COLUMN IF NOT EXISTS default_responsible_role text;

ALTER TABLE public.planos_acao_template_versoes
  DROP CONSTRAINT IF EXISTS planos_acao_template_versoes_improvement_direction_check;

ALTER TABLE public.planos_acao_template_versoes
  ADD CONSTRAINT planos_acao_template_versoes_improvement_direction_check
  CHECK (
    improvement_direction IS NULL
    OR improvement_direction IN ('aumentar', 'reduzir', 'manter', 'faixa', 'corrigir_processo')
  );

ALTER TABLE public.planos_acao_template_itens
  ADD COLUMN IF NOT EXISTS recommended_responsible_role text;

CREATE INDEX IF NOT EXISTS idx_pa_template_items_responsible_role
  ON public.planos_acao_template_itens (recommended_responsible_role)
  WHERE recommended_responsible_role IS NOT NULL;

CREATE OR REPLACE FUNCTION public.open_action_plan_template_revision(
  p_template_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_draft_id uuid;
  v_published_id uuid;
  v_version integer;
BEGIN
  IF v_actor IS NULL OR NOT public.eh_area_interna_mx(v_actor) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  PERFORM id FROM public.planos_acao_templates WHERE id = p_template_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEMPLATE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  SELECT id INTO v_draft_id
  FROM public.planos_acao_template_versoes
  WHERE template_id = p_template_id AND status = 'rascunho'
  ORDER BY versao DESC
  LIMIT 1;
  IF v_draft_id IS NOT NULL THEN RETURN v_draft_id; END IF;

  SELECT id INTO v_published_id
  FROM public.planos_acao_template_versoes
  WHERE template_id = p_template_id AND status = 'publicada'
  ORDER BY versao DESC
  LIMIT 1;
  IF v_published_id IS NULL THEN
    RAISE EXCEPTION 'PUBLISHED_VERSION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(MAX(versao), 0) + 1 INTO v_version
  FROM public.planos_acao_template_versoes
  WHERE template_id = p_template_id;

  INSERT INTO public.planos_acao_template_versoes(
    template_id, versao, status, notas, created_by,
    improvement_direction, default_responsible_role,
    problem, objective, when_to_apply,
    owner_suggestion_title, owner_suggestion_problem, owner_suggestion_recommendation,
    effectiveness_indicator_code
  )
  SELECT p_template_id, v_version, 'rascunho', NULLIF(BTRIM(p_notes), ''), v_actor,
         improvement_direction, default_responsible_role,
         problem, objective, when_to_apply,
         owner_suggestion_title, owner_suggestion_problem, owner_suggestion_recommendation,
         effectiveness_indicator_code
  FROM public.planos_acao_template_versoes
  WHERE id = v_published_id
  RETURNING id INTO v_draft_id;

  INSERT INTO public.planos_acao_template_itens(
    version_id, ordem, problema, acao, como, departamento, indicador,
    prioridade, prazo_dias, evidencia_requerida,
    support_material_type, file_asset_path, file_asset_name,
    treinamento_id, treinamento_titulo, recommended_responsible_role, peso_bp
  )
  SELECT v_draft_id, ordem, problema, acao, como, departamento, indicador,
         prioridade, prazo_dias, evidencia_requerida,
         support_material_type, file_asset_path, file_asset_name,
         treinamento_id, treinamento_titulo, recommended_responsible_role, peso_bp
  FROM public.planos_acao_template_itens
  WHERE version_id = v_published_id
  ORDER BY ordem, id;

  RETURN v_draft_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_action_plan_template_revision(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.open_action_plan_template_revision(uuid, text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.save_action_plan_template_draft(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_template_id uuid;
  v_version_id uuid;
  v_next_version integer;
  v_template jsonb := COALESCE(p_payload -> 'template', '{}'::jsonb);
  v_version jsonb := COALESCE(p_payload -> 'version', '{}'::jsonb);
BEGIN
  IF v_actor IS NULL OR NOT public.eh_area_interna_mx(v_actor) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(p_payload ->> 'template_id', '') IS NULL THEN
    INSERT INTO public.planos_acao_templates(
      template_key, nome, departamento, indicador, descricao, program_key,
      active, created_by, primary_indicator_code, improvement_direction,
      default_responsible_role, manual_application_enabled, owner_suggestion_enabled
    )
    VALUES (
      BTRIM(v_template ->> 'template_key'),
      BTRIM(v_template ->> 'nome'),
      BTRIM(v_template ->> 'departamento'),
      NULLIF(BTRIM(v_template ->> 'indicador'), ''),
      NULLIF(BTRIM(v_template ->> 'descricao'), ''),
      NULLIF(BTRIM(v_template ->> 'program_key'), ''),
      COALESCE((v_template ->> 'active')::boolean, true),
      v_actor,
      NULLIF(BTRIM(v_template ->> 'primary_indicator_code'), ''),
      NULLIF(v_template ->> 'improvement_direction', ''),
      NULLIF(BTRIM(v_template ->> 'default_responsible_role'), ''),
      COALESCE((v_template ->> 'manual_application_enabled')::boolean, true),
      COALESCE((v_template ->> 'owner_suggestion_enabled')::boolean, false)
    )
    RETURNING id INTO v_template_id;
  ELSE
    v_template_id := (p_payload ->> 'template_id')::uuid;
    PERFORM id FROM public.planos_acao_templates WHERE id = v_template_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'TEMPLATE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

    UPDATE public.planos_acao_templates
    SET template_key = BTRIM(v_template ->> 'template_key'),
        nome = BTRIM(v_template ->> 'nome'),
        departamento = BTRIM(v_template ->> 'departamento'),
        indicador = NULLIF(BTRIM(v_template ->> 'indicador'), ''),
        descricao = NULLIF(BTRIM(v_template ->> 'descricao'), ''),
        program_key = NULLIF(BTRIM(v_template ->> 'program_key'), ''),
        active = COALESCE((v_template ->> 'active')::boolean, true),
        primary_indicator_code = NULLIF(BTRIM(v_template ->> 'primary_indicator_code'), ''),
        improvement_direction = NULLIF(v_template ->> 'improvement_direction', ''),
        default_responsible_role = NULLIF(BTRIM(v_template ->> 'default_responsible_role'), ''),
        manual_application_enabled = COALESCE((v_template ->> 'manual_application_enabled')::boolean, true),
        owner_suggestion_enabled = COALESCE((v_template ->> 'owner_suggestion_enabled')::boolean, false),
        updated_at = now()
    WHERE id = v_template_id;
  END IF;

  SELECT id INTO v_version_id
  FROM public.planos_acao_template_versoes
  WHERE template_id = v_template_id AND status = 'rascunho'
  ORDER BY versao DESC
  LIMIT 1
  FOR UPDATE;

  IF v_version_id IS NULL THEN
    SELECT COALESCE(MAX(versao), 0) + 1 INTO v_next_version
    FROM public.planos_acao_template_versoes
    WHERE template_id = v_template_id;

    INSERT INTO public.planos_acao_template_versoes(
      template_id, versao, status, created_by, improvement_direction,
      default_responsible_role, problem, objective, when_to_apply,
      owner_suggestion_title, owner_suggestion_problem, owner_suggestion_recommendation,
      effectiveness_indicator_code
    )
    VALUES (
      v_template_id, v_next_version, 'rascunho', v_actor,
      NULLIF(v_version ->> 'improvement_direction', ''),
      NULLIF(BTRIM(v_version ->> 'default_responsible_role'), ''),
      NULLIF(BTRIM(v_version ->> 'problem'), ''),
      NULLIF(BTRIM(v_version ->> 'objective'), ''),
      NULLIF(BTRIM(v_version ->> 'when_to_apply'), ''),
      NULLIF(BTRIM(v_version ->> 'owner_suggestion_title'), ''),
      NULLIF(BTRIM(v_version ->> 'owner_suggestion_problem'), ''),
      NULLIF(BTRIM(v_version ->> 'owner_suggestion_recommendation'), ''),
      NULLIF(BTRIM(v_version ->> 'effectiveness_indicator_code'), '')
    )
    RETURNING id INTO v_version_id;
  ELSE
    DELETE FROM public.planos_acao_template_itens WHERE version_id = v_version_id;
    UPDATE public.planos_acao_template_versoes
    SET improvement_direction = NULLIF(v_version ->> 'improvement_direction', ''),
        default_responsible_role = NULLIF(BTRIM(v_version ->> 'default_responsible_role'), ''),
        problem = NULLIF(BTRIM(v_version ->> 'problem'), ''),
        objective = NULLIF(BTRIM(v_version ->> 'objective'), ''),
        when_to_apply = NULLIF(BTRIM(v_version ->> 'when_to_apply'), ''),
        owner_suggestion_title = NULLIF(BTRIM(v_version ->> 'owner_suggestion_title'), ''),
        owner_suggestion_problem = NULLIF(BTRIM(v_version ->> 'owner_suggestion_problem'), ''),
        owner_suggestion_recommendation = NULLIF(BTRIM(v_version ->> 'owner_suggestion_recommendation'), ''),
        effectiveness_indicator_code = NULLIF(BTRIM(v_version ->> 'effectiveness_indicator_code'), ''),
        updated_at = now()
    WHERE id = v_version_id;
  END IF;

  INSERT INTO public.planos_acao_template_itens(
    version_id, ordem, problema, acao, como, departamento, indicador,
    prioridade, prazo_dias, evidencia_requerida, support_material_type,
    file_asset_path, file_asset_name, treinamento_id, treinamento_titulo,
    recommended_responsible_role, peso_bp
  )
  SELECT
    v_version_id,
    item.ord::integer,
    BTRIM(item.value ->> 'problema'),
    BTRIM(item.value ->> 'acao'),
    NULLIF(BTRIM(item.value ->> 'como'), ''),
    NULLIF(BTRIM(item.value ->> 'departamento'), ''),
    NULLIF(BTRIM(item.value ->> 'indicador'), ''),
    COALESCE(NULLIF(item.value ->> 'prioridade', ''), 'media')::public.action_priority,
    NULLIF(item.value ->> 'prazo_dias', '')::integer,
    COALESCE((item.value ->> 'evidencia_requerida')::boolean, false),
    COALESCE(NULLIF(item.value ->> 'support_material_type', ''), 'nenhum'),
    NULLIF(BTRIM(item.value ->> 'file_asset_path'), ''),
    NULLIF(BTRIM(item.value ->> 'file_asset_name'), ''),
    NULLIF(item.value ->> 'treinamento_id', '')::uuid,
    NULLIF(BTRIM(item.value ->> 'treinamento_titulo'), ''),
    NULLIF(BTRIM(item.value ->> 'recommended_responsible_role'), ''),
    NULLIF(item.value ->> 'peso_bp', '')::integer
  FROM jsonb_array_elements(COALESCE(p_payload -> 'items', '[]'::jsonb)) WITH ORDINALITY AS item(value, ord)
  WHERE NULLIF(BTRIM(item.value ->> 'problema'), '') IS NOT NULL
    AND NULLIF(BTRIM(item.value ->> 'acao'), '') IS NOT NULL;

  RETURN v_template_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_action_plan_template_draft(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_action_plan_template_draft(jsonb) TO authenticated;

COMMIT;

-- DOWN
-- DROP INDEX IF EXISTS public.idx_pa_template_items_responsible_role;
-- ALTER TABLE public.planos_acao_template_itens DROP COLUMN IF EXISTS recommended_responsible_role;
-- ALTER TABLE public.planos_acao_template_versoes DROP COLUMN IF EXISTS improvement_direction, DROP COLUMN IF EXISTS default_responsible_role;
-- ALTER TABLE public.planos_acao_templates DROP COLUMN IF EXISTS default_responsible_role;

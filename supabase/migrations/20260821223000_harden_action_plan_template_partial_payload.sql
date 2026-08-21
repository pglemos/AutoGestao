-- CONS-20: preservar itens de rascunho quando o payload atualiza somente
-- metadados. A migration 20260821180000 recebe `items` no fluxo completo,
-- mas callers parciais não podem apagar silenciosamente a versão em edição.
--
-- A função é definida diretamente porque alguns ambientes têm a migration
-- 20260821180000 registrada, mas não têm a função materializada no schema.

BEGIN;

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
  v_items jsonb := '[]'::jsonb;
  v_payload jsonb := p_payload;
  v_template jsonb;
  v_version jsonb;
BEGIN
  IF v_actor IS NULL OR NOT public.eh_area_interna_mx(v_actor) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Omitir `items` significa atualização parcial. Reidrata os itens do
  -- rascunho atual antes de executar o fluxo transacional completo.
  IF NOT (p_payload ? 'items') THEN
    v_template_id := NULLIF(p_payload ->> 'template_id', '')::uuid;
    IF v_template_id IS NOT NULL THEN
      SELECT id INTO v_version_id
      FROM public.planos_acao_template_versoes
      WHERE template_id = v_template_id
        AND status = 'rascunho'
      ORDER BY versao DESC
      LIMIT 1
      FOR UPDATE;

      IF v_version_id IS NOT NULL THEN
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'ordem', item.ordem,
              'problema', item.problema,
              'acao', item.acao,
              'como', item.como,
              'departamento', item.departamento,
              'indicador', item.indicador,
              'prioridade', item.prioridade,
              'prazo_dias', item.prazo_dias,
              'evidencia_requerida', item.evidencia_requerida,
              'support_material_type', item.support_material_type,
              'file_asset_path', item.file_asset_path,
              'file_asset_name', item.file_asset_name,
              'treinamento_id', item.treinamento_id,
              'treinamento_titulo', item.treinamento_titulo,
              'recommended_responsible_role', item.recommended_responsible_role,
              'peso_bp', item.peso_bp
            ) ORDER BY item.ordem, item.id
          ),
          '[]'::jsonb
        )
        INTO v_items
        FROM public.planos_acao_template_itens AS item
        WHERE item.version_id = v_version_id;
      END IF;
    END IF;
    v_payload := p_payload || jsonb_build_object('items', v_items);
  END IF;

  v_template := COALESCE(v_payload -> 'template', '{}'::jsonb);
  v_version := COALESCE(v_payload -> 'version', '{}'::jsonb);

  IF NULLIF(v_payload ->> 'template_id', '') IS NULL THEN
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
    v_template_id := (v_payload ->> 'template_id')::uuid;
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
  FROM jsonb_array_elements(COALESCE(v_payload -> 'items', '[]'::jsonb)) WITH ORDINALITY AS item(value, ord)
  WHERE NULLIF(BTRIM(item.value ->> 'problema'), '') IS NOT NULL
    AND NULLIF(BTRIM(item.value ->> 'acao'), '') IS NOT NULL;

  RETURN v_template_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_action_plan_template_draft(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_action_plan_template_draft(jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_action_plan_template_draft(jsonb) IS
  'Salva metadados e itens de template; payload sem items preserva os itens do rascunho atual.';

COMMIT;

-- DOWN
-- Sem DOWN automático: a função canônica pode estar ausente ou ter sido
-- materializada por uma migration anterior. Restaurar a implementação
-- anterior exige o schema efetivo do ambiente e deve ser feito forward-only.

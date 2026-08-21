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
  LIMIT 1;
  IF v_draft_id IS NOT NULL THEN RETURN v_draft_id; END IF;

  SELECT id INTO v_published_id
  FROM public.planos_acao_template_versoes
  WHERE template_id = p_template_id AND status = 'publicada'
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

COMMIT;

-- DOWN
-- DROP INDEX IF EXISTS public.idx_pa_template_items_responsible_role;
-- ALTER TABLE public.planos_acao_template_itens DROP COLUMN IF EXISTS recommended_responsible_role;
-- ALTER TABLE public.planos_acao_template_versoes DROP COLUMN IF EXISTS improvement_direction, DROP COLUMN IF EXISTS default_responsible_role;
-- ALTER TABLE public.planos_acao_templates DROP COLUMN IF EXISTS default_responsible_role;

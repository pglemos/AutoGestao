-- Módulo Administrador MX — campos do wizard de templates (paridade base44).
--
-- O form de template hoje é raso (problema/ação/como/prioridade/prazo/evidência).
-- O base44 monta o template com indicador real, direção de melhoria, problema/
-- objetivo/quando-aplicar da versão, material de apoio por ação (arquivo ou
-- aula da Universidade) com peso, e uma sugestão pronta pro Dono. Esta migration
-- adiciona essas colunas sem alterar o modelo (1 template → N versões → N itens)
-- nem duplicar catálogos que já existem (indicador reaproveita
-- catalogo_indicadores_planejamento; aula reaproveita treinamentos).
--
-- open_action_plan_template_revision (20260820233000) copia colunas dos itens
-- ao abrir uma revisão — precisa ser recriada para não perder material de
-- apoio/peso ao revisar um template publicado.

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. planos_acao_templates
-- ----------------------------------------------------------------------------

ALTER TABLE public.planos_acao_templates
  ADD COLUMN IF NOT EXISTS primary_indicator_code text REFERENCES public.catalogo_indicadores_planejamento(code) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS improvement_direction text CHECK (improvement_direction IS NULL OR improvement_direction IN ('aumentar', 'reduzir')),
  ADD COLUMN IF NOT EXISTS manual_application_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS owner_suggestion_enabled boolean NOT NULL DEFAULT false;

-- ----------------------------------------------------------------------------
-- 2. planos_acao_template_versoes
-- ----------------------------------------------------------------------------

ALTER TABLE public.planos_acao_template_versoes
  ADD COLUMN IF NOT EXISTS problem text,
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS when_to_apply text,
  ADD COLUMN IF NOT EXISTS owner_suggestion_title text,
  ADD COLUMN IF NOT EXISTS owner_suggestion_problem text,
  ADD COLUMN IF NOT EXISTS owner_suggestion_recommendation text,
  ADD COLUMN IF NOT EXISTS effectiveness_indicator_code text REFERENCES public.catalogo_indicadores_planejamento(code) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 3. planos_acao_template_itens
-- ----------------------------------------------------------------------------

ALTER TABLE public.planos_acao_template_itens
  ADD COLUMN IF NOT EXISTS support_material_type text NOT NULL DEFAULT 'nenhum' CHECK (support_material_type IN ('nenhum', 'arquivo', 'aula')),
  ADD COLUMN IF NOT EXISTS file_asset_path text,
  ADD COLUMN IF NOT EXISTS file_asset_name text,
  ADD COLUMN IF NOT EXISTS treinamento_id uuid REFERENCES public.treinamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS treinamento_titulo text,
  ADD COLUMN IF NOT EXISTS peso_bp integer CHECK (peso_bp IS NULL OR (peso_bp >= 0 AND peso_bp <= 10000));

-- ----------------------------------------------------------------------------
-- 4. open_action_plan_template_revision — copiar as colunas novas também
-- ----------------------------------------------------------------------------

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
    problem, objective, when_to_apply,
    owner_suggestion_title, owner_suggestion_problem, owner_suggestion_recommendation,
    effectiveness_indicator_code
  )
  SELECT p_template_id, v_version, 'rascunho', NULLIF(BTRIM(p_notes), ''), v_actor,
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
    treinamento_id, treinamento_titulo, peso_bp
  )
  SELECT v_draft_id, ordem, problema, acao, como, departamento, indicador,
         prioridade, prazo_dias, evidencia_requerida,
         support_material_type, file_asset_path, file_asset_name,
         treinamento_id, treinamento_titulo, peso_bp
  FROM public.planos_acao_template_itens
  WHERE version_id = v_published_id
  ORDER BY ordem, id;

  RETURN v_draft_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.open_action_plan_template_revision(uuid, text) TO authenticated;

COMMIT;

-- DOWN
-- ALTER TABLE public.planos_acao_templates DROP COLUMN IF EXISTS primary_indicator_code, DROP COLUMN IF EXISTS improvement_direction, DROP COLUMN IF EXISTS manual_application_enabled, DROP COLUMN IF EXISTS owner_suggestion_enabled;
-- ALTER TABLE public.planos_acao_template_versoes DROP COLUMN IF EXISTS problem, DROP COLUMN IF EXISTS objective, DROP COLUMN IF EXISTS when_to_apply, DROP COLUMN IF EXISTS owner_suggestion_title, DROP COLUMN IF EXISTS owner_suggestion_problem, DROP COLUMN IF EXISTS owner_suggestion_recommendation, DROP COLUMN IF EXISTS effectiveness_indicator_code;
-- ALTER TABLE public.planos_acao_template_itens DROP COLUMN IF EXISTS support_material_type, DROP COLUMN IF EXISTS file_asset_path, DROP COLUMN IF EXISTS file_asset_name, DROP COLUMN IF EXISTS treinamento_id, DROP COLUMN IF EXISTS treinamento_titulo, DROP COLUMN IF EXISTS peso_bp;

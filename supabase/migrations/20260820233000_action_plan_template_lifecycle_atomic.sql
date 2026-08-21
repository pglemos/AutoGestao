-- Ciclo de vida transacional dos templates de plano de ação.
BEGIN;

-- Reconcilia corridas históricas sem apagar conteúdo: o rascunho mais recente
-- permanece aberto e os demais ficam arquivados com nota auditável.
WITH ranked AS (
  SELECT id,
         row_number() OVER (PARTITION BY template_id ORDER BY versao DESC, created_at DESC, id DESC) AS position
  FROM public.planos_acao_template_versoes
  WHERE status = 'rascunho'
)
UPDATE public.planos_acao_template_versoes version
SET status = 'arquivada',
    notas = concat_ws(E'\n', NULLIF(BTRIM(version.notas), ''), '[AUTO_RECONCILED] Rascunho duplicado anterior ao índice único.'),
    updated_at = clock_timestamp()
FROM ranked
WHERE ranked.id = version.id
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pa_template_versao_rascunho
  ON public.planos_acao_template_versoes (template_id)
  WHERE status = 'rascunho';

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

  INSERT INTO public.planos_acao_template_versoes(template_id, versao, status, notas, created_by)
  VALUES (p_template_id, v_version, 'rascunho', NULLIF(BTRIM(p_notes), ''), v_actor)
  RETURNING id INTO v_draft_id;

  INSERT INTO public.planos_acao_template_itens(
    version_id, ordem, problema, acao, como, departamento, indicador,
    prioridade, prazo_dias, evidencia_requerida
  )
  SELECT v_draft_id, ordem, problema, acao, como, departamento, indicador,
         prioridade, prazo_dias, evidencia_requerida
  FROM public.planos_acao_template_itens
  WHERE version_id = v_published_id
  ORDER BY ordem, id;

  RETURN v_draft_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_action_plan_template(p_template_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NULL OR NOT public.eh_area_interna_mx(v_actor) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  PERFORM id FROM public.planos_acao_templates WHERE id = p_template_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TEMPLATE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  UPDATE public.planos_acao_template_versoes
  SET status = 'arquivada', updated_at = clock_timestamp()
  WHERE template_id = p_template_id AND status IN ('rascunho', 'publicada');

  UPDATE public.planos_acao_templates
  SET active = false, updated_at = clock_timestamp()
  WHERE id = p_template_id;
END;
$$;

REVOKE ALL ON FUNCTION public.open_action_plan_template_revision(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_action_plan_template(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.open_action_plan_template_revision(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_action_plan_template(uuid) TO authenticated;

COMMIT;

-- DOWN
-- DROP FUNCTION IF EXISTS public.open_action_plan_template_revision(uuid, text);
-- DROP FUNCTION IF EXISTS public.archive_action_plan_template(uuid);
-- DROP INDEX IF EXISTS public.uniq_pa_template_versao_rascunho;

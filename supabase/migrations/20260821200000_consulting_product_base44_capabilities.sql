-- CONS-20: metadata de ciclo de vida e matriz Base44 para produtos de consultoria.
-- A aparência continua sendo responsabilidade do design system MX; estes campos
-- preservam somente o contrato funcional persistido.

BEGIN;

ALTER TABLE public.programas_visita_consultoria
  ADD COLUMN IF NOT EXISTS evolution_group text NOT NULL DEFAULT 'CONSULTORIA_EVOLUTIVA_PRINCIPAL',
  ADD COLUMN IF NOT EXISTS modality_variant text,
  ADD COLUMN IF NOT EXISTS change_summary text,
  ADD COLUMN IF NOT EXISTS effective_from date;

ALTER TABLE public.programas_visita_consultoria
  DROP CONSTRAINT IF EXISTS programas_visita_status_check;
ALTER TABLE public.programas_visita_consultoria
  ADD CONSTRAINT programas_visita_status_check
  CHECK (status IN ('rascunho', 'em_revisao', 'publicado', 'suspenso_novas_contratacoes', 'arquivado'));

-- Compatibilidade com o catálogo MX já existente. O Base44 usa o grupo
-- `CONSULTORIA_EVOLUTIVA_PRINCIPAL` para a família PMR Online/Híbrido, mas o
-- catálogo histórico também contém PMR 7/9, PMR Plus e PPA. Não podemos
-- atribuir o grupo principal a todos os registros: isso faria o índice abaixo
-- falhar antes de a aplicação conseguir abrir `/produtos`.
UPDATE public.programas_visita_consultoria
SET evolution_group = CASE
  WHEN program_key IN ('pmr_online', 'pmr_hibrido') THEN 'CONSULTORIA_EVOLUTIVA_PRINCIPAL'
  WHEN program_key = 'pmr_plus' THEN 'CONSULTORIA_EVOLUTIVA_PMR_PLUS'
  WHEN program_key = 'ppa' THEN 'CONSULTORIA_EVOLUTIVA_PPA'
  ELSE 'CONSULTORIA_LEGADO_' || upper(regexp_replace(program_key, '[^a-zA-Z0-9]+', '_', 'g'))
END,
updated_at = now()
WHERE evolution_group = 'CONSULTORIA_EVOLUTIVA_PRINCIPAL';

-- O catálogo atual tem clientes no PMR Híbrido e nenhum cliente não arquivado
-- no PMR Online. Suspender o Online preserva contratos existentes e fecha a
-- regra Base44 de não manter as duas variantes PMR ativas simultaneamente.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.programas_visita_consultoria online
    JOIN public.programas_visita_consultoria hibrido
      ON hibrido.program_key = 'pmr_hibrido'
    WHERE online.program_key = 'pmr_online'
      AND online.status = 'publicado'
      AND online.active IS TRUE
      AND hibrido.status = 'publicado'
      AND hibrido.active IS TRUE
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.clientes_consultoria
      WHERE program_template_key = 'pmr_online'
        AND lower(coalesce(status, '')) <> 'arquivado'
    ) THEN
      RAISE EXCEPTION 'CONS-20: PMR Online e PMR Híbrido estão ativos e o PMR Online possui contratos; decisão manual necessária antes da migration.'
        USING ERRCODE = '23514';
    END IF;

    UPDATE public.programas_visita_consultoria
    SET status = 'suspenso_novas_contratacoes', active = false, updated_at = now()
    WHERE program_key = 'pmr_online';
  END IF;
END $$;

ALTER TABLE public.modulos_produto_consultoria
  ADD COLUMN IF NOT EXISTS module_code text,
  ADD COLUMN IF NOT EXISTS module_label text,
  ADD COLUMN IF NOT EXISTS menu_code text,
  ADD COLUMN IF NOT EXISTS menu_label text,
  ADD COLUMN IF NOT EXISTS release_stage text NOT NULL DEFAULT 'NA_ATIVACAO',
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'ATIVO',
  ADD COLUMN IF NOT EXISTS technical_status text NOT NULL DEFAULT 'DISPONIVEL',
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ATIVO';

ALTER TABLE public.modulos_produto_consultoria
  DROP CONSTRAINT IF EXISTS modulos_produto_release_stage_check,
  DROP CONSTRAINT IF EXISTS modulos_produto_visibility_check,
  DROP CONSTRAINT IF EXISTS modulos_produto_technical_status_check,
  DROP CONSTRAINT IF EXISTS modulos_produto_status_check;

ALTER TABLE public.modulos_produto_consultoria
  ADD CONSTRAINT modulos_produto_release_stage_check
    CHECK (release_stage IN ('ETAPA_1', 'ETAPA_2', 'ETAPA_3', 'ETAPA_4', 'NA_ATIVACAO', 'MANUAL', 'A_DEFINIR')),
  ADD CONSTRAINT modulos_produto_visibility_check
    CHECK (visibility IN ('ATIVO', 'EM_BREVE', 'VISIVEL_BLOQUEADO', 'OCULTO')),
  ADD CONSTRAINT modulos_produto_technical_status_check
    CHECK (technical_status IN ('DISPONIVEL', 'EM_HOMOLOGACAO', 'EM_DESENVOLVIMENTO', 'TEMPORARIAMENTE_INDISPONIVEL')),
  ADD CONSTRAINT modulos_produto_status_check
    CHECK (status IN ('ATIVO', 'INATIVO'));

CREATE INDEX IF NOT EXISTS idx_programas_consultoria_evolution_group
  ON public.programas_visita_consultoria (evolution_group, status, active);
CREATE INDEX IF NOT EXISTS idx_modulos_produto_hierarchy
  ON public.modulos_produto_consultoria (program_key, display_order, module_code, menu_code);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_programa_consultoria_publicado_por_grupo
  ON public.programas_visita_consultoria (evolution_group)
  WHERE status = 'publicado' AND active IS TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_modulo_produto_hierarquia
  ON public.modulos_produto_consultoria (program_key, module_code, menu_code)
  WHERE module_code IS NOT NULL AND menu_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.duplicate_consulting_product(
  p_source_key text,
  p_target_key text,
  p_target_name text,
  p_version integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_created_key text;
BEGIN
  IF v_actor IS NULL OR NOT public.eh_area_interna_mx(v_actor) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_target_key IS NULL OR p_target_key !~ '^[a-z0-9_]+$' THEN
    RAISE EXCEPTION 'INVALID_TARGET_KEY' USING ERRCODE = '22023';
  END IF;
  IF p_version IS NULL OR p_version < 1 THEN
    RAISE EXCEPTION 'INVALID_TARGET_VERSION' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.programas_visita_consultoria(
    program_key, name, descricao, modalidade, total_visits, min_presenciais,
    max_presenciais, usa_plano_estrategico, indicator_package_version_id,
    evolution_group, modality_variant, change_summary, effective_from,
    status, versao, active, published_at, published_by
  )
  SELECT
    p_target_key, COALESCE(NULLIF(BTRIM(p_target_name), ''), source.name), source.descricao,
    source.modalidade, source.total_visits, source.min_presenciais, source.max_presenciais,
    source.usa_plano_estrategico, source.indicator_package_version_id, source.evolution_group,
    source.modality_variant, source.change_summary, source.effective_from,
    'rascunho', p_version, true, NULL, NULL
  FROM public.programas_visita_consultoria AS source
  WHERE source.program_key = p_source_key
  RETURNING program_key INTO v_created_key;

  IF v_created_key IS NULL THEN
    RAISE EXCEPTION 'SOURCE_PRODUCT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.modulos_produto_consultoria(
    program_key, module_key, label, module_code, module_label, menu_code, menu_label,
    incluido, obrigatorio, etapa, visibilidade, release_stage, visibility,
    technical_status, display_order, status
  )
  SELECT
    p_target_key, module_key, label, module_code, module_label, menu_code, menu_label,
    incluido, obrigatorio, etapa, visibilidade, release_stage, visibility,
    technical_status, display_order, status
  FROM public.modulos_produto_consultoria
  WHERE program_key = p_source_key;

  INSERT INTO public.tempos_encontro_produto(
    program_key, visit_number, horas_online, horas_presencial, origem, observacao
  )
  SELECT p_target_key, visit_number, horas_online, horas_presencial, origem, observacao
  FROM public.tempos_encontro_produto
  WHERE program_key = p_source_key;

  RETURN v_created_key;
END;
$$;

REVOKE ALL ON FUNCTION public.duplicate_consulting_product(text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_consulting_product(text, text, text, integer) TO authenticated;

COMMENT ON COLUMN public.programas_visita_consultoria.evolution_group IS
  'Grupo de exclusividade comercial do produto, conforme o contrato Base44.';
COMMENT ON COLUMN public.modulos_produto_consultoria.visibility IS
  'Estado de exposição da capacidade: ativa, em breve, visível bloqueada ou oculta.';
COMMENT ON COLUMN public.modulos_produto_consultoria.technical_status IS
  'Disponibilidade técnica da capacidade para prévia e contratação.';

COMMIT;

-- DOWN
-- ALTER TABLE public.modulos_produto_consultoria
--   DROP COLUMN IF EXISTS module_code,
--   DROP COLUMN IF EXISTS module_label,
--   DROP COLUMN IF EXISTS menu_code,
--   DROP COLUMN IF EXISTS menu_label,
--   DROP COLUMN IF EXISTS release_stage,
--   DROP COLUMN IF EXISTS visibility,
--   DROP COLUMN IF EXISTS technical_status,
--   DROP COLUMN IF EXISTS display_order,
--   DROP COLUMN IF EXISTS status;
-- ALTER TABLE public.programas_visita_consultoria
--   DROP COLUMN IF EXISTS evolution_group,
--   DROP COLUMN IF EXISTS modality_variant,
--   DROP COLUMN IF EXISTS change_summary,
--   DROP COLUMN IF EXISTS effective_from;

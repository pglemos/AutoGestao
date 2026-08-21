-- CONS-20: origem da configuração da matriz de capacidades do produto.
-- Mantém a distinção Base44 entre padrão do produto e ajuste personalizado.

BEGIN;

ALTER TABLE public.modulos_produto_consultoria
  ADD COLUMN IF NOT EXISTS configuration_origin text NOT NULL DEFAULT 'PADRAO_PRODUTO';

ALTER TABLE public.modulos_produto_consultoria
  DROP CONSTRAINT IF EXISTS modulos_produto_configuration_origin_check;

ALTER TABLE public.modulos_produto_consultoria
  ADD CONSTRAINT modulos_produto_configuration_origin_check
  CHECK (configuration_origin IN ('PADRAO_PRODUTO', 'PERSONALIZADO_PRODUTO'));

-- Recria a RPC para que duplicação/nova versão preserve a origem de cada item.
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
    technical_status, display_order, status, configuration_origin
  )
  SELECT
    p_target_key, module_key, label, module_code, module_label, menu_code, menu_label,
    incluido, obrigatorio, etapa, visibilidade, release_stage, visibility,
    technical_status, display_order, status, configuration_origin
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

COMMENT ON COLUMN public.modulos_produto_consultoria.configuration_origin IS
  'Origem da configuração da capacidade: padrão do produto ou ajuste personalizado MX.';

COMMIT;

-- DOWN
-- ALTER TABLE public.modulos_produto_consultoria
--   DROP CONSTRAINT IF EXISTS modulos_produto_configuration_origin_check,
--   DROP COLUMN IF EXISTS configuration_origin;

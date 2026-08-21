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

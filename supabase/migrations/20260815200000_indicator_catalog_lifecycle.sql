-- Catálogo de indicadores — ciclo de vida e metadados de exibição.
--
-- Paridade com IndicatorDetailDrawer/CreateIndicatorWizard do Base44: o
-- indicador nasce rascunho, passa por revisão, é publicado e pode ser
-- desabilitado ou arquivado; além disso a MX controla se ele aparece no
-- Módulo Dono, com quantas casas decimais e em que frequência é medido.

ALTER TABLE public.catalogo_metricas_consultoria
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'publicado',
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS visivel_dono boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS casas_decimais smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS frequencia text NOT NULL DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS ano_inicial integer,
  ADD COLUMN IF NOT EXISTS ano_final integer;

ALTER TABLE public.catalogo_metricas_consultoria
  DROP CONSTRAINT IF EXISTS catalogo_metricas_status_check;
ALTER TABLE public.catalogo_metricas_consultoria
  ADD CONSTRAINT catalogo_metricas_status_check
  CHECK (status IN ('rascunho', 'em_revisao', 'publicado', 'desabilitado', 'arquivado'));

ALTER TABLE public.catalogo_metricas_consultoria
  DROP CONSTRAINT IF EXISTS catalogo_metricas_frequencia_check;
ALTER TABLE public.catalogo_metricas_consultoria
  ADD CONSTRAINT catalogo_metricas_frequencia_check
  CHECK (frequencia IN ('diaria', 'semanal', 'mensal', 'trimestral', 'anual'));

ALTER TABLE public.catalogo_metricas_consultoria
  DROP CONSTRAINT IF EXISTS catalogo_metricas_casas_check;
ALTER TABLE public.catalogo_metricas_consultoria
  ADD CONSTRAINT catalogo_metricas_casas_check
  CHECK (casas_decimais BETWEEN 0 AND 4);

ALTER TABLE public.catalogo_metricas_consultoria
  DROP CONSTRAINT IF EXISTS catalogo_metricas_vigencia_check;
ALTER TABLE public.catalogo_metricas_consultoria
  ADD CONSTRAINT catalogo_metricas_vigencia_check
  CHECK (ano_inicial IS NULL OR ano_final IS NULL OR ano_final >= ano_inicial);

CREATE INDEX IF NOT EXISTS idx_catalogo_metricas_status
  ON public.catalogo_metricas_consultoria (status, sort_order);

COMMENT ON COLUMN public.catalogo_metricas_consultoria.status IS
  'Ciclo de vida: rascunho → em_revisao → publicado → desabilitado/arquivado.';
COMMENT ON COLUMN public.catalogo_metricas_consultoria.visivel_dono IS
  'Se o indicador aparece no Módulo Dono.';
COMMENT ON COLUMN public.catalogo_metricas_consultoria.casas_decimais IS
  'Casas decimais na exibição (0 a 4).';
COMMENT ON COLUMN public.catalogo_metricas_consultoria.frequencia IS
  'Frequência de medição do indicador.';

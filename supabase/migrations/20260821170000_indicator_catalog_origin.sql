-- Origem operacional do catálogo para os filtros de paridade do Plano Estratégico.
-- Registros existentes são o catálogo MX já publicado; novos registros criados
-- pelo wizard são marcados como criação interna, sem copiar a taxonomia visual
-- do Base44 para o banco MX.

ALTER TABLE public.catalogo_metricas_consultoria
  ADD COLUMN IF NOT EXISTS created_origin text;

UPDATE public.catalogo_metricas_consultoria
SET created_origin = 'mx_padrao'
WHERE created_origin IS NULL OR created_origin NOT IN ('mx_padrao', 'criado_mx');

ALTER TABLE public.catalogo_metricas_consultoria
  ALTER COLUMN created_origin SET DEFAULT 'mx_padrao',
  ALTER COLUMN created_origin SET NOT NULL;

ALTER TABLE public.catalogo_metricas_consultoria
  DROP CONSTRAINT IF EXISTS catalogo_metricas_created_origin_check;

ALTER TABLE public.catalogo_metricas_consultoria
  ADD CONSTRAINT catalogo_metricas_created_origin_check
  CHECK (created_origin IN ('mx_padrao', 'criado_mx'));

COMMENT ON COLUMN public.catalogo_metricas_consultoria.created_origin IS
  'Origem do registro: catálogo padrão MX ou indicador criado pela equipe MX.';

-- DOWN
-- ALTER TABLE public.catalogo_metricas_consultoria
--   DROP CONSTRAINT IF EXISTS catalogo_metricas_created_origin_check;
-- ALTER TABLE public.catalogo_metricas_consultoria
--   DROP COLUMN IF EXISTS created_origin;

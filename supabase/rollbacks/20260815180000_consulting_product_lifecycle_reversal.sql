-- REVERSAL de 20260815180000_consulting_product_lifecycle.sql
-- Remove o ciclo de vida de produtos de consultoria (status/versão/capacidade)
-- e as tabelas de módulos padrão e tempos de encontro. Idempotente.

DROP TABLE IF EXISTS public.tempos_encontro_produto;
DROP TABLE IF EXISTS public.modulos_produto_consultoria;

ALTER TABLE public.programas_visita_consultoria
  DROP CONSTRAINT IF EXISTS programas_visita_presenciais_check;
ALTER TABLE public.programas_visita_consultoria
  DROP CONSTRAINT IF EXISTS programas_visita_status_check;

ALTER TABLE public.programas_visita_consultoria
  DROP COLUMN IF EXISTS published_by;
ALTER TABLE public.programas_visita_consultoria
  DROP COLUMN IF EXISTS published_at;
ALTER TABLE public.programas_visita_consultoria
  DROP COLUMN IF EXISTS usa_plano_estrategico;
ALTER TABLE public.programas_visita_consultoria
  DROP COLUMN IF EXISTS max_presenciais;
ALTER TABLE public.programas_visita_consultoria
  DROP COLUMN IF EXISTS min_presenciais;
ALTER TABLE public.programas_visita_consultoria
  DROP COLUMN IF EXISTS modalidade;
ALTER TABLE public.programas_visita_consultoria
  DROP COLUMN IF EXISTS descricao;
ALTER TABLE public.programas_visita_consultoria
  DROP COLUMN IF EXISTS versao;
ALTER TABLE public.programas_visita_consultoria
  DROP COLUMN IF EXISTS status;

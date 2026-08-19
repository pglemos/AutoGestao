-- Modalidade e escopo por encontro no modelo de jornada.
--
-- Hoje a modalidade existe só no programa (`programas_visita_consultoria.modalidade`
-- mais a faixa `min/max_presenciais`), o que diz quantos encontros são presenciais
-- mas não quais. O cronograma oficial define isso encontro a encontro: no PMR
-- Híbrido são 11 online e 2 presenciais, em posições determinadas; no PMR Plus e
-- no PPA nove encontros nascem com modalidade a definir, a combinar com o cliente.
--
-- Sem esse dado não há como agendar corretamente nem como verificar a pendência
-- "encontros futuros com modalidade a definir", que a consultoria precisa
-- resolver antes de ativar o cliente.
--
-- Valores vindos do cronograma de visitas v1.7 (PMR Online, PMR Híbrido,
-- ENCONTRO_PMR PLUS, ENCONTRO_PPA). `pmr_7` e `pmr_9` não constam do cronograma
-- e ficam sem modalidade por encontro até que o produto a defina.

BEGIN;

ALTER TABLE public.etapas_modelo_visita_consultoria
  ADD COLUMN IF NOT EXISTS modalidade text,
  ADD COLUMN IF NOT EXISTS escopo text;

ALTER TABLE public.etapas_modelo_visita_consultoria
  DROP CONSTRAINT IF EXISTS etapas_modelo_visita_modalidade_check;
ALTER TABLE public.etapas_modelo_visita_consultoria
  ADD CONSTRAINT etapas_modelo_visita_modalidade_check
  CHECK (modalidade IS NULL OR modalidade IN ('ONLINE', 'PRESENCIAL', 'A_DEFINIR'));

ALTER TABLE public.etapas_modelo_visita_consultoria
  DROP CONSTRAINT IF EXISTS etapas_modelo_visita_escopo_check;
ALTER TABLE public.etapas_modelo_visita_consultoria
  ADD CONSTRAINT etapas_modelo_visita_escopo_check
  CHECK (escopo IS NULL OR escopo IN ('EMPRESA', 'TODAS_LOJAS'));

WITH canonico(program_key, visit_number, modalidade, escopo) AS (
  VALUES
    ('pmr_online', 1, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 2, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 3, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 4, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 5, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 6, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 7, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 8, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 9, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 10, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 11, 'ONLINE', 'EMPRESA'),
    ('pmr_online', 12, 'ONLINE', 'EMPRESA'),
    ('pmr_hibrido', 1, 'PRESENCIAL', 'EMPRESA'),
    ('pmr_hibrido', 2, 'ONLINE', 'EMPRESA'),
    ('pmr_hibrido', 3, 'ONLINE', 'EMPRESA'),
    ('pmr_hibrido', 4, 'ONLINE', 'TODAS_LOJAS'),
    ('pmr_hibrido', 5, 'ONLINE', 'EMPRESA'),
    ('pmr_hibrido', 6, 'ONLINE', 'EMPRESA'),
    ('pmr_hibrido', 7, 'ONLINE', 'EMPRESA'),
    ('pmr_hibrido', 8, 'ONLINE', 'EMPRESA'),
    ('pmr_hibrido', 9, 'PRESENCIAL', 'EMPRESA'),
    ('pmr_hibrido', 10, 'ONLINE', 'EMPRESA'),
    ('pmr_hibrido', 11, 'ONLINE', 'EMPRESA'),
    ('pmr_hibrido', 12, 'ONLINE', 'EMPRESA'),
    ('pmr_plus', 1, 'A_DEFINIR', 'EMPRESA'),
    ('pmr_plus', 2, 'A_DEFINIR', 'EMPRESA'),
    ('pmr_plus', 3, 'A_DEFINIR', 'EMPRESA'),
    ('pmr_plus', 4, 'A_DEFINIR', 'EMPRESA'),
    ('pmr_plus', 5, 'A_DEFINIR', 'EMPRESA'),
    ('pmr_plus', 6, 'A_DEFINIR', 'EMPRESA'),
    ('pmr_plus', 7, 'A_DEFINIR', 'EMPRESA'),
    ('pmr_plus', 8, 'A_DEFINIR', 'EMPRESA'),
    ('pmr_plus', 9, 'A_DEFINIR', 'EMPRESA'),
    ('ppa', 1, 'A_DEFINIR', 'EMPRESA'),
    ('ppa', 2, 'A_DEFINIR', 'EMPRESA'),
    ('ppa', 3, 'A_DEFINIR', 'EMPRESA'),
    ('ppa', 4, 'A_DEFINIR', 'EMPRESA'),
    ('ppa', 5, 'A_DEFINIR', 'TODAS_LOJAS'),
    ('ppa', 6, 'A_DEFINIR', 'EMPRESA'),
    ('ppa', 7, 'A_DEFINIR', 'EMPRESA'),
    ('ppa', 8, 'A_DEFINIR', 'EMPRESA'),
    ('ppa', 9, 'A_DEFINIR', 'EMPRESA')
)
UPDATE public.etapas_modelo_visita_consultoria etapa
SET modalidade = canonico.modalidade,
    escopo = canonico.escopo,
    updated_at = now()
FROM canonico
WHERE etapa.program_key = canonico.program_key
  AND etapa.visit_number = canonico.visit_number;

COMMENT ON COLUMN public.etapas_modelo_visita_consultoria.modalidade IS
  'Modalidade do encontro no cronograma oficial. A_DEFINIR exige combinação com o cliente antes do agendamento.';
COMMENT ON COLUMN public.etapas_modelo_visita_consultoria.escopo IS
  'EMPRESA: encontro único para o cliente. TODAS_LOJAS: repete-se em cada unidade.';

COMMIT;

-- DOWN
-- ALTER TABLE public.etapas_modelo_visita_consultoria
--   DROP COLUMN IF EXISTS modalidade,
--   DROP COLUMN IF EXISTS escopo;

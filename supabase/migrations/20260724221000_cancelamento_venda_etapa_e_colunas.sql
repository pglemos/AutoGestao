-- Cancelamento de venda — Fase 2/4
-- Novo estágio terminal 'cancelada' em crm_etapa_funil (hoje só existe
-- 'ganho'/'perdido', nenhum estágio pós-fechamento) e colunas de rastreio
-- do cancelamento em oportunidades. valor_negociado/valor_troca NÃO são
-- tocados aqui — preserva o valor histórico da venda para auditoria e não
-- conflita com trg_oportunidades_prevent_valor_tamper.

-- ============================================================
-- UP
-- ============================================================
BEGIN;

ALTER TYPE public.crm_etapa_funil ADD VALUE IF NOT EXISTS 'cancelada';

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS cancelada_em timestamptz,
  ADD COLUMN IF NOT EXISTS cancelada_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text;

COMMENT ON COLUMN public.oportunidades.cancelada_em IS 'Timestamp do cancelamento da venda; NULL enquanto a venda está ativa.';
COMMENT ON COLUMN public.oportunidades.cancelada_por IS 'Usuário que executou o cancelamento (o próprio vendedor dentro do prazo, ou gerente/dono/admin da loja).';
COMMENT ON COLUMN public.oportunidades.motivo_cancelamento IS 'Motivo obrigatório informado no cancelamento da venda.';

CREATE INDEX IF NOT EXISTS idx_oportunidades_cancelada_em
  ON public.oportunidades (loja_id, cancelada_em)
  WHERE cancelada_em IS NOT NULL;

COMMIT;

-- ============================================================
-- DOWN (obrigatório — não delete este bloco)
-- ============================================================
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_oportunidades_cancelada_em;
-- ALTER TABLE public.oportunidades
--   DROP COLUMN IF EXISTS cancelada_em,
--   DROP COLUMN IF EXISTS cancelada_por,
--   DROP COLUMN IF EXISTS motivo_cancelamento;
-- COMMIT;
--
-- Remover o valor 'cancelada' de crm_etapa_funil requer recriar o tipo
-- (ver padrão de DOWN em 20260724220000_cancelamento_venda_evento_enum.sql),
-- só seguro se nenhuma linha em oportunidades usar etapa='cancelada'.
--
-- Validação pós-DOWN:
--   - Schema diff vs versão anterior deve ser zero
--   - Smoke tests existentes devem continuar verdes
-- ============================================================

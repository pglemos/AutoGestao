-- Cancelamento de venda — Fase 1/4
-- Novo tipo de evento comercial para registrar cancelamento como fato
-- compensatório, sem editar/apagar o evento 'venda_realizada' original
-- (eventos_comerciais é append-only por design).
--
-- Isolada em migration própria: Postgres não permite usar um valor de enum
-- na mesma transação em que ele foi criado (ALTER TYPE ... ADD VALUE).

-- ============================================================
-- UP
-- ============================================================
BEGIN;

ALTER TYPE public.crm_evento_tipo ADD VALUE IF NOT EXISTS 'venda_cancelada';

COMMIT;

-- ============================================================
-- DOWN (obrigatório — não delete este bloco)
-- ============================================================
-- Postgres não suporta DROP VALUE de enum. Reverter exige recriar o tipo
-- (só é seguro se nenhuma linha em eventos_comerciais usar 'venda_cancelada'):
--
-- BEGIN;
-- ALTER TYPE public.crm_evento_tipo RENAME TO crm_evento_tipo_old;
-- CREATE TYPE public.crm_evento_tipo AS ENUM (
--   'oportunidade_registrada','cliente_qualificado','agendamento_criado',
--   'atendimento_comercial_realizado','venda_realizada','proposta_enviada',
--   'retorno_realizado','entrega_realizada','garantia_registrada','pos_venda_realizado'
-- );
-- ALTER TABLE public.eventos_comerciais
--   ALTER COLUMN tipo_evento TYPE public.crm_evento_tipo USING tipo_evento::text::public.crm_evento_tipo;
-- DROP TYPE public.crm_evento_tipo_old;
-- COMMIT;
--
-- Validação pós-DOWN:
--   - Schema diff vs versão anterior deve ser zero
--   - Smoke tests existentes devem continuar verdes
-- ============================================================

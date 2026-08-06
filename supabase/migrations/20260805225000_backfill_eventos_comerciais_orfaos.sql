-- Backfill dos fatos comerciais que nunca viraram evento.
--
-- Enquanto a criação do evento era best-effort no cliente, toda falha de rede
-- deixava o registro principal sem o evento correspondente. Estado real em
-- 2026-08-05 (produção, contagem própria):
--
--   1  oportunidade em `ganho` sem `venda_realizada`
--   76 agendamentos `compareceu` sem `atendimento_comercial_realizado`
--   70 agendamentos com cliente e sem nenhum evento de criação
--
-- O backfill é determinístico e reexecutável: cada linha inserida carrega a
-- mesma `idempotency_key` que as RPCs transacionais usam, e o índice único
-- parcial impede segunda inserção. Rodar duas vezes não duplica nada.
--
-- Nenhum dado é apagado ou alterado — só inserção do que faltava.
-- Timestamps vêm do fato real (closed_at / data_hora / created_at), nunca de
-- now(): a competência do evento tem que bater com a do fato.

-- 1. Venda realizada faltante em oportunidade ganha ---------------------------

INSERT INTO public.eventos_comerciais (
  cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento, canal,
  origem_modulo, observacao, data_evento, data_competencia, created_by,
  idempotency_key
)
SELECT
  o.cliente_id,
  o.id,
  o.loja_id,
  o.seller_user_id,
  'venda_realizada'::public.crm_evento_tipo,
  o.canal,
  coalesce(o.origem_modulo, 'crm'),
  'Evento reconciliado pelo backfill de 2026-08-05 (venda registrada sem evento).',
  coalesce(o.closed_at, o.updated_at, o.created_at),
  coalesce(o.data_competencia, (coalesce(o.closed_at, o.updated_at, o.created_at))::date),
  o.created_by,
  'crm:venda_realizada:' || o.id::text
FROM public.oportunidades o
WHERE o.etapa = 'ganho'
  AND NOT EXISTS (
    SELECT 1 FROM public.eventos_comerciais e
     WHERE e.oportunidade_id = o.id
       AND e.tipo_evento = 'venda_realizada'
  )
ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

-- 2. Atendimento comercial faltante em agendamento com comparecimento --------

INSERT INTO public.eventos_comerciais (
  cliente_id, oportunidade_id, agendamento_id, loja_id, seller_user_id,
  tipo_evento, canal, origem_modulo, observacao, data_evento, data_competencia,
  created_by, idempotency_key
)
SELECT
  a.cliente_id,
  a.oportunidade_id,
  a.id,
  a.loja_id,
  a.seller_user_id,
  'atendimento_comercial_realizado'::public.crm_evento_tipo,
  a.canal,
  coalesce(a.origem_modulo, 'crm'),
  'Evento reconciliado pelo backfill de 2026-08-05 (comparecimento sem evento).',
  coalesce(a.data_hora, a.updated_at, a.created_at),
  coalesce(a.data_competencia, (coalesce(a.data_hora, a.updated_at, a.created_at))::date),
  a.created_by,
  'crm:atendimento_comercial_realizado:' || a.id::text
FROM public.agendamentos a
WHERE a.status = 'compareceu'
  AND a.cliente_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.eventos_comerciais e
     WHERE e.agendamento_id = a.id
       AND e.tipo_evento = 'atendimento_comercial_realizado'
  )
ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

-- 3. Evento de criação faltante no agendamento --------------------------------

INSERT INTO public.eventos_comerciais (
  cliente_id, oportunidade_id, agendamento_id, loja_id, seller_user_id,
  tipo_evento, canal, origem_modulo, observacao, data_evento, data_competencia,
  created_by, idempotency_key
)
SELECT
  a.cliente_id,
  a.oportunidade_id,
  a.id,
  a.loja_id,
  a.seller_user_id,
  public.crm_evento_de_agendamento(a.tipo),
  a.canal,
  coalesce(a.origem_modulo, 'crm'),
  'Evento reconciliado pelo backfill de 2026-08-05 (agendamento sem evento de criação).',
  a.created_at,
  coalesce(a.data_competencia, a.created_at::date),
  a.created_by,
  'crm:' || public.crm_evento_de_agendamento(a.tipo)::text || ':' || a.id::text
FROM public.agendamentos a
WHERE a.cliente_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.eventos_comerciais e
     WHERE e.agendamento_id = a.id
       AND e.tipo_evento = public.crm_evento_de_agendamento(a.tipo)
  )
ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

-- 4. Registro do que foi reconciliado ----------------------------------------

DO $$
DECLARE
  v_total integer;
BEGIN
  SELECT count(*) INTO v_total
    FROM public.eventos_comerciais
   WHERE observacao LIKE 'Evento reconciliado pelo backfill de 2026-08-05%';
  RAISE NOTICE 'Backfill de eventos comerciais: % eventos reconciliados no total.', v_total;
END;
$$;

-- DOWN (compensatória, forward-only):
-- Os eventos criados aqui são identificáveis por
--   observacao LIKE 'Evento reconciliado pelo backfill de 2026-08-05%'
-- Remover só sob decisão explícita do dono do dado — são fatos comerciais
-- reais que estavam faltando, não lixo técnico:
--   DELETE FROM public.eventos_comerciais
--    WHERE observacao LIKE 'Evento reconciliado pelo backfill de 2026-08-05%';

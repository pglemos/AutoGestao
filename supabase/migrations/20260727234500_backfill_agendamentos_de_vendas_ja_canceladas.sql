-- Migration: 20260727234500_backfill_agendamentos_de_vendas_ja_canceladas.sql
--
-- `cancelar_venda` só passou a encerrar agendamentos em 20260727230000. As
-- vendas canceladas antes disso continuaram com agendamento aberto, gerando
-- "visita confirmada" de uma venda que não existe mais.
--
-- Aplica o mesmo tratamento da RPC (Opção B): marcador canônico em
-- `observacoes`, `proxima_acao` esvaziada, status preservado, um evento por
-- agendamento encerrado. Nada é apagado.
--
-- Idempotente: o filtro `NOT LIKE '[ENCERRADO:venda_cancelada]%'` impede
-- remarcar. `created_by` fica NULL de propósito — o encerramento é do sistema,
-- não de um usuário, e atribuí-lo a `cancelada_por` fingiria uma ação que a
-- pessoa não fez.

BEGIN;

WITH encerrados AS (
  UPDATE public.agendamentos a
     SET observacoes = '[ENCERRADO:venda_cancelada] '
                       || coalesce(o.motivo_cancelamento, 'Venda cancelada')
                       || coalesce(' | ' || nullif(a.observacoes, ''), ''),
         proxima_acao = NULL,
         updated_at = now()
    FROM public.oportunidades o
   WHERE a.oportunidade_id = o.id
     AND o.etapa = 'cancelada'
     AND a.status IN ('confirmado', 'aguardando')
     AND coalesce(a.observacoes, '') NOT LIKE '[ENCERRADO:venda_cancelada]%'
  RETURNING a.id, a.cliente_id, a.loja_id, a.seller_user_id, o.id AS oportunidade_id,
            coalesce(o.motivo_cancelamento, 'Venda cancelada') AS motivo
)
INSERT INTO public.eventos_comerciais (
  cliente_id, oportunidade_id, agendamento_id, loja_id, seller_user_id,
  tipo_evento, observacao, origem_modulo
)
SELECT e.cliente_id, e.oportunidade_id, e.id, e.loja_id, e.seller_user_id,
       'venda_cancelada',
       '[ENCERRADO:venda_cancelada] agendamento encerrado (backfill): ' || e.motivo,
       'crm'
  FROM encerrados e;

-- Próxima ação de cliente cuja única oportunidade foi cancelada.
UPDATE public.clientes c
   SET proxima_acao = NULL,
       proxima_acao_em = NULL,
       updated_at = now()
 WHERE (c.proxima_acao IS NOT NULL OR c.proxima_acao_em IS NOT NULL)
   AND EXISTS (
     SELECT 1 FROM public.oportunidades o
      WHERE o.cliente_id = c.id AND o.etapa = 'cancelada'
   )
   AND NOT EXISTS (
     SELECT 1 FROM public.oportunidades o
      WHERE o.cliente_id = c.id
        AND o.etapa::text NOT IN ('ganho', 'perdido', 'cancelada')
   );

COMMIT;

-- ============================================================
-- DOWN
-- ============================================================
-- Não há reversão automática: o marcador e os eventos são fato histórico.
-- Para identificar o que este backfill tocou:
--   SELECT * FROM public.eventos_comerciais
--    WHERE observacao LIKE '[ENCERRADO:venda_cancelada] agendamento encerrado (backfill)%';

-- Estorna os 4 cancelamentos de venda do GUSTAVO OLIVEIRA GOMES na TREND AUTO.
--
-- Contexto: a unificação indevida dos dois GUSTAVO jogou as vendas dele no
-- cadastro do outro. O gestor viu vendas alheias no cadastro e cancelou as
-- quatro, com o motivo "Venda feita por outro vendedor." — premissa falsa
-- criada pelo merge, já desfeito. As vendas são reais e são dele.
--
-- `d1_audit_log` registra que as quatro estavam em `ganho` antes do
-- cancelamento (tipo_alteracao = 'cancelamento_venda', valor_anterior='ganho').
-- O estorno devolve exatamente esse estado e deixa a própria trilha.
--
-- Não recuperável: `proxima_acao` dos agendamentos foi zerada pelo
-- cancelamento e o valor anterior não foi registrado em lugar nenhum.

BEGIN;

CREATE TEMP TABLE _alvo AS
SELECT o.id AS oportunidade_id, o.cliente_id
FROM public.oportunidades o
JOIN public.usuarios u ON u.id = o.seller_user_id
WHERE u.email = 'gustavobirotrendauto@gmail.com'
  AND o.etapa::text = 'cancelada'
  AND o.cancelada_em::date = DATE '2026-08-27';

DO $$
DECLARE v_n integer;
BEGIN
  SELECT count(*) INTO v_n FROM _alvo;
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'Esperava 4 vendas canceladas para estornar, encontrei %. Abortado.', v_n;
  END IF;
END $$;

-- 1. Trilha do estorno, antes de mexer no dado.
INSERT INTO public.d1_audit_log (usuario_id, cliente_id, data_hora_alteracao, tipo_alteracao, valor_anterior, valor_novo)
SELECT
  (SELECT id FROM public.usuarios WHERE email='synvollt@gmail.com'),
  a.cliente_id,
  now(),
  'estorno_cancelamento_venda',
  'cancelada',
  'ganho'
FROM _alvo a;

-- 2. Oportunidade volta a ser venda ganha.
UPDATE public.oportunidades o
SET etapa = 'ganho',
    cancelada_em = NULL,
    cancelada_por = NULL,
    motivo_cancelamento = NULL,
    updated_at = now()
WHERE o.id IN (SELECT oportunidade_id FROM _alvo);

-- 3. Some o marcador de encerramento das observações dos agendamentos.
UPDATE public.agendamentos a
SET observacoes = nullif(trim(regexp_replace(
      a.observacoes,
      '^\[ENCERRADO:venda_cancelada\][^|]*\|?\s*', '')), ''),
    updated_at = now()
WHERE a.oportunidade_id IN (SELECT oportunidade_id FROM _alvo)
  AND coalesce(a.observacoes, '') LIKE '[ENCERRADO:venda_cancelada]%';

-- 4. Os eventos de cancelamento registram um fato que não aconteceu.
DELETE FROM public.eventos_comerciais e
WHERE e.tipo_evento = 'venda_cancelada'
  AND e.oportunidade_id IN (SELECT oportunidade_id FROM _alvo);

COMMIT;

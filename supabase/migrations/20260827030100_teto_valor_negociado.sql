-- Teto de valor para negociação de veículo, no banco.
--
-- O schema Zod barra no formulário, mas nem toda escrita passa por ele:
-- importação, RPC e correção manual chegam direto na tabela. Sem o CHECK, o
-- erro de escala volta pelo caminho sem validação.
--
-- R$ 10 milhões é teto de sanidade contra zeros sobrando, não julgamento de
-- preço: a maior venda real do sistema é R$ 239.990.
--
-- NOT VALID: a linha da IMPÉRIO (GWM HAVAL H6 2025) segue pendente de revisão
-- própria e não deve bloquear a criação da constraint. A regra passa a valer
-- para toda inserção e atualização daqui em diante.
ALTER TABLE public.oportunidades
  DROP CONSTRAINT IF EXISTS oportunidades_valor_negociado_teto;

ALTER TABLE public.oportunidades
  ADD CONSTRAINT oportunidades_valor_negociado_teto
  CHECK (valor_negociado IS NULL OR valor_negociado <= 10000000)
  NOT VALID;

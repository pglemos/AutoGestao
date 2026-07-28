-- Migration: 20260727210000_clientes_oportunidades_classifica_cancelada.sql
--
-- A view de compatibilidade `public.clientes_oportunidades` classificava
-- qualquer etapa fora de 'ganho'/'perdido' como 'ativa'. Depois que o enum
-- `crm_etapa_funil` ganhou o valor 'cancelada' (venda faturada e depois
-- revertida), toda venda cancelada voltava a aparecer como oportunidade ativa
-- para os consumidores da view:
--   - src/pages/FunilVendedor.tsx
--   - src/features/vendedor-treinamentos/hooks/useVendedorTreinamentos.ts
--   - src/features/crm/lib/funil-vendas-diagnostico.ts (isSoldCustomer)
--
-- `cancelada` é um estado terminal próprio — não é sinônimo de 'perdido':
-- a venda existiu, foi faturada e depois revertida, e essa diferença governa
-- comissão, performance e estratégia de recuperação.
--
-- A view continua `security_invoker = true`: o RLS de `oportunidades` segue
-- sendo a barreira de acesso. Nenhuma coluna é removida nem renomeada — só o
-- CASE de `status_oportunidade` ganha um ramo. Mudança retrocompatível.

CREATE OR REPLACE VIEW public.clientes_oportunidades
WITH (security_invoker = true)
AS
SELECT
  id,
  cliente_id,
  seller_user_id,
  loja_id,
  canal,
  etapa,
  etapa = 'ganho'::crm_etapa_funil AS vendido,
  CASE
    WHEN etapa = 'ganho'::crm_etapa_funil     THEN 'vendido'::text
    WHEN etapa = 'perdido'::crm_etapa_funil   THEN 'perdido'::text
    WHEN etapa = 'cancelada'::crm_etapa_funil THEN 'cancelada'::text
    ELSE 'ativa'::text
  END AS status_oportunidade,
  closed_at AS data_venda,
  valor_negociado,
  created_at,
  updated_at
FROM public.oportunidades o;

COMMENT ON VIEW public.clientes_oportunidades IS
  'View de compatibilidade sobre public.oportunidades. security_invoker=true: '
  'o RLS de oportunidades é a barreira de acesso. status_oportunidade tem quatro '
  'valores terminais/ativos: vendido, perdido, cancelada, ativa.';

GRANT SELECT ON public.clientes_oportunidades TO authenticated;

-- ============================================================
-- DOWN
-- ============================================================
-- BEGIN;
-- CREATE OR REPLACE VIEW public.clientes_oportunidades
-- WITH (security_invoker = true)
-- AS
-- SELECT
--   id, cliente_id, seller_user_id, loja_id, canal, etapa,
--   etapa = 'ganho'::crm_etapa_funil AS vendido,
--   CASE
--     WHEN etapa = 'ganho'::crm_etapa_funil   THEN 'vendido'::text
--     WHEN etapa = 'perdido'::crm_etapa_funil THEN 'perdido'::text
--     ELSE 'ativa'::text
--   END AS status_oportunidade,
--   closed_at AS data_venda, valor_negociado, created_at, updated_at
-- FROM public.oportunidades o;
-- GRANT SELECT ON public.clientes_oportunidades TO authenticated;
-- COMMIT;

-- Cliente com oportunidade ganha passa a ser pós-venda, venha a venda de onde vier.
--
-- PROBLEMA
-- `clientes.status = 'pos_venda'` só era gravado por UM caminho: resolver uma
-- ação da Central de Execução com `p_result_code = 'sale_completed'`. Qualquer
-- outro fluxo que marque a oportunidade como ganha — venda direta, fechamento
-- diário, edição da oportunidade na carteira — deixava o cliente parado em
-- `oportunidade`.
--
-- Resultado: duas fontes de verdade para "esse cliente comprou?". O Ranking
-- conta o evento oficial da venda; o Mentor Comercial conta `clientes.status`.
-- Os dois discordavam na tela do vendedor.
--
-- Medido em produção em 2026-08-28, antes desta migration:
--   523 oportunidades ganhas, 500 clientes distintos
--   362 desses clientes com status != 'pos_venda'  (72%)
--   360 em 'oportunidade' e 2 em 'inativo'
--   28 lojas afetadas
--
-- DECISÃO
-- O invariante passa a ser garantido pelo banco, não por qual tela o vendedor
-- usou. Um trigger cobre todo caminho de escrita, presente e futuro.
--
-- `inativo` NÃO é promovido: desativar um cliente é ato deliberado do vendedor
-- e pode ser posterior à venda. Sobrescrever isso apagaria uma decisão humana.
-- Os 2 casos ficam de fora, de propósito.

CREATE OR REPLACE FUNCTION public.sincronizar_cliente_pos_venda()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.etapa IS DISTINCT FROM 'ganho'::public.crm_etapa_funil THEN
    RETURN NEW;
  END IF;

  UPDATE public.clientes c
     SET status = 'pos_venda'::public.crm_cliente_status,
         updated_at = now()
   WHERE c.id = NEW.cliente_id
     AND c.status IN (
       'oportunidade'::public.crm_cliente_status,
       'ativo'::public.crm_cliente_status,
       'aguardando_contato'::public.crm_cliente_status
     );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sincronizar_cliente_pos_venda() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_cliente_pos_venda_segue_oportunidade ON public.oportunidades;

CREATE TRIGGER trg_cliente_pos_venda_segue_oportunidade
AFTER INSERT OR UPDATE OF etapa ON public.oportunidades
FOR EACH ROW
EXECUTE FUNCTION public.sincronizar_cliente_pos_venda();

-- Correção do histórico: mesma regra do trigger, aplicada ao que já está torto.
-- `inativo` continua intocado.
UPDATE public.clientes c
   SET status = 'pos_venda'::public.crm_cliente_status,
       updated_at = now()
 WHERE c.status IN (
         'oportunidade'::public.crm_cliente_status,
         'ativo'::public.crm_cliente_status,
         'aguardando_contato'::public.crm_cliente_status
       )
   AND EXISTS (
     SELECT 1
       FROM public.oportunidades o
      WHERE o.cliente_id = c.id
        AND o.etapa = 'ganho'::public.crm_etapa_funil
   );

-- ============================================================
-- DOWN
--
-- O trigger sai. O backfill NÃO é desfeito em massa: reverter os 360 clientes
-- para `oportunidade` apagaria junto as promoções legítimas que a Central de
-- Execução já tinha feito, e depois do fato não há como separar umas das outras
-- — `updated_at` foi reescrito pelo próprio backfill. Para desfazer os dados,
-- restaure `clientes.status` de um snapshot anterior a 2026-08-28.
--
-- DROP TRIGGER IF EXISTS trg_cliente_pos_venda_segue_oportunidade ON public.oportunidades;
-- DROP FUNCTION IF EXISTS public.sincronizar_cliente_pos_venda();
-- ============================================================

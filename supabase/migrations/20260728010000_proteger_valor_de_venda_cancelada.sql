-- Migration: 20260728010000_proteger_valor_de_venda_cancelada.sql
--
-- `prevent_valor_negociado_tamper_after_close` só protegia `OLD.etapa = 'ganho'`.
-- Depois de cancelar, a etapa vira 'cancelada' e a proteção sumia: qualquer
-- vendedor podia alterar `valor_negociado` e `valor_troca` de uma venda que
-- existiu e foi revertida — exatamente o registro que sustenta auditoria,
-- comissão e conciliação de performance.
--
-- A venda cancelada é um fato histórico fechado. O valor dela não muda mais,
-- pelo mesmo motivo e com as mesmas exceções da venda concluída
-- (administrador MX, gerente ou dono da loja).
--
-- Também estende o snapshot de funil com a contagem de canceladas: sem isso
-- o gerente vê `oportunidades_total` cair sem nenhuma linha explicando para
-- onde a venda foi. Campo aditivo dentro de um jsonb — nenhum consumidor
-- existente quebra.

CREATE OR REPLACE FUNCTION public.prevent_valor_negociado_tamper_after_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF OLD.etapa::text IN ('ganho', 'cancelada')
     AND (
       NEW.valor_negociado IS DISTINCT FROM OLD.valor_negociado
       OR NEW.valor_troca IS DISTINCT FROM OLD.valor_troca
     )
     AND NOT (
       public.eh_administrador_mx(auth.uid())
       OR public.is_manager_of(OLD.loja_id)
       OR public.is_owner_of(OLD.loja_id)
     )
  THEN
    RAISE EXCEPTION 'Não é possível alterar o valor negociado de uma venda já concluída ou cancelada. Fale com o gerente da loja.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.prevent_valor_negociado_tamper_after_close() IS
  'Impede alteração de valor_negociado/valor_troca depois que a oportunidade '
  'virou fato financeiro fechado (ganho ou cancelada). Exceções: administrador '
  'MX, gerente e dono da loja. Anexada em trg_oportunidades_prevent_valor_tamper.';

-- ============================================================
-- DOWN
-- ============================================================
-- BEGIN;
-- CREATE OR REPLACE FUNCTION public.prevent_valor_negociado_tamper_after_close()
-- RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
-- AS $function$
-- BEGIN
--   IF OLD.etapa::text = 'ganho'
--      AND (NEW.valor_negociado IS DISTINCT FROM OLD.valor_negociado
--           OR NEW.valor_troca IS DISTINCT FROM OLD.valor_troca)
--      AND NOT (public.eh_administrador_mx(auth.uid())
--               OR public.is_manager_of(OLD.loja_id)
--               OR public.is_owner_of(OLD.loja_id))
--   THEN
--     RAISE EXCEPTION 'Não é possível alterar o valor negociado de uma venda já concluída. Fale com o gerente da loja.'
--       USING ERRCODE = 'P0001';
--   END IF;
--   RETURN NEW;
-- END;
-- $function$;
-- COMMIT;

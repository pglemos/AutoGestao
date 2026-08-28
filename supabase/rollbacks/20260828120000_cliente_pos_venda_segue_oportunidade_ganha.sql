-- Reversão: volta a deixar `clientes.status` fora de sincronia com a oportunidade ganha.
--
-- O trigger sai. O backfill NÃO é desfeito em massa: reverter 360 clientes para
-- `oportunidade` apagaria também as promoções legítimas feitas pela Central de
-- Execução no mesmo estado, e não há como distinguir umas das outras depois do
-- fato — `updated_at` foi reescrito pelo próprio backfill.
--
-- Se for mesmo necessário desfazer os dados, restaure `clientes.status` a partir
-- de um snapshot anterior a 2026-08-28, e não daqui.

DROP TRIGGER IF EXISTS trg_cliente_pos_venda_segue_oportunidade ON public.oportunidades;

DROP FUNCTION IF EXISTS public.sincronizar_cliente_pos_venda();

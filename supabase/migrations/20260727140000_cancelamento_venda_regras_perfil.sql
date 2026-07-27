-- Cancelamento de venda — regras por perfil
--
-- Atualiza a RPC cancelar_venda com as regras de negócio:
--   Vendedor:      só a própria venda, mesmo mês do fechamento
--   Gerente:       qualquer data, da sua loja
--   Dono:          qualquer data, das suas lojas
--   Admin MX /    qualquer data, todas as lojas
--   Admin Geral /
--   Consultor MX

CREATE OR REPLACE FUNCTION public.cancelar_venda(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_oportunidade_id uuid := nullif(p_payload->>'oportunidade_id', '')::uuid;
  v_motivo text := nullif(trim(coalesce(p_payload->>'motivo', '')), '');
  v_op record;
  v_is_privileged boolean;
  v_is_vendedor_mesmo_mes boolean;
  v_evento_id uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
  END IF;

  IF v_oportunidade_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda (oportunidade_id) é obrigatória.');
  END IF;

  IF v_motivo IS NULL OR length(v_motivo) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Motivo do cancelamento é obrigatório (mínimo 10 caracteres).');
  END IF;

  SELECT * INTO v_op FROM public.oportunidades WHERE id = v_oportunidade_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
  END IF;

  IF v_op.etapa::text <> 'ganho' OR v_op.cancelada_em IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Venda não está em estado cancelável.');
  END IF;

  v_is_privileged := public.eh_area_interna_mx(v_caller_id)
    OR public.is_manager_of(v_op.loja_id)
    OR public.is_owner_of(v_op.loja_id);

  v_is_vendedor_mesmo_mes := v_op.seller_user_id = v_caller_id
    AND v_op.closed_at IS NOT NULL
    AND date_trunc('month', v_op.closed_at) = date_trunc('month', now());

  IF NOT (v_is_privileged OR v_is_vendedor_mesmo_mes) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão para cancelar esta venda (vendedor só pode cancelar vendas do mesmo mês).');
  END IF;

  UPDATE public.oportunidades
     SET etapa = 'cancelada',
         cancelada_em = now(),
         cancelada_por = v_caller_id,
         motivo_cancelamento = v_motivo,
         updated_at = now(),
         updated_by = v_caller_id
   WHERE id = v_oportunidade_id;

  INSERT INTO public.eventos_comerciais (
    cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento,
    observacao, origem_modulo, created_by
  ) VALUES (
    v_op.cliente_id, v_op.id, v_op.loja_id, v_op.seller_user_id, 'venda_cancelada',
    v_motivo, 'crm', v_caller_id
  ) RETURNING id INTO v_evento_id;

  INSERT INTO public.d1_audit_log (
    usuario_id, cliente_id, tipo_alteracao, valor_anterior, valor_novo
  ) VALUES (
    v_caller_id, v_op.cliente_id::text, 'cancelamento_venda', 'ganho', 'cancelada'
  );

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'oportunidade_id', v_op.id, 'evento_id', v_evento_id
  ));
END;
$function$;

REVOKE ALL ON FUNCTION public.cancelar_venda(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancelar_venda(jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- DOWN
-- ============================================================
-- BEGIN;
-- REVOKE ALL ON FUNCTION public.cancelar_venda(jsonb) FROM authenticated;
-- CREATE OR REPLACE FUNCTION public.cancelar_venda(p_payload jsonb)
-- RETURNS jsonb
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $function$
-- DECLARE
--   v_caller_id uuid := auth.uid();
--   v_oportunidade_id uuid := nullif(p_payload->>'oportunidade_id', '')::uuid;
--   v_motivo text := nullif(trim(coalesce(p_payload->>'motivo', '')), '');
--   v_op record;
--   v_is_privileged boolean;
--   v_is_owner_in_window boolean;
--   v_evento_id uuid;
-- BEGIN
--   IF v_caller_id IS NULL THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
--   END IF;
--   IF v_oportunidade_id IS NULL THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'Venda (oportunidade_id) é obrigatória.');
--   END IF;
--   IF v_motivo IS NULL OR length(v_motivo) < 10 THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'Motivo do cancelamento é obrigatório (mínimo 10 caracteres).');
--   END IF;
--   SELECT * INTO v_op FROM public.oportunidades WHERE id = v_oportunidade_id FOR UPDATE;
--   IF NOT FOUND THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'Venda não encontrada.');
--   END IF;
--   IF v_op.etapa::text <> 'ganho' OR v_op.cancelada_em IS NOT NULL THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'Venda não está em estado cancelável.');
--   END IF;
--   v_is_privileged := public.eh_administrador_mx(v_caller_id)
--     OR public.is_manager_of(v_op.loja_id)
--     OR public.is_owner_of(v_op.loja_id);
--   v_is_owner_in_window := v_op.seller_user_id = v_caller_id
--     AND v_op.closed_at IS NOT NULL
--     AND now() - v_op.closed_at <= interval '7 days';
--   IF NOT (v_is_privileged OR v_is_owner_in_window) THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão para cancelar esta venda (fora do prazo de 7 dias ou não é o vendedor responsável).');
--   END IF;
--   UPDATE public.oportunidades
--      SET etapa = 'cancelada',
--          cancelada_em = now(),
--          cancelada_por = v_caller_id,
--          motivo_cancelamento = v_motivo,
--          updated_at = now(),
--          updated_by = v_caller_id
--    WHERE id = v_oportunidade_id;
--   INSERT INTO public.eventos_comerciais (
--     cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento,
--     observacao, origem_modulo, created_by
--   ) VALUES (
--     v_op.cliente_id, v_op.id, v_op.loja_id, v_op.seller_user_id, 'venda_cancelada',
--     v_motivo, 'crm', v_caller_id
--   ) RETURNING id INTO v_evento_id;
--   INSERT INTO public.d1_audit_log (
--     usuario_id, cliente_id, tipo_alteracao, valor_anterior, valor_novo
--   ) VALUES (
--     v_caller_id, v_op.cliente_id::text, 'cancelamento_venda', 'ganho', 'cancelada'
--   );
--   RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object(
--     'oportunidade_id', v_op.id, 'evento_id', v_evento_id
--   ));
-- END;
-- $function$;
-- REVOKE ALL ON FUNCTION public.cancelar_venda(jsonb) FROM PUBLIC;
-- GRANT EXECUTE ON FUNCTION public.cancelar_venda(jsonb) TO authenticated;
-- NOTIFY pgrst, 'reload schema';
-- COMMIT;
-- ============================================================

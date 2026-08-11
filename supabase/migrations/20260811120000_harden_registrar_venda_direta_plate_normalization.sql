-- Migration: Harden registrar_venda_direta plate normalization & duplicate prevention
-- Date: 2026-08-11

CREATE OR REPLACE FUNCTION public.registrar_venda_direta(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_caller_id uuid := auth.uid();
  v_store_id uuid := nullif(p_payload->>'store_id', '')::uuid;
  v_phone text := nullif(regexp_replace(coalesce(p_payload->>'telefone', ''), '\D', '', 'g'), '');
  v_nome text := nullif(trim(coalesce(p_payload->>'nome', '')), '');
  v_competencia date := coalesce(nullif(p_payload->>'data_competencia', '')::date, timezone('America/Sao_Paulo', now())::date);
  v_key text := nullif(trim(coalesce(p_payload->>'idempotency_key', '')), '');
  v_norm_placa text := regexp_replace(upper(trim(coalesce(p_payload->>'placa', ''))), '[^A-Z0-9]', '', 'g');
  v_cliente_id uuid;
  v_oportunidade_id uuid;
  v_existing_etapa text;
  v_evento_id uuid;
  v_agendamento_id uuid;
  v_fechamento_id uuid := nullif(p_payload->>'fechamento_id', '')::uuid;
  v_cliente_existente boolean := false;
  v_canal public.crm_canal;
  v_financiamento public.crm_financiamento;
  v_closed_at timestamptz;
BEGIN
  IF v_caller_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.'); END IF;

  IF v_store_id IS NULL THEN
    SELECT store_id INTO v_store_id
      FROM public.vendedores_loja
     WHERE seller_user_id = v_caller_id AND coalesce(is_active, true)
     ORDER BY started_at DESC NULLS LAST LIMIT 1;
  ELSIF NOT EXISTS (
    SELECT 1 FROM public.vendedores_loja
     WHERE seller_user_id = v_caller_id
       AND store_id = v_store_id
       AND coalesce(is_active, true)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Vendedor sem vínculo ativo com a loja informada.');
  END IF;

  IF v_store_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Vendedor sem vínculo ativo com loja.'); END IF;
  IF length(coalesce(v_phone, '')) < 10 THEN RETURN jsonb_build_object('ok', false, 'error', 'Telefone válido é obrigatório.'); END IF;
  IF v_competencia > timezone('America/Sao_Paulo', now())::date THEN RETURN jsonb_build_object('ok', false, 'error', 'Venda não pode usar competência futura.'); END IF;
  IF coalesce((p_payload->>'valor_venda')::numeric, 0) <= 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'Valor da venda deve ser maior que zero.'); END IF;
  IF nullif(trim(coalesce(p_payload->>'veiculo', '')), '') IS NULL OR v_norm_placa = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Veículo e placa são obrigatórios.');
  END IF;

  v_canal := coalesce(nullif(p_payload->>'canal', '')::public.crm_canal, 'porta'::public.crm_canal);
  v_financiamento := coalesce(nullif(p_payload->>'financiamento', '')::public.crm_financiamento, 'nao_aplica'::public.crm_financiamento);
  v_closed_at := (v_competencia::text || 'T12:00:00-03:00')::timestamptz;
  v_key := v_caller_id::text || ':' || v_store_id::text || ':' || coalesce(
    v_key,
    v_competencia::text || ':' || v_phone || ':' || v_norm_placa
  );

  IF v_fechamento_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.lancamentos_diarios ld
     WHERE ld.id = v_fechamento_id
       AND ld.seller_user_id = v_caller_id
       AND ld.store_id = v_store_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Fechamento informado não pertence ao vendedor e à loja ativos.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_store_id::text || ':' || v_phone, 0));

  SELECT id, cliente_id, etapa INTO v_oportunidade_id, v_cliente_id, v_existing_etapa
    FROM public.oportunidades
   WHERE (
     idempotency_key = v_key
     OR (
       loja_id = v_store_id
       AND seller_user_id = v_caller_id
       AND data_competencia = v_competencia
       AND regexp_replace(upper(coalesce(placa_veiculo, '')), '[^A-Z0-9]', '', 'g') = v_norm_placa
     )
   )
   ORDER BY created_at DESC LIMIT 1
   FOR UPDATE;

  IF v_oportunidade_id IS NOT NULL AND v_existing_etapa = 'ganho' THEN
    SELECT id INTO v_evento_id FROM public.eventos_comerciais WHERE idempotency_key = v_key || ':venda' LIMIT 1;
    RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object(
      'cliente_id', v_cliente_id, 'oportunidade_id', v_oportunidade_id,
      'evento_id', v_evento_id, 'duplicate', true
    ));
  END IF;

  SELECT id INTO v_cliente_id
    FROM public.clientes
   WHERE loja_id = v_store_id AND telefone_normalizado = v_phone
   ORDER BY updated_at DESC LIMIT 1
   FOR UPDATE;

  IF v_cliente_id IS NULL THEN
    IF v_nome IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'Nome do cliente é obrigatório.'); END IF;
    INSERT INTO public.clientes (
      loja_id, seller_user_id, nome, telefone, canal_origem, status,
      observacoes, data_competencia, origem_modulo, fechamento_id, created_by
    ) VALUES (
      v_store_id, v_caller_id, v_nome, p_payload->>'telefone', v_canal, 'oportunidade',
      nullif(trim(coalesce(p_payload->>'observacao', '')), ''), v_competencia,
      'terminal_mx', v_fechamento_id, v_caller_id
    ) RETURNING id INTO v_cliente_id;
  ELSE
    v_cliente_existente := true;
  END IF;

  IF v_oportunidade_id IS NOT NULL THEN
    -- Reativa / atualiza a oportunidade existente em vez de criar uma 2ª linha
    UPDATE public.oportunidades
       SET veiculo_interesse = trim(p_payload->>'veiculo'),
           valor_negociado = (p_payload->>'valor_venda')::numeric,
           etapa = 'ganho',
           canal = v_canal,
           financiamento = v_financiamento,
           carro_avaliado = coalesce((p_payload->>'carro_avaliado')::boolean, false),
           closed_at = v_closed_at,
           placa_veiculo = v_norm_placa,
           data_entrega_prevista = nullif(p_payload->>'data_entrega_prevista', '')::timestamptz,
           data_competencia = v_competencia,
           origem_modulo = 'terminal_mx',
           cancelada_em = NULL,
           cancelada_por = NULL,
           motivo_cancelamento = NULL,
           updated_at = now(),
           idempotency_key = v_key
     WHERE id = v_oportunidade_id;
  ELSE
    INSERT INTO public.oportunidades (
      cliente_id, loja_id, seller_user_id, veiculo_interesse, valor_negociado,
      etapa, canal, financiamento, carro_avaliado, closed_at, placa_veiculo,
      data_entrega_prevista, data_competencia, origem_modulo, fechamento_id,
      created_by, idempotency_key
    ) VALUES (
      v_cliente_id, v_store_id, v_caller_id, trim(p_payload->>'veiculo'),
      (p_payload->>'valor_venda')::numeric, 'ganho', v_canal, v_financiamento,
      coalesce((p_payload->>'carro_avaliado')::boolean, false), v_closed_at,
      v_norm_placa, nullif(p_payload->>'data_entrega_prevista', '')::timestamptz,
      v_competencia, 'terminal_mx', v_fechamento_id, v_caller_id, v_key
    ) RETURNING id INTO v_oportunidade_id;
  END IF;

  INSERT INTO public.eventos_comerciais (
    cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento,
    canal, data_evento, data_competencia, origem_modulo, fechamento_id,
    created_by, idempotency_key, observacao
  ) VALUES (
    v_cliente_id, v_oportunidade_id, v_store_id, v_caller_id, 'venda_realizada',
    v_canal, v_closed_at, v_competencia,
    'terminal_mx', v_fechamento_id, v_caller_id, v_key || ':venda',
    nullif(trim(coalesce(p_payload->>'observacao', '')), '')
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL
  DO UPDATE SET oportunidade_id = EXCLUDED.oportunidade_id,
                tipo_evento = 'venda_realizada',
                data_evento = EXCLUDED.data_evento,
                data_competencia = EXCLUDED.data_competencia
  RETURNING id INTO v_evento_id;

  IF nullif(p_payload->>'data_entrega_prevista', '') IS NOT NULL THEN
    INSERT INTO public.agendamentos (
      cliente_id, oportunidade_id, loja_id, seller_user_id, data_hora, canal,
      tipo, status, observacoes, data_competencia, origem_modulo, fechamento_id, created_by
    ) VALUES (
      v_cliente_id, v_oportunidade_id, v_store_id, v_caller_id,
      (p_payload->>'data_entrega_prevista')::timestamptz, v_canal, 'entrega', 'aguardando',
      nullif(trim(coalesce(p_payload->>'observacao_entrega', '')), ''),
      v_competencia, 'terminal_mx', v_fechamento_id, v_caller_id
    ) RETURNING id INTO v_agendamento_id;
  END IF;

  PERFORM public.consolidate_store_target_plan(v_store_id, v_competencia);

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object(
    'cliente_id', v_cliente_id, 'cliente_existente', v_cliente_existente,
    'oportunidade_id', v_oportunidade_id, 'evento_id', v_evento_id,
    'agendamento_id', v_agendamento_id, 'duplicate', false
  ));
END;
$function$;

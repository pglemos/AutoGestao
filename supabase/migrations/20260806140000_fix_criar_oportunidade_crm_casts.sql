-- Corrige os casts de `criar_oportunidade_crm` (introduzida em 20260805224000).
--
-- Defeito em produção, visto pelo vendedor ao salvar um agendamento novo no
-- Fechamento Diário:
--
--   column "sinal" is of type numeric but expression is of type boolean
--
-- Eu havia escrito `sinal` e `financiamento` como boolean. Os tipos reais são:
--
--   sinal              numeric        (valor do sinal, não um sim/não)
--   financiamento      crm_financiamento  (aprovado/reprovado/nao_aplica/pendente)
--   carro_avaliado     boolean        (este sim)
--   tipo_veiculo       crm_tipo_veiculo
--   categoria_veiculo  crm_categoria_veiculo
--
-- A RPC também descartava três campos que o INSERT direto anterior gravava:
-- `motivo_perda`, `closed_at` e `fechamento_id`. Com etapa terminal, a
-- oportunidade ficava sem data de fechamento.
--
-- O corpo abaixo é o de 20260805224000 com o mapeamento corrigido; o restante
-- (autenticação, escopo de loja, eventos no mesmo commit, idempotência) é
-- idêntico.

CREATE OR REPLACE FUNCTION public.criar_oportunidade_crm(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_store_id uuid := nullif(p_payload->>'loja_id', '')::uuid;
  v_cliente_id uuid := nullif(p_payload->>'cliente_id', '')::uuid;
  v_canal public.crm_canal := nullif(p_payload->>'canal', '')::public.crm_canal;
  v_etapa public.crm_etapa_funil := coalesce(nullif(p_payload->>'etapa', ''), 'prospeccao')::public.crm_etapa_funil;
  v_origem text := coalesce(nullif(p_payload->>'origem_modulo', ''), 'crm');
  v_oportunidade_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED', 'error', 'Sessão inválida.');
  END IF;
  IF v_store_id IS NULL OR v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_PAYLOAD', 'error', 'Loja e cliente são obrigatórios.');
  END IF;
  IF NOT public.crm_assert_store_access(v_store_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'error', 'Operação não permitida para esta loja.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = v_cliente_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'error', 'Cliente não encontrado para esta operação.');
  END IF;

  INSERT INTO public.oportunidades (
    cliente_id, loja_id, seller_user_id, veiculo_interesse, valor_negociado,
    etapa, canal, sinal, financiamento, carro_avaliado, tipo_veiculo,
    placa_veiculo, data_entrega_prevista, data_competencia, origem_modulo,
    veiculo_troca, valor_troca, categoria_veiculo, motivo_perda, closed_at,
    fechamento_id, created_by, updated_by
  ) VALUES (
    v_cliente_id, v_store_id, v_caller,
    nullif(p_payload->>'veiculo_interesse', ''),
    coalesce((p_payload->>'valor_negociado')::numeric, 0),
    v_etapa,
    v_canal,
    coalesce((p_payload->>'sinal')::numeric, 0),
    coalesce(nullif(p_payload->>'financiamento', ''), 'nao_aplica')::public.crm_financiamento,
    coalesce((p_payload->>'carro_avaliado')::boolean, false),
    nullif(p_payload->>'tipo_veiculo', '')::public.crm_tipo_veiculo,
    nullif(p_payload->>'placa_veiculo', ''),
    nullif(p_payload->>'data_entrega_prevista', '')::date,
    nullif(p_payload->>'data_competencia', '')::date,
    v_origem,
    nullif(p_payload->>'veiculo_troca', ''),
    nullif(p_payload->>'valor_troca', '')::numeric,
    nullif(p_payload->>'categoria_veiculo', '')::public.crm_categoria_veiculo,
    CASE WHEN v_etapa = 'perdido' THEN nullif(trim(coalesce(p_payload->>'motivo_perda', '')), '') END,
    -- Etapa terminal precisa de data de fechamento: o cliente já manda
    -- closed_at, e sem ela a oportunidade ficaria "ganha" sem quando.
    CASE
      WHEN v_etapa IN ('ganho', 'perdido', 'cancelada')
        THEN coalesce(nullif(p_payload->>'closed_at', '')::timestamptz, now())
    END,
    nullif(p_payload->>'fechamento_id', '')::uuid,
    v_caller, v_caller
  )
  RETURNING id INTO v_oportunidade_id;

  -- Qualificado nasce sempre que o cliente vira oportunidade trabalhável.
  INSERT INTO public.eventos_comerciais (
    cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento, canal,
    origem_modulo, created_by, idempotency_key
  ) VALUES (
    v_cliente_id, v_oportunidade_id, v_store_id, v_caller,
    'cliente_qualificado', v_canal, v_origem, v_caller,
    'crm:cliente_qualificado:' || v_oportunidade_id::text
  )
  ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

  -- Internet também soma como "Oportunidade" (etapa adicional do funil).
  IF v_canal = 'internet' THEN
    INSERT INTO public.eventos_comerciais (
      cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento, canal,
      origem_modulo, created_by, idempotency_key
    ) VALUES (
      v_cliente_id, v_oportunidade_id, v_store_id, v_caller,
      'oportunidade_registrada', v_canal, v_origem, v_caller,
      'crm:oportunidade_registrada:' || v_oportunidade_id::text
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  END IF;

  -- Oportunidade já criada como ganha registra a venda no mesmo commit.
  IF v_etapa = 'ganho' THEN
    INSERT INTO public.eventos_comerciais (
      cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento, canal,
      origem_modulo, created_by, idempotency_key
    ) VALUES (
      v_cliente_id, v_oportunidade_id, v_store_id, v_caller,
      'venda_realizada', v_canal, v_origem, v_caller,
      'crm:venda_realizada:' || v_oportunidade_id::text
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object('id', v_oportunidade_id));
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'code', 'TRANSACTION_FAILED', 'error', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.criar_oportunidade_crm(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.criar_oportunidade_crm(jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.criar_oportunidade_crm(jsonb) TO authenticated;

-- DOWN (compensatória, forward-only):
-- Restaurar o corpo de 20260805224000 — não fazer: aquela versão não grava
-- oportunidade nenhuma, por causa dos casts errados.

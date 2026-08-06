-- Gravações comerciais transacionais.
--
-- Hoje o frontend grava a entidade (oportunidade/agendamento) e depois chama
-- `registrarEventoComercial` em modo best-effort: se o INSERT do evento falha,
-- o registro principal permanece e o indicador nunca contabiliza o fato. O
-- resultado são eventos órfãos e um funil que não fecha com a operação.
--
-- Estas RPCs fazem entidade + evento no mesmo commit. Qualquer falha derruba
-- a transação inteira; nada de sucesso parcial.
--
-- Idempotência: cada evento recebe uma `idempotency_key` determinística
-- (índice único parcial já existente). Reenvio por duplo clique ou retry de
-- rede não duplica evento.

-- 1. Helper de mapeamento canônico tipo de agendamento → tipo de evento ------

CREATE OR REPLACE FUNCTION public.crm_evento_de_agendamento(p_tipo public.crm_agendamento_tipo)
RETURNS public.crm_evento_tipo
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE p_tipo
    WHEN 'garantia' THEN 'garantia_registrada'::public.crm_evento_tipo
    WHEN 'pos_venda' THEN 'pos_venda_realizado'::public.crm_evento_tipo
    ELSE 'agendamento_criado'::public.crm_evento_tipo
  END;
$function$;

-- 2. Guard comum: quem é o chamador e ele pode operar nesta loja? ------------

CREATE OR REPLACE FUNCTION public.crm_assert_store_access(p_store_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_role text;
BEGIN
  IF v_caller IS NULL OR p_store_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role INTO v_role FROM public.usuarios WHERE id = v_caller AND active = true;
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  IF v_role IN ('administrador_geral', 'administrador_mx', 'consultor_mx') THEN
    RETURN true;
  END IF;

  RETURN EXISTS (
    SELECT 1
      FROM public.vinculos_loja
     WHERE user_id = v_caller
       AND store_id = p_store_id
       AND coalesce(is_active, true) = true
  );
END;
$function$;

-- 3. Criar oportunidade + eventos de funil no mesmo commit -------------------

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
  v_oportunidade_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED', 'error', 'Sessão inválida.');
  END IF;
  IF v_store_id IS NULL OR v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_PAYLOAD', 'error', 'Loja e cliente são obrigatórios.');
  END IF;
  IF NOT public.crm_assert_store_access(v_store_id) THEN
    -- Mensagem genérica de propósito: não revelar se a loja existe.
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'error', 'Operação não permitida para esta loja.');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE id = v_cliente_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'error', 'Cliente não encontrado para esta operação.');
  END IF;

  INSERT INTO public.oportunidades (
    cliente_id, loja_id, seller_user_id, veiculo_interesse, valor_negociado,
    etapa, canal, sinal, financiamento, carro_avaliado, tipo_veiculo,
    placa_veiculo, data_entrega_prevista, data_competencia, origem_modulo,
    veiculo_troca, valor_troca, categoria_veiculo, created_by, updated_by
  ) VALUES (
    v_cliente_id, v_store_id, v_caller,
    nullif(p_payload->>'veiculo_interesse', ''),
    coalesce((p_payload->>'valor_negociado')::numeric, 0),
    coalesce(nullif(p_payload->>'etapa', ''), 'prospeccao')::public.crm_etapa_funil,
    v_canal,
    coalesce((p_payload->>'sinal')::boolean, false),
    coalesce((p_payload->>'financiamento')::boolean, false),
    coalesce((p_payload->>'carro_avaliado')::boolean, false),
    nullif(p_payload->>'tipo_veiculo', ''),
    nullif(p_payload->>'placa_veiculo', ''),
    nullif(p_payload->>'data_entrega_prevista', '')::date,
    nullif(p_payload->>'data_competencia', '')::date,
    coalesce(nullif(p_payload->>'origem_modulo', ''), 'crm'),
    nullif(p_payload->>'veiculo_troca', ''),
    nullif(p_payload->>'valor_troca', '')::numeric,
    nullif(p_payload->>'categoria_veiculo', ''),
    v_caller, v_caller
  )
  RETURNING id INTO v_oportunidade_id;

  -- Qualificado nasce sempre que o cliente vira oportunidade trabalhável.
  INSERT INTO public.eventos_comerciais (
    cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento, canal,
    origem_modulo, created_by, idempotency_key
  ) VALUES (
    v_cliente_id, v_oportunidade_id, v_store_id, v_caller,
    'cliente_qualificado', v_canal,
    coalesce(nullif(p_payload->>'origem_modulo', ''), 'crm'), v_caller,
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
      'oportunidade_registrada', v_canal,
      coalesce(nullif(p_payload->>'origem_modulo', ''), 'crm'), v_caller,
      'crm:oportunidade_registrada:' || v_oportunidade_id::text
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object('id', v_oportunidade_id));
EXCEPTION
  WHEN others THEN
    -- A transação inteira já foi desfeita: entidade sem evento é impossível.
    RETURN jsonb_build_object('ok', false, 'code', 'TRANSACTION_FAILED', 'error', SQLERRM);
END;
$function$;

-- 4. Mudar etapa (ganho gera venda_realizada no mesmo commit) ----------------

CREATE OR REPLACE FUNCTION public.atualizar_etapa_oportunidade_crm(
  p_oportunidade_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_etapa public.crm_etapa_funil := nullif(p_payload->>'etapa', '')::public.crm_etapa_funil;
  v_motivo text := nullif(trim(coalesce(p_payload->>'motivo_perda', '')), '');
  v_row public.oportunidades%ROWTYPE;
  v_teve_atendimento boolean;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED', 'error', 'Sessão inválida.');
  END IF;
  IF v_etapa IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_PAYLOAD', 'error', 'Etapa inválida.');
  END IF;

  SELECT * INTO v_row FROM public.oportunidades WHERE id = p_oportunidade_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'error', 'Oportunidade não encontrada para esta operação.');
  END IF;
  -- Ownership explícito: sem isto, a proteção seria só a RLS da tabela.
  IF v_row.seller_user_id <> v_caller AND NOT public.crm_assert_store_access(v_row.loja_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'error', 'Oportunidade não encontrada para esta operação.');
  END IF;

  UPDATE public.oportunidades
     SET etapa = v_etapa,
         closed_at = CASE WHEN v_etapa IN ('ganho', 'perdido', 'cancelada') THEN now() ELSE NULL END,
         motivo_perda = CASE WHEN v_etapa = 'perdido' THEN v_motivo ELSE NULL END,
         updated_by = v_caller,
         updated_at = now()
   WHERE id = p_oportunidade_id;

  IF v_etapa = 'ganho' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.eventos_comerciais
       WHERE oportunidade_id = p_oportunidade_id
         AND tipo_evento = 'atendimento_comercial_realizado'
    ) INTO v_teve_atendimento;

    INSERT INTO public.eventos_comerciais (
      cliente_id, oportunidade_id, loja_id, seller_user_id, tipo_evento, canal,
      origem_modulo, observacao, created_by, idempotency_key
    ) VALUES (
      v_row.cliente_id, p_oportunidade_id, v_row.loja_id, v_row.seller_user_id,
      'venda_realizada', v_row.canal, coalesce(v_row.origem_modulo, 'crm'),
      CASE WHEN v_teve_atendimento THEN NULL ELSE 'Venda sem atendimento comercial registrado previamente.' END,
      v_caller,
      'crm:venda_realizada:' || p_oportunidade_id::text
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object('id', p_oportunidade_id, 'etapa', v_etapa));
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'code', 'TRANSACTION_FAILED', 'error', SQLERRM);
END;
$function$;

-- 5. Criar agendamento + evento correspondente -------------------------------

CREATE OR REPLACE FUNCTION public.criar_agendamento_crm(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_store_id uuid := nullif(p_payload->>'loja_id', '')::uuid;
  v_cliente_id uuid := nullif(p_payload->>'cliente_id', '')::uuid;
  v_oportunidade_id uuid := nullif(p_payload->>'oportunidade_id', '')::uuid;
  v_canal public.crm_canal := nullif(p_payload->>'canal', '')::public.crm_canal;
  v_tipo public.crm_agendamento_tipo := coalesce(nullif(p_payload->>'tipo', ''), 'visita')::public.crm_agendamento_tipo;
  v_data_hora timestamptz := nullif(p_payload->>'data_hora', '')::timestamptz;
  v_observacoes text := nullif(trim(coalesce(p_payload->>'observacoes', '')), '');
  v_agendamento_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED', 'error', 'Sessão inválida.');
  END IF;
  IF v_store_id IS NULL OR v_data_hora IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_PAYLOAD', 'error', 'Loja e data/hora são obrigatórias.');
  END IF;
  IF NOT public.crm_assert_store_access(v_store_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'error', 'Operação não permitida para esta loja.');
  END IF;

  INSERT INTO public.agendamentos (
    cliente_id, oportunidade_id, loja_id, seller_user_id, data_hora, canal,
    tipo, status, proxima_acao, observacoes, modalidade, data_competencia,
    origem_modulo, created_by, updated_by
  ) VALUES (
    v_cliente_id, v_oportunidade_id, v_store_id, v_caller, v_data_hora, v_canal,
    v_tipo,
    coalesce(nullif(p_payload->>'status', ''), 'aguardando')::public.crm_agendamento_status,
    nullif(trim(coalesce(p_payload->>'proxima_acao', '')), ''),
    v_observacoes,
    nullif(p_payload->>'modalidade', '')::public.crm_evento_modalidade,
    nullif(p_payload->>'data_competencia', '')::date,
    coalesce(nullif(p_payload->>'origem_modulo', ''), 'crm'),
    v_caller, v_caller
  )
  RETURNING id INTO v_agendamento_id;

  -- Sem cliente não há fato comercial a registrar: o agendamento existe, mas
  -- não alimenta funil. Continua sendo uma gravação válida.
  IF v_cliente_id IS NOT NULL THEN
    INSERT INTO public.eventos_comerciais (
      cliente_id, oportunidade_id, agendamento_id, loja_id, seller_user_id,
      tipo_evento, canal, origem_modulo, observacao, created_by, idempotency_key
    ) VALUES (
      v_cliente_id, v_oportunidade_id, v_agendamento_id, v_store_id, v_caller,
      public.crm_evento_de_agendamento(v_tipo), v_canal,
      coalesce(nullif(p_payload->>'origem_modulo', ''), 'crm'), v_observacoes, v_caller,
      'crm:' || public.crm_evento_de_agendamento(v_tipo)::text || ':' || v_agendamento_id::text
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object('id', v_agendamento_id));
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'code', 'TRANSACTION_FAILED', 'error', SQLERRM);
END;
$function$;

-- 6. Mudar status do agendamento (compareceu gera atendimento) ---------------

CREATE OR REPLACE FUNCTION public.atualizar_status_agendamento_crm(
  p_agendamento_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_status public.crm_agendamento_status := nullif(p_payload->>'status', '')::public.crm_agendamento_status;
  v_row public.agendamentos%ROWTYPE;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED', 'error', 'Sessão inválida.');
  END IF;
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID_PAYLOAD', 'error', 'Status inválido.');
  END IF;

  SELECT * INTO v_row FROM public.agendamentos WHERE id = p_agendamento_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'error', 'Agendamento não encontrado para esta operação.');
  END IF;
  IF v_row.seller_user_id <> v_caller AND NOT public.crm_assert_store_access(v_row.loja_id) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'error', 'Agendamento não encontrado para esta operação.');
  END IF;

  UPDATE public.agendamentos
     SET status = v_status,
         updated_by = v_caller,
         updated_at = now()
   WHERE id = p_agendamento_id;

  IF v_status = 'compareceu' AND v_row.cliente_id IS NOT NULL THEN
    INSERT INTO public.eventos_comerciais (
      cliente_id, oportunidade_id, agendamento_id, loja_id, seller_user_id,
      tipo_evento, canal, origem_modulo, created_by, idempotency_key
    ) VALUES (
      v_row.cliente_id, v_row.oportunidade_id, p_agendamento_id, v_row.loja_id,
      v_row.seller_user_id, 'atendimento_comercial_realizado', v_row.canal,
      coalesce(v_row.origem_modulo, 'crm'), v_caller,
      'crm:atendimento_comercial_realizado:' || p_agendamento_id::text
    )
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object('id', p_agendamento_id, 'status', v_status));
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'code', 'TRANSACTION_FAILED', 'error', SQLERRM);
END;
$function$;

-- 7. Grants mínimos ----------------------------------------------------------

REVOKE ALL ON FUNCTION public.criar_oportunidade_crm(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atualizar_etapa_oportunidade_crm(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.criar_agendamento_crm(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.atualizar_status_agendamento_crm(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_assert_store_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_evento_de_agendamento(public.crm_agendamento_tipo) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.criar_oportunidade_crm(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_etapa_oportunidade_crm(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_agendamento_crm(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_agendamento_crm(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crm_evento_de_agendamento(public.crm_agendamento_tipo) TO authenticated;

-- DOWN (compensatória, forward-only — nunca remove dados):
-- DROP FUNCTION IF EXISTS public.atualizar_status_agendamento_crm(uuid, jsonb);
-- DROP FUNCTION IF EXISTS public.criar_agendamento_crm(jsonb);
-- DROP FUNCTION IF EXISTS public.atualizar_etapa_oportunidade_crm(uuid, jsonb);
-- DROP FUNCTION IF EXISTS public.criar_oportunidade_crm(jsonb);
-- DROP FUNCTION IF EXISTS public.crm_assert_store_access(uuid);
-- DROP FUNCTION IF EXISTS public.crm_evento_de_agendamento(public.crm_agendamento_tipo);
-- O frontend anterior (insert direto + evento best-effort) volta a funcionar
-- sem alteração de schema: nenhuma tabela é modificada por esta migration.

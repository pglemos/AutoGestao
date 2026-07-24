-- Migration recuperada de prod (aplicada em 2026-07-23, ausente do git ate a auditoria de 2026-07-24).
-- Recuperada via supabase_migrations.schema_migrations.statements pela auditoria de auth/lojas.

-- Carteira: categoria de veiculo (hatch/sedan/suv/...) em oportunidades e
-- veiculos_estoque, pra permitir sugerir veiculo chegado por categoria/faixa
-- de preco quando o texto do veiculo de interesse nao bate literal.
-- Reuniao de 2026-07-23.

BEGIN

DO $$
BEGIN
  CREATE TYPE public.crm_categoria_veiculo AS ENUM (
    'hatch', 'sedan', 'suv', 'picape', 'minivan', 'utilitario', 'moto', 'outro'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$

ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS categoria_veiculo public.crm_categoria_veiculo

ALTER TABLE public.veiculos_estoque
  ADD COLUMN IF NOT EXISTS categoria public.crm_categoria_veiculo

COMMENT ON COLUMN public.oportunidades.categoria_veiculo IS
  'Categoria do veiculo de interesse do cliente, para sugestao de veiculos chegados por categoria.'

COMMENT ON COLUMN public.veiculos_estoque.categoria IS
  'Categoria do veiculo recem-chegado, para sugestao aos clientes da carteira.'

CREATE OR REPLACE FUNCTION public.carteira_salvar_cliente(p_payload jsonb, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_store_id uuid;
  v_cliente_id uuid := NULLIF(p_payload->>'cliente_id', '')::uuid;
  v_oportunidade_id uuid := NULLIF(p_payload->>'oportunidade_id', '')::uuid;
  v_agendamento_id uuid := NULLIF(p_payload->>'agendamento_id', '')::uuid;
  v_evento_id uuid;
  v_phone text := NULLIF(BTRIM(COALESCE(p_payload->>'telefone', p_payload->>'whatsapp', '')), '');
  v_phone_normalized text := regexp_replace(COALESCE(v_phone, ''), '\D', '', 'g');
  v_new_opportunity boolean := COALESCE((p_payload->>'nova_oportunidade')::boolean, false);
  v_event_type crm_evento_tipo := COALESCE(NULLIF(p_payload->>'tipo_evento', '')::crm_evento_tipo, 'retorno_realizado'::crm_evento_tipo);
  v_existing_event record;
  v_existing_client record;
  v_existing_opportunity record;
  v_existing_appointment record;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, cliente_id, oportunidade_id, agendamento_id
      INTO v_existing_event
    FROM public.eventos_comerciais
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'replayed', true,
        'cliente_id', v_existing_event.cliente_id,
        'oportunidade_id', v_existing_event.oportunidade_id,
        'agendamento_id', v_existing_event.agendamento_id,
        'evento_id', v_existing_event.id
      );
    END IF;
  END IF;

  IF v_cliente_id IS NOT NULL THEN
    SELECT * INTO v_existing_client
    FROM public.clientes
    WHERE id = v_cliente_id
      AND seller_user_id = v_user
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cliente não encontrado ou sem permissão.';
    END IF;

    v_store_id := v_existing_client.loja_id;
  ELSE
    SELECT vl.store_id INTO v_store_id
    FROM public.vinculos_loja vl
    WHERE vl.user_id = v_user
      AND vl.is_active = true
    ORDER BY vl.created_at DESC NULLS LAST
    LIMIT 1;

    IF v_store_id IS NULL THEN
      RAISE EXCEPTION 'Vendedor sem vínculo ativo com loja.';
    END IF;

    IF v_phone_normalized <> '' THEN
      SELECT * INTO v_existing_client
      FROM public.clientes
      WHERE seller_user_id = v_user
        AND loja_id = v_store_id
        AND COALESCE(telefone_normalizado, regexp_replace(COALESCE(telefone, ''), '\D', '', 'g')) = v_phone_normalized
      ORDER BY updated_at DESC
      LIMIT 1
      FOR UPDATE;

      IF FOUND THEN
        v_cliente_id := v_existing_client.id;
      END IF;
    END IF;
  END IF;

  IF v_cliente_id IS NULL THEN
    INSERT INTO public.clientes (
      loja_id,
      seller_user_id,
      nome,
      telefone,
      canal_origem,
      status,
      proxima_acao,
      proxima_acao_em,
      potencial_negocio,
      observacoes,
      origem_modulo,
      created_by,
      updated_by,
      do_not_contact,
      do_not_contact_at,
      do_not_contact_reason,
      reactivation_at
    ) VALUES (
      v_store_id,
      v_user,
      COALESCE(NULLIF(BTRIM(p_payload->>'nome'), ''), 'Cliente sem nome'),
      v_phone,
      COALESCE(NULLIF(p_payload->>'canal_origem', '')::crm_canal, 'carteira'::crm_canal),
      COALESCE(NULLIF(p_payload->>'cliente_status', '')::crm_cliente_status, 'oportunidade'::crm_cliente_status),
      NULLIF(p_payload->>'proxima_acao', ''),
      NULLIF(p_payload->>'proxima_acao_em', '')::date,
      COALESCE(NULLIF(p_payload->>'potencial_negocio', '')::numeric, 0),
      NULLIF(p_payload->>'observacoes', ''),
      'carteira_base44',
      v_user,
      v_user,
      COALESCE((p_payload->>'do_not_contact')::boolean, false),
      CASE WHEN COALESCE((p_payload->>'do_not_contact')::boolean, false) THEN now() ELSE NULL END,
      NULLIF(p_payload->>'do_not_contact_reason', ''),
      NULLIF(p_payload->>'reactivation_at', '')::timestamptz
    )
    RETURNING id INTO v_cliente_id;
  ELSE
    UPDATE public.clientes
    SET
      nome = CASE WHEN p_payload ? 'nome' THEN COALESCE(NULLIF(BTRIM(p_payload->>'nome'), ''), nome) ELSE nome END,
      telefone = CASE WHEN p_payload ? 'telefone' OR p_payload ? 'whatsapp' THEN v_phone ELSE telefone END,
      canal_origem = CASE WHEN p_payload ? 'canal_origem' THEN (p_payload->>'canal_origem')::crm_canal ELSE canal_origem END,
      status = CASE WHEN p_payload ? 'cliente_status' THEN (p_payload->>'cliente_status')::crm_cliente_status ELSE status END,
      proxima_acao = CASE WHEN p_payload ? 'proxima_acao' THEN NULLIF(p_payload->>'proxima_acao', '') ELSE proxima_acao END,
      proxima_acao_em = CASE WHEN p_payload ? 'proxima_acao_em' THEN NULLIF(p_payload->>'proxima_acao_em', '')::date ELSE proxima_acao_em END,
      potencial_negocio = CASE WHEN p_payload ? 'potencial_negocio' THEN COALESCE(NULLIF(p_payload->>'potencial_negocio', '')::numeric, 0) ELSE potencial_negocio END,
      observacoes = CASE WHEN p_payload ? 'observacoes' THEN NULLIF(p_payload->>'observacoes', '') ELSE observacoes END,
      ultima_interacao = CASE WHEN COALESCE((p_payload->>'registrar_interacao')::boolean, false) THEN CURRENT_DATE ELSE ultima_interacao END,
      do_not_contact = CASE WHEN p_payload ? 'do_not_contact' THEN COALESCE((p_payload->>'do_not_contact')::boolean, false) ELSE do_not_contact END,
      do_not_contact_at = CASE
        WHEN p_payload ? 'do_not_contact' AND COALESCE((p_payload->>'do_not_contact')::boolean, false) THEN COALESCE(do_not_contact_at, now())
        WHEN p_payload ? 'do_not_contact' THEN NULL
        ELSE do_not_contact_at
      END,
      do_not_contact_reason = CASE WHEN p_payload ? 'do_not_contact_reason' THEN NULLIF(p_payload->>'do_not_contact_reason', '') ELSE do_not_contact_reason END,
      reactivation_at = CASE WHEN p_payload ? 'reactivation_at' THEN NULLIF(p_payload->>'reactivation_at', '')::timestamptz ELSE reactivation_at END,
      origem_modulo = 'carteira_base44',
      updated_at = now(),
      updated_by = v_user
    WHERE id = v_cliente_id;
  END IF;

  IF v_oportunidade_id IS NOT NULL THEN
    SELECT * INTO v_existing_opportunity
    FROM public.oportunidades
    WHERE id = v_oportunidade_id
      AND cliente_id = v_cliente_id
      AND seller_user_id = v_user
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Oportunidade não encontrada ou sem permissão.';
    END IF;
  ELSIF NOT v_new_opportunity THEN
    SELECT * INTO v_existing_opportunity
    FROM public.oportunidades
    WHERE cliente_id = v_cliente_id
      AND seller_user_id = v_user
      AND etapa NOT IN ('ganho'::crm_etapa_funil, 'perdido'::crm_etapa_funil)
    ORDER BY updated_at DESC, created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
      v_oportunidade_id := v_existing_opportunity.id;
    END IF;
  END IF;

  IF v_oportunidade_id IS NULL THEN
    INSERT INTO public.oportunidades (
      cliente_id,
      loja_id,
      seller_user_id,
      veiculo_interesse,
      categoria_veiculo,
      valor_negociado,
      etapa,
      canal,
      sinal,
      financiamento,
      carro_avaliado,
      veiculo_troca,
      valor_troca,
      motivo_perda,
      origem_modulo,
      created_by,
      updated_by,
      idempotency_key
    ) VALUES (
      v_cliente_id,
      v_store_id,
      v_user,
      NULLIF(p_payload->>'veiculo_interesse', ''),
      NULLIF(p_payload->>'categoria_veiculo', '')::crm_categoria_veiculo,
      COALESCE(NULLIF(p_payload->>'valor_negociado', '')::numeric, 0),
      COALESCE(NULLIF(p_payload->>'etapa', '')::crm_etapa_funil, 'prospeccao'::crm_etapa_funil),
      COALESCE(NULLIF(p_payload->>'canal', '')::crm_canal, NULLIF(p_payload->>'canal_origem', '')::crm_canal),
      COALESCE(NULLIF(p_payload->>'sinal', '')::numeric, 0),
      COALESCE(NULLIF(p_payload->>'financiamento', '')::crm_financiamento, 'nao_aplica'::crm_financiamento),
      COALESCE((p_payload->>'carro_avaliado')::boolean, false),
      NULLIF(p_payload->>'veiculo_troca', ''),
      NULLIF(p_payload->>'valor_troca', '')::numeric,
      NULLIF(p_payload->>'motivo_perda', ''),
      'carteira_base44',
      v_user,
      v_user,
      CASE WHEN v_new_opportunity THEN p_idempotency_key ELSE NULL END
    )
    RETURNING id INTO v_oportunidade_id;
  ELSE
    UPDATE public.oportunidades
    SET
      veiculo_interesse = CASE WHEN p_payload ? 'veiculo_interesse' THEN NULLIF(p_payload->>'veiculo_interesse', '') ELSE veiculo_interesse END,
      categoria_veiculo = CASE WHEN p_payload ? 'categoria_veiculo' THEN NULLIF(p_payload->>'categoria_veiculo', '')::crm_categoria_veiculo ELSE categoria_veiculo END,
      valor_negociado = CASE WHEN p_payload ? 'valor_negociado' THEN COALESCE(NULLIF(p_payload->>'valor_negociado', '')::numeric, 0) ELSE valor_negociado END,
      etapa = CASE WHEN p_payload ? 'etapa' THEN (p_payload->>'etapa')::crm_etapa_funil ELSE etapa END,
      canal = CASE WHEN p_payload ? 'canal' THEN NULLIF(p_payload->>'canal', '')::crm_canal ELSE canal END,
      sinal = CASE WHEN p_payload ? 'sinal' THEN COALESCE(NULLIF(p_payload->>'sinal', '')::numeric, 0) ELSE sinal END,
      financiamento = CASE WHEN p_payload ? 'financiamento' THEN (p_payload->>'financiamento')::crm_financiamento ELSE financiamento END,
      carro_avaliado = CASE WHEN p_payload ? 'carro_avaliado' THEN COALESCE((p_payload->>'carro_avaliado')::boolean, false) ELSE carro_avaliado END,
      veiculo_troca = CASE WHEN p_payload ? 'veiculo_troca' THEN NULLIF(p_payload->>'veiculo_troca', '') ELSE veiculo_troca END,
      valor_troca = CASE WHEN p_payload ? 'valor_troca' THEN NULLIF(p_payload->>'valor_troca', '')::numeric ELSE valor_troca END,
      motivo_perda = CASE WHEN p_payload ? 'motivo_perda' THEN NULLIF(p_payload->>'motivo_perda', '') ELSE motivo_perda END,
      closed_at = CASE
        WHEN p_payload ? 'etapa' AND (p_payload->>'etapa') IN ('ganho', 'perdido') THEN COALESCE(closed_at, now())
        WHEN p_payload ? 'etapa' THEN NULL
        ELSE closed_at
      END,
      origem_modulo = 'carteira_base44',
      updated_at = now(),
      updated_by = v_user
    WHERE id = v_oportunidade_id;
  END IF;

  IF NULLIF(p_payload->>'agendamento_data_hora', '') IS NOT NULL THEN
    IF v_agendamento_id IS NOT NULL THEN
      SELECT * INTO v_existing_appointment
      FROM public.agendamentos
      WHERE id = v_agendamento_id
        AND seller_user_id = v_user
      FOR UPDATE;
    ELSE
      SELECT * INTO v_existing_appointment
      FROM public.agendamentos
      WHERE oportunidade_id = v_oportunidade_id
        AND seller_user_id = v_user
        AND status IN ('confirmado'::crm_agendamento_status, 'aguardando'::crm_agendamento_status)
      ORDER BY data_hora DESC, updated_at DESC
      LIMIT 1
      FOR UPDATE;

      IF FOUND THEN
        v_agendamento_id := v_existing_appointment.id;
      END IF;
    END IF;

    IF v_agendamento_id IS NULL THEN
      INSERT INTO public.agendamentos (
        cliente_id,
        oportunidade_id,
        loja_id,
        seller_user_id,
        data_hora,
        canal,
        tipo,
        status,
        proxima_acao,
        observacoes,
        origem_modulo,
        created_by,
        updated_by
      ) VALUES (
        v_cliente_id,
        v_oportunidade_id,
        v_store_id,
        v_user,
        (p_payload->>'agendamento_data_hora')::timestamptz,
        COALESCE(NULLIF(p_payload->>'canal', '')::crm_canal, NULLIF(p_payload->>'canal_origem', '')::crm_canal),
        COALESCE(NULLIF(p_payload->>'agendamento_tipo', '')::crm_agendamento_tipo, 'visita'::crm_agendamento_tipo),
        COALESCE(NULLIF(p_payload->>'agendamento_status', '')::crm_agendamento_status, 'confirmado'::crm_agendamento_status),
        NULLIF(p_payload->>'proxima_acao', ''),
        NULLIF(p_payload->>'observacoes', ''),
        'carteira_base44',
        v_user,
        v_user
      )
      RETURNING id INTO v_agendamento_id;
    ELSE
      UPDATE public.agendamentos
      SET
        data_hora = (p_payload->>'agendamento_data_hora')::timestamptz,
        canal = CASE WHEN p_payload ? 'canal' THEN NULLIF(p_payload->>'canal', '')::crm_canal ELSE canal END,
        tipo = CASE WHEN p_payload ? 'agendamento_tipo' THEN (p_payload->>'agendamento_tipo')::crm_agendamento_tipo ELSE tipo END,
        status = CASE WHEN p_payload ? 'agendamento_status' THEN (p_payload->>'agendamento_status')::crm_agendamento_status ELSE status END,
        proxima_acao = CASE WHEN p_payload ? 'proxima_acao' THEN NULLIF(p_payload->>'proxima_acao', '') ELSE proxima_acao END,
        observacoes = CASE WHEN p_payload ? 'observacoes' THEN NULLIF(p_payload->>'observacoes', '') ELSE observacoes END,
        origem_modulo = 'carteira_base44',
        updated_at = now(),
        updated_by = v_user
      WHERE id = v_agendamento_id;
    END IF;
  END IF;

  INSERT INTO public.eventos_comerciais (
    cliente_id,
    oportunidade_id,
    agendamento_id,
    loja_id,
    seller_user_id,
    tipo_evento,
    canal,
    modalidade,
    data_evento,
    origem_modulo,
    observacao,
    metadata,
    created_by,
    idempotency_key
  ) VALUES (
    v_cliente_id,
    v_oportunidade_id,
    v_agendamento_id,
    v_store_id,
    v_user,
    v_event_type,
    COALESCE(NULLIF(p_payload->>'canal', '')::crm_canal, NULLIF(p_payload->>'canal_origem', '')::crm_canal),
    NULLIF(p_payload->>'modalidade', '')::crm_evento_modalidade,
    COALESCE(NULLIF(p_payload->>'data_evento', '')::timestamptz, now()),
    'carteira_base44',
    NULLIF(p_payload->>'evento_observacao', ''),
    COALESCE(p_payload->'evento_metadata', '{}'::jsonb),
    v_user,
    p_idempotency_key
  )
  RETURNING id INTO v_evento_id;

  RETURN jsonb_build_object(
    'ok', true,
    'replayed', false,
    'cliente_id', v_cliente_id,
    'oportunidade_id', v_oportunidade_id,
    'agendamento_id', v_agendamento_id,
    'evento_id', v_evento_id
  );
END;
$function$

NOTIFY pgrst, 'reload schema'

COMMIT

-- DOWN (manual):
-- ALTER TABLE public.oportunidades DROP COLUMN IF EXISTS categoria_veiculo;
-- ALTER TABLE public.veiculos_estoque DROP COLUMN IF EXISTS categoria;
-- DROP TYPE IF EXISTS public.crm_categoria_veiculo;

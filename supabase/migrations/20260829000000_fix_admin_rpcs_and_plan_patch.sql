-- Migration: 20260829000000_fix_admin_rpcs_and_plan_patch.sql
-- Objetivo:
-- 1. Permitir participants, efficacy_indicator, reference_year, etc. em atualizar_plano_acao_patch
-- 2. Criar admin_update_usuario para permitir que a equipe interna MX edite usuários e membros da equipe sem erro 403
-- 3. Melhorar admin_hard_delete_store para limpar vínculos e referências antes de excluir a loja

BEGIN;

-- 1. Atualizar atualizar_plano_acao_patch para aceitar todos os campos do wizard
CREATE OR REPLACE FUNCTION public.atualizar_plano_acao_patch(
  p_plano_id uuid,
  p_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS public.planos_acao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_before public.planos_acao;
  v_after public.planos_acao;
  v_patch jsonb := COALESCE(p_patch, '{}'::jsonb);
  v_allowed text[] := ARRAY[
    'acao', 'problema', 'objetivo', 'indicador', 'departamento', 'responsavel_id', 'prazo',
    'prioridade', 'status', 'progresso', 'como', 'eficacia_score', 'eficacia_nota',
    'checklist', 'comentarios', 'requires_owner', 'financial_impact', 'budget',
    'evidence_required', 'blocked_reason', 'block_category', 'block_responsible',
    'block_responsible_id', 'expected_unblock_date', 'block_note', 'unblock_solution',
    'unblock_note', 'return_reason', 'return_guidance', 'reopen_reason', 'reopen_note',
    'cancel_reason', 'cancel_note', 'progress_note', 'next_step', 'projected_date',
    'impact_status', 'impact_value_before', 'impact_value_after', 'realized_impact',
    'impact_measurement_date', 'approval_note', 'approved_by', 'approved_at',
    'delegation_note', 'delegated_by', 'delegated_at', 'reschedule_reason',
    'reschedule_note', 'rescheduled_by', 'rescheduled_at', 'transition_metadata',
    'concluido_at', 'iniciado_at', 'participants', 'efficacy_indicator', 'reference_year',
    'origem', 'origem_ref_id', 'origem_ref_table', 'codigo'
  ];
  v_manager boolean;
  v_pending_count integer := 0;
  v_override_requested boolean := false;
  v_override_reason text;
  v_transition_metadata jsonb;
BEGIN
  IF jsonb_typeof(v_patch) <> 'object' THEN
    RAISE EXCEPTION 'O patch do plano de ação deve ser um objeto JSON.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(v_patch) AS keys(key)
    WHERE NOT (keys.key = ANY(v_allowed))
  ) THEN
    RAISE EXCEPTION 'Patch contém campo não permitido.' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_before FROM public.planos_acao WHERE id = p_plano_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano de ação não encontrado.'; END IF;

  v_manager := public.can_manage_mx_action_scope(v_before.scope_type, v_before.scope_id);
  IF NOT v_manager AND v_before.responsavel_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sem permissão para atualizar este plano.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT v_manager AND EXISTS (
    SELECT 1
    FROM jsonb_object_keys(v_patch) AS keys(key)
    WHERE keys.key = ANY(ARRAY[
      'acao', 'problema', 'objetivo', 'indicador', 'departamento', 'responsavel_id', 'prazo',
      'prioridade', 'requires_owner', 'financial_impact', 'budget', 'evidence_required',
      'participants', 'efficacy_indicator', 'reference_year'
    ])
  ) THEN
    RAISE EXCEPTION 'Responsável pode atualizar apenas execução, progresso e eficácia.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_patch ->> 'status' = 'concluido' AND v_before.status <> 'concluido'::public.action_status THEN
    SELECT count(*)::integer
    INTO v_pending_count
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(v_before.checklist) = 'array' THEN v_before.checklist
        ELSE '[]'::jsonb
      END
    ) AS checklist_item
    WHERE lower(COALESCE(checklist_item ->> 'status', ''))
      NOT IN ('concluido', 'concluida', 'realizado', 'cancelado', 'cancelada');

    v_override_requested := lower(COALESCE(v_patch #>> '{transition_metadata,completionOverride}', 'false')) = 'true';
    v_override_reason := NULLIF(BTRIM(v_patch #>> '{transition_metadata,completionOverrideReason}'), '');

    IF v_pending_count > 0 AND NOT v_override_requested THEN
      RAISE EXCEPTION 'ACTION_PLAN_PENDING_ITEMS:%', v_pending_count USING ERRCODE = 'P0001';
    END IF;

    IF v_override_requested THEN
      IF v_pending_count = 0 THEN
        RAISE EXCEPTION 'ACTION_PLAN_OVERRIDE_NOT_REQUIRED' USING ERRCODE = '22023';
      END IF;
      IF NOT public.eh_administrador_mx(auth.uid()) THEN
        RAISE EXCEPTION 'ACTION_PLAN_OVERRIDE_FORBIDDEN' USING ERRCODE = '42501';
      END IF;
      IF v_override_reason IS NULL THEN
        RAISE EXCEPTION 'ACTION_PLAN_OVERRIDE_REASON_REQUIRED' USING ERRCODE = '22023';
      END IF;
    END IF;
  END IF;

  UPDATE public.planos_acao
  SET
    acao = CASE WHEN v_patch ? 'acao' THEN NULLIF(BTRIM(v_patch ->> 'acao'), '') ELSE acao END,
    problema = CASE WHEN v_patch ? 'problema' THEN NULLIF(BTRIM(v_patch ->> 'problema'), '') ELSE problema END,
    objetivo = CASE WHEN v_patch ? 'objetivo' THEN NULLIF(BTRIM(v_patch ->> 'objetivo'), '') ELSE objetivo END,
    indicador = CASE WHEN v_patch ? 'indicador' THEN NULLIF(BTRIM(v_patch ->> 'indicador'), '') ELSE indicador END,
    departamento = CASE WHEN v_patch ? 'departamento' THEN (v_patch ->> 'departamento')::public.department_type ELSE departamento END,
    responsavel_id = CASE WHEN v_patch ? 'responsavel_id' THEN (v_patch ->> 'responsavel_id')::uuid ELSE responsavel_id END,
    prazo = CASE WHEN v_patch ? 'prazo' THEN (v_patch ->> 'prazo')::date ELSE prazo END,
    prioridade = CASE WHEN v_patch ? 'prioridade' THEN (v_patch ->> 'prioridade')::public.action_priority ELSE prioridade END,
    status = CASE WHEN v_patch ? 'status' THEN (v_patch ->> 'status')::public.action_status ELSE status END,
    progresso = CASE WHEN v_patch ? 'progresso' THEN (v_patch ->> 'progresso')::numeric ELSE progresso END,
    como = CASE WHEN v_patch ? 'como' THEN NULLIF(BTRIM(v_patch ->> 'como'), '') ELSE como END,
    eficacia_score = CASE WHEN v_patch ? 'eficacia_score' THEN (v_patch ->> 'eficacia_score')::numeric ELSE eficacia_score END,
    eficacia_nota = CASE WHEN v_patch ? 'eficacia_nota' THEN (v_patch ->> 'eficacia_nota')::integer ELSE eficacia_nota END,
    checklist = CASE WHEN v_patch ? 'checklist' THEN COALESCE(v_patch -> 'checklist', '[]'::jsonb) ELSE checklist END,
    comentarios = CASE WHEN v_patch ? 'comentarios' THEN COALESCE(v_patch -> 'comentarios', '[]'::jsonb) ELSE comentarios END,
    requires_owner = CASE WHEN v_patch ? 'requires_owner' THEN (v_patch ->> 'requires_owner')::boolean ELSE requires_owner END,
    financial_impact = CASE WHEN v_patch ? 'financial_impact' THEN (v_patch ->> 'financial_impact')::numeric ELSE financial_impact END,
    budget = CASE WHEN v_patch ? 'budget' THEN (v_patch ->> 'budget')::numeric ELSE budget END,
    evidence_required = CASE WHEN v_patch ? 'evidence_required' THEN (v_patch ->> 'evidence_required')::boolean ELSE evidence_required END,
    blocked_reason = CASE WHEN v_patch ? 'blocked_reason' THEN (v_patch ->> 'blocked_reason')::public.block_reason_type ELSE blocked_reason END,
    block_category = CASE WHEN v_patch ? 'block_category' THEN NULLIF(BTRIM(v_patch ->> 'block_category'), '') ELSE block_category END,
    block_responsible = CASE WHEN v_patch ? 'block_responsible' THEN NULLIF(BTRIM(v_patch ->> 'block_responsible'), '') ELSE block_responsible END,
    block_responsible_id = CASE WHEN v_patch ? 'block_responsible_id' THEN (v_patch ->> 'block_responsible_id')::uuid ELSE block_responsible_id END,
    expected_unblock_date = CASE WHEN v_patch ? 'expected_unblock_date' THEN (v_patch ->> 'expected_unblock_date')::date ELSE expected_unblock_date END,
    block_note = CASE WHEN v_patch ? 'block_note' THEN NULLIF(BTRIM(v_patch ->> 'block_note'), '') ELSE block_note END,
    unblock_solution = CASE WHEN v_patch ? 'unblock_solution' THEN NULLIF(BTRIM(v_patch ->> 'unblock_solution'), '') ELSE unblock_solution END,
    unblock_note = CASE WHEN v_patch ? 'unblock_note' THEN NULLIF(BTRIM(v_patch ->> 'unblock_note'), '') ELSE unblock_note END,
    return_reason = CASE WHEN v_patch ? 'return_reason' THEN NULLIF(BTRIM(v_patch ->> 'return_reason'), '') ELSE return_reason END,
    return_guidance = CASE WHEN v_patch ? 'return_guidance' THEN NULLIF(BTRIM(v_patch ->> 'return_guidance'), '') ELSE return_guidance END,
    reopen_reason = CASE WHEN v_patch ? 'reopen_reason' THEN NULLIF(BTRIM(v_patch ->> 'reopen_reason'), '') ELSE reopen_reason END,
    reopen_note = CASE WHEN v_patch ? 'reopen_note' THEN NULLIF(BTRIM(v_patch ->> 'reopen_note'), '') ELSE reopen_note END,
    cancel_reason = CASE WHEN v_patch ? 'cancel_reason' THEN NULLIF(BTRIM(v_patch ->> 'cancel_reason'), '') ELSE cancel_reason END,
    cancel_note = CASE WHEN v_patch ? 'cancel_note' THEN NULLIF(BTRIM(v_patch ->> 'cancel_note'), '') ELSE cancel_note END,
    progress_note = CASE WHEN v_patch ? 'progress_note' THEN NULLIF(BTRIM(v_patch ->> 'progress_note'), '') ELSE progress_note END,
    next_step = CASE WHEN v_patch ? 'next_step' THEN NULLIF(BTRIM(v_patch ->> 'next_step'), '') ELSE next_step END,
    projected_date = CASE WHEN v_patch ? 'projected_date' THEN (v_patch ->> 'projected_date')::date ELSE projected_date END,
    impact_status = CASE WHEN v_patch ? 'impact_status' THEN NULLIF(BTRIM(v_patch ->> 'impact_status'), '') ELSE impact_status END,
    impact_value_before = CASE WHEN v_patch ? 'impact_value_before' THEN (v_patch ->> 'impact_value_before')::numeric ELSE impact_value_before END,
    impact_value_after = CASE WHEN v_patch ? 'impact_value_after' THEN (v_patch ->> 'impact_value_after')::numeric ELSE impact_value_after END,
    realized_impact = CASE WHEN v_patch ? 'realized_impact' THEN (v_patch ->> 'realized_impact')::numeric ELSE realized_impact END,
    impact_measurement_date = CASE WHEN v_patch ? 'impact_measurement_date' THEN (v_patch ->> 'impact_measurement_date')::date ELSE impact_measurement_date END,
    approval_note = CASE WHEN v_patch ? 'approval_note' THEN NULLIF(BTRIM(v_patch ->> 'approval_note'), '') ELSE approval_note END,
    approved_by = CASE WHEN v_patch ? 'approved_by' THEN (v_patch ->> 'approved_by')::uuid ELSE approved_by END,
    approved_at = CASE WHEN v_patch ? 'approved_at' THEN (v_patch ->> 'approved_at')::timestamptz ELSE approved_at END,
    delegation_note = CASE WHEN v_patch ? 'delegation_note' THEN NULLIF(BTRIM(v_patch ->> 'delegation_note'), '') ELSE delegation_note END,
    delegated_by = CASE WHEN v_patch ? 'delegated_by' THEN (v_patch ->> 'delegated_by')::uuid ELSE delegated_by END,
    delegated_at = CASE WHEN v_patch ? 'delegated_at' THEN (v_patch ->> 'delegated_at')::timestamptz ELSE delegated_at END,
    reschedule_reason = CASE WHEN v_patch ? 'reschedule_reason' THEN NULLIF(BTRIM(v_patch ->> 'reschedule_reason'), '') ELSE reschedule_reason END,
    reschedule_note = CASE WHEN v_patch ? 'reschedule_note' THEN NULLIF(BTRIM(v_patch ->> 'reschedule_note'), '') ELSE reschedule_note END,
    rescheduled_by = CASE WHEN v_patch ? 'rescheduled_by' THEN (v_patch ->> 'rescheduled_by')::uuid ELSE rescheduled_by END,
    rescheduled_at = CASE WHEN v_patch ? 'rescheduled_at' THEN (v_patch ->> 'rescheduled_at')::timestamptz ELSE rescheduled_at END,
    transition_metadata = CASE WHEN v_patch ? 'transition_metadata' THEN COALESCE(v_patch -> 'transition_metadata', '{}'::jsonb) ELSE transition_metadata END,
    concluido_at = CASE
      WHEN v_patch ? 'concluido_at' THEN (v_patch ->> 'concluido_at')::timestamptz
      WHEN v_patch ->> 'status' = 'concluido' AND concluido_at IS NULL THEN now()
      ELSE concluido_at
    END,
    iniciado_at = CASE WHEN v_patch ? 'iniciado_at' THEN (v_patch ->> 'iniciado_at')::date ELSE iniciado_at END,
    participants = CASE WHEN v_patch ? 'participants' THEN NULLIF(BTRIM(v_patch ->> 'participants'), '') ELSE participants END,
    efficacy_indicator = CASE WHEN v_patch ? 'efficacy_indicator' THEN NULLIF(BTRIM(v_patch ->> 'efficacy_indicator'), '') ELSE efficacy_indicator END,
    reference_year = CASE WHEN v_patch ? 'reference_year' THEN (v_patch ->> 'reference_year')::integer ELSE reference_year END,
    origem = CASE WHEN v_patch ? 'origem' THEN NULLIF(BTRIM(v_patch ->> 'origem'), '') ELSE origem END,
    origem_ref_id = CASE WHEN v_patch ? 'origem_ref_id' THEN (v_patch ->> 'origem_ref_id')::uuid ELSE origem_ref_id END,
    origem_ref_table = CASE WHEN v_patch ? 'origem_ref_table' THEN NULLIF(BTRIM(v_patch ->> 'origem_ref_table'), '') ELSE origem_ref_table END,
    codigo = CASE WHEN v_patch ? 'codigo' THEN NULLIF(BTRIM(v_patch ->> 'codigo'), '') ELSE codigo END,
    updated_at = now()
  WHERE id = p_plano_id
  RETURNING * INTO v_after;

  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_plano_acao_patch(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_plano_acao_patch(uuid, jsonb) TO authenticated, service_role;

-- 2. Criar admin_update_usuario para atualização segura de usuários pela área interna MX
CREATE OR REPLACE FUNCTION public.admin_update_usuario(
  p_user_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_target_user public.usuarios%ROWTYPE;
  v_active boolean;
  v_new_role text;
  v_role_id uuid;
BEGIN
  IF v_caller_id IS NULL OR NOT public.eh_area_interna_mx(v_caller_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Apenas a área interna MX pode atualizar dados de usuários.');
  END IF;

  SELECT * INTO v_target_user FROM public.usuarios WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Usuário não encontrado.');
  END IF;

  v_active := CASE
    WHEN p_payload ? 'active' THEN (p_payload->>'active')::boolean
    ELSE NULL
  END;

  v_new_role := CASE
    WHEN p_payload ? 'role' THEN NULLIF(lower(trim(p_payload->>'role')), '')
    ELSE NULL
  END;

  IF v_new_role IS NOT NULL THEN
    SELECT id INTO v_role_id FROM public.roles WHERE code = v_new_role OR name = v_new_role LIMIT 1;
  END IF;

  UPDATE public.usuarios
  SET
    name = CASE WHEN p_payload ? 'name' THEN NULLIF(trim(p_payload->>'name'), '') ELSE name END,
    email = CASE WHEN p_payload ? 'email' THEN NULLIF(lower(trim(p_payload->>'email')), '') ELSE email END,
    phone = CASE WHEN p_payload ? 'phone' THEN NULLIF(trim(p_payload->>'phone'), '') ELSE phone END,
    avatar_url = CASE WHEN p_payload ? 'avatar_url' THEN NULLIF(trim(p_payload->>'avatar_url'), '') ELSE avatar_url END,
    preferred_name = CASE WHEN p_payload ? 'preferred_name' THEN NULLIF(trim(p_payload->>'preferred_name'), '') ELSE preferred_name END,
    birth_date = CASE WHEN p_payload ? 'birth_date' THEN (p_payload->>'birth_date')::date ELSE birth_date END,
    declared_function = CASE WHEN p_payload ? 'declared_function' THEN NULLIF(trim(p_payload->>'declared_function'), '') ELSE declared_function END,
    entry_date = CASE WHEN p_payload ? 'entry_date' THEN (p_payload->>'entry_date')::date ELSE entry_date END,
    notes = CASE WHEN p_payload ? 'notes' THEN NULLIF(trim(p_payload->>'notes'), '') ELSE notes END,
    relationship_consent = CASE WHEN p_payload ? 'relationship_consent' THEN (p_payload->>'relationship_consent')::boolean ELSE relationship_consent END,
    default_view = CASE WHEN p_payload ? 'default_view' THEN NULLIF(trim(p_payload->>'default_view'), '') ELSE default_view END,
    deactivated_at = CASE
      WHEN v_active IS FALSE AND deactivated_at IS NULL THEN now()
      WHEN v_active IS TRUE THEN NULL
      WHEN p_payload ? 'deactivated_at' THEN (p_payload->>'deactivated_at')::timestamptz
      ELSE deactivated_at
    END,
    deactivation_reason = CASE
      WHEN v_active IS TRUE THEN NULL
      WHEN p_payload ? 'deactivation_reason' THEN NULLIF(trim(p_payload->>'deactivation_reason'), '')
      ELSE deactivation_reason
    END,
    role = COALESCE(v_new_role, role),
    role_id = COALESCE(v_role_id, role_id),
    active = COALESCE(v_active, active),
    updated_at = now()
  WHERE id = p_user_id;

  -- Se desativado, encerra vínculos ativos
  IF v_active IS FALSE THEN
    UPDATE public.user_roles
       SET status = 'encerrado', valid_until = current_date, change_reason = 'Desativação de usuário.'
     WHERE user_id = p_user_id AND status = 'ativo';

    UPDATE public.vinculos_loja
       SET is_active = false, ended_at = current_date
     WHERE user_id = p_user_id AND is_active = true;

    UPDATE public.vendedores_loja
       SET is_active = false, ended_at = current_date
     WHERE seller_user_id = p_user_id AND is_active = true;

    UPDATE public.atribuicoes_consultoria
       SET active = false, updated_at = now()
     WHERE user_id = p_user_id AND active = true;
  END IF;

  RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object('id', p_user_id));
EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_usuario(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_usuario(uuid, jsonb) TO authenticated, service_role;

-- 3. Atualizar admin_hard_delete_store para limpar vínculos e integridade referencial
CREATE OR REPLACE FUNCTION public.admin_hard_delete_store(
  p_store_id uuid,
  p_confirmation text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_store public.lojas%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR NOT public.eh_area_interna_mx(v_actor_id) THEN
    RAISE EXCEPTION 'Apenas a área interna MX pode excluir lojas definitivamente.'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT public.papel_usuario(v_actor_id) INTO v_actor_role;
  SELECT * INTO v_store
  FROM public.lojas
  WHERE id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja não encontrada.' USING ERRCODE = 'no_data_found';
  END IF;

  IF coalesce(trim(p_confirmation), '') IS DISTINCT FROM trim(v_store.name) THEN
    RAISE EXCEPTION 'A confirmação deve ser exatamente o nome da loja.'
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.internal_mx_admin_audit (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    store_id,
    before_data,
    after_data,
    metadata
  ) VALUES (
    v_actor_id,
    coalesce(v_actor_role, 'area_interna_mx'),
    'hard_delete',
    'loja',
    v_store.id,
    v_store.id,
    to_jsonb(v_store),
    NULL,
    jsonb_build_object('confirmation', p_confirmation)
  );

  -- Limpar referências diretas em clientes e vínculos
  UPDATE public.clientes_consultoria
     SET primary_store_id = NULL
   WHERE primary_store_id = p_store_id;

  DELETE FROM public.unidades_cliente_consultoria WHERE store_id = p_store_id;
  DELETE FROM public.valores_indicadores_planejamento WHERE loja_id = p_store_id;
  DELETE FROM public.d1_snapshot_items WHERE store_id = p_store_id;
  DELETE FROM public.d1_contact_audit WHERE store_id = p_store_id;
  DELETE FROM public.manager_daily_tasks WHERE store_id = p_store_id;
  DELETE FROM public.manager_lead_conferences WHERE store_id = p_store_id;
  DELETE FROM public.manager_routine_snapshots WHERE store_id = p_store_id;
  DELETE FROM public.seller_routine_snapshots WHERE store_id = p_store_id;
  DELETE FROM public.store_target_plans WHERE store_id = p_store_id;
  DELETE FROM public.solicitacoes_correcao_lancamento WHERE store_id = p_store_id;
  DELETE FROM public.d1_snapshot_batches WHERE store_id = p_store_id;
  DELETE FROM public.vendedores_loja WHERE store_id = p_store_id;
  DELETE FROM public.vinculos_loja WHERE store_id = p_store_id;

  DELETE FROM public.lojas WHERE id = p_store_id;

  RETURN jsonb_build_object(
    'success', true,
    'store_id', v_store.id,
    'store_name', v_store.name,
    'deleted_at', now()
  );
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Falha ao excluir loja: %', SQLERRM;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_hard_delete_store(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_hard_delete_store(uuid, text) TO authenticated, service_role;

COMMIT;

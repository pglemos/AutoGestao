-- Migration: 20260831160000_fix_plan_patch_departamento_text.sql
-- Corrige HTTP 400 42704: tipo public.department_type inexistente ao patchar departamento
-- (ex.: cancelamento/atualização de plano de ação). planos_acao.departamento é text.

BEGIN;

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
    departamento = CASE WHEN v_patch ? 'departamento' THEN NULLIF(BTRIM(v_patch ->> 'departamento'), '') ELSE departamento END,
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

COMMIT;

-- DOWN
BEGIN;

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
BEGIN
  SELECT * INTO v_before FROM public.planos_acao WHERE id = p_plano_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plano de ação não encontrado.'; END IF;
  UPDATE public.planos_acao
  SET departamento = CASE WHEN v_patch ? 'departamento' THEN (v_patch ->> 'departamento')::public.department_type ELSE departamento END,
      updated_at = now()
  WHERE id = p_plano_id
  RETURNING * INTO v_after;
  RETURN v_after;
END;
$$;

COMMIT;

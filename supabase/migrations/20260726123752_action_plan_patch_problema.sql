-- Permite editar o campo "problema ou oportunidade" no CRUD global do Plano de Ação.
-- A RPC anterior aceitava o patch gerado pelo cliente sem esse campo, mas o mapper
-- sempre o enviava como "problema", fazendo toda edição falhar com patch inválido.

BEGIN;

CREATE OR REPLACE FUNCTION public.atualizar_plano_acao_patch(
  p_plano_id uuid,
  p_patch jsonb DEFAULT '{}'::jsonb
)
RETURNS public.planos_acao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    'concluido_at', 'iniciado_at'
  ];
  v_manager boolean;
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
      'prioridade', 'requires_owner', 'financial_impact', 'budget', 'evidence_required'
    ])
  ) THEN
    RAISE EXCEPTION 'Responsável pode atualizar apenas execução, progresso e eficácia.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_after := jsonb_populate_record(v_before, v_patch);

  UPDATE public.planos_acao
  SET problema = v_after.problema,
      acao = v_after.acao,
      objetivo = v_after.objetivo,
      indicador = v_after.indicador,
      departamento = v_after.departamento,
      responsavel_id = v_after.responsavel_id,
      prazo = v_after.prazo,
      prioridade = v_after.prioridade,
      status = v_after.status,
      progresso = v_after.progresso,
      como = v_after.como,
      eficacia_score = v_after.eficacia_score,
      eficacia_nota = v_after.eficacia_nota,
      checklist = v_after.checklist,
      comentarios = v_after.comentarios,
      requires_owner = v_after.requires_owner,
      financial_impact = v_after.financial_impact,
      budget = v_after.budget,
      evidence_required = v_after.evidence_required,
      blocked_reason = v_after.blocked_reason,
      block_category = v_after.block_category,
      block_responsible = v_after.block_responsible,
      block_responsible_id = v_after.block_responsible_id,
      expected_unblock_date = v_after.expected_unblock_date,
      block_note = v_after.block_note,
      unblock_solution = v_after.unblock_solution,
      unblock_note = v_after.unblock_note,
      return_reason = v_after.return_reason,
      return_guidance = v_after.return_guidance,
      reopen_reason = v_after.reopen_reason,
      reopen_note = v_after.reopen_note,
      cancel_reason = v_after.cancel_reason,
      cancel_note = v_after.cancel_note,
      progress_note = v_after.progress_note,
      next_step = v_after.next_step,
      projected_date = v_after.projected_date,
      impact_status = v_after.impact_status,
      impact_value_before = v_after.impact_value_before,
      impact_value_after = v_after.impact_value_after,
      realized_impact = v_after.realized_impact,
      impact_measurement_date = v_after.impact_measurement_date,
      approval_note = v_after.approval_note,
      approved_by = v_after.approved_by,
      approved_at = v_after.approved_at,
      delegation_note = v_after.delegation_note,
      delegated_by = v_after.delegated_by,
      delegated_at = v_after.delegated_at,
      reschedule_reason = v_after.reschedule_reason,
      reschedule_note = v_after.reschedule_note,
      rescheduled_by = v_after.rescheduled_by,
      rescheduled_at = v_after.rescheduled_at,
      transition_metadata = v_after.transition_metadata,
      concluido_at = v_after.concluido_at,
      iniciado_at = v_after.iniciado_at
  WHERE id = p_plano_id
  RETURNING * INTO v_after;

  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_plano_acao_patch(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_plano_acao_patch(uuid, jsonb) TO authenticated;

COMMIT;

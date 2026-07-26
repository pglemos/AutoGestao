-- Completa o contrato persistente do Plano de Ação aprovado no Base44.
-- Mantém o escopo/RLS existente e adiciona um patch JSONB que distingue
-- campo ausente de NULL, permitindo limpar valores explicitamente.

BEGIN;

ALTER TYPE public.action_status ADD VALUE IF NOT EXISTS 'aguardando_decisao';
ALTER TYPE public.action_status ADD VALUE IF NOT EXISTS 'bloqueada';

ALTER TABLE public.planos_acao
  ADD COLUMN IF NOT EXISTS requires_owner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS financial_impact numeric,
  ADD COLUMN IF NOT EXISTS budget numeric,
  ADD COLUMN IF NOT EXISTS evidence_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason text,
  ADD COLUMN IF NOT EXISTS block_category text,
  ADD COLUMN IF NOT EXISTS block_responsible text,
  ADD COLUMN IF NOT EXISTS block_responsible_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS expected_unblock_date date,
  ADD COLUMN IF NOT EXISTS block_note text,
  ADD COLUMN IF NOT EXISTS unblock_solution text,
  ADD COLUMN IF NOT EXISTS unblock_note text,
  ADD COLUMN IF NOT EXISTS return_reason text,
  ADD COLUMN IF NOT EXISTS return_guidance text,
  ADD COLUMN IF NOT EXISTS reopen_reason text,
  ADD COLUMN IF NOT EXISTS reopen_note text,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS cancel_note text,
  ADD COLUMN IF NOT EXISTS progress_note text,
  ADD COLUMN IF NOT EXISTS next_step text,
  ADD COLUMN IF NOT EXISTS projected_date date,
  ADD COLUMN IF NOT EXISTS impact_status text,
  ADD COLUMN IF NOT EXISTS impact_value_before numeric,
  ADD COLUMN IF NOT EXISTS impact_value_after numeric,
  ADD COLUMN IF NOT EXISTS realized_impact text,
  ADD COLUMN IF NOT EXISTS impact_measurement_date date,
  ADD COLUMN IF NOT EXISTS approval_note text,
  ADD COLUMN IF NOT EXISTS approved_by text,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS delegation_note text,
  ADD COLUMN IF NOT EXISTS delegated_by text,
  ADD COLUMN IF NOT EXISTS delegated_at timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_reason text,
  ADD COLUMN IF NOT EXISTS reschedule_note text,
  ADD COLUMN IF NOT EXISTS rescheduled_by text,
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS transition_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.planos_acao
  DROP CONSTRAINT IF EXISTS planos_acao_impact_status_check,
  ADD CONSTRAINT planos_acao_impact_status_check
    CHECK (impact_status IS NULL OR impact_status IN ('positive', 'partial', 'none', 'negative', 'unmeasured'));

CREATE INDEX IF NOT EXISTS idx_planos_acao_lifecycle_status
  ON public.planos_acao(scope_type, scope_id, status, prazo);

ALTER TABLE public.evidencias_planos_acao
  ADD COLUMN IF NOT EXISTS valor_antes numeric,
  ADD COLUMN IF NOT EXISTS valor_depois numeric;

CREATE OR REPLACE FUNCTION public.planos_acao_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();

  IF NEW.prazo IS NOT NULL
     AND NEW.prazo < CURRENT_DATE
     AND NEW.status IN ('pendente', 'em_andamento') THEN
    NEW.status = 'atrasado';
  END IF;

  IF NEW.status = 'concluido' THEN
    NEW.progresso = 100;
    IF NEW.concluido_at IS NULL THEN NEW.concluido_at = now(); END IF;
  ELSIF NEW.status = 'cancelada' THEN
    NEW.concluido_at = NULL;
  ELSIF NEW.status IN ('em_andamento', 'bloqueada', 'atrasado', 'validando_eficacia')
        AND NEW.iniciado_at IS NULL THEN
    NEW.iniciado_at = now();
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.historico_planos_acao
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'status_changed',
  ADD COLUMN IF NOT EXISTS event_note text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.log_planos_acao_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fields text[] := ARRAY[]::text[];
  v_type text := NULL;
  v_note text;
  v_metadata jsonb := COALESCE(NEW.transition_metadata, '{}'::jsonb);
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_type := 'created';
    v_fields := ARRAY['created'];
    v_note := 'Ação criada';
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN v_fields := array_append(v_fields, 'status'); END IF;
    IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN v_fields := array_append(v_fields, 'prioridade'); END IF;
    IF NEW.prazo IS DISTINCT FROM OLD.prazo THEN v_fields := array_append(v_fields, 'prazo'); END IF;
    IF NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN v_fields := array_append(v_fields, 'responsavel_id'); END IF;
    IF NEW.progresso IS DISTINCT FROM OLD.progresso THEN v_fields := array_append(v_fields, 'progresso'); END IF;
    IF NEW.checklist IS DISTINCT FROM OLD.checklist THEN v_fields := array_append(v_fields, 'checklist'); END IF;
    IF NEW.comentarios IS DISTINCT FROM OLD.comentarios THEN v_fields := array_append(v_fields, 'comentarios'); END IF;
    IF NEW.eficacia_score IS DISTINCT FROM OLD.eficacia_score
       OR NEW.eficacia_nota IS DISTINCT FROM OLD.eficacia_nota
       OR NEW.impact_status IS DISTINCT FROM OLD.impact_status
       OR NEW.impact_value_before IS DISTINCT FROM OLD.impact_value_before
       OR NEW.impact_value_after IS DISTINCT FROM OLD.impact_value_after
       OR NEW.realized_impact IS DISTINCT FROM OLD.realized_impact
       OR NEW.impact_measurement_date IS DISTINCT FROM OLD.impact_measurement_date THEN
      v_fields := array_append(v_fields, 'impact');
    END IF;
    IF NEW.blocked_reason IS DISTINCT FROM OLD.blocked_reason
       OR NEW.block_category IS DISTINCT FROM OLD.block_category
       OR NEW.block_note IS DISTINCT FROM OLD.block_note THEN
      v_fields := array_append(v_fields, 'block');
    END IF;
    IF NEW.return_reason IS DISTINCT FROM OLD.return_reason THEN v_fields := array_append(v_fields, 'return'); END IF;
    IF NEW.reopen_reason IS DISTINCT FROM OLD.reopen_reason THEN v_fields := array_append(v_fields, 'reopen'); END IF;
    IF NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason THEN v_fields := array_append(v_fields, 'cancel'); END IF;
    IF NEW.transition_metadata IS DISTINCT FROM OLD.transition_metadata THEN
      v_fields := array_append(v_fields, 'transition_metadata');
    END IF;

    v_type := NULLIF(NEW.transition_metadata ->> 'eventType', '');
    IF v_type IS NULL THEN
      v_type := CASE
        WHEN NEW.cancel_reason IS DISTINCT FROM OLD.cancel_reason AND NEW.cancel_reason IS NOT NULL THEN 'cancelled'
        WHEN NEW.reopen_reason IS DISTINCT FROM OLD.reopen_reason AND NEW.reopen_reason IS NOT NULL THEN 'reopened'
        WHEN NEW.return_reason IS DISTINCT FROM OLD.return_reason AND NEW.return_reason IS NOT NULL THEN 'returned'
        WHEN NEW.status = 'bloqueada' AND OLD.status IS DISTINCT FROM NEW.status THEN 'blocked'
        WHEN OLD.status = 'bloqueada' AND NEW.status IS DISTINCT FROM OLD.status THEN 'unblocked'
        WHEN NEW.status = 'validando_eficacia' AND OLD.status IS DISTINCT FROM NEW.status THEN 'submitted_for_validation'
        WHEN NEW.status = 'concluido' AND OLD.status IS DISTINCT FROM NEW.status THEN 'validated'
        WHEN NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id THEN 'delegated'
        WHEN NEW.impact_status IS DISTINCT FROM OLD.impact_status THEN 'impact_measured'
        WHEN NEW.progresso IS DISTINCT FROM OLD.progresso THEN 'progress_changed'
        WHEN NEW.prazo IS DISTINCT FROM OLD.prazo THEN 'due_date_changed'
        ELSE 'updated'
      END;
    END IF;
    v_note := NULLIF(NEW.transition_metadata ->> 'note', '');
    IF v_note IS NULL THEN
      v_note := COALESCE(NEW.blocked_reason, NEW.return_reason, NEW.reopen_reason, NEW.cancel_reason, NEW.progress_note, NEW.realized_impact, NEW.como, 'Ação atualizada');
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR array_length(v_fields, 1) IS NOT NULL THEN
    INSERT INTO public.historico_planos_acao (
      plano_id, changed_by, old_values, new_values, changed_fields,
      event_type, event_note, metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END,
      to_jsonb(NEW),
      v_fields,
      COALESCE(v_type, 'updated'),
      v_note,
      v_metadata
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_planos_acao_changes ON public.planos_acao;
CREATE TRIGGER trg_log_planos_acao_changes
  AFTER INSERT OR UPDATE ON public.planos_acao
  FOR EACH ROW EXECUTE FUNCTION public.log_planos_acao_changes();

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
    'acao', 'objetivo', 'indicador', 'departamento', 'responsavel_id', 'prazo',
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
      'acao', 'objetivo', 'indicador', 'departamento', 'responsavel_id', 'prazo',
      'prioridade', 'requires_owner', 'financial_impact', 'budget', 'evidence_required'
    ])
  ) THEN
    RAISE EXCEPTION 'Responsável pode atualizar apenas execução, progresso e eficácia.' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_after := jsonb_populate_record(v_before, v_patch);

  UPDATE public.planos_acao
  SET acao = v_after.acao,
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

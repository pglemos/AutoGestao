BEGIN;

-- ============================================================================
-- Fix Checkin Audit Logs Columns & Regularization Approval RPC
--
-- 1. Adds missing columns seller_id, store_id, and reason to checkin_audit_logs.
-- 2. Adds missing column reviewed_by to solicitacoes_correcao_lancamento (alias for auditor_id).
-- 3. Updates public.aplicar_regularizacao_fechamento to set auditor_id = v_caller
--    and populate all audit columns safely.
-- ============================================================================

ALTER TABLE IF EXISTS public.checkin_audit_logs
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS store_id uuid,
  ADD COLUMN IF NOT EXISTS reason text;

ALTER TABLE IF EXISTS public.solicitacoes_correcao_lancamento
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

CREATE OR REPLACE FUNCTION public.aplicar_regularizacao_fechamento(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_request public.solicitacoes_correcao_lancamento%ROWTYPE;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não autenticado.');
  END IF;

  SELECT * INTO v_request
    FROM public.solicitacoes_correcao_lancamento
   WHERE id = p_request_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solicitação não encontrada.');
  END IF;

  -- Authorize before returning status-specific information.
  IF NOT (
    public.eh_administrador_mx(v_caller)
    OR public.is_manager_of(v_request.store_id)
    OR public.is_owner_of(v_request.store_id)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Permissão negada.');
  END IF;

  IF v_request.status = 'approved' AND v_request.applied_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'data', jsonb_build_object('already_applied', true));
  END IF;

  IF v_request.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solicitação já processada.');
  END IF;

  SELECT to_jsonb(ld) INTO v_old
    FROM public.lancamentos_diarios ld
   WHERE ld.id = v_request.checkin_id
     AND ld.store_id = v_request.store_id
     AND ld.seller_user_id = v_request.seller_id
   FOR UPDATE;

  IF v_old IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Fechamento original não encontrado ou fora do escopo da solicitação.');
  END IF;

  IF v_request.original_values IS DISTINCT FROM (
    SELECT jsonb_build_object(
      'leads_prev_day', coalesce(ld.leads_prev_day, 0),
      'leads_net_prev_day', coalesce(ld.leads_net_prev_day, 0),
      'agd_cart_prev_day', coalesce(ld.agd_cart_prev_day, 0),
      'agd_net_prev_day', coalesce(ld.agd_net_prev_day, 0),
      'agd_cart_today', coalesce(ld.agd_cart_today, 0),
      'agd_net_today', coalesce(ld.agd_net_today, 0),
      'vnd_porta_prev_day', coalesce(ld.vnd_porta_prev_day, 0),
      'vnd_cart_prev_day', coalesce(ld.vnd_cart_prev_day, 0),
      'vnd_net_prev_day', coalesce(ld.vnd_net_prev_day, 0),
      'visit_prev_day', coalesce(ld.visit_prev_day, 0),
      'visitas_porta_prev_day', ld.visitas_porta_prev_day,
      'visitas_cart_prev_day', ld.visitas_cart_prev_day,
      'visitas_net_prev_day', ld.visitas_net_prev_day,
      'zero_reason', ld.zero_reason,
      'note', ld.note
    )
    FROM public.lancamentos_diarios ld
    WHERE ld.id = v_request.checkin_id
      AND ld.store_id = v_request.store_id
      AND ld.seller_user_id = v_request.seller_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'O fechamento mudou após a solicitação. Refaça a regularização.');
  END IF;

  IF (v_old->>'metric_scope') = 'historical' AND EXISTS (
    SELECT 1
    FROM public.lancamentos_diarios ld
    WHERE ld.seller_user_id = v_request.seller_id
      AND ld.store_id = v_request.store_id
      AND ld.reference_date = (v_old->>'reference_date')::date
      AND ld.metric_scope = 'daily'
      AND coalesce(ld.submission_status, '') <> 'draft'
      AND ld.submitted_at IS NOT NULL
      AND ld.id <> v_request.checkin_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Já existe fechamento diário oficial para esta data. Refaça a regularização sobre o registro oficial.');
  END IF;

  -- Se existia um rascunho diário não finalizado para a mesma data, remove antes de promover o histórico
  IF (v_old->>'metric_scope') = 'historical' THEN
    DELETE FROM public.lancamentos_diarios
     WHERE seller_user_id = v_request.seller_id
       AND store_id = v_request.store_id
       AND reference_date = (v_old->>'reference_date')::date
       AND metric_scope = 'daily'
       AND (submission_status = 'draft' OR submitted_at IS NULL)
       AND id <> v_request.checkin_id;
  END IF;

  UPDATE public.lancamentos_diarios
     SET metric_scope = CASE WHEN metric_scope = 'historical' THEN 'daily'::public.checkin_scope ELSE metric_scope END,
         submitted_at = CASE WHEN metric_scope = 'historical' THEN now() ELSE submitted_at END,
         submission_status = CASE WHEN metric_scope = 'historical' THEN 'late' ELSE submission_status END,
         submitted_late = CASE WHEN metric_scope = 'historical' THEN true ELSE submitted_late END,
         edit_locked_at = CASE WHEN metric_scope = 'historical' THEN now() ELSE edit_locked_at END,
         leads_prev_day = (v_request.requested_values->>'leads_prev_day')::integer,
         leads_net_prev_day = (v_request.requested_values->>'leads_net_prev_day')::integer,
         agd_cart_prev_day = (v_request.requested_values->>'agd_cart_prev_day')::integer,
         agd_net_prev_day = (v_request.requested_values->>'agd_net_prev_day')::integer,
         agd_cart_today = (v_request.requested_values->>'agd_cart_today')::integer,
         agd_net_today = (v_request.requested_values->>'agd_net_today')::integer,
         vnd_porta_prev_day = (v_request.requested_values->>'vnd_porta_prev_day')::integer,
         vnd_cart_prev_day = (v_request.requested_values->>'vnd_cart_prev_day')::integer,
         vnd_net_prev_day = (v_request.requested_values->>'vnd_net_prev_day')::integer,
         visit_prev_day = (v_request.requested_values->>'visit_prev_day')::integer,
         visitas_porta_prev_day = (v_request.requested_values->>'visitas_porta_prev_day')::integer,
         visitas_cart_prev_day = (v_request.requested_values->>'visitas_cart_prev_day')::integer,
         visitas_net_prev_day = (v_request.requested_values->>'visitas_net_prev_day')::integer,
         zero_reason = nullif(v_request.requested_values->>'zero_reason', ''),
         note = nullif(v_request.requested_values->>'note', ''),
         updated_at = now()
   WHERE id = v_request.checkin_id
     AND store_id = v_request.store_id
     AND seller_user_id = v_request.seller_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Fechamento saiu do escopo durante a aplicação.');
  END IF;

  SELECT to_jsonb(ld) INTO v_new
    FROM public.lancamentos_diarios ld
   WHERE ld.id = v_request.checkin_id
     AND ld.store_id = v_request.store_id
     AND ld.seller_user_id = v_request.seller_id;

  INSERT INTO public.checkin_audit_logs (
    checkin_id, correction_request_id, seller_id, store_id, changed_by, change_type,
    old_values, new_values, reason
  ) VALUES (
    v_request.checkin_id, v_request.id, v_request.seller_id, v_request.store_id,
    v_caller, 'approved_regularization',
    v_old, v_new, v_request.reason
  );

  UPDATE public.solicitacoes_correcao_lancamento
     SET status = 'approved',
         auditor_id = v_caller,
         reviewed_by = v_caller,
         reviewed_at = now(),
         applied_at = now(),
         updated_at = now()
   WHERE id = v_request.id;

  INSERT INTO public.notificacoes (
    recipient_id, title, message, target_type, target_store_id, store_id,
    target_role, type, priority, link
  ) VALUES (
    v_request.seller_id, 'Regularização de fechamento aprovada',
    'Sua solicitação de regularização foi aprovada pela gestão.', 'user',
    v_request.store_id, v_request.store_id, 'vendedor', 'regularizacao', 'medium',
    '/vendedor'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'request_id', v_request.id,
      'checkin_id', v_request.checkin_id,
      'applied_at', now()
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.aplicar_regularizacao_fechamento(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.aplicar_regularizacao_fechamento(uuid) TO authenticated, service_role;

COMMIT;

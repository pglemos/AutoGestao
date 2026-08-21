-- Reconciliação administrativa de planos e rascunhos duplicados.
-- As duas operações são dry-run por padrão, exigem seleção explícita e
-- preservam as linhas originais para auditoria.

BEGIN;

CREATE OR REPLACE FUNCTION public.reconcile_action_plan_applications(
  p_version_id uuid,
  p_store_ids uuid[],
  p_canonical_request_id text,
  p_duplicate_request_ids text[],
  p_reason text,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_reason text := NULLIF(BTRIM(p_reason), '');
  v_duplicate_request_ids text[];
  v_candidate_ids uuid[] := ARRAY[]::uuid[];
  v_missing_canonical_store_ids uuid[] := ARRAY[]::uuid[];
  v_reconciled_at timestamptz := clock_timestamp();
  v_reconciled_count integer := 0;
  v_dry_run boolean := COALESCE(p_dry_run, true);
BEGIN
  IF v_actor IS NULL OR NOT public.eh_area_interna_mx(v_actor) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_version_id IS NULL OR COALESCE(cardinality(p_store_ids), 0) = 0 THEN
    RAISE EXCEPTION 'APPLICATION_SCOPE_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(BTRIM(p_canonical_request_id), '') IS NULL THEN
    RAISE EXCEPTION 'CANONICAL_REQUEST_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'RECONCILIATION_REASON_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT BTRIM(request_id)), ARRAY[]::text[])
  INTO v_duplicate_request_ids
  FROM unnest(COALESCE(p_duplicate_request_ids, ARRAY[]::text[])) AS requests(request_id)
  WHERE NULLIF(BTRIM(request_id), '') IS NOT NULL
    AND BTRIM(request_id) <> BTRIM(p_canonical_request_id);

  IF cardinality(v_duplicate_request_ids) = 0 THEN
    RAISE EXCEPTION 'DUPLICATE_REQUESTS_REQUIRED' USING ERRCODE = '22023';
  END IF;

  -- Serializa toda aplicação candidata e o request canônico nas unidades
  -- selecionadas antes de validar ou atualizar qualquer linha.
  PERFORM id
  FROM public.planos_acao
  WHERE scope_type = 'store'::public.score_scope_type
    AND scope_id = ANY(p_store_ids)
    AND origem_ref_id = p_version_id
    AND origem_ref_table = 'planos_acao_template_versoes'
    AND transition_metadata ->> 'template_application_request_id'
      = ANY(array_append(v_duplicate_request_ids, BTRIM(p_canonical_request_id)))
  FOR UPDATE;

  SELECT COALESCE(array_agg(DISTINCT selected_store_id), ARRAY[]::uuid[])
  INTO v_missing_canonical_store_ids
  FROM unnest(p_store_ids) AS selected_stores(selected_store_id)
  WHERE EXISTS (
    SELECT 1
    FROM public.planos_acao duplicate_plan
    WHERE duplicate_plan.scope_type = 'store'::public.score_scope_type
      AND duplicate_plan.scope_id = selected_store_id
      AND duplicate_plan.origem_ref_id = p_version_id
      AND duplicate_plan.origem_ref_table = 'planos_acao_template_versoes'
      AND duplicate_plan.status <> 'cancelada'::public.action_status
      AND duplicate_plan.transition_metadata ->> 'template_application_request_id'
        = ANY(v_duplicate_request_ids)
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.planos_acao canonical_plan
    WHERE canonical_plan.scope_type = 'store'::public.score_scope_type
      AND canonical_plan.scope_id = selected_store_id
      AND canonical_plan.origem_ref_id = p_version_id
      AND canonical_plan.origem_ref_table = 'planos_acao_template_versoes'
      AND canonical_plan.status <> 'cancelada'::public.action_status
      AND canonical_plan.transition_metadata ->> 'template_application_request_id'
        = BTRIM(p_canonical_request_id)
  );

  IF cardinality(v_missing_canonical_store_ids) > 0 THEN
    RAISE EXCEPTION 'CANONICAL_REQUEST_NOT_FOUND_FOR_STORE' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::uuid[])
  INTO v_candidate_ids
  FROM public.planos_acao
  WHERE scope_type = 'store'::public.score_scope_type
    AND scope_id = ANY(p_store_ids)
    AND origem_ref_id = p_version_id
    AND origem_ref_table = 'planos_acao_template_versoes'
    AND status <> 'cancelada'::public.action_status
    AND COALESCE(transition_metadata ->> 'reconcile_status', '') <> 'DUPLICATE_RECONCILED'
    AND transition_metadata ->> 'template_application_request_id'
      = ANY(v_duplicate_request_ids);

  IF NOT v_dry_run AND cardinality(v_candidate_ids) > 0 THEN
    UPDATE public.planos_acao
    SET status = 'cancelada'::public.action_status,
        cancel_reason = 'duplicate_reconciled',
        cancel_note = v_reason,
        transition_metadata = COALESCE(transition_metadata, '{}'::jsonb) || jsonb_build_object(
          'reconcile_status', 'DUPLICATE_RECONCILED',
          'duplicate_of_request_id', BTRIM(p_canonical_request_id),
          'reconciled_at', v_reconciled_at,
          'reconciled_by', v_actor,
          'reconciliation_reason', v_reason
        ),
        updated_at = v_reconciled_at
    WHERE id = ANY(v_candidate_ids);
    GET DIAGNOSTICS v_reconciled_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'dry_run', v_dry_run,
    'candidate_count', cardinality(v_candidate_ids),
    'reconciled_count', v_reconciled_count,
    'plan_ids', to_jsonb(v_candidate_ids)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reconcile_action_plan_template_drafts(
  p_template_id uuid,
  p_canonical_version_id uuid,
  p_duplicate_version_ids uuid[],
  p_reason text,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_reason text := NULLIF(BTRIM(p_reason), '');
  v_duplicate_ids uuid[];
  v_candidate_ids uuid[] := ARRAY[]::uuid[];
  v_reconciled_at timestamptz := clock_timestamp();
  v_archived_count integer := 0;
  v_dry_run boolean := COALESCE(p_dry_run, true);
BEGIN
  IF v_actor IS NULL OR NOT public.eh_area_interna_mx(v_actor) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_template_id IS NULL OR p_canonical_version_id IS NULL THEN
    RAISE EXCEPTION 'DRAFT_SELECTION_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'RECONCILIATION_REASON_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT version_id), ARRAY[]::uuid[])
  INTO v_duplicate_ids
  FROM unnest(COALESCE(p_duplicate_version_ids, ARRAY[]::uuid[])) AS versions(version_id)
  WHERE version_id IS NOT NULL AND version_id <> p_canonical_version_id;

  IF cardinality(v_duplicate_ids) = 0 THEN
    RAISE EXCEPTION 'DUPLICATE_DRAFTS_REQUIRED' USING ERRCODE = '22023';
  END IF;

  PERFORM id
  FROM public.planos_acao_template_versoes
  WHERE id = ANY(array_append(v_duplicate_ids, p_canonical_version_id))
  FOR UPDATE;

  IF NOT EXISTS (
    SELECT 1 FROM public.planos_acao_template_versoes
    WHERE id = p_canonical_version_id
      AND template_id = p_template_id
      AND status = 'rascunho'
  ) THEN
    RAISE EXCEPTION 'CANONICAL_DRAFT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(v_duplicate_ids) AS selected_versions(selected_id)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.planos_acao_template_versoes version
      WHERE version.id = selected_id
        AND version.template_id = p_template_id
        AND version.status = 'rascunho'
    )
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_DRAFT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT COALESCE(array_agg(id ORDER BY id), ARRAY[]::uuid[])
  INTO v_candidate_ids
  FROM public.planos_acao_template_versoes
  WHERE id = ANY(v_duplicate_ids)
    AND template_id = p_template_id
    AND status = 'rascunho';

  IF NOT v_dry_run THEN
    UPDATE public.planos_acao_template_versoes
    SET status = 'arquivada',
        notas = concat_ws(
          E'\n',
          NULLIF(BTRIM(notas), ''),
          format(
            '[DUPLICATE_RECONCILED %s] canonical=%s; by=%s; reason=%s',
            v_reconciled_at,
            p_canonical_version_id,
            v_actor,
            v_reason
          )
        ),
        updated_at = v_reconciled_at
    WHERE id = ANY(v_candidate_ids)
      AND status = 'rascunho';
    GET DIAGNOSTICS v_archived_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'dry_run', v_dry_run,
    'candidate_count', cardinality(v_candidate_ids),
    'archived_count', v_archived_count,
    'version_ids', to_jsonb(v_candidate_ids)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_action_plan_applications(uuid, uuid[], text, text[], text, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reconcile_action_plan_template_drafts(uuid, uuid, uuid[], text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_action_plan_applications(uuid, uuid[], text, text[], text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_action_plan_template_drafts(uuid, uuid, uuid[], text, boolean) TO authenticated;

COMMENT ON FUNCTION public.reconcile_action_plan_applications(uuid, uuid[], text, text[], text, boolean) IS
  'Dry-run por padrão; cancela apenas aplicações explicitamente selecionadas sob lock e preserva auditoria.';
COMMENT ON FUNCTION public.reconcile_action_plan_template_drafts(uuid, uuid, uuid[], text, boolean) IS
  'Dry-run por padrão; arquiva rascunhos explicitamente selecionados sob lock e sem exclusão física.';

COMMIT;

-- DOWN
-- DROP FUNCTION IF EXISTS public.reconcile_action_plan_applications(uuid, uuid[], text, text[], text, boolean);
-- DROP FUNCTION IF EXISTS public.reconcile_action_plan_template_drafts(uuid, uuid, uuid[], text, boolean);

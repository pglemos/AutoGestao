-- Alternância atômica de um item do checklist do plano de ação.
-- Evita lost update quando dois usuários atualizam itens diferentes.
BEGIN;

CREATE OR REPLACE FUNCTION public.toggle_action_plan_checklist_item(
  p_plan_id uuid,
  p_item_index integer,
  p_completed boolean
)
RETURNS public.planos_acao
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_before public.planos_acao;
  v_after public.planos_acao;
  v_checklist jsonb;
  v_total integer;
  v_total_weight numeric := 0;
  v_completed_weight numeric := 0;
  v_completed_count integer := 0;
  v_progress integer := 0;
  v_now timestamptz := clock_timestamp();
  v_item_title text;
  v_manager boolean;
BEGIN
  IF p_item_index IS NULL OR p_item_index < 0 THEN
    RAISE EXCEPTION 'CHECKLIST_ITEM_INDEX_INVALID' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_before
  FROM public.planos_acao
  WHERE id = p_plan_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTION_PLAN_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_manager := public.can_manage_mx_action_scope(v_before.scope_type, v_before.scope_id);
  IF NOT v_manager AND v_before.responsavel_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF v_before.status = 'concluido'::public.action_status THEN
    RAISE EXCEPTION 'ACTION_PLAN_ALREADY_COMPLETED' USING ERRCODE = '55000';
  END IF;

  v_checklist := CASE
    WHEN jsonb_typeof(v_before.checklist) = 'array' THEN v_before.checklist
    ELSE '[]'::jsonb
  END;
  v_total := jsonb_array_length(v_checklist);
  IF p_item_index >= v_total THEN
    RAISE EXCEPTION 'CHECKLIST_ITEM_NOT_FOUND' USING ERRCODE = '22023';
  END IF;

  v_item_title := NULLIF(BTRIM(v_checklist -> p_item_index ->> 'titulo'), '');
  v_checklist := jsonb_set(
    v_checklist,
    ARRAY[p_item_index::text, 'status'],
    to_jsonb(CASE WHEN COALESCE(p_completed, false) THEN 'concluido' ELSE 'pendente' END),
    false
  );

  SELECT
    COALESCE(SUM(GREATEST(0, CASE WHEN (item ->> 'peso_bp') ~ '^[0-9]+([.][0-9]+)?$' THEN (item ->> 'peso_bp')::numeric ELSE 0 END)), 0),
    COALESCE(SUM(
      CASE WHEN lower(COALESCE(item ->> 'status', '')) IN ('concluido', 'concluida', 'realizado')
        THEN GREATEST(0, CASE WHEN (item ->> 'peso_bp') ~ '^[0-9]+([.][0-9]+)?$' THEN (item ->> 'peso_bp')::numeric ELSE 0 END)
        ELSE 0 END
    ), 0),
    COUNT(*) FILTER (WHERE lower(COALESCE(item ->> 'status', '')) IN ('concluido', 'concluida', 'realizado'))
  INTO v_total_weight, v_completed_weight, v_completed_count
  FROM jsonb_array_elements(v_checklist) AS checklist(item);

  v_progress := CASE
    WHEN v_total_weight > 0 THEN round((v_completed_weight / v_total_weight) * 100)::integer
    WHEN v_total > 0 THEN round((v_completed_count::numeric / v_total::numeric) * 100)::integer
    ELSE 0
  END;

  UPDATE public.planos_acao
  SET checklist = v_checklist,
      progresso = v_progress,
      status = CASE
        WHEN COALESCE(p_completed, false) AND v_before.status = 'pendente'::public.action_status
          THEN 'em_andamento'::public.action_status
        ELSE v_before.status
      END,
      iniciado_at = CASE
        WHEN COALESCE(p_completed, false) AND v_before.status = 'pendente'::public.action_status
          THEN COALESCE(v_before.iniciado_at, v_now)
        ELSE v_before.iniciado_at
      END,
      transition_metadata = jsonb_build_object(
        'eventType', CASE WHEN COALESCE(p_completed, false) THEN 'checklist_item_completed' ELSE 'checklist_item_reopened' END,
        'note', COALESCE(v_item_title, format('Item %s', p_item_index + 1)),
        'changedAt', v_now,
        'changedBy', auth.uid(),
        'checklistItemIndex', p_item_index
      ),
      updated_at = v_now
  WHERE id = p_plan_id
  RETURNING * INTO v_after;

  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_action_plan_checklist_item(uuid, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_action_plan_checklist_item(uuid, integer, boolean) TO authenticated;

COMMENT ON FUNCTION public.toggle_action_plan_checklist_item(uuid, integer, boolean) IS
  'Alterna um item sob row lock, recalcula progresso do checklist persistido e preserva atualizações concorrentes.';

COMMIT;

-- DOWN
-- DROP FUNCTION IF EXISTS public.toggle_action_plan_checklist_item(uuid, integer, boolean);

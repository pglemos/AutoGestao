-- DOWN
BEGIN;

DROP POLICY IF EXISTS deterministic_action_resolutions_select
  ON public.deterministic_action_resolutions;
DROP POLICY IF EXISTS deterministic_action_resolutions_insert
  ON public.deterministic_action_resolutions;
DROP POLICY IF EXISTS deterministic_action_resolutions_update
  ON public.deterministic_action_resolutions;
DROP POLICY IF EXISTS deterministic_action_resolutions_delete
  ON public.deterministic_action_resolutions;

CREATE POLICY deterministic_action_resolutions_select
  ON public.deterministic_action_resolutions
  FOR SELECT
  TO authenticated
  USING (
    public.central_can_access_store(store_id)
    AND (
      completed_by = auth.uid()
      OR seller_user_id = auth.uid()
      OR public.user_has_role(
        ARRAY['admin_mx', 'consultant', 'master', 'sales_manager']::text[],
        auth.uid()
      )
    )
  );

CREATE POLICY deterministic_action_resolutions_insert
  ON public.deterministic_action_resolutions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    completed_by = auth.uid()
    AND user_id = auth.uid()
    AND public.central_can_access_store(store_id)
    AND (
      seller_user_id IS NULL
      OR seller_user_id = auth.uid()
      OR public.user_has_role(
        ARRAY['admin_mx', 'consultant', 'master', 'sales_manager']::text[],
        auth.uid()
      )
    )
  );

CREATE POLICY deterministic_action_resolutions_update
  ON public.deterministic_action_resolutions
  FOR UPDATE
  TO authenticated
  USING (
    completed_by = auth.uid()
    AND public.central_can_access_store(store_id)
  )
  WITH CHECK (
    completed_by = auth.uid()
    AND user_id = auth.uid()
    AND public.central_can_access_store(store_id)
    AND (
      seller_user_id IS NULL
      OR seller_user_id = auth.uid()
      OR public.user_has_role(
        ARRAY['admin_mx', 'consultant', 'master', 'sales_manager']::text[],
        auth.uid()
      )
    )
  );

CREATE POLICY deterministic_action_resolutions_delete
  ON public.deterministic_action_resolutions
  FOR DELETE
  TO authenticated
  USING (
    completed_by = auth.uid()
    AND public.central_can_access_store(store_id)
  );

DROP FUNCTION IF EXISTS private.deterministic_actions_can_access_store(uuid);

COMMIT;

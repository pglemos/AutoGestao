BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.deterministic_actions_can_access_store(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT public.central_can_access_store(p_store_id);
$function$;

REVOKE ALL ON FUNCTION private.deterministic_actions_can_access_store(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.deterministic_actions_can_access_store(uuid)
  TO authenticated, service_role;

DROP POLICY IF EXISTS deterministic_action_resolutions_select
  ON public.deterministic_action_resolutions;
CREATE POLICY deterministic_action_resolutions_select
  ON public.deterministic_action_resolutions
  FOR SELECT
  TO authenticated
  USING (
    private.deterministic_actions_can_access_store(store_id)
    AND (
      completed_by = auth.uid()
      OR seller_user_id = auth.uid()
      OR public.user_has_role(
        ARRAY['admin_mx', 'consultant', 'master', 'sales_manager']::text[],
        auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS deterministic_action_resolutions_insert
  ON public.deterministic_action_resolutions;
CREATE POLICY deterministic_action_resolutions_insert
  ON public.deterministic_action_resolutions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    completed_by = auth.uid()
    AND user_id = auth.uid()
    AND private.deterministic_actions_can_access_store(store_id)
    AND (
      seller_user_id IS NULL
      OR seller_user_id = auth.uid()
      OR public.user_has_role(
        ARRAY['admin_mx', 'consultant', 'master', 'sales_manager']::text[],
        auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS deterministic_action_resolutions_update
  ON public.deterministic_action_resolutions;
CREATE POLICY deterministic_action_resolutions_update
  ON public.deterministic_action_resolutions
  FOR UPDATE
  TO authenticated
  USING (
    completed_by = auth.uid()
    AND private.deterministic_actions_can_access_store(store_id)
  )
  WITH CHECK (
    completed_by = auth.uid()
    AND user_id = auth.uid()
    AND private.deterministic_actions_can_access_store(store_id)
    AND (
      seller_user_id IS NULL
      OR seller_user_id = auth.uid()
      OR public.user_has_role(
        ARRAY['admin_mx', 'consultant', 'master', 'sales_manager']::text[],
        auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS deterministic_action_resolutions_delete
  ON public.deterministic_action_resolutions;
CREATE POLICY deterministic_action_resolutions_delete
  ON public.deterministic_action_resolutions
  FOR DELETE
  TO authenticated
  USING (
    completed_by = auth.uid()
    AND private.deterministic_actions_can_access_store(store_id)
  );

COMMIT;

BEGIN;

CREATE TABLE IF NOT EXISTS public.deterministic_action_resolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id text NOT NULL CHECK (btrim(action_id) <> ''),
  scenario_code text NOT NULL CHECK (btrim(scenario_code) <> ''),
  resolution_key text NOT NULL CHECK (btrim(resolution_key) <> ''),
  rule_version text NOT NULL CHECK (btrim(rule_version) <> ''),
  store_id uuid NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  seller_user_id uuid NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  customer_id uuid NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  opportunity_id uuid NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deterministic_action_resolutions_actor_action_version_key
    UNIQUE (completed_by, action_id, rule_version)
);

CREATE INDEX IF NOT EXISTS deterministic_action_resolutions_store_completed_idx
  ON public.deterministic_action_resolutions (store_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS deterministic_action_resolutions_seller_completed_idx
  ON public.deterministic_action_resolutions (seller_user_id, completed_at DESC)
  WHERE seller_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS deterministic_action_resolutions_customer_idx
  ON public.deterministic_action_resolutions (customer_id)
  WHERE customer_id IS NOT NULL;

ALTER TABLE public.deterministic_action_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deterministic_action_resolutions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.deterministic_action_resolutions REPLICA IDENTITY FULL;

REVOKE ALL ON TABLE public.deterministic_action_resolutions FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.deterministic_action_resolutions TO authenticated;
GRANT ALL ON TABLE public.deterministic_action_resolutions TO service_role;

DROP POLICY IF EXISTS deterministic_action_resolutions_select ON public.deterministic_action_resolutions;
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

DROP POLICY IF EXISTS deterministic_action_resolutions_insert ON public.deterministic_action_resolutions;
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

DROP POLICY IF EXISTS deterministic_action_resolutions_update ON public.deterministic_action_resolutions;
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

DROP POLICY IF EXISTS deterministic_action_resolutions_delete ON public.deterministic_action_resolutions;
CREATE POLICY deterministic_action_resolutions_delete
  ON public.deterministic_action_resolutions
  FOR DELETE
  TO authenticated
  USING (
    completed_by = auth.uid()
    AND public.central_can_access_store(store_id)
  );

DO $realtime$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'deterministic_action_resolutions'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deterministic_action_resolutions;
  END IF;
END
$realtime$;

REVOKE ALL ON FUNCTION public.prevent_valor_negociado_tamper_after_close()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_valor_negociado_tamper_after_close()
  TO postgres, service_role;

COMMIT;

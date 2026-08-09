-- C0.5 follow-up: this SECURITY DEFINER function is used only by the
-- mentor-comercial updated_at triggers. It is not a public RPC endpoint.
-- Keep the callback callable by PostgreSQL trigger execution while removing
-- direct API execution from exposed roles.
BEGIN;

REVOKE ALL ON FUNCTION public.mentor_touch_updated_at()
  FROM PUBLIC, anon, authenticated, service_role;

-- PostgreSQL grants EXECUTE on newly-created functions to PUBLIC by default;
-- make the no-public-execute rule explicit for future functions created by
-- the migration owner as well.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;

-- DOWN (compensatory, intentionally does not restore public API access):
-- BEGIN;
-- GRANT EXECUTE ON FUNCTION public.mentor_touch_updated_at() TO postgres;
-- COMMIT;

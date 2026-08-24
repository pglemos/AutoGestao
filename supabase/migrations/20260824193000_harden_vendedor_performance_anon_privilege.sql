-- Forward-only privilege hardening after 20260824182000 was applied.

BEGIN;

REVOKE ALL ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) TO authenticated;

COMMIT;

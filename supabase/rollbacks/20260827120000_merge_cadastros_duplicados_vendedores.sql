-- DOWN — reversão documentada para CI (migration congelada; produção usa 20260828100000+).
BEGIN;
UPDATE public.usuarios SET updated_at = updated_at WHERE false;
COMMIT;

-- C0.4 follow-up: keep the historical backup table inaccessible through
-- PostgREST while making that decision explicit to the Supabase advisor.
-- The table is recovered only through the database owner/service_role path;
-- anon and authenticated must never receive API access to it.
BEGIN;

ALTER TABLE IF EXISTS public.backup_is_venda_loja_20260805
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.backup_is_venda_loja_20260805
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "deny_api_backup_is_venda_loja_20260805"
  ON public.backup_is_venda_loja_20260805;

CREATE POLICY "deny_api_backup_is_venda_loja_20260805"
  ON public.backup_is_venda_loja_20260805
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

COMMIT;

-- DOWN (compensatory): dropping this policy restores the original
-- inaccessible-by-grants-only state and will intentionally re-open the
-- Supabase advisor finding. Do not use as an operational rollback.

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260809152358_harden_backup_is_venda_loja_policy.sql', import.meta.url),
  'utf8',
)
const auditCreationMigration = readFileSync(
  new URL('../../supabase/migrations/20260805115900_create_data_correction_audit_if_missing.sql', import.meta.url),
  'utf8',
)
const backupCreationMigration = readFileSync(
  new URL('../../supabase/migrations/20260806145900_create_backup_is_venda_loja_if_missing.sql', import.meta.url),
  'utf8',
)
const auxiliaryHardeningMigration = readFileSync(
  new URL('../../supabase/migrations/20260810110000_harden_auxiliary_audit_backup_rls.sql', import.meta.url),
  'utf8',
)

describe('backup table RLS hardening migration', () => {
  it('keeps the historical backup inaccessible to API roles', () => {
    expect(migration).toContain('ALTER TABLE IF EXISTS public.backup_is_venda_loja_20260805')
    expect(migration).toContain('REVOKE ALL ON TABLE public.backup_is_venda_loja_20260805')
    expect(migration).toContain('CREATE POLICY "deny_api_backup_is_venda_loja_20260805"')
    expect(migration).toContain('TO anon, authenticated')
    expect(migration).toContain('USING (false)')
    expect(migration).toContain('WITH CHECK (false)')
  })

  it('protects both relations and their identity sequences at creation time', () => {
    expect(auditCreationMigration).toContain('ALTER TABLE public.data_correction_audit ENABLE ROW LEVEL SECURITY')
    expect(auditCreationMigration).toContain('GRANT USAGE, SELECT ON SEQUENCE public.data_correction_audit_id_seq TO service_role')
    expect(backupCreationMigration).toContain('ALTER TABLE public.backup_is_venda_loja_20260805 ENABLE ROW LEVEL SECURITY')
    expect(backupCreationMigration).toContain('GRANT USAGE, SELECT ON SEQUENCE public.backup_is_venda_loja_20260805_id_seq TO service_role')
    expect(auxiliaryHardeningMigration).toContain("to_regclass('public.data_correction_audit_id_seq')")
    expect(auxiliaryHardeningMigration).toContain("to_regclass('public.backup_is_venda_loja_20260805_id_seq')")
  })
})

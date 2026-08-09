import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260809152358_harden_backup_is_venda_loja_policy.sql', import.meta.url),
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
})

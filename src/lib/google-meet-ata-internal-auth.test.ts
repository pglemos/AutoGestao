import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

describe('Google Meet ATA — autenticação interna', () => {
  test('usa segredo dedicado e autenticação manual completa', () => {
    const config = readFileSync('supabase/config.toml', 'utf8')
    const handler = readFileSync('supabase/functions/google-meet-ata/index.ts', 'utf8')

    expect(config).toContain('[functions.google-meet-ata]\nverify_jwt = false')
    expect(handler).toContain('isInternalTokenAuthorized')
    expect(handler).toContain('x-mx-cron-secret')
    expect(handler).toContain('requireAuthenticatedRole')
    expect(handler).not.toContain('isServiceRoleJwt')
    expect(handler).not.toContain('SUPABASE_SERVICE_ROLE_KEY')
  })

  test('o cron não transporta service-role no contrato novo', () => {
    const migration = readFileSync(
      'supabase/migrations/20260729140000_google_meet_ata_dedicated_cron_auth.sql',
      'utf8',
    )

    expect(migration).toContain("'x-mx-cron-secret'")
    expect(migration).toContain("'mx-google-meet-ata-cron-secret'")
    expect(migration).not.toContain("'Authorization'")
    expect(migration).not.toContain("'mx-service-role-key'")
  })
})

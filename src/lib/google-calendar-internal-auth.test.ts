import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { isInternalTokenAuthorized } from '../../supabase/functions/_shared/internal-token'

describe('Google Calendar Sync — autenticação interna', () => {
  test('rejeita token ausente, vazio ou diferente', () => {
    expect(isInternalTokenAuthorized(null, 'expected')).toBe(false)
    expect(isInternalTokenAuthorized('', 'expected')).toBe(false)
    expect(isInternalTokenAuthorized('expected', '')).toBe(false)
    expect(isInternalTokenAuthorized('wrong', 'expected')).toBe(false)
  })

  test('aceita somente o token interno exato', () => {
    expect(isInternalTokenAuthorized('expected', 'expected')).toBe(true)
  })

  test('o endpoint usa verificação própria e não aceita service role como Bearer', () => {
    const config = readFileSync('supabase/config.toml', 'utf8')
    const sync = readFileSync('supabase/functions/google-calendar-sync/index.ts', 'utf8')
    const oauth = readFileSync('supabase/functions/google-oauth-handler/index.ts', 'utf8')

    expect(config).toContain('[functions.google-calendar-sync]\nverify_jwt = false')
    expect(sync).toContain('isInternalTokenAuthorized')
    expect(sync).toContain('if (!authHeader?.startsWith("Bearer "))')
    expect(sync).toContain('status: 401')
    expect(sync).not.toContain('SUPABASE_SERVICE_ROLE_JWT')
    expect(sync).not.toContain('isServiceRoleRequest')
    expect(oauth).toContain('"x-google-calendar-sync-admin-token"')
    expect(oauth).not.toContain('SUPABASE_SERVICE_ROLE_JWT')
  })
})

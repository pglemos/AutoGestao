import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const readRepoFile = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')

describe('production hardening contracts', () => {
  test('Vercel enforces CSP instead of report-only mode', () => {
    const vercel = JSON.parse(readRepoFile('vercel.json')) as {
      headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
    }
    const globalHeaders = vercel.headers?.find((entry) => entry.source === '/(.*)')?.headers ?? []
    const keys = globalHeaders.map((header) => header.key.toLowerCase())

    expect(keys).toContain('content-security-policy')
    expect(keys).not.toContain('content-security-policy-report-only')

    const csp = globalHeaders.find((header) => header.key.toLowerCase() === 'content-security-policy')?.value ?? ''
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).not.toContain('PLACEHOLDER')
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  test('the pre-registration cache reset uses an external script allowed by CSP', () => {
    const indexHtml = readRepoFile('index.html')
    const externalScript = readRepoFile('public/pre-cadastro-cache-reset.js')

    expect(indexHtml).toContain('src="/pre-cadastro-cache-reset.js"')
    expect(indexHtml).not.toMatch(/<script>\s*\(function\s*\(\)/)
    expect(externalScript).toContain("window.location.pathname.startsWith('/pre-cadastro')")
  })

  test('database migration persists deterministic resolutions and revokes trigger RPC exposure', () => {
    const migration = readRepoFile(
      'supabase/migrations/20260728061728_deterministic_actions_runtime_and_security.sql',
    )

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.deterministic_action_resolutions')
    expect(migration).toContain('ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('supabase_realtime')
    expect(migration).toContain('GRANT SELECT, INSERT, UPDATE, DELETE')
    expect(migration).toContain('CREATE POLICY deterministic_action_resolutions_update')
    expect(migration).toContain('user_id = auth.uid()')
    expect(migration).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+public\.prevent_valor_negociado_tamper_after_close\(\)\s+FROM\s+PUBLIC,\s*anon,\s*authenticated/i,
    )
  })

  test('runtime reads persisted resolutions across days and fails closed on roles', () => {
    const hook = readRepoFile('src/features/deterministic-actions/useDeterministicActions.ts')
    const roleAdapter = readRepoFile('src/features/deterministic-actions/deterministic-role.ts')

    expect(hook).not.toMatch(/resolutionsQuery[\s\S]{0,300}\.gte\(['"]completed_at['"]/)
    expect(hook).toContain('toDeterministicRole(role)')
    expect(hook).toContain("if (!normalizedRole)")
    expect(roleAdapter).toContain('return null')
  })
})

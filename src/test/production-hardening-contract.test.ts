import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const readRepoFile = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8')

describe('production hardening contracts', () => {
  test('Vercel enforces CSP instead of report-only mode', () => {
    const vercel = JSON.parse(readRepoFile('vercel.json')) as {
      headers?: Array<{ source: string; headers: Array<{ key: string; value: string }> }>
    }
    const cspRules = (vercel.headers ?? []).filter((entry) =>
      entry.headers.some((header) =>
        header.key.toLowerCase().startsWith('content-security-policy'),
      ),
    )

    expect(cspRules.length).toBeGreaterThan(0)
    for (const rule of cspRules) {
      const keys = rule.headers.map((header) => header.key.toLowerCase())
      expect(keys).not.toContain('content-security-policy-report-only')

      const enforcedPolicies = rule.headers.filter(
        (header) => header.key.toLowerCase() === 'content-security-policy',
      )
      expect(enforcedPolicies.length).toBeGreaterThan(0)
      for (const header of enforcedPolicies) {
        expect(header.value).not.toContain("'unsafe-eval'")
        expect(header.value).not.toContain('PLACEHOLDER')
        expect(header.value).toContain("object-src 'none'")
        expect(header.value).toContain("frame-ancestors 'none'")
      }
    }
  })

  /**
   * O fallback de SPA cobria `/(.*)`, inclusive `/assets/`. Um chunk que nao
   * existia mais — indice antigo em cache pedindo um hash de build anterior —
   * respondia `200 text/html` em vez de 404. O navegador recusa HTML como
   * modulo JS e a tela fica branca.
   *
   * Pior: o `vite:preloadError` de `src/main.tsx`, que recarrega a pagina
   * justamente nesse caso, depende do fetch FALHAR. Com 200 na mao, a
   * recuperacao nunca era acionada. Asset ausente tem que dar 404.
   */
  test('o fallback de SPA nao engole requisicoes de asset', () => {
    const vercel = JSON.parse(readRepoFile('vercel.json')) as {
      rewrites?: Array<{ source: string; destination: string }>
    }
    const paraIndex = (vercel.rewrites ?? []).filter((rule) => rule.destination === '/index.html')

    expect(paraIndex.length).toBeGreaterThan(0)
    for (const rule of paraIndex) {
      expect(rule.source).not.toBe('/(.*)')
      expect(rule.source).toContain('?!assets/')
    }
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
    expect(migration).toContain('FORCE ROW LEVEL SECURITY')
    expect(migration).toContain('supabase_realtime')
    expect(migration).toContain('GRANT SELECT, INSERT, UPDATE, DELETE')
    expect(migration).toContain('CREATE POLICY deterministic_action_resolutions_select')
    expect(migration).toContain('CREATE POLICY deterministic_action_resolutions_insert')
    expect(migration).toContain('CREATE POLICY deterministic_action_resolutions_update')
    expect(migration).toContain('CREATE POLICY deterministic_action_resolutions_delete')
    expect(migration).toContain('public.central_can_access_store(store_id)')
    expect(migration).toContain('completed_by = auth.uid()')
    expect(migration).toContain('seller_user_id = auth.uid()')
    expect(migration).toContain('user_id = auth.uid()')
    expect(migration).toContain('TO authenticated')
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

  test('resolution policies call store authorization through a non-exposed helper', () => {
    const migration = readRepoFile(
      'supabase/migrations/20260728070054_deterministic_actions_rls_private_access_helper.sql',
    )

    expect(migration).toContain('CREATE SCHEMA IF NOT EXISTS private')
    expect(migration).toContain(
      'FUNCTION private.deterministic_actions_can_access_store(p_store_id uuid)',
    )
    expect(migration).toContain('SECURITY DEFINER')
    expect(migration).toContain('SET search_path = pg_catalog')
    expect(migration).toContain(
      'private.deterministic_actions_can_access_store(store_id)',
    )
    expect(migration).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+private\.deterministic_actions_can_access_store\(uuid\)\s+FROM\s+PUBLIC,\s*anon/i,
    )
    expect(migration).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+private\.deterministic_actions_can_access_store\(uuid\)\s+TO\s+authenticated,\s*service_role/i,
    )
    expect(migration).not.toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.central_can_access_store/i,
    )
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE AK — parity final consolidada (read-only, docs/qa/parity-final.md).
 *
 * - health.release == HEAD confirmado.
 * - Vercel deploy READY.
 * - Sentry bloqueado (inatividade, sem 0 newGroups verificável).
 * - Supabase sem PRODUCTION_BUG ativo (34.007 bloqueado).
 */
describe('FASE AK — parity final', () => {
  test('relatório de parity existe e cobre as 4 verificações', () => {
    const parity = read('docs/qa/parity-final.md')
    for (const k of ['health.release', 'vercel ls --prod', 'Sentry', 'Supabase']) {
      expect(parity, k).toContain(k)
    }
  })

  test('health.release == HEAD confirmado no relatório', () => {
    const parity = read('docs/qa/parity-final.md')
    expect(parity).toContain('f5f07279')
    expect(parity).toContain('HTTP 200')
  })

  test('Vercel deploy READY documentado', () => {
    const parity = read('docs/qa/parity-final.md')
    expect(parity).toContain('Ready')
    expect(parity).toContain('Production')
  })

  test('Sentry bloqueado com motivo (não é regressão)', () => {
    const parity = read('docs/qa/parity-final.md')
    expect(parity).toContain('BLOQUEADO')
    expect(parity).toContain('VITE_SENTRY_DSN')
    expect(parity).toContain('sem dados')
  })

  test('Supabase sem PRODUCTION_BUG ativo documentado', () => {
    const parity = read('docs/qa/parity-final.md')
    expect(parity).toContain('0 PRODUCTION_BUG')
    expect(parity).toContain('statement timeout')
    expect(parity).toContain('34.007')
  })
})

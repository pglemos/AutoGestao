import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE AK — runbook de release 37.006-37.020 (pronto p/ executar pós-freeze).
 *
 * Documenta push, tag, deploy verify, health, smokes por perfil, screenshots,
 * Supabase/Sentry parity, rollback dry-run, db-types e spec coverage final.
 */
describe('FASE AK — runbook release 37.006-37.020', () => {
  test('runbook existe e cobre os 15 passos', () => {
    const runbook = read('docs/execution/release-runbook-ak.md')
    for (const n of ['37.006', '37.009', '37.012', '37.015', '37.020']) {
      expect(runbook, n).toContain(n)
    }
  })

  test('push sem force + tag de release (37.006/007)', () => {
    const runbook = read('docs/execution/release-runbook-ak.md')
    expect(runbook).toContain('git push origin main')
    expect(runbook).toContain('--force')
    expect(runbook).toContain('git tag')
  })

  test('deploy verify + health check (37.009/010)', () => {
    const runbook = read('docs/execution/release-runbook-ak.md')
    expect(runbook).toContain('vercel --prod')
    expect(runbook).toContain('health.release')
    expect(runbook).toContain('/login')
  })

  test('smokes autenticados por perfil (37.011)', () => {
    const runbook = read('docs/execution/release-runbook-ak.md')
    for (const p of ['vendedor', 'dono', 'gerente']) {
      expect(runbook, p).toContain(p)
    }
  })

  test('screenshots/matriz + Supabase delta + rollback (37.012/014/017)', () => {
    const runbook = read('docs/execution/release-runbook-ak.md')
    expect(runbook).toContain('visual-matrix-roles')
    expect(runbook).toContain('classify-supabase-events')
    expect(runbook).toContain('rollback-dry-run')
  })

  test('sequência de execução + rollback documentados', () => {
    const runbook = read('docs/execution/release-runbook-ak.md')
    expect(runbook).toContain('Sequência de execução')
    expect(runbook).toContain('Rollback a qualquer momento')
  })
})

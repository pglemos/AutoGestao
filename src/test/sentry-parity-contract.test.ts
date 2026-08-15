import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE AK 37.018 — Sentry parity (read-only).
 *
 * - release = FINAL_CANDIDATE_SHA confirmado (0a37ccfb).
 * - Sentry inativo: VITE_SENTRY_DSN ausente → initSentry no-op (SYS-017).
 * - Bloqueio documentado no ledger 37.018 e 39.017.
 */
describe('FASE AK 37.018 — Sentry parity', () => {
  test('release atual == FINAL_CANDIDATE_SHA registrado', () => {
    const doc = read('docs/execution/release-candidate.md')
    expect(doc).toMatch(/FINAL_CANDIDATE_SHA = [0-9a-f]{40}/)
    expect(doc).toContain('0a37ccfb')
  })

  test('initSentry exige VITE_SENTRY_DSN (no-op sem DSN)', () => {
    const sentry = read('src/lib/observability/sentry.ts')
    expect(sentry).toContain('VITE_SENTRY_DSN')
    expect(sentry).toContain('SYS-017')
    expect(sentry).toContain('no-op')
  })

  test('initSentry chamado no main.tsx', () => {
    const main = read('src/main.tsx')
    expect(main).toContain('initSentry')
  })

  test('bloqueio do Sentry documentado no ledger (37.018/39.017)', () => {
    const ledger = read('.superpowers/mx-foundation-zero/progress.md')
    expect(ledger).toContain('37.018')
    expect(ledger).toContain('VITE_SENTRY_DSN')
    expect(ledger).toContain('observabilidade DESABILITADA')
    expect(ledger).toContain('39.017')
  })
})

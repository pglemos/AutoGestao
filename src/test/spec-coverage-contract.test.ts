import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE AJ — full regression gate (36.019/36.020).
 *
 * - 36.019: review independente do diff acumulado registrado em
 *   `docs/qa/session-diff-review.md` (apontamentos, sem correção).
 * - 36.020: spec coverage audit em `docs/qa/spec-coverage-audit.md` —
 *   requisito → evidência por FASE.
 */
describe('FASE AJ 36.019 — review do diff acumulado', () => {
  test('relatório de review existe e documenta riscos', () => {
    const review = read('docs/qa/session-diff-review.md')
    expect(review).toContain('36.019')
    expect(review).toContain('185 arquivos')
    expect(review).toContain('rollbacks')
  })

  test('review aponta a dívida das migrations sem reversal', () => {
    const review = read('docs/qa/session-diff-review.md')
    expect(review).toContain('20260815120000_add_client_contract_fields.sql')
    expect(review).toContain('20260815130000_action_plan_templates.sql')
    expect(review).toContain('supabase/rollbacks')
    expect(review).toContain('não têm rollback correspondente')
  })

  test('review não faz correção de código (read-only)', () => {
    const review = read('docs/qa/session-diff-review.md')
    expect(review).toContain('Read-only')
    expect(review).toContain('nenhuma correção feita')
  })
})

describe('FASE AJ 36.020 — spec coverage audit', () => {
  test('mapa de cobertura existe e lista fases 100%', () => {
    const audit = read('docs/qa/spec-coverage-audit.md')
    expect(audit).toContain('36.020')
    expect(audit).toContain('543')
    expect(audit).toContain('22')
  })

  test('mapa relaciona evidência por categoria (rotas/design/overlay/estados)', () => {
    const audit = read('docs/qa/spec-coverage-audit.md')
    for (const key of ['route-role-matrix', 'lint-overlay-geometry', 'EmptyState', 'motion-contract', 'keyboard-activation']) {
      expect(audit, key).toContain(key)
    }
  })

  test('mapa registra FASEs parciais e as 0% (AJ/AK/AM)', () => {
    const audit = read('docs/qa/spec-coverage-audit.md')
    expect(audit).toContain('FASEs 0%')
    expect(audit).toContain('AK')
    expect(audit).toContain('AM')
  })
})

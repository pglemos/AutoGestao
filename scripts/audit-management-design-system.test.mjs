import assert from 'node:assert/strict'
import test from 'node:test'
import { auditManagementDesignSystem, auditText } from './audit-management-design-system.mjs'

test('detecta tokens e wrappers legados em uma superfície de gestão', () => {
  const violations = auditText(`
    <section className="bg-surface-alt text-text-primary mxds-page-frame border-border-default bg-brand-primary bg-status-success-surface font-mono-numbers shadow-action" />
  `)
  const rules = new Set(violations.map((violation) => violation.rule))
  for (const expectedRule of [
    'legacy-text-token',
    'legacy-surface-token',
    'legacy-border-token',
    'legacy-brand-action',
    'legacy-wrapper',
    'legacy-status-token',
    'legacy-mono-token',
    'legacy-action-shadow',
  ]) {
    assert.equal(rules.has(expectedRule), true, `Regra ausente: ${expectedRule}`)
  }
})

test('ignora somente o ramo vendedor explicitamente delimitado', () => {
  const violations = auditText(`
    /* management-audit:seller-only-start */
    const seller = 'bg-brand-primary bg-status-success-surface'
    /* management-audit:seller-only-end */
    const manager = 'rounded-2xl bg-emerald-600 p-4'
  `)
  assert.deepEqual(violations, [])
})

test('continua detectando legado fora do ramo vendedor delimitado', () => {
  const violations = auditText(`
    /* management-audit:seller-only-start */
    const seller = 'bg-brand-primary'
    /* management-audit:seller-only-end */
    const manager = 'bg-brand-primary'
  `)
  assert.equal(violations.some((violation) => violation.rule === 'legacy-brand-action'), true)
})

test('audita as dependências reais das rotas de gestão', () => {
  const report = auditManagementDesignSystem()
  // 37 desde f4311438 (tela de meta unificada, /metas virou redirect).
  assert.equal(report.entries, 37)
  assert.ok(report.reachableFiles > 0)
  assert.ok(report.auditedFiles > 0)
  assert.ok(report.baselineFiles > 0)
  assert.ok(report.baselineSuppressed > 0)
  assert.deepEqual(report.violations, [])
})

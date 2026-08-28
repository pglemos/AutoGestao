import assert from 'node:assert/strict'
import test from 'node:test'
import { auditManagementDesignSystem, auditText } from './audit-management-design-system.mjs'

test('detecta apenas padrões genuinamente obsoletos (wrappers e shadow-action)', () => {
  const violations = auditText(`
    <section className="bg-surface-alt text-text-primary mxds-page-frame border-border-default bg-brand-primary bg-status-success-surface font-mono-numbers shadow-action" />
  `)
  const rules = new Set(violations.map((violation) => violation.rule))
  for (const expectedRule of ['legacy-wrapper', 'legacy-action-shadow']) {
    assert.equal(rules.has(expectedRule), true, `Regra ausente: ${expectedRule}`)
  }
  for (const removedRule of [
    'legacy-text-token',
    'legacy-surface-token',
    'legacy-border-token',
    'legacy-brand-action',
    'legacy-status-token',
    'legacy-mono-token',
    'legacy-secondary-brand',
  ]) {
    assert.equal(rules.has(removedRule), false, `Regra removida disparando: ${removedRule}`)
  }
})

test('ignora somente o ramo vendedor explicitamente delimitado', () => {
  const violations = auditText(`
    /* management-audit:seller-only-start */
    const seller = 'mxds-page-frame shadow-action'
    /* management-audit:seller-only-end */
    const manager = 'rounded-2xl bg-emerald-600 p-4'
  `)
  assert.deepEqual(violations, [])
})

test('continua detectando legado fora do ramo vendedor delimitado', () => {
  const violations = auditText(`
    /* management-audit:seller-only-start */
    const seller = 'mxds-page-frame'
    /* management-audit:seller-only-end */
    const manager = 'mxds-page-frame shadow-action'
  `)
  assert.equal(violations.some((violation) => violation.rule === 'legacy-wrapper'), true)
  assert.equal(violations.some((violation) => violation.rule === 'legacy-action-shadow'), true)
})

test('aliases canônicos da Fase 4 não disparam violações', () => {
  const violations = auditText(`
    <section className="bg-status-success-surface text-text-primary bg-surface-alt border-border-strong bg-brand-primary bg-brand-secondary bg-pure-black border-mx-action ring-mx-teal/20 font-mono-numbers" />
  `)
  assert.deepEqual(violations, [])
})

test('audita as dependências reais das rotas de gestão', () => {
  const report = auditManagementDesignSystem()
  // 33 entradas canônicas; aliases e superfícies removidas ficam fora da auditoria.
  // Caiu de 34 quando `/consultoria/clientes` virou alias (`<Navigate to="/clientes">`).
  assert.equal(report.entries, 33)
  assert.ok(report.reachableFiles > 0)
  assert.ok(report.auditedFiles > 0)
  assert.ok(report.baselineFiles > 0)
  assert.deepEqual(report.violations, [])
})

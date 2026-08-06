import { test } from 'node:test'
import assert from 'node:assert/strict'
import { auditLegacyScopes, auditText, legacyScopePatterns } from './audit-legacy-scopes.mjs'

test('auditText flagra o atributo de escopo interno', () => {
  const violations = auditText('<div data-mx-internal-scope="true" />')
  assert.ok(violations.some((v) => v.rule === 'legacy-internal-scope-attribute'))
})

test('auditText flagra seletores de classe legados', () => {
  const css = '.mx-manager-scope { color: red } .owner-b44 { color: blue } .mx-manager-page-1to1 { color: green }'
  const violations = auditText(css)
  assert.ok(violations.some((v) => v.rule === 'legacy-mx-manager-scope-class'))
  assert.ok(violations.some((v) => v.rule === 'legacy-owner-b44-class'))
  assert.ok(violations.some((v) => v.rule === 'legacy-manager-page-1to1-class'))
})

test('auditText ignora menções documentais e imports', () => {
  const mentions = [
    "expect(scope).not.toContain('mx-manager-scope')",
    "import { useIsMobile } from '@/lib/owner-b44/use-mobile'",
    "import '@/styles/internal-mx-manager-scope.css'",
    'documentado em docs/adr/ADR-MX-002 (`.owner-b44`)',
  ]
  for (const source of mentions) {
    assert.deepEqual(auditText(source), [], `não deveria flagrar: ${source}`)
  }
})

test('auditLegacyScopes varre src sem violações', () => {
  const report = auditLegacyScopes()
  assert.ok(report.scannedFiles > 100, 'deveria varrer todo o src')
  assert.deepEqual(report.violations, [], `violações inesperadas: ${JSON.stringify(report.violations)}`)
  assert.equal(typeof legacyScopePatterns.length, 'number')
})

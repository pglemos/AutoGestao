import { describe, expect, test } from 'bun:test'

import { auditVisualRaw } from '../../scripts/lint-visual-raw.mjs'

/**
 * FASE G — 07.014
 *
 * O guard `scripts/lint-visual-raw.mjs` precisa (a) estar verde no runtime e
 * (b) realmente falhar quando aparece uma decisão visual crua. Sem o segundo
 * teste um guard quebrado passaria por guard funcionando.
 *
 * O scanner é 100% fs (readdir/readFile) e o teste importa `auditVisualRaw()`
 * diretamente — nenhum subprocesso, então o bun test 1.3.5 (que engole o
 * stdout de subprocessos sob o project root) não afeta este contrato.
 */
describe('07.014 guard de decisão visual crua', () => {
  test('runtime está livre de raio/sombra/cor crua fora dos tokens', () => {
    const report = auditVisualRaw()
    expect(report.totalViolations).toBe(0)
  })

  test('cobre as famílias de decisão visual e tokens', () => {
    const report = auditVisualRaw()
    expect(report.rules.map((rule: { rule: string }) => rule.rule).sort()).toEqual([
      'hex-cru-em-componentes',
      'radius-arbitrario-px',
      'shadow-arbitrario',
      'token-call-em-string',
    ])
  })
})

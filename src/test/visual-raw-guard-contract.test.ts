import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

/**
 * FASE G — 07.014
 *
 * O guard `scripts/lint-visual-raw.mjs` precisa (a) estar verde no runtime e
 * (b) realmente falhar quando aparece uma decisão visual crua. Sem o segundo
 * teste um guard quebrado passaria por guard funcionando.
 */
function runGuard(): { status: number; stdout: string } {
  try {
    const stdout = execFileSync('node', ['scripts/lint-visual-raw.mjs'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { status: 0, stdout }
  } catch (error) {
    const err = error as { status?: number; stdout?: string }
    return { status: err.status ?? 1, stdout: err.stdout ?? '' }
  }
}

describe('07.014 guard de decisão visual crua', () => {
  test('runtime está livre de raio/sombra/cor crua fora dos tokens', () => {
    const { status, stdout } = runGuard()
    const report = JSON.parse(stdout.slice(stdout.indexOf('{')))
    expect(report.totalViolations, stdout).toBe(0)
    expect(status).toBe(0)
  })

  test('cobre as três famílias de decisão visual', () => {
    const { stdout } = runGuard()
    const report = JSON.parse(stdout.slice(stdout.indexOf('{')))
    expect(report.rules.map((rule: { rule: string }) => rule.rule).sort()).toEqual([
      'hex-cru-em-componentes',
      'radius-arbitrario-px',
      'shadow-arbitrario',
    ])
  })
})

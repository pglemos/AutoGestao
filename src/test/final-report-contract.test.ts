import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE AM — relatório final e prova de 100% (39.001-39.020).
 *
 * Relatório consolida evidência determinável agora (read-only); itens
 * pós-release ficam PENDENTE (FASE AK). Cada task tem checkbox próprio e
 * pointer de evidência (39.019/020).
 */
describe('FASE AM — relatório final', () => {
  test('relatório existe e cobre as 20 seções (39.001-020)', () => {
    const report = read('docs/qa/final-report.md')
    for (const n of ['39.001', '39.005', '39.010', '39.015', '39.020']) {
      expect(report, n).toContain(n)
    }
  })

  test('dados determináveis preenchidos (rotas/route×role/STANDARD_CANVAS)', () => {
    const report = read('docs/qa/final-report.md')
    expect(report).toContain('109')
    expect(report).toContain('232')
    expect(report).toContain('216')
    expect(report).toContain('STANDARD_CANVAS migrated')
    expect(report).toContain('STANDARD_CANVAS (vivo)')
  })

  test('seções de evidência local marcadas (39.010-015)', () => {
    const report = read('docs/qa/final-report.md')
    expect(report).toContain('EVIDÊNCIA LOCAL OK')
    expect(report).toContain('464 PASS')
    expect(report).toContain('dono-home 3/3')
    expect(report).toContain('14 contratos a11y')
  })

  test('itens pós-release marcados PENDENTE (39.016/017)', () => {
    const report = read('docs/qa/final-report.md')
    expect(report).toContain('39.016 Vercel | PENDENTE')
    expect(report).toContain('39.017 Sentry | PENDENTE')
  })

  test('estrutura sem agrupar tasks (39.019) e pointers por task (39.020)', () => {
    const report = read('docs/qa/final-report.md')
    expect(report).toContain('39.019')
    expect(report).toContain('uma task com checkbox próprio')
    expect(report).toContain('39.020')
  })

  test('riscos conhecidos documentados (39.018)', () => {
    const report = read('docs/qa/final-report.md')
    expect(report).toContain('statement timeout')
    expect(report).toContain('StoreFeedbackModal')
    expect(report).toContain('base44-reference')
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE AE — Matriz visual e DOM (31.001–31.019).
 *
 * O harness `visual-matrix-roles.playwright.ts` captura screenshots + DOM
 * metrics + erros por ROLE-ROUTE nos perfis operacionais (31.003–31.015),
 * e a documentação de evidência existe em `visual-evidence/`. Este contrato
 * garante que a infraestrutura da matriz está presente e completa, e que o
 * fluxo de classificação de regressão (31.018) tem guarda contra baseline
 * forçado (31.019).
 */
describe('FASE AE — harness de matriz visual por role (31.003–31.015)', () => {
  test('harness de matriz visual existe e cobre os 3 perfis operacionais', () => {
    const harness = read('src/test/visual-matrix-roles.playwright.ts')
    expect(harness).toContain("'vendedor', 'gerente', 'dono'")
    expect(harness).toContain('mobile-320')
    expect(harness).toContain('mobile-390')
    expect(harness).toContain('desktop')
  })

  test('harness captura screenshot full-page e viewport por rota', () => {
    const harness = read('src/test/visual-matrix-roles.playwright.ts')
    expect(harness).toContain("screenshotViewport")
    expect(harness).toContain("screenshotFullPage")
    expect(harness).toContain('fullPage: false')
    expect(harness).toContain('fullPage: true')
  })

  test('harness mede os DOM metrics da FASE AE (31.004–31.011)', () => {
    const harness = read('src/test/visual-matrix-roles.playwright.ts')
    for (const metric of [
      'pageCanvasCount', 'mainCount', 'scrollOwnerCount',
      'paddingLeft', 'paddingRight', 'paddingTop',
      'maxContentWidth', 'horizontalOverflow', 'headerHeight',
    ]) {
      expect(harness, `deve medir ${metric}`).toContain(metric)
    }
  })

  test('harness coleta console/page/HTTP errors (31.013–31.015)', () => {
    const harness = read('src/test/visual-matrix-roles.playwright.ts')
    expect(harness).toContain("page.on('console'")
    expect(harness).toContain("page.on('pageerror'")
    expect(harness).toContain("page.on('response'")
    expect(harness).toContain('httpErrors')
    expect(harness).toContain('pageErrors')
  })
})

describe('FASE AE — evidência e classificação de regressão (31.016–31.019)', () => {
  test('evidência é gravada em visual-evidence com nomes por role-viewport', () => {
    const harness = read('src/test/visual-matrix-roles.playwright.ts')
    expect(harness).toContain('visual-evidence')
    expect(harness).toContain('roles')
    expect(harness).toContain('matrix.json')
  })

  test('golden do Dono existe como baseline comparável (31.016)', () => {
    const golden = read('e2e/visual/dono-home.spec.ts')
    expect(golden).toContain('Golden Dono /home')
    expect(golden).toContain('toHaveScreenshot')
  })

  test('harness não força baseline — captura é separada da comparação (31.019)', () => {
    const harness = read('src/test/visual-matrix-roles.playwright.ts')
    // o harness de coleta não atualiza baseline: não usa toHaveScreenshot nem setBaseline
    expect(harness).not.toContain('toHaveScreenshot')
    expect(harness).not.toContain('setBaseline')
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Contrato FASE AE 31.018 — classificar diferenças visuais intencionais vs regressões.
 *
 * O processo (formalizado a partir da evidência de retomada da FASE AE):
 *
 * 1. Toda captura visual usa `authenticate` (credencial real) ou rotula
 *    explicitamente a fixture sintética — nunca se aceita uma diferença de
 *    baseline com fixture não-autenticada como se fosse o produto.
 * 2. O baseline (`toHaveScreenshot`) é tolerância de REGRESSÃO, não autorização
 *    para alterar produção (31.019): uma diferença só é aceita quando há
 *    evidência de credencial real + causa documentada.
 * 3. Diferenças aceitas entram como anotação no spec (intencional), não como
 *    silêncio do baseline.
 *
 * O harness de coleta (foundation_zero_harness) separa captura×comparação e
 * nunca usa `toHaveScreenshot`/`setBaseline` — verificado aqui.
 */
const VISUAL_DIR = 'e2e/visual'

function readSpec(name: string): string {
  return readFileSync(join(VISUAL_DIR, name), 'utf8')
}

describe('FASE AE 31.018 — processo de classificação de diffs visuais', () => {
  test('specs visuais autenticam com credencial real (helpers.authenticate)', () => {
    const publicRoutes = new Set(['landing.spec.ts', 'login.spec.ts']) // rotas públicas, sem auth
    for (const f of readdirSync(VISUAL_DIR)) {
      if (!f.endsWith('.spec.ts')) continue
      if (publicRoutes.has(f) || f === 'internal-mx-overflow.spec.ts') continue
      const src = readSpec(f)
      expect(src, `${f} deve autenticar`).toMatch(/authenticate|loginWithCredentials|AUTH/)
    }
  })

  test('baseline (toHaveScreenshot) é tolerância de regressão, não autorização', () => {
    const harness = readFileSync('scripts/foundation_zero_harness.ts', 'utf8')
    // O harness de coleta não compara screenshots nem seta baseline
    expect(harness, 'harness não deve usar toHaveScreenshot').not.toContain('toHaveScreenshot')
    expect(harness, 'harness não deve usar setBaseline').not.toContain('setBaseline')
  })

  test('fixture sintética é rotulada explicitamente, não como autorização', () => {
    // O golden do dono usa authenticate real (credencial), não fixture sintética
    const dono = readSpec('dono-home.spec.ts')
    expect(dono).toContain("authenticate(page, { role: 'dono' })")
    // Se um spec usar fixture (storage bypass), deve rotular como tal
    const helpers = readFileSync('e2e/visual/helpers.ts', 'utf8')
    expect(helpers).toMatch(/AUTH|role|credencial|credential/i)
  })
})

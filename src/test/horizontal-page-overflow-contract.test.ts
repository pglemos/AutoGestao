import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

import {
  ALLOWLIST,
  inspectHorizontalPageOverflow,
  runHorizontalPageOverflowGate,
} from '../../scripts/lint-horizontal-page-overflow.mjs'

/**
 * A allowlist do gate é a fonte única de verdade dos residuais documentados
 * (telas fullscreen deliberadas, clipadas pelo main do shell, medidas sem
 * overflow no harness). O orçamento deve ENCOLHER conforme essas telas migram
 * para `PageCanvas`/tokens — o gate filtra por ela, e o contrato exige que ela
 * não cresça.
 */
const RESIDUAL: Record<string, string> = Object.fromEntries(ALLOWLIST)

describe('contrato AC-29.016 — horizontal page overflow estático', () => {
  test('RED: raiz de página com w-screen é flagrada', () => {
    const source = `export function P() { return <div className="w-screen min-h-full"><p>x</p></div> }`
    expect(inspectHorizontalPageOverflow(source, 'pages/P.tsx')).toEqual([
      expect.objectContaining({ rule: 'page-root-viewport-width', file: 'pages/P.tsx' }),
    ])
  })

  test('RED: raiz de página com w-[100vw] ou 100vw é flagrada', () => {
    const source = `export function P() { return <div className="w-[100vw]"><p>x</p></div> }`
    expect(inspectHorizontalPageOverflow(source, 'pages/Q.tsx')).toEqual([
      expect.objectContaining({ rule: 'page-root-viewport-width', file: 'pages/Q.tsx' }),
    ])
  })

  test('RED: raiz de página com largura arbitrária em px é flagrada', () => {
    const source = `export function P() { return <div className="w-[1200px]"><p>x</p></div> }`
    expect(inspectHorizontalPageOverflow(source, 'pages/R.tsx')).toEqual([
      expect.objectContaining({ rule: 'page-root-arbitrary-width', file: 'pages/R.tsx' }),
    ])
  })

  test('GREEN: PageCanvas é o denominador (largura via token, não overflow)', () => {
    const source = `export function P() { return <PageCanvas width="dashboard"><div className="min-h-full">x</div></PageCanvas> }`
    expect(inspectHorizontalPageOverflow(source, 'pages/S.tsx')).toEqual([])
  })

  test('GREEN: ScrollableRegion com min-w em tabela é scroll LOCAL, não overflow', () => {
    const source = `export function P() {
      return <PageCanvas width="dashboard">
        <ScrollableRegion axis="horizontal" label="Tabela"><table className="w-full min-w-[900px]"><tbody /></table></ScrollableRegion>
      </PageCanvas>
    }`
    expect(inspectHorizontalPageOverflow(source, 'pages/T.tsx')).toEqual([])
  })

  test('GREEN: h-screen (altura) não é overflow horizontal', () => {
    const source = `export function P() { return <div className="h-screen flex items-center"><p>x</p></div> }`
    expect(inspectHorizontalPageOverflow(source, 'pages/U.tsx')).toEqual([])
  })

  test('RED: componente cuja raiz usa w-screen também é risco onde for montado', () => {
    const source = `export function Card() { return <div className="w-screen"><p>x</p></div> }`
    expect(inspectHorizontalPageOverflow(source, 'components/Card.tsx')).toEqual([
      expect.objectContaining({ rule: 'page-root-viewport-width', file: 'components/Card.tsx' }),
    ])
  })

  test('integração: árvore viva sem fontes de overflow fora do orçamento residual', () => {
    const violations = runHorizontalPageOverflowGate()
    const pending = violations.filter((v) => !RESIDUAL[v.file])
    expect(pending, `violações não-residuais:\n${JSON.stringify(pending, null, 2)}`).toEqual([])
  })

  test('cada residual documentado ainda está presente (orçamento não apodrece)', () => {
    // Verifica contra as violações CRUAS (antes do filtro da allowlist) para
    // garantir que o residual ainda existe no código — se a tela migrar para
    // PageCanvas, o residual vira obsoleto e deve sair da allowlist.
    const root = join(import.meta.dir, '../..')
    const rawByFile = new Set<string>()
    function walk(dir: string): void {
      for (const entry of readdirSync(dir)) {
        const abs = join(dir, entry)
        if (statSync(abs).isDirectory()) {
          if (['node_modules', '.git', 'base44-reference', '_stories'].includes(entry)) continue
          walk(abs)
          continue
        }
        if (!/\.(tsx|jsx)$/.test(entry) || /\.(test|spec|stories)\./.test(entry)) continue
        const rel = relative(root, abs).replace(/\\/g, '/')
        const found = inspectHorizontalPageOverflow(readFileSync(abs, 'utf8'), rel)
        for (const v of found) rawByFile.add(v.file)
      }
    }
    walk(join(root, 'src'))
    const stale = Object.keys(RESIDUAL).filter((key) => !rawByFile.has(key))
    expect(stale, `residuais já migrados — remover da allowlist:\n${stale.join('\n')}`).toEqual([])
  })
})

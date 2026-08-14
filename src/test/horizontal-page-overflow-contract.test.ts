import { describe, expect, test } from 'bun:test'

import {
  inspectHorizontalPageOverflow,
  runHorizontalPageOverflowGate,
} from '../../scripts/lint-horizontal-page-overflow.mjs'

/**
 * Residuais documentados de largura de viewport em raiz de página.
 *
 * Telas de estado fullscreen montadas por rota (acesso restrito, aguardando
 * carregamento) centralizam conteúdo com `h-screen w-screen` — o shell
 * autenticado (`main#main-content` com `overflow-hidden`) clipa o conteúdo, e o
 * harness browser mede `scrollWidth <= clientWidth + 1` nessas rotas (prova:
 * browser test da matriz route × viewport). São exceções DECLARADAS: o
 * orçamento deve ENCOLHER conforme essas telas migram para `PageCanvas`/tokens.
 */
const RESIDUAL: Record<string, string> = {
  'src/pages/LiberacaoFechamento.tsx': 'tela de estado fullscreen (acesso restrito) centralizada com h-screen w-screen; clipada pelo main do shell; medida sem overflow no harness.',
}

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
    const keys = new Set(runHorizontalPageOverflowGate().map((v) => v.file))
    const stale = Object.keys(RESIDUAL).filter((key) => !keys.has(key))
    expect(stale, `residuais já migrados — remover do orçamento RESIDUAL:\n${stale.join('\n')}`).toEqual([])
  })
})

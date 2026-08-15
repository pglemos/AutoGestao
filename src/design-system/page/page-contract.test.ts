import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { PAGE_CLEARANCES, PAGE_WIDTHS } from './PageCanvas'
import { DEFAULT_ROUTE_LAYOUT, isRouteAdopted, resolveRouteLayout } from './routeLayoutMetadata'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

const primitives = read('src/design-system/tokens/primitives.css')
const semantic = read('src/design-system/tokens/semantic.css')
const pageCanvas = read('src/design-system/page/PageCanvas.tsx')

describe('contrato de layout de página', () => {
  it('publica um token de largura para cada variante semântica', () => {
    // Sem isto, uma variante nova renderiza `max-width: var(--não-existe)`,
    // que o CSS resolve silenciosamente como sem limite.
    for (const width of PAGE_WIDTHS) {
      expect(semantic).toContain(`--mx-page-width-${width}:`)
    }
  })

  it('publica um token de reserva para cada nível de clearance', () => {
    for (const clearance of PAGE_CLEARANCES) {
      expect(semantic).toContain(`--mx-page-clearance-${clearance}:`)
    }
  })

  it('declara os breakpoints do Material Design 3 uma única vez', () => {
    expect(primitives).toContain('--mx-breakpoint-medium: 600px;')
    expect(primitives).toContain('--mx-breakpoint-expanded: 840px;')
    expect(primitives).toContain('--mx-breakpoint-large: 1200px;')
    expect(primitives).toContain('--mx-breakpoint-extra-large: 1600px;')
  })

  it('escalona a margem lateral por classe de tela — 16/24/32', () => {
    expect(semantic).toMatch(/--mx-page-margin:\s*var\(--mx-space-4\)/)
    expect(semantic).toMatch(/@media \(min-width: 600px\)/)
    expect(semantic).toMatch(/@media \(min-width: 840px\)/)
  })

  it('publica a geometria em :root, fora do escopo de migração de cor', () => {
    // Login, termos, privacidade, 404 e pré-cadastro renderizam fora do
    // AppShell. Se estes tokens ficassem sob `.mx-ds`, o PageCanvas cairia para
    // padding zero justamente nas telas que um visitante vê primeiro.
    const layoutBlock = semantic.slice(semantic.indexOf('Layout de página'))
    expect(layoutBlock).toMatch(/:root \{/)
    expect(layoutBlock).not.toMatch(/\.mx-ds \{[^}]*--mx-page-margin/)

    for (const media of ['600px', '840px']) {
      const query = semantic.slice(semantic.indexOf(`@media (min-width: ${media})`))
      expect(query.slice(0, 200)).toMatch(/:root \{/)
    }
  })

  it('soma a safe area do dispositivo à reserva inferior', () => {
    // A regressão que isto pega: alguém trocar o calc() por um valor fixo e o
    // último botão sumir sob a barra de gestos do iOS.
    expect(pageCanvas).toContain('env(safe-area-inset-bottom, 0px)')
    expect(pageCanvas).toContain('var(--mx-page-bottom-clearance)')
  })

  it('mantém o container livre de breakpoints próprios', () => {
    // O container não pode conhecer breakpoint: se conhecer, volta a existir
    // mais de um lugar decidindo margem lateral.
    expect(pageCanvas).not.toMatch(/@media|min-width|matchMedia|useMediaQuery/)
  })

  it('garante um único scroll owner na rota DashboardLoja sem overflow-y-auto interno', () => {
    const dashboardLoja = read('src/features/dashboard-loja/DashboardLoja.container.tsx')
    expect(dashboardLoja).not.toContain('overflow-y-auto')
  })
})

describe('registro de layout por rota', () => {
  it('resolve toda rota declarada em App.tsx', () => {
    const app = read('src/App.tsx')
    const paths = [...app.matchAll(/path="([^"]*)"/g)]
      .map(([, path]) => path)
      // Curingas e o índice não são páginas com conteúdo próprio.
      .filter((path) => path !== '*' && path !== '/' && !path.endsWith('/*'))

    expect(paths.length).toBeGreaterThan(50)

    for (const path of paths) {
      const layout = resolveRouteLayout(path)
      expect(PAGE_WIDTHS).toContain(layout.width)
    }
  })

  it('prefere a rota mais específica, independente da ordem de declaração', () => {
    // A subrota tem decisão própria e não herda a do prefixo.
    expect(resolveRouteLayout('configuracoes').width).toBe('dashboard')
    expect(resolveRouteLayout('configuracoes/operacional').width).toBe('focused')
    expect(resolveRouteLayout('configuracoes/reprocessamento').width).toBe('form')
  })

  it('normaliza barras iniciais e finais', () => {
    expect(resolveRouteLayout('/ranking/').width).toBe(
      resolveRouteLayout('ranking').width,
    )
  })

  it('devolve o default para rota desconhecida em vez de lançar', () => {
    expect(resolveRouteLayout('rota-que-nao-existe')).toEqual(
      DEFAULT_ROUTE_LAYOUT,
    )
  })

  it('reserva espaço de navegação nas rotas com bottom navigation no mobile', () => {
    expect(resolveRouteLayout('meu-dia').bottomClearance).toBe('navigation')
    expect(resolveRouteLayout('vendedor/carteira').bottomClearance).toBe(
      'navigation',
    )
  })

  it('trata rota não migrada como não adotada', () => {
    // Enquanto a rota não tiver perdido o padding próprio, o shell não pode
    // envolvê-la no PageCanvas: os dois paddings somariam.
    expect(isRouteAdopted('plano-acao')).toBe(false)
    expect(isRouteAdopted('rota-que-nao-existe')).toBe(false)
  })

  it('reserva espaço de ações nos fluxos com barra fixa de salvar', () => {
    expect(resolveRouteLayout('fechamento-diario').bottomClearance).toBe(
      'actions',
    )
    expect(resolveRouteLayout('rotina-do-dia').bottomClearance).toBe('actions')
  })
})

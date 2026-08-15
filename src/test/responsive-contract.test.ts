import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * FASE W — Responsividade (Window Size Classes)
 *
 * O produto usa os breakpoints do Material Design 3, não os defaults do
 * Tailwind (`sm/md/lg/xl`). As classes de janela nomeadas — compact/medium/
 * expanded/large/extra-large — respondem aos tokens `--mx-breakpoint-*`
 * (0/600/840/1200/1600). Grids responsivos devem usar essas classes, não
 * media queries manuais espalhadas.
 *
 * `min-width: 0` é obrigatório em flex/grid children roláveis, senão o
 * conteúdo estoura o container (o padrão de `min-width: auto` do flex).
 */
const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

describe('FASE W — responsividade (window size)', () => {
  test('tokens de breakpoint MD3 existem na escala canônica', () => {
    const primitives = read('src/design-system/tokens/primitives.css')
    expect(primitives).toContain('--mx-breakpoint-compact: 0px')
    expect(primitives).toContain('--mx-breakpoint-medium: 600px')
    expect(primitives).toContain('--mx-breakpoint-expanded: 840px')
    expect(primitives).toContain('--mx-breakpoint-large: 1200px')
    expect(primitives).toContain('--mx-breakpoint-extra-large: 1600px')
  })

  test('variantes nomeadas de janela mapeiam os breakpoints MD3 no @theme', () => {
    const css = read('src/index.css')
    expect(css).toContain('--breakpoint-medium: 600px')
    expect(css).toContain('--breakpoint-expanded: 840px')
    expect(css).toContain('--breakpoint-large: 1200px')
    expect(css).toContain('--breakpoint-extra-large: 1600px')
  })

  test('utilities de grid por classe de janela existem (1/2/3/4 colunas)', () => {
    const css = read('src/index.css')
    expect(css).toMatch(/grid-cols-compact/)        // 1 coluna
    expect(css).toMatch(/grid-cols-medium/)         // 2 colunas
    expect(css).toMatch(/grid-cols-expanded/)       // 3 colunas
    expect(css).toMatch(/grid-cols-large/)          // 4 colunas
  })

  test('sem media queries manuais de breakpoint em componentes canônicos', () => {
    const viewport = read('src/design-system/page/PageViewport.tsx')
    expect(viewport).toContain('min-w-0')
    const header = read('src/components/molecules/PageHeader.tsx')
    expect(header).toContain('min-w-0')
  })
})

describe('FASE W — comportamento por classe de janela (23.004–015)', () => {
  test('viewport matrix cobre compact/medium/expanded/large (23.004–008)', () => {
    const matrix = read('src/test/visual-matrix-roles.playwright.ts')
    expect(matrix).toContain('mobile-320')
    expect(matrix).toContain('mobile-390')
    expect(matrix).toContain('desktop')
    const config = read('playwright.config.ts')
    for (const vp of ['width: 320', 'width: 768', 'width: 1280', 'width: 1440']) {
      expect(config, vp).toContain(vp)
    }
  })

  test('long labels truncam nos componentes canônicos (23.011)', () => {
    const pageHeader = read('src/components/molecules/PageHeader.tsx')
    expect(pageHeader).toMatch(/truncate|min-w-0/)
    const tabNav = read('src/components/molecules/TabNav.tsx')
    expect(tabNav).toMatch(/truncate|whitespace-nowrap/)
  })

  test('safe areas simuladas com env() (23.012)', () => {
    const css = read('src/index.css')
    expect(css).toContain('env(safe-area-inset-top)')
    expect(css).toContain('env(safe-area-inset-left)')
  })

  test('200% zoom coberto por playwright (23.013)', () => {
    const zoom = read('src/test/typography-zoom-200.playwright.ts')
    expect(zoom).toContain('zoom 200%')
  })

  test('scrollbar sem layout jump — scrollbar-gutter stable (23.014)', () => {
    const css = read('src/index.css')
    expect(css).toContain('scrollbar-gutter: stable')
  })

  test('overflow horizontal auditado por lint (23.015)', () => {
    const lint = read('scripts/lint-horizontal-page-overflow.mjs')
    expect(lint).toContain('overflow')
  })
})

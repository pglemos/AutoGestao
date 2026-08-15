import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE I — invariantes de PageCanvas (09.007-010, 09.018).
 *
 * O PageCanvas é o ÚNICO dono da geometria de página: safe-area lateral com
 * `max(gutter, inset)`, safe-area bottom + clearance de navegação/ações,
 * padding top/bottom por classe de viewport, e centralização via
 * `margin-inline: auto` com `max-width` por variante. Nenhuma rota pode
 * substituir isso por literais (o gate `lint-page-roots` bloqueia `max-w-*`).
 */
describe('FASE I — PageCanvas é o único dono da geometria (09.007-010/018)', () => {
  test('safe-area lateral usa max(gutter, inset) (09.007)', () => {
    const canvas = read('src/design-system/page/PageCanvas.tsx')
    expect(canvas).toContain('max(var(--mx-page-margin), env(safe-area-inset-left, 0px))')
    expect(canvas).toContain('max(var(--mx-page-margin), env(safe-area-inset-right, 0px))')
  })

  test('safe-area bottom soma clearance + inset (09.008)', () => {
    const canvas = read('src/design-system/page/PageCanvas.tsx')
    expect(canvas).toContain('paddingBottom')
    expect(canvas).toContain('var(--mx-page-bottom-clearance)')
    expect(canvas).toContain('env(safe-area-inset-bottom, 0px)')
  })

  test('padding top/bottom vêm dos tokens de viewport (09.009)', () => {
    const canvas = read('src/design-system/page/PageCanvas.tsx')
    expect(canvas).toContain("paddingTop: 'var(--mx-page-padding-top)'")
    const semantic = read('src/design-system/tokens/semantic.css')
    expect(semantic).toContain('--mx-page-margin: var(--mx-space-4)')
    expect(semantic).toContain('--mx-page-padding-top: var(--mx-space-6)')
    expect(semantic).toContain('--mx-page-padding-bottom: var(--mx-space-6)')
  })

  test('centralização via margin-inline auto + max-width por variante (09.010)', () => {
    const canvas = read('src/design-system/page/PageCanvas.tsx')
    expect(canvas).toContain("marginInline: 'auto'")
    expect(canvas).toContain('var(--mx-page-width-${width})')
  })

  test('clearance de ações reserva espaço para fixed action bars (09.018)', () => {
    const semantic = read('src/design-system/tokens/semantic.css')
    expect(semantic).toContain('--mx-page-clearance-actions: var(--mx-space-20)')
    expect(semantic).toContain('--mx-page-clearance-navigation: var(--mx-space-16)')
  })

  test('PageCanvas emite data-mx-page-* para regressão visual e E2E', () => {
    const canvas = read('src/design-system/page/PageCanvas.tsx')
    expect(canvas).toContain('data-mx-page-canvas=""')
    expect(canvas).toContain('data-mx-page-width={width}')
    expect(canvas).toContain('data-mx-page-clearance={bottomClearance}')
  })
})

import { readFileSync } from 'node:fs'

describe('Foundation Zero harness synchronization contract', () => {
  test('aguarda o PageCanvas depois do landmark do shell', () => {
    const source = readFileSync('scripts/foundation_zero_harness.ts', 'utf8')
    const shellWait = source.indexOf("page.locator('#main-content, [data-mx-page-canvas], [data-mx-role]').first().waitFor")
    const canvasWait = source.indexOf("page.locator('[data-mx-page-canvas]').first().waitFor")

    expect(shellWait).toBeGreaterThanOrEqual(0)
    expect(canvasWait).toBeGreaterThan(shellWait)
    expect(source.slice(canvasWait, canvasWait + 180)).toContain('timeout: 30_000')
  })

  test('só desconta scroll owner que foi declarado pelo primitivo', () => {
    const source = readFileSync('scripts/foundation_zero_harness.ts', 'utf8')
    // O desconto precisa exigir o marcador E preservar o PageViewport, senão
    // qualquer scroller acidental escaparia da contagem.
    expect(source).toContain("element.hasAttribute('data-mx-scroll-region')")
    expect(source).toContain("element !== pageViewport && element.hasAttribute('data-mx-scroll-region')")

    // E o marcador só pode nascer no primitivo — nunca solto numa tela.
    const primitive = readFileSync('src/design-system/page/ScrollableRegion.tsx', 'utf8')
    expect(primitive).toContain('data-mx-scroll-region=""')
  })
})

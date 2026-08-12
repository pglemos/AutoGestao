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
})

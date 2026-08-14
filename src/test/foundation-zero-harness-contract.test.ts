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

  test('expõe resume idempotente e lock de processo concorrente (H1)', () => {
    const source = readFileSync('scripts/foundation_zero_harness.ts', 'utf8')
    expect(source).toContain("args['no-resume']")
    expect(source).toContain('acquireRunLock')
    expect(source).toContain('acquireGlobalLock')
    expect(source).toContain('runRoleLoop')
    expect(source).toContain('parseBatchSize')
    expect(source).toContain('onRoleComplete')
    expect(source).toContain('aggregateSummaryFromDisk(plan.effective, outputRoot, plan.selected, runId)')

    // Anti-máscara: writeSummary NUNCA pode ser engolido por catch — falha de
    // persistência deve propagar para main().catch (exit 1) com release do lock
    // garantido pelo finally aninhado.
    const summaryIndex = source.indexOf('const summary = await writeSummary()')
    expect(summaryIndex).toBeGreaterThan(-1)
    const afterSummary = source.slice(summaryIndex, summaryIndex + 200)
    expect(afterSummary).toContain('} finally {')
    expect(afterSummary).not.toContain('catch')
    expect(source).toContain('await runHandle.release()')

    const runner = readFileSync('scripts/foundation-zero-runner.mjs', 'utf8')
    expect(runner).toContain('HARNESS_LOCK_HELD')
    expect(runner).toContain('isCompleteCapture')
    expect(runner).toContain("flag: 'wx'")
    expect(runner).toContain('aggregateSummaryFromDisk')
    expect(runner).toContain('prevToken')
    expect(runner).toContain('matrix-${slug}.lock')
    expect(runner).toContain('onRoleComplete(role, roleResults, { sessionsOpened, sessionsClosed })')
  })
})

import { expect, test } from '@playwright/test'
import axe from 'axe-core'

const routes = [
  '/',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
]

for (const route of routes) {
  test(`rota pública ${route} não possui violação WCAG séria`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(100)
    await page.addScriptTag({ content: axe.source })

    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
        },
      })

      return result.violations
        .filter(({ impact }) => impact === 'serious' || impact === 'critical')
        .map(({ id, impact, nodes }) => ({
          id,
          impact,
          nodes: nodes.map(({ target, failureSummary }) => ({
            target,
            failureSummary,
          })),
        }))
    })

    expect(violations, JSON.stringify(violations)).toEqual([])

    const { clientWidth, scrollWidth } = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })
}

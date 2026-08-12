import { expect, test } from '@playwright/test'

const PUBLIC_ROUTES = ['/', '/login', '/privacy', '/terms']

async function assertNoClippedText(page: import('@playwright/test').Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(150)
  const result = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth
    const horizontalOverflow = document.documentElement.scrollWidth - viewport
    const clipped: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
    let node: Element | null = walker.nextNode() as Element | null
    while (node) {
      const el = node as HTMLElement
      const style = window.getComputedStyle(el)
      let ancestor: Element | null = el
      let isAnimatedScroll = false
      while (ancestor) {
        if (['marquee', 'ticker', 'micro-mq', 'micro-mq-row', 'marquee-track', 'ticker-track'].some((c) => ancestor.classList.contains(c))) { isAnimatedScroll = true; break }
        ancestor = ancestor.parentElement
      }
      const hasOwnText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && /[^\s]/.test(n.textContent || ''))
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
      if (visible && hasOwnText && !isAnimatedScroll) {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && (rect.right > viewport + 0.5 || rect.left < -0.5)) {
          clipped.push(
            `${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')} right=${Math.round(rect.right)} left=${Math.round(rect.left)} "${(el.textContent || '').trim().slice(0, 50)}"`
          )
        }
      }
      node = walker.nextNode() as Element | null
    }
    return { horizontalOverflow, clipped: clipped.slice(0, 12) }
  })
  expect(result.horizontalOverflow).toBeLessThanOrEqual(1)
  expect(result.clipped).toEqual([])
}

for (const route of PUBLIC_ROUTES) {
  test(`06.013 zoom 200% — rota pública ${route} sem corte de texto`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto(route)
    await assertNoClippedText(page)
  })
}

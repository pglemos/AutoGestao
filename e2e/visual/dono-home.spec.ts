import { expect, test } from '@playwright/test'
import { authenticate, waitForStable } from './helpers'

test.describe('Golden Dono /home - Visual Regression', () => {
  test('golden home nao altera alem da tolerancia', async ({ page }) => {
    await authenticate(page, { role: 'dono' })
    await page.goto('/home')
    await waitForStable(page)
    // PageCanvas is intentionally rendered as content inside the shell's
    // canonical <main>; the canvas itself is a div/section with the stable
    // data contract, never a second landmark.
    await expect(page.locator('[data-mx-page-canvas]')).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveScreenshot('dono-home-golden.png')
  })
})

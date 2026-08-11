import { expect, test } from '@playwright/test'
import { authenticate, waitForStable } from './helpers'

test.describe('Golden Dono /home - Visual Regression', () => {
  test('golden home nao altera alem da tolerancia', async ({ page }) => {
    await authenticate(page, { role: 'dono' })
    await page.goto('/home')
    await waitForStable(page)
    await expect(page.locator('main[data-mx-page-canvas]')).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveScreenshot('dono-home-golden.png')
  })
})
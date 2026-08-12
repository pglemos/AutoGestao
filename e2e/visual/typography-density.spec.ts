import { expect, test } from '@playwright/test'
import { authenticate, waitForStable } from './helpers'

const PUBLIC = ['/login', '/privacy', '/terms'] as const
const AUTH = [
  { route: '/home', role: 'vendedor', label: 'vendedor-home' },
  { route: '/meu-funil', role: 'vendedor', label: 'vendedor-funil' },
  { route: '/configuracoes', role: 'vendedor', label: 'vendedor-config' },
  { route: '/universidade-mx', role: 'gerente', label: 'gerente-universidade' },
  { route: '/desenvolvimento', role: 'dono', label: 'dono-desenvolvimento' },
] as const

test.describe('06.015 Visual Regression - paginas de maior densidade textual', () => {
  for (const route of PUBLIC) {
    test(`publica ${route} estavel`, async ({ page }) => {
      await page.goto(route)
      await waitForStable(page)
      await expect(page.locator('body')).toHaveScreenshot(`fase-f-densidade${route.replaceAll('/', '-')}.png`)
    })
  }

  for (const { route, role, label } of AUTH) {
    test(`autenticada ${label} (${route}) estavel`, async ({ page }) => {
      await authenticate(page, { role })
      await page.goto(route)
      await waitForStable(page)
      await expect(page.locator('body')).toHaveScreenshot(`fase-f-densidade-${label}.png`)
    })
  }
})
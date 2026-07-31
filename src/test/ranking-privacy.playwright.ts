import { expect, test } from '@playwright/test'
import {
  createE2EAdminUser,
  deleteE2EUser,
  getFirstRankingStoreName,
  type E2EUser,
} from './e2e-helpers/supabase-admin'

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(painel|home|loja|lojas)/, { timeout: 15000 }).catch(() => {})
}

test.describe('Ranking store privacy regression', () => {
  let user: E2EUser | null = null

  test.afterEach(async () => {
    if (user) {
      await deleteE2EUser(user.id)
      user = null
    }
  })

  test('admin can hide store names and the literal store name leaves the DOM text', async ({ page }, testInfo) => {
    const storeName = await getFirstRankingStoreName()
    test.skip(!storeName, 'No active ranking store is available in the current Supabase project.')

    user = await createE2EAdminUser({
      prefix: `ranking-privacy-${testInfo.project.name}`,
      mustChangePassword: false,
    })

    await login(page, user.email, user.password)
    await page.goto('/ranking')

    // O cabeçalho é "Ranking Global" desde a unificação; "Arena" sobrou apenas
    // no nome do seletor de comparação entre lojas.
    await expect(page.getByRole('heading', { name: /Ranking\s+Global/i }).first()).toBeVisible({ timeout: 15000 })
    await expect.poll(async () => (await page.locator('body').textContent()) || '', { timeout: 15000 })
      .toContain(storeName!)

    await page.getByRole('button', { name: /Ocultar lojas/i }).click()

    await expect(page.getByRole('button', { name: /Mostrar lojas/i })).toBeVisible()
    await expect.poll(async () => (await page.locator('body').textContent()) || '', { timeout: 15000 })
      .not.toContain(storeName!)
    await expect(page.getByText(/LOJA #1|Loja oculta/i).first()).toBeVisible()
  })
})

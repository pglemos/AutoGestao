import { expect, test, type Page } from '@playwright/test'

const password = process.env.E2E_ROLE_PASSWORD
const profiles = [
  { role: 'administrador_mx', email: process.env.E2E_ADMIN_MX_EMAIL },
  { role: 'consultor_mx', email: process.env.E2E_CONSULTANT_EMAIL },
  { role: 'dono', email: process.env.E2E_OWNER_EMAIL },
  { role: 'gerente', email: process.env.E2E_MANAGER_EMAIL },
  { role: 'vendedor', email: process.env.E2E_SELLER_EMAIL },
] as const
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 768 },
  { name: 'mobile', width: 390, height: 844 },
] as const
const internalRoutes = [
  '/painel',
  '/lojas',
  '/consultoria/clientes',
  '/agenda',
  '/notificacoes',
  '/relatorio-matinal',
  '/relatorios/performance-vendas',
  '/relatorios/performance-vendedor',
  '/auditoria',
  '/simulacao',
  '/configuracoes/reprocessamento',
] as const

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password as string)
  await page.click('button[type="submit"]')
  await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
}

test.describe('Ondas 3 e 4 internas MX', () => {
  test.describe.configure({ timeout: 900_000 })
  for (const profile of profiles) {
    for (const viewport of viewports) {
      test(`${profile.role} ${viewport.name}`, async ({ page }) => {
        test.skip(!profile.email || !password, `Credencial E2E de ${profile.role} não configurada`)
        await page.setViewportSize(viewport)
        const errors: string[] = []
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
        page.on('pageerror', error => errors.push(error.message))
        await login(page, profile.email as string)

        if (profile.role === 'administrador_mx' || profile.role === 'consultor_mx') {
          for (const route of internalRoutes) {
            await page.goto(route, { waitUntil: 'networkidle' })
            await expect(page.locator('[data-mx-template-slot="page"]')).toHaveCount(1)
            expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false)
          }
        } else {
          await page.goto('/', { waitUntil: 'networkidle' })
          await expect(page.locator('main#main-content')).toBeVisible()
        }
        expect(errors).toEqual([])
      })
    }
  }
})

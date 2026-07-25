import { test, expect, type Page } from '@playwright/test'
import { getVisualAuthPassword } from '../../e2e/visual/helpers'

const PASSWORD = process.env.E2E_ROLE_PASSWORD || getVisualAuthPassword()
const profiles = [
  { role: 'administrador_geral', email: process.env.E2E_ADMIN_EMAIL || 'synvollt@gmail.com' },
  { role: 'administrador_mx', email: process.env.E2E_ADMIN_MX_EMAIL },
  { role: 'consultor_mx', email: process.env.E2E_CONSULTANT_EMAIL },
] as const
const viewports = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'tablet', width: 1024, height: 768 },
  { key: 'mobile', width: 390, height: 844 },
] as const
const routes = [
  { path: '/configuracoes?aba=perfil', page: 'configuracoes' },
  { path: '/configuracoes?aba=equipe-usuarios', page: 'configuracoes', consultantAccess: 'read-only' },
  { path: '/configuracoes?aba=lojas-rede', page: 'configuracoes', consultantAccess: 'read-only' },
  { path: '/configuracoes?aba=operacional-loja', page: 'configuracoes', consultantAccess: 'read-only' },
  { path: '/configuracoes?aba=sistema-mx', page: 'configuracoes', consultantAccess: 'read-only' },
  { path: '/gerente/feedbacks-pdis?tab=feedbacks', page: 'desenvolvimento' },
  { path: '/gerente/feedbacks-pdis?tab=pdis', page: 'desenvolvimento' },
  { path: '/produtos', page: 'produtos-digitais', consultantAccess: 'read-only' },
] as const

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
}

test.describe('Onda 2 interna MX', () => {
  test.describe.configure({ timeout: 900_000 })
  for (const profile of profiles) {
    for (const viewport of viewports) {
      for (const route of routes) {
        test(`${profile.role} ${viewport.key} ${route.path}`, async ({ page }) => {
          test.skip(!profile.email, `Credencial ${profile.role} não configurada`)
          await page.setViewportSize(viewport)
          const consoleErrors: string[] = []
          page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()) })
          page.on('pageerror', (error) => consoleErrors.push(error.message))
          await login(page, profile.email as string)
          await page.goto(route.path, { waitUntil: 'networkidle' })
          await expect(page.locator('[data-mx-template-slot="page"]')).toHaveCount(1)
          await expect(page.locator('[data-mx-module-header]')).toHaveCount(1)
          expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false)
          expect(consoleErrors).toEqual([])
          if (route.page === 'configuracoes' || route.page === 'desenvolvimento') await expect(page.locator('[data-mx-page-tabs]')).toHaveCount(1)
          if (profile.role === 'consultor_mx' && route.consultantAccess === 'read-only') {
            await expect(page.locator('[data-mx-access-mode="read-only"]')).toHaveCount(1)
            await expect(page.locator('[data-mx-requires-manage]:not(:disabled)')).toHaveCount(0)
          }
        })
      }
    }
  }
})

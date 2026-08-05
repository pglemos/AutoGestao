import { test, expect } from '@playwright/test'
import { waitForStable } from './helpers'

const MANAGER_EMAIL = process.env.E2E_MANAGER_EMAIL || process.env.E2E_AUTH_EMAIL || 'gerente@mxgestaopreditiva.com.br'
const MANAGER_PASSWORD = process.env.E2E_ROLE_PASSWORD || process.env.E2E_AUTH_PASSWORD

const routes = [
  { path: '/home', slug: 'inicio', heading: 'Início' },
  { path: '/rotina', slug: 'rotina-dia', heading: 'Rotina do Dia' },
  { path: '/fechamento-diario', slug: 'fechamento-diario', heading: 'Fechamento Diário' },
  { path: '/rotina-equipe', slug: 'rotina-equipe', heading: 'Rotina da Equipe' },
  { path: '/minha-equipe', slug: 'minha-equipe', heading: 'Minha Equipe' },
  { path: '/meta-loja', slug: 'meta-loja', heading: 'Meta da Loja' },
  { path: '/mentor', slug: 'mentor', heading: 'Mentor Gerencial' },
  { path: '/feedbacks-pdis', slug: 'desenvolvimento', heading: 'Desenvolvimento' },
  { path: '/ranking', slug: 'ranking', heading: 'Ranking' },
  { path: '/universidade-mx', slug: 'universidade-mx', heading: /Universidade|Desenvolvimento/ },
] as const

test.describe('Módulo Gerencial — regressão visual MX', () => {
  test.beforeEach(async ({ page }) => {
    if (!MANAGER_PASSWORD) {
      throw new Error('E2E_ROLE_PASSWORD ou E2E_AUTH_PASSWORD é obrigatório para baseline gerencial; a suíte não pode ser aprovada com testes ignorados.')
    }
    await page.goto('/login')
    await page.fill('input[type="email"]', MANAGER_EMAIL)
    await page.fill('input[type="password"]', MANAGER_PASSWORD!)
    await page.click('button[type="submit"]')
    await expect(page.locator('main#main-content').first()).toBeVisible({ timeout: 20000 })
  })

  for (const route of routes) {
    test(`${route.slug} mantém composição carregada`, async ({ page }) => {
      await page.goto(route.path)
      await waitForStable(page)
      await expect(page.locator('main#main-content').first()).toBeVisible()
      await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible()
      await expect(page.locator('body')).not.toContainText('NaN')
      await expect(page).toHaveScreenshot(`${route.slug}.png`, {
        animations: 'disabled',
        caret: 'hide',
        fullPage: true,
      })
    })
  }
})

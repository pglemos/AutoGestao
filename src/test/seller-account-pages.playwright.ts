import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

const password = getE2ERolePassword()

type RouteContract = {
  path: string
  slug: string
  content?: RegExp
  target?: boolean
}

const routes: RouteContract[] = [
  { path: '/perfil', slug: 'perfil', content: /Meu Perfil/i, target: true },
  { path: '/configuracoes', slug: 'configuracoes', content: /Configurações/i, target: true },
  { path: '/notificacoes', slug: 'notificacoes', content: /Notificações/i, target: true },
  { path: '/fechamento-diario', slug: 'fechamento-diario' },
  { path: '/central-execucao', slug: 'central-execucao' },
  { path: '/universidade-mx', slug: 'universidade-mx' },
] as const

test.describe('Seller account pages visual contract', () => {
  test('renders account pages with the seller shell at required viewports', async ({ page }) => {
    test.setTimeout(120_000)
    await loginWithCredentials(page, 'vendedor@mxgestaopreditiva.com.br', password)

    for (const viewport of [
      { name: 'desktop-1440', width: 1440, height: 900 },
      { name: 'mobile-390', width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      // A navegação lateral do Vendedor só existe acima de lg — abaixo disso o
      // shell entrega a barra inferior. Cobrar a lateral antes de fixar o
      // viewport fazia o caso reprovar quando o projeto Playwright já começava
      // em largura de celular, sem nada a ver com as telas medidas aqui.
      if (viewport.width >= 1024) {
        await expect(page.getByRole('navigation', { name: /Menu principal do Vendedor/i })).toBeVisible({ timeout: 20_000 })
      }
      for (const route of routes) {
        await page.goto(route.path)
        await expect(page.locator('main#main-content').first()).toBeVisible({ timeout: 20_000 })
        if (route.target) {
          await expect(page.getByRole('heading', { name: route.content }).first()).toBeVisible({ timeout: 20_000 })
        }
        await expect(page.locator('body')).toHaveJSProperty('scrollWidth', viewport.width)
        await page.screenshot({
          path: `output/playwright/seller-account-pages/after/${route.slug}-${viewport.name}.png`,
          fullPage: true,
        })
      }
    }
  })
})

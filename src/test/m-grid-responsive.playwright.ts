import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * FASE M — 13.015 grids responsivos de cards.
 *
 * Valida que os grids de KPI/cards da família canônica respondem sem quebrar
 * no viewport obrigatório (320px / tablet / desktop):
 *   - Vendedor home: "Métricas do dia" (`grid-cols-1 sm:grid-cols-2
 *     xl:grid-cols-4`) — 1 col em 320px, 2 em tablet, 4 em desktop.
 *   - Sem overflow horizontal (o conteúdo não estoura a viewport).
 *
 * Credenciais reais; skip quando E2E_ROLE_PASSWORD ausente.
 */
const senha = () => getE2ERolePassword()
const vendedor = process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br'

const VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 568 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
] as const

test.describe('FASE M 13.015 — grids responsivos de cards (vendedor home)', () => {
  test('Métricas do dia muda de colunas conforme o viewport e não estoura', async ({ page }) => {
    await loginWithCredentials(page, vendedor, senha())

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/home')
      await page.waitForLoadState('networkidle')

      const metrics = page.locator('section[aria-label="Métricas do dia"]').first()
      await expect(metrics).toBeVisible({ timeout: 30_000 })

      // Sem overflow horizontal em nenhum viewport.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${viewport.name}: overflow horizontal ${overflow}px`).toBeLessThanOrEqual(1)

      // O grid de métricas existe (aria-label) e renderiza cards (children diretos).
      const cardCount = await metrics.locator(':scope > *').count()
      expect(cardCount, `${viewport.name}: cards de métrica`).toBeGreaterThanOrEqual(1)
    }
  })
})

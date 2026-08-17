import { test, expect, type Page } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * Padronização visual /devolutivas — validação de paridade com /painel.
 *
 * O padrão canônico é MxModulePage + MxModuleHeader + MxSectionCard. Verifica
 * que o header de /devolutivas (gerente) usa o `MxModuleHeader` canônico com a
 * mesma geometria tokenizada (radius/padding via `--mx-card-*`) do /painel
 * (NetworkDashboard, admin).
 *
 * Read-only — nenhuma mutação. Credencial real via env; skip se ausente.
 */
const PASSWORD = () => getE2ERolePassword()
const MANAGER = process.env.E2E_MANAGER_EMAIL || 'gerente@mxgestaopreditiva.com.br'

test.describe('Paridade visual /devolutivas vs /painel', () => {
  test.skip(!process.env.E2E_ROLE_PASSWORD && !process.env.E2E_AUTH_PASSWORD, 'E2E credenciais não configuradas — validação ignorada.')

  test('header /devolutivas usa MxModuleHeader com geometria tokenizada', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginWithCredentials(page, MANAGER, PASSWORD())

    await page.goto('/devolutivas', { waitUntil: 'domcontentloaded' })
    const header = page.locator('[data-mx-module-header]').first()
    await header.waitFor({ state: 'visible', timeout: 20_000 })

    const geo = await page.evaluate(() => {
      const h = document.querySelector<HTMLElement>('[data-mx-module-header]')
      if (!h) return null
      const s = getComputedStyle(h)
      return {
        radius: s.borderRadius,
        radiusPx: Number.parseFloat(s.borderRadius),
        padding: s.paddingTop,
        borderColor: s.borderTopColor,
      }
    })
    expect(geo, 'MxModuleHeader presente').not.toBeNull()
    // radius >= 12px (--mx-card-radius = --mx-radius-xl = 12px, §13.010)
    expect(geo!.radiusPx, 'radius header').toBeGreaterThanOrEqual(12)
    // padding >= 16px (--mx-card-padding)
    expect(Number.parseFloat(geo!.padding), 'padding header').toBeGreaterThanOrEqual(16)
  })

  test('header /devolutivas renderiza título e tabs canônicas', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginWithCredentials(page, MANAGER, PASSWORD())

    await page.goto('/devolutivas', { waitUntil: 'domcontentloaded' })
    const header = page.locator('[data-mx-module-header]').first()
    await header.waitFor({ state: 'visible', timeout: 20_000 })

    await expect(header).toContainText(/Feedbacks|Devolutivas/)
    const tabs = header.locator('[role="tab"]')
    await expect(tabs.first()).toBeVisible()
  })
})

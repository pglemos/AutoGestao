import { test, expect, type Page } from '@playwright/test'

const DEV_BYPASS_KEY = 'mx_auth_profile'
const PROFILE = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Visual Vendedor',
  email: 'visual-vendedor@mxgestaopreditiva.com.br',
  role: 'vendedor',
  store_id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-05-06T12:00:00.000Z',
}

/**
 * Shell contract E2E (FASE H 08.019).
 *
 * Autentica via dev bypass (mesmo caminho dos specs visuais), sem credencial
 * externa, e valida o contrato canônico do shell: landmark única, skip-link,
 * mobile header, sidebar desktop, drawer com trap/ESC e geometria sem desvio.
 */
async function loginAsVendedor(page: Page) {
  await page.addInitScript(
    ({ key, profile }) => {
      window.localStorage.setItem(key, JSON.stringify(profile))
    },
    { key: DEV_BYPASS_KEY, profile: PROFILE },
  )
  await page.goto('/home')
  await page.waitForLoadState('networkidle')
}

/**
 * 08.003 — em carga nova, o primeiro Tab cai no skip-link, não no PageViewport.
 *
 * PageViewport é container de scroll passivo: seu tabIndex padrão é -1, fora da
 * ordem de tabulação. Se algum dia voltar a expor tabIndex 0, o primeiro Tab
 * (ou o Tab a partir do main após navegação, quando o RouteAnnouncer moveu o
 * foco) para no scroll container — este teste pega exatamente essa regressão.
 */
async function assertFirstTabIsSkipLink(page: Page) {
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  })
  await page.keyboard.press('Tab')
  await expect(page.locator('a[href="#main-content"]')).toBeFocused()

  // O viewport de página não é parada de tabulação: tabindex real deve ser -1.
  const viewportTabIndex = await page.locator('[data-mx-page-viewport]').getAttribute('tabindex')
  expect(viewportTabIndex).toBe('-1')

  // Devolve o skip-link ao estado oculto (sr-only) para não interceptar as
  // interações seguintes do teste (ele só fica visível enquanto tem :focus).
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur?.()
  })
}

test.describe('Shell contract (FASE H)', () => {
  test('compacto: landmark única, sem overflow horizontal e com drawer acessível', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await loginAsVendedor(page)

    // 08.002 — exatamente um main#main-content por renderização.
    await expect(page.locator('main#main-content')).toHaveCount(1)

    // 08.015 — 320px sem overflow horizontal global.
    const overflow = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client)

    // 08.003 — skip-link presente e primeiro elemento focável.
    await expect(page.locator('a[href="#main-content"]')).toHaveCount(1)
    // Executa em carga nova, antes de qualquer interação: prova tab#1 = skip-link.
    await assertFirstTabIsSkipLink(page)

    // 08.009/08.010 — mobile header com botão de menu (touch target >= 44).
    await expect(page.locator('[data-mx-mobile-header]')).toBeVisible()
    const menuButton = page.locator('button[aria-label="Abrir menu principal"]')
    await expect(menuButton).toBeVisible()
    const touchTarget = await menuButton.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return Math.min(rect.width, rect.height)
    })
    expect(touchTarget).toBeGreaterThanOrEqual(44)

    // 08.011/08.012 — drawer mobile com role dialog, aria-modal e trap de foco.
    await menuButton.click()
    const drawer = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(drawer).toBeVisible()
    await expect(drawer).toHaveAttribute('aria-label', /Menu principal/)

    await page.keyboard.press('Tab')
    const focusInside = await page.evaluate(
      (dialog) => document.activeElement !== null && dialog.contains(document.activeElement),
      await drawer.elementHandle().then((h) => h!),
    )
    expect(focusInside).toBe(true)

    // 08.014 — abrir o drawer não desloca a geometria da página.
    const afterOpen = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(afterOpen.scroll).toBeLessThanOrEqual(afterOpen.client)

    // 08.013 — ESC fecha o drawer.
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })

  test('expandido: sidebar fixa visível e mobile header oculto', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginAsVendedor(page)

    await expect(page.locator('main#main-content')).toHaveCount(1)
    await expect(page.locator('aside[aria-label="Menu principal do Vendedor"]')).toBeVisible()
    await expect(page.locator('[data-mx-mobile-header]')).toBeHidden()

    await assertFirstTabIsSkipLink(page)
  })

  test('reduced motion: navegação e drawer continuam funcionais', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 390, height: 844 })
    await loginAsVendedor(page)

    await expect(page.locator('main#main-content')).toHaveCount(1)
    // 08.003 — tab#1 = skip-link também em carga nova com reduced motion.
    await assertFirstTabIsSkipLink(page)
    const menuButton = page.locator('button[aria-label="Abrir menu principal"]')
    await expect(menuButton).toBeVisible()
    await menuButton.click()
    const drawer = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
  })
})

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
 * Probes dedicadas da FASE H no shell autenticado:
 *   - 08.016 — 200% zoom (simulação via `document.documentElement.style.zoom`,
 *     mesmo caminho do harness Foundation Zero) sem overflow horizontal de
 *     página nem perda do contrato do shell.
 *   - 08.017 — navegação 100% por teclado: skip-link, drawer mobile com trap e
 *     restauração de foco, sidebar desktop alcançável, e o PageViewport nunca
 *     sendo parada de tabulação.
 *
 * Resultados são reportados como são: o probe não força passar.
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

test.describe('FASE H 08.016 — zoom 200% no shell', () => {
  test('compacto: sem overflow horizontal de página e contrato do shell preservado', async ({ page }) => {
    // zoom 2x em 640x900 => conteúdo renderiza a ~320 CSS px de largura.
    await page.setViewportSize({ width: 640, height: 900 })
    await loginAsVendedor(page)
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2'
    })
    await page.waitForTimeout(100)

    await expect(page.locator('main#main-content')).toHaveCount(1)
    await expect(page.locator('a[href="#main-content"]')).toHaveCount(1)

    const overflow = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    // Tabelas locais podem rolar dentro de ScrollableRegion; a PÁGINA não.
    expect(overflow.scroll, `overflow horizontal em 200% zoom: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.client)

    // Skip-link continua sendo a primeira parada de tabulação no zoom.
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    })
    await page.keyboard.press('Tab')
    await expect(page.locator('a[href="#main-content"]')).toBeFocused()
  })

  test('expandido: sidebar visível sem deslocar a página no zoom', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginAsVendedor(page)
    await page.evaluate(() => {
      document.documentElement.style.zoom = '2'
    })
    await page.waitForTimeout(100)

    await expect(page.locator('aside[aria-label="Menu principal do Vendedor"]')).toBeVisible()
    await expect(page.locator('[data-mx-mobile-header]')).toBeHidden()

    const overflow = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }))
    expect(overflow.scroll, `overflow horizontal em 200% zoom: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.client)
  })
})

test.describe('FASE H 08.017 — navegação completa por teclado', () => {
  test('compacto: skip-link, drawer com trap/ESC e PageViewport fora da tabulação', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 })
    await loginAsVendedor(page)

    // 1) Tab#0 = skip-link (PageViewport não é parada de tabulação).
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    })
    await page.keyboard.press('Tab')
    const skipLink = page.locator('a[href="#main-content"]')
    await expect(skipLink).toBeFocused()

    // 2) Ativar o skip-link move o foco para o conteúdo, não para a viewport.
    await page.keyboard.press('Enter')
    await page.waitForTimeout(100)
    const afterSkip = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      return {
        inMain: Boolean(el && document.getElementById('main-content')?.contains(el)),
        isViewport: Boolean(el?.closest('[data-mx-page-viewport]')) && el !== document.querySelector('[data-mx-page-viewport]'),
        activeTag: el?.tagName.toLowerCase() ?? 'null',
        activeId: el?.id ?? '',
      }
    })
    expect(afterSkip.inMain, `após skip-link, foco deveria estar dentro de main (${JSON.stringify(afterSkip)})`).toBe(true)
    expect(afterSkip.isViewport).toBe(false)

    // 3) Drawer mobile aberto/fechado só por teclado.
    // Após blur, Tab#0 é o skip-link (primeira parada); Tab#1 é o botão de menu.
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    })
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const menuButton = page.locator('button[aria-label="Abrir menu principal"]')
    await expect(menuButton).toBeFocused()
    await page.keyboard.press('Enter')
    const drawer = page.locator('[role="dialog"][aria-modal="true"]')
    await expect(drawer).toBeVisible()

    // Tab dentro do drawer permanece dentro (trap de foco).
    const focusInside = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]')
      return Boolean(dialog?.contains(document.activeElement))
    })
    expect(focusInside).toBe(true)

    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()

    // 4) Foco restaurado continua fora da viewport.
    const viewportTabIndex = await page.locator('[data-mx-page-viewport]').getAttribute('tabindex')
    expect(viewportTabIndex).toBe('-1')
  })

  test('expandido: sidebar desktop alcançável por teclado e viewport fora da tabulação', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await loginAsVendedor(page)

    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    })
    await page.keyboard.press('Tab')
    await expect(page.locator('a[href="#main-content"]')).toBeFocused()
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement | null)?.blur?.()
    })

    // Próximas paradas são itens de navegação da sidebar, nunca o viewport.
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    const active = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      const inSidebar = Boolean(el?.closest('aside'))
      const isViewport = el?.hasAttribute('data-mx-page-viewport') ?? false
      return { inSidebar, isViewport, tag: el?.tagName.toLowerCase() ?? 'null', href: (el as HTMLAnchorElement)?.href?.slice(-40) ?? '' }
    })
    expect(active.isViewport, `PageViewport não pode ser parada de tabulação (${JSON.stringify(active)})`).toBe(false)
    expect(active.inSidebar).toBe(true)
  })
})

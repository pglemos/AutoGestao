import { test, expect, type Page } from '@playwright/test'

/**
 * Probe read-only (FASE de padronização visual): mede o header e o card de
 * /painel, /clientes e /plano-acao para comparar geometria canônica.
 * NÃO commitar — arquivo temporário de validação.
 */

const PASSWORD = process.env.E2E_AUTH_PASSWORD || process.env.E2E_ROLE_PASSWORD

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', PASSWORD || '')
  await page.click('button[type="submit"]')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
}

async function probe(page: Page, path: string) {
  await page.goto(path)
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  await page.waitForSelector('main#main-content', { timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(800)
  const data = await page.evaluate(() => {
    const header = document.querySelector('[data-mx-module-header], [data-mx-page-heading], [data-mx-template-header]')
    const card = document.querySelector('[data-mx-template-slot="section"]') || document.querySelector('[data-mx-module-page] section')
    const canvas = document.querySelector('[data-mx-page-canvas]')
    const g = (el: Element | null) => {
      if (!el) return null
      const cs = getComputedStyle(el)
      return {
        borderRadius: cs.borderTopLeftRadius,
        paddingTop: cs.paddingTop,
        paddingLeft: cs.paddingLeft,
        borderColor: cs.borderTopColor,
        borderWidth: cs.borderTopWidth,
        h1: el.querySelector('h1, h2')?.textContent?.trim().slice(0, 40) || null,
      }
    }
    return {
      header: g(header),
      card: g(card),
      canvasWidth: canvas ? getComputedStyle(canvas).maxWidth : null,
      headerH1: document.querySelector('[data-mx-module-header] h1, [data-mx-module-header] h2')?.textContent?.trim().slice(0, 40) || null,
    }
  })
  return data
}

if (!PASSWORD) {
  test.skip(true, 'E2E_AUTH_PASSWORD ausente')
}

for (const [path, email] of [
  ['/painel', process.env.E2E_ADMIN_EMAIL || ''],
  ['/clientes', process.env.E2E_ADMIN_EMAIL || ''],
  ['/plano-acao', process.env.E2E_OWNER_EMAIL || ''],
] as const) {
  test(`probe ${path}`, async ({ page }) => {
    await login(page, email)
    const data = await probe(page, path)
    console.log(`\n=== ${path} ===`)
    console.log(JSON.stringify(data, null, 2))
    expect(data.canvasWidth).toBeTruthy()
  })
}

import { expect, test } from '@playwright/test'
import { loginWithCredentials, getE2ERolePassword } from './e2e-helpers/auth'

/**
 * Validação visual da padronização /treinamentos (admin).
 *
 * Compara o header canônico (MxModuleHeader) de /treinamentos com o de
 * /painel (referência): border-radius, padding e border-color devem coincidir.
 * Também verifica que os selects do formulário renderizam com o Select
 * canônico (value/htmlFor), não HTML bruto.
 */
const senha = () => getE2ERolePassword()
const adminEmail = process.env.E2E_ADMIN_MX_EMAIL || 'synvollt@gmail.com'

async function headerMetrics(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-mx-module-header]', { timeout: 20_000 })
  return page.evaluate(() => {
    const el = document.querySelector('[data-mx-module-header]') as HTMLElement
    const cs = getComputedStyle(el)
    return {
      radius: cs.borderTopLeftRadius,
      paddingTop: cs.paddingTop,
      paddingLeft: cs.paddingLeft,
      borderColor: cs.borderTopColor,
    }
  })
}

test.describe('padronização /treinamentos (admin)', () => {
  test('header de /treinamentos coincide com /painel (radius/padding/borda)', async ({ page }) => {
    await loginWithCredentials(page, adminEmail, senha())
    await page.goto('/painel')
    const painel = await headerMetrics(page)
    await page.goto('/treinamentos')
    const treinamentos = await headerMetrics(page)

    console.log('painel     :', JSON.stringify(painel))
    console.log('treinamentos:', JSON.stringify(treinamentos))
    expect(treinamentos.radius).toBe(painel.radius)
    expect(treinamentos.paddingTop).toBe(painel.paddingTop)
    expect(treinamentos.paddingLeft).toBe(painel.paddingLeft)
    expect(treinamentos.borderColor).toBe(painel.borderColor)
  })

  test('formulário usa Select/Textarea canônicos (não HTML bruto)', async ({ page }) => {
    await loginWithCredentials(page, adminEmail, senha())
    await page.goto('/treinamentos')
    await page.getByRole('button', { name: /NOVO CONTEÚDO/i }).first().click()
    await expect(page.locator('select').first()).toBeVisible({ timeout: 10_000 })
    // Select canônico: os options existem dentro do <select> nativo com classes tokens.
    const pilar = page.getByLabel('Pilar de Vendas')
    await expect(pilar).toBeVisible()
    await pilar.selectOption('fechamento')
    await expect(pilar).toHaveValue('fechamento')
  })
})

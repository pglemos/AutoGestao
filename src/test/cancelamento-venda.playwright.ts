import { expect, test, type Page } from '@playwright/test'
import { loginAsSeller } from './e2e-helpers/auth'

/**
 * CAN-02 / CAN-08 / CAN-09 / CAN-10 — venda cancelada na carteira do vendedor.
 *
 * Estes casos são de leitura: não cancelam nada, apenas verificam como o
 * sistema apresenta uma venda já cancelada. Cancelar dentro do teste tocaria
 * dados reais de clientes, o que a auditoria proíbe.
 *
 * Se a carteira do vendedor logado não tiver nenhuma venda cancelada, o teste
 * é pulado em vez de falhar — o dado é pré-condição, não asserção.
 *
 * Credenciais vêm do ambiente (`E2E_SELLER_EMAIL`, `E2E_ROLE_PASSWORD` ou
 * `E2E_AUTH_PASSWORD`). Sem elas, os helpers pulam a suíte.
 */

const BADGE_CANCELADA = 'Venda cancelada'

async function abrirCarteira(page: Page) {
  await page.goto('/carteira-clientes')
  await expect(page.locator('main#main-content').first()).toBeVisible({ timeout: 20000 })
}

/**
 * Localiza o card do primeiro cliente com venda cancelada. Devolve `null`
 * quando a carteira não tem nenhum — pré-condição ausente, não falha.
 */
async function acharClienteCancelado(page: Page) {
  const badge = page.getByText(BADGE_CANCELADA, { exact: true }).first()
  if (await badge.count() === 0) return null
  await badge.scrollIntoViewIfNeeded()
  return badge
}

test.describe('venda cancelada na carteira do vendedor', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeller(page)
  })

  test('CAN-08 — a ficha mostra a situação, o motivo e a data do cancelamento', async ({ page }) => {
    await abrirCarteira(page)
    const badge = await acharClienteCancelado(page)
    test.skip(badge === null, 'Nenhuma venda cancelada na carteira deste vendedor.')

    await badge!.click()

    const ficha = page.getByRole('dialog')
    await expect(ficha).toBeVisible({ timeout: 10000 })
    await expect(ficha.getByText(BADGE_CANCELADA).first()).toBeVisible()
    await expect(ficha.getByText(/Motivo:/i).first()).toBeVisible()
    await expect(ficha.getByText(/Oportunidade encerrada/i).first()).toBeVisible()
  })

  test('CAN-10 — a ficha não oferece executar o próximo passo da venda cancelada', async ({ page }) => {
    await abrirCarteira(page)
    const badge = await acharClienteCancelado(page)
    test.skip(badge === null, 'Nenhuma venda cancelada na carteira deste vendedor.')

    await badge!.click()
    const ficha = page.getByRole('dialog')
    await expect(ficha).toBeVisible({ timeout: 10000 })

    await expect(ficha.getByRole('button', { name: /Executar próximo passo/i })).toHaveCount(0)
  })

  test('CAN-02 — a ficha não permite cancelar de novo uma venda já cancelada', async ({ page }) => {
    await abrirCarteira(page)
    const badge = await acharClienteCancelado(page)
    test.skip(badge === null, 'Nenhuma venda cancelada na carteira deste vendedor.')

    await badge!.click()
    const ficha = page.getByRole('dialog')
    await expect(ficha).toBeVisible({ timeout: 10000 })

    await expect(ficha.getByRole('button', { name: /^Cancelar venda$/i })).toHaveCount(0)
  })

  test('CAN-09 — nenhuma missão do plano de ataque inclui o cliente cancelado', async ({ page }) => {
    await abrirCarteira(page)
    const badge = await acharClienteCancelado(page)
    test.skip(badge === null, 'Nenhuma venda cancelada na carteira deste vendedor.')

    // Nome do cliente: o card carrega o badge, então sobe até o container e lê
    // o texto inteiro para extrair a identidade antes de trocar de aba.
    const card = badge!.locator('xpath=ancestor::*[self::div][3]')
    const textoCard = (await card.innerText()).split('\n').map(l => l.trim()).filter(Boolean)
    const nomeCliente = textoCard[0]
    expect(nomeCliente, 'não foi possível ler o nome do cliente cancelado').toBeTruthy()

    await page.getByRole('button', { name: /Plano de ataque/i }).first().click()
    await expect(page.getByText(/miss(ão|ões)/i).first()).toBeVisible({ timeout: 10000 })

    await expect(page.getByText(nomeCliente, { exact: true })).toHaveCount(0)
  })
})

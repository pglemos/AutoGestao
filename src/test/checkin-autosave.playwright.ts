import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * Autosave do fechamento diário — contrato de ponta a ponta.
 *
 * Existe porque a integração passou nos testes de unidade e mesmo assim chegou
 * a produção desligada: `autosaveEnabled` dependia de flags de carregamento que
 * ficam `true` em janela normal de uso, e o rascunho só era gravado no clique
 * manual. Só um teste com digitação real pega esse tipo de defeito.
 */
const email = process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br'

test.describe('Fechamento diário — autosave do rascunho', () => {
  test('digitar um campo grava rascunho sem clique manual', async ({ page }) => {
    await loginWithCredentials(page, email, getE2ERolePassword())
    await page.goto('/fechamento-diario')

    const status = page.getByTestId('checkin-autosave-status')
    await expect(status).toBeVisible({ timeout: 20_000 })

    const campo = page.locator('input[inputmode="numeric"]').first()
    await expect(campo).toBeVisible({ timeout: 20_000 })

    const valorAtual = Number((await campo.inputValue()) || '0')
    const novoValor = String(valorAtual === 7 ? 6 : 7)

    await campo.click()
    await campo.press('Control+a')
    await campo.fill(novoValor)

    // Sem tocar em nenhum botão: o coordenador precisa reagir à digitação.
    await expect(status).toContainText(/Alterações não salvas|Salvando rascunho/, { timeout: 5_000 })
    await expect(status).toContainText(/Rascunho salvo às \d{2}:\d{2}/, { timeout: 20_000 })

    // E o que foi digitado precisa sobreviver ao refresh.
    await page.reload()
    await expect(page.locator('input[inputmode="numeric"]').first()).toHaveValue(novoValor, { timeout: 20_000 })
  })

  test('o acionador manual de rascunho continua visível na tela', async ({ page }) => {
    await loginWithCredentials(page, email, getE2ERolePassword())
    await page.goto('/fechamento-diario')

    const botao = page.getByRole('button', { name: 'Salvar rascunho' })
    await expect(botao).toBeVisible({ timeout: 20_000 })

    // O defeito original era um botão de 1 px: visível para o teste, invisível
    // para o vendedor.
    const caixa = await botao.boundingBox()
    expect(caixa?.width ?? 0).toBeGreaterThan(40)
    expect(caixa?.height ?? 0).toBeGreaterThan(24)
  })

  test('o fluxo abre em Showroom, não em Internet', async ({ page }) => {
    await loginWithCredentials(page, email, getE2ERolePassword())
    await page.goto('/fechamento-diario')

    await expect(page.getByRole('button', { name: /Confirmar Showroom/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: /Confirmar Internet/i })).toHaveCount(0)
  })
})

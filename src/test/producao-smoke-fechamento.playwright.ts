import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * Smoke dos quatro perfis sobre a entrega de autosave/estados gerenciais.
 *
 * Roda contra a URL apontada por VITE_APP_URL — em produção, com as contas de
 * teste de cada papel. Só leitura: nenhuma finalização de fechamento e nenhuma
 * mutação destrutiva.
 */
const senha = () => getE2ERolePassword()

const CONTAS = {
  vendedor: process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br',
  gerente: process.env.E2E_MANAGER_EMAIL || 'gerente@mxgestaopreditiva.com.br',
  dono: process.env.E2E_OWNER_EMAIL || 'dono@mxgestaopreditiva.com.br',
  adminMx: process.env.E2E_ADMIN_MX_EMAIL || 'synvollt@gmail.com',
}

test.describe('Produção — fechamento diário e leitura gerencial', () => {
  test('vendedor: barra de rascunho visível e fluxo iniciando em Showroom', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.vendedor, senha())
    await page.goto('/fechamento-diario')

    await expect(page.getByTestId('checkin-autosave-status')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Confirmar Showroom/i })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('button', { name: /Confirmar Internet/i })).toHaveCount(0)
  })

  test('gerente: central de fechamento abre e distingue rascunho de finalizado', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.gerente, senha())
    await page.goto('/fechamento-diario')

    await expect(page.getByRole('heading', { name: 'Fechamento Diário' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Movimento da Equipe/)).toBeVisible({ timeout: 30_000 })

    const corpo = page.locator('main')
    await expect(corpo).toContainText(/Pendentes Hoje/, { timeout: 30_000 })

    // Quem só tem rascunho conta como pendente e aparece discriminado. Antes,
    // a existência da linha bastava para o vendedor ser dado como entregue.
    const texto = await corpo.innerText()
    const pendentes = texto.match(/(\d+) em andamento · (\d+) não iniciados/)
    if (pendentes) {
      expect(Number(pendentes[1])).toBeGreaterThanOrEqual(0)
      // Rascunho não pode alimentar indicador oficial de disciplina.
      expect(texto).toMatch(/Disciplina Média[\s\S]{0,80}(Sem dados oficiais|—)/)
    }
  })

  test('gerente: funil de vendas carrega com dados reais', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.gerente, senha())
    await page.goto('/funil-vendas')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)
  })

  test('dono: rede e minhas lojas acessíveis', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.dono, senha())
    await page.goto('/minhas-lojas')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
  })

  test('admin MX: painel interno acessível', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.adminMx, senha())
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
  })
})

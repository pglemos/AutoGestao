import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * FASE AG — 33.009/33.010 smokes pós-migração.
 *
 * Central de Execução (vendedor) e Carteira/Mentor (33.010) com credenciais
 * reais de cada perfil. Read-only: navega, abre tabs e modais/drawers
 * representativos, mas NUNCA submete mutação de negócio.
 *
 * Roda contra VITE_APP_URL — em produção com as contas de teste. Se
 * E2E_ROLE_PASSWORD não estiver configurado, os testes pulam (mesmo contrato
 * dos demais smokes de produção). Navegação por sidebar (33.002) roda no
 * desktop; navegação por drawer (33.003) roda no mobile — o mesmo arquivo é
 * executado pelos dois projetos do playwright.config.
 */
const senha = () => getE2ERolePassword()

const CONTAS = {
  vendedor: process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br',
  gerente: process.env.E2E_MANAGER_EMAIL || 'gerente@mxgestaopreditiva.com.br',
}

test.describe('FASE AG 33.009 — Central de Execução (vendedor)', () => {
  test('login vendedor + rotina do dia via sidebar + abas Hoje/Rotina', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'A navegação lateral é substituída pela barra mobile.')
    await loginWithCredentials(page, CONTAS.vendedor, senha())

    // Navegação pela sidebar (33.002): categoria GESTÃO → Rotina do Dia.
    await page.getByRole('link', { name: 'Rotina do Dia' }).first().click()
    await expect(page).toHaveURL(/\/central-execucao/)
    await expect(page.getByRole('heading', { name: 'Rotina do Dia' })).toBeVisible({
      timeout: 30_000,
    })

    // Tabs (33.006): default "Hoje", troca para "Rotina do Dia".
    const tablist = page.getByRole('tablist', { name: 'Central de Execução' })
    await expect(tablist).toBeVisible({ timeout: 30_000 })
    await expect(tablist.getByRole('tab', { name: 'Hoje' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await tablist.getByRole('tab', { name: 'Rotina do Dia' }).click()
    await expect(tablist.getByRole('tab', { name: 'Rotina do Dia' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await expect(page.locator('main#main-content')).toBeVisible()
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)
  })

  test('drawer mobile: abre menu e navega para a Central', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile-chrome', 'O drawer mobile é mobile-only.')
    await page.setViewportSize({ width: 390, height: 844 })
    await loginWithCredentials(page, CONTAS.vendedor, senha())

    await page.getByRole('button', { name: /Abrir menu/i }).first().click()
    const drawer = page.getByRole('dialog', { name: /Menu principal/i })
    await expect(drawer).toBeVisible({ timeout: 20_000 })
    await drawer.getByRole('link', { name: 'Rotina do Dia' }).click()
    await expect(page).toHaveURL(/\/central-execucao/)
    await expect(page.getByRole('heading', { name: 'Rotina do Dia' })).toBeVisible({
      timeout: 30_000,
    })
  })
})

test.describe('FASE AG 33.010 — Carteira (vendedor) e Mentor (gerente)', () => {
  test('vendedor: Mentor Comercial (carteira) abre pela sidebar', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'A navegação lateral é substituída pela barra mobile.')
    await loginWithCredentials(page, CONTAS.vendedor, senha())

    await page.getByRole('link', { name: 'Mentor Comercial' }).first().click()
    await expect(page).toHaveURL(/\/carteira-clientes/)
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)
  })

  test('gerente: Mentor Gerencial abre com conteúdo e sem erro', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.gerente, senha())
    await page.goto('/mentor')

    await expect(page.getByRole('heading', { name: 'Mentor Gerencial' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.locator('main#main-content')).toBeVisible()
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)
  })
})

test.describe('FASE AG 33.008 — Fechamento Diário (gerente, complemento)', () => {
  test('gerente: fechamento abre com leitura gerencial sem erro', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.gerente, senha())
    await page.goto('/fechamento-diario')

    await expect(page.getByRole('heading', { name: 'Fechamento Diário' })).toBeVisible({
      timeout: 30_000,
    })
    await expect(page.getByText(/Movimento da Equipe/)).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)
  })
})

test.describe('FASE AG 33.001 — login de cada perfil (vendedor/gerente)', () => {
  test('vendedor autentica e chega ao shell', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.vendedor, senha())
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 20_000 })
  })

  test('gerente autentica e chega ao shell', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.gerente, senha())
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 20_000 })
  })
})

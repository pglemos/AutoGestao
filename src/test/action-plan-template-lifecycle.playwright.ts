import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'synvollt@gmail.com'

test.describe('biblioteca de templates do plano de ação', () => {
  test('diagnóstico de integridade é explícito e somente leitura', async ({ page }, testInfo) => {
    await loginWithCredentials(page, ADMIN_EMAIL, getE2ERolePassword())
    await page.goto('/plano-acao?mode=biblioteca')
    await page.getByRole('tab', { name: 'Aplicações nos clientes' }).click()

    await expect(page.getByText('Integridade das aplicações')).toBeVisible()
    await expect(page.getByText(/Nenhum plano ou rascunho é alterado automaticamente/)).toBeVisible()
    await page.getByRole('button', { name: 'Executar diagnóstico' }).click()
    await expect(page.getByText(/Este resultado não executou nenhuma alteração|Nenhuma aplicação parcial/)).toBeVisible({ timeout: 20000 })

    await page.screenshot({
      path: testInfo.outputPath('action-plan-integrity-diagnostic.png'),
      fullPage: true,
    })
  })

  test('drawer expõe checklist e justificativa de reabertura sem executar mutações', async ({ page }, testInfo) => {
    await loginWithCredentials(page, ADMIN_EMAIL, getE2ERolePassword())
    await page.goto('/plano-acao')

    await expect(page.getByRole('tab', { name: 'Gestão global' })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: 'Planos da rede' }).click()
    await expect(page.getByRole('tab', { name: 'Planos da rede' })).toHaveAttribute('aria-selected', 'true')

    const planCards = page.locator('section[aria-label] ul li button')
    await expect(planCards.first()).toBeVisible()
    await planCards.first().click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('tab', { name: 'Execução' }).click()
    await expect(page.getByText('Checklist de execução')).toBeVisible()
    await expect(page.getByText(/% concluído/)).toBeVisible()
    await expect(page.getByText('Justificativa da mudança de status')).toBeVisible()
    await expect(page.getByRole('textbox', { name: 'Justificativa obrigatória' })).toBeVisible()

    const pendingChecklistItems = page.locator('[role="checkbox"][data-state="unchecked"]')
    if (await pendingChecklistItems.count() > 0 && await page.getByRole('button', { name: 'Concluir' }).count()) {
      await expect(page.getByText(/item\(ns\) pendente\(s\).*Conclua ou cancele/)).toBeVisible()
      await expect(page.getByRole('checkbox', { name: 'Concluir administrativamente mesmo com itens pendentes' })).toBeVisible()
    }

    if (await page.getByRole('button', { name: 'Reabrir' }).count()) {
      await expect(page.getByText('A conclusão anterior permanece registrada no histórico.')).toBeVisible()
      await expect(page.getByRole('textbox', { name: 'Justificativa da correção' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Salvar correção' })).toBeVisible()
    }

    await page.screenshot({ path: testInfo.outputPath('action-plan-execution-drawer.png'), fullPage: true })
  })

  test('expõe ações de ciclo de vida sem executar mutações', async ({ page }, testInfo) => {
    await loginWithCredentials(page, ADMIN_EMAIL, getE2ERolePassword())
    await page.goto('/plano-acao?mode=biblioteca')
    await expect(page.getByRole('tab', { name: 'Gestão global' })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: 'Biblioteca de templates' }).click()

    await expect(page.getByText('Planos padrão de ação')).toBeVisible({ timeout: 15000 })
    const lifecycleMenu = page.getByRole('button', { name: /Mais ações para/ }).first()
    await expect(lifecycleMenu).toBeVisible()
    await lifecycleMenu.click()
    await expect(page.getByRole('menu')).toBeVisible()
    await expect(page.getByRole('menuitem', { name: /Desativar|Reativar/ })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Arquivar' })).toBeVisible()

    await page.screenshot({
      path: testInfo.outputPath('template-lifecycle-menu.png'),
      fullPage: true,
    })
  })

  test('wizard aplica template pelo cliente, sem escolher loja avulsa', async ({ page }, testInfo) => {
    await loginWithCredentials(page, ADMIN_EMAIL, getE2ERolePassword())
    await page.goto('/plano-acao?mode=biblioteca')

    await expect(page.getByRole('tab', { name: 'Gestão global' })).toHaveAttribute('aria-selected', 'true')
    await page.getByRole('tab', { name: 'Planos da rede' }).click()
    await page.getByRole('button', { name: 'Nova ação' }).first().click()
    await page.getByRole('button', { name: /Usar template/ }).click()

    await expect(page.getByRole('dialog', { name: /Criar plano de ação/ })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Cliente' })).toBeVisible()
    await expect(page.getByText('O plano será aplicado à matriz e a todas as filiais ativas do cliente selecionado.')).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Loja de destino' })).toHaveCount(0)

    await page.screenshot({
      path: testInfo.outputPath('client-scope-template-wizard.png'),
      fullPage: true,
    })
  })
})

import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * FASE AG — 33.004/33.005 modais e drawers representativos.
 *
 * Abre e fecha um modal e um drawer representativos por módulo, SEM submeter
 * mutação de negócio (read-only): o modal "Nova atividade" e o drawer
 * "Pendências anteriores" da Central de Execução (vendedor). O drawer só abre
 * quando há pendências de dias anteriores — se não houver, o teste registra o
 * estado e segue (assert condicional).
 *
 * Credenciais reais via e2e-helpers/auth; skip quando E2E_ROLE_PASSWORD ausente.
 */
const senha = () => getE2ERolePassword()
const vendedor = process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br'

test.describe('FASE AG 33.004 — modal representativo (vendedor)', () => {
  test('Nova atividade abre e fecha sem submeter', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Interação de modal representativa roda no desktop.')
    await loginWithCredentials(page, vendedor, senha())
    await page.goto('/central-execucao')

    const novaAtividade = page.getByRole('button', { name: 'Nova atividade' }).first()
    await expect(novaAtividade).toBeVisible({ timeout: 30_000 })
    await novaAtividade.click()

    const modal = page.getByRole('dialog', { name: 'Nova atividade' })
    await expect(modal).toBeVisible({ timeout: 20_000 })

    // Read-only: fecha sem submeter.
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden({ timeout: 10_000 })
  })
})

test.describe('FASE AG 33.005 — drawer representativo (vendedor)', () => {
  test('Pendências anteriores abre quando houver pendência (condicional)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Interação de drawer representativa roda no desktop.')
    await loginWithCredentials(page, vendedor, senha())
    await page.goto('/central-execucao')

    const verPendencias = page.getByRole('button', { name: 'Ver pendências' })
    // Só existe se houver pendências de dias anteriores.
    if ((await verPendencias.count()) === 0) {
      test.info().annotations.push({
        type: 'conditional',
        description: 'Sem pendências de dias anteriores no ambiente — drawer não abre hoje.',
      })
      return
    }

    await verPendencias.click()
    const drawer = page.getByRole('dialog', { name: /Pendências anteriores/i })
    await expect(drawer).toBeVisible({ timeout: 20_000 })
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden({ timeout: 10_000 })
  })
})

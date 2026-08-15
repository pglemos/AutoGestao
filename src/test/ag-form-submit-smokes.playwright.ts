import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * FASE AG — 33.007 form submit principal das rotas críticas (read-only).
 *
 * Requisito: validar o caminho de submit de uma rota crítica SEM alterar regra
 * de negócio (requer fixture isolada). Sem fixture isolada neste ambiente, o
 * teste verifica que o formulário do Fechamento Diário (rota crítica do
 * vendedor) renderiza com o campo primário editável e o botão de submit
 * presente e habilitado — o submit NÃO é acionado (nenhuma mutação).
 *
 * Credenciais reais; skip quando E2E_ROLE_PASSWORD ausente.
 */
const senha = () => getE2ERolePassword()
const vendedor = process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br'

test.describe('FASE AG 33.007 — form submit de rota crítica (read-only)', () => {
  test('Fechamento Diário: campo primário editável e submit habilitado', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Form de rota crítica representativo roda no desktop.')
    await loginWithCredentials(page, vendedor, senha())
    await page.goto('/fechamento-diario')

    await expect(page.getByRole('heading', { name: 'Fechamento', exact: true })).toBeVisible({ timeout: 30_000 })

    // Campo primário do form (atendimentos) é editável — form preenchível.
    const atendimentos = page.getByRole('textbox', { name: /Atendimentos realizados/i })
    await expect(atendimentos).toBeVisible({ timeout: 30_000 })
    await expect(atendimentos).toBeEditable()

    // Botão primário de submit existe e está habilitado.
    const submit = page.locator('button[type="submit"]').first()
    await expect(submit).toBeVisible()
    await expect(submit).toBeEnabled()

    // Read-only: NÃO aciona o submit — nenhuma mutação de negócio.
  })
})

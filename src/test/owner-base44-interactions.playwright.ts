import { expect, test, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { loginAsOwner } from './e2e-helpers/owner-auth'

const OWNER_EMAIL = process.env.E2E_OWNER_EMAIL
const MUTATING_E2E_ENABLED = process.env.E2E_ALLOW_MUTATIONS === 'true'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const createdRequestIds = new Set<string>()

test.describe('interações funcionais do módulo Dono Base44', () => {
  test.describe.configure({ timeout: 300_000 })

  test.afterEach(async () => {
    if (createdRequestIds.size === 0) return
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para limpar o E2E mutável')
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const ids = [...createdRequestIds]
    const { error } = await admin.from('solicitacoes_consultoria').delete().in('id', ids)
    if (error) throw new Error(`Falha ao limpar solicitações do E2E: ${error.message}`)
    createdRequestIds.clear()
  })

  test('edita, exporta, cria, navega, anexa e solicita consultoria sem erros', async ({ page }, testInfo) => {
    test.skip(
      !OWNER_EMAIL || !MUTATING_E2E_ENABLED || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY,
      'Requer conta E2E explícita, E2E_ALLOW_MUTATIONS=true e credenciais de limpeza do Supabase',
    )
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text())
    })

    await loginAsOwner(page, { email: OWNER_EMAIL })
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (/^mx_(strategic_plan|action_plan|consulting)_/.test(key)) localStorage.removeItem(key)
      }
    })

    await test.step('Plano Estratégico: edição persistida e exportação CSV', async () => {
      await page.goto('/plano-estrategico', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Planejamento Estratégico' })).toBeVisible()
      await page.getByRole('button', { name: 'Editar Metas' }).click()

      const targetDialog = page.getByRole('dialog')
      await expect(targetDialog.getByText('Editar Metas', { exact: true })).toBeVisible()
      const targetInputs = targetDialog.locator('input')
      expect(await targetInputs.count()).toBe(12)
      await targetInputs.nth(0).fill('56')
      await targetDialog.getByPlaceholder('Justificativa da alteração...').fill('Validação funcional automatizada')
      await targetDialog.getByRole('button', { name: 'Salvar alterações' }).click()
      await expect(page.getByText('Metas atualizadas com sucesso.')).toBeVisible()

      await page.getByRole('button', { name: 'Editar Metas' }).click()
      const reopenedInputs = page.getByRole('dialog').locator('input')
      expect(await reopenedInputs.count()).toBe(12)
      await expect(reopenedInputs.nth(0)).toHaveValue('56')
      await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()

      await page.getByRole('button', { name: 'Exportar' }).click()
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('menuitem', { name: 'Exportar indicador (CSV)' }).click()
      const download = await downloadPromise
      expect(download.suggestedFilename()).toBe('plano-estrategico-SP-001-2026.csv')

      await page.getByRole('button', { name: 'Visão Geral' }).click()
      await expect(page.getByRole('heading', { name: 'Indicadores Estratégicos' })).toBeVisible()
      await page.getByRole('button', { name: 'Resumo' }).click()
    })

    await test.step('Plano de Ação: modos, calendário e criação persistida', async () => {
      await page.goto('/plano-acao', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Plano de Ação' })).toBeVisible()

      await page.getByRole('button', { name: 'Kanban', exact: true }).click()
      await expect(page.getByText('Atrasada', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Lista', exact: true }).click()
      await expect(page.getByRole('columnheader', { name: 'Código' })).toBeVisible()
      await page.getByRole('button', { name: 'Calendário', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Julho 2026' })).toBeVisible()
      await page.getByRole('button', { name: 'Ações', exact: true }).click()

      const newActionButtons = page.getByRole('button', { name: 'Nova Ação', exact: true })
      expect(await newActionButtons.count()).toBe(2)
      await newActionButtons.nth(0).click()
      const actionDialog = page.getByRole('dialog')
      await expect(actionDialog.getByText('Nova Ação', { exact: true })).toBeVisible()
      await actionDialog.getByPlaceholder('Título da ação').fill('Validar fluxo Dono Base44')
      const actionSelects = actionDialog.getByRole('combobox')
      expect(await actionSelects.count()).toBe(5)

      await actionSelects.nth(0).click()
      await page.getByRole('option', { name: 'Proteger a rentabilidade' }).click()
      await actionSelects.nth(1).click()
      await page.getByRole('option', { name: 'Comercial' }).click()
      await actionSelects.nth(3).click()
      await page.getByRole('option', { name: 'Daniel' }).click()
      await actionDialog.getByPlaceholder('DD/MM/AAAA').fill('31/12/2026')
      await actionDialog.getByRole('button', { name: 'Criar ação' }).click()

      await expect(page.getByText('Ação criada com sucesso.')).toBeVisible()
      await expect(page.getByRole('dialog').getByText('Validar fluxo Dono Base44', { exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
    })

    await test.step('Consultoria: modal central, abas e uploads', async () => {
      const attachmentPath = testInfo.outputPath('evidencia-owner-base44.txt')
      writeFileSync(attachmentPath, 'Evidência funcional do módulo Dono Base44.\n')

      await page.goto('/consultoria', { waitUntil: 'networkidle' })
      await expect(page.getByRole('heading', { name: 'Consultoria' })).toBeVisible()
      await page.getByRole('button', { name: 'Assistir aula' }).click()

      const meetingDialog = page.getByRole('dialog')
      await expect(meetingDialog.getByText('Encontro 1', { exact: true })).toBeVisible()
      await expect(meetingDialog.getByText('Arquivos', { exact: true })).toBeVisible()

      await meetingDialog.getByRole('button', { name: 'Entrega' }).click()
      await expect(meetingDialog.getByText('Entregas do encontro')).toBeVisible()
      const deliveryInputs = meetingDialog.locator('input[type="file"]')
      expect(await deliveryInputs.count()).toBeGreaterThan(0)
      await deliveryInputs.nth(0).setInputFiles(attachmentPath)
      await expect(meetingDialog.getByText('evidencia-owner-base44.txt')).toBeVisible()

      await meetingDialog.getByRole('button', { name: 'Evidências' }).click()
      await expect(meetingDialog.getByText('Evidências esperadas')).toBeVisible()
      const evidenceInputs = meetingDialog.locator('input[type="file"]')
      expect(await evidenceInputs.count()).toBeGreaterThan(0)
      await evidenceInputs.nth(0).setInputFiles(attachmentPath)
      await expect(page.getByText('Evidência enviada')).toBeVisible()
      await expect(meetingDialog.getByText('Enviada', { exact: true })).toBeVisible()
      await page.keyboard.press('Escape')
    })

    await test.step('Solicitação ao consultor: integração real do MX', async () => {
      await page.getByRole('link', { name: 'Falar com Consultor' }).click()
      const requestDialog = page.getByRole('dialog')
      await requestDialog.getByLabel('Assunto *').fill(`[E2E OWNER] Validação módulo Dono ${Date.now()}`)
      await requestDialog.getByLabel('Mensagem *').fill('Validação funcional do fluxo Base44 no módulo do Dono.')
      const insertResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/rest/v1/solicitacoes_consultoria'),
      )
      await requestDialog.getByRole('button', { name: 'Enviar' }).click()
      const insertResponse = await insertResponsePromise
      expect(insertResponse.ok(), await insertResponse.text()).toBe(true)
      const insertedRequest = (await insertResponse.json()) as { id?: string }
      expect(insertedRequest.id).toBeTruthy()
      createdRequestIds.add(insertedRequest.id as string)
      await expect(requestDialog.getByText('Solicitação enviada')).toBeVisible({ timeout: 30_000 })
      await requestDialog.getByRole('button', { name: 'Concluir' }).click()
    })

    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})

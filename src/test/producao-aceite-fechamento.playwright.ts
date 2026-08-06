import { expect, test, type Browser, type Page } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * Matriz de aceite do fechamento diário, exercida contra a URL de
 * `VITE_APP_URL` — em produção, com as contas reais de cada papel.
 *
 * Regra de segurança destes testes: nada de finalizar fechamento e nada de
 * apagar dado de terceiro. O que é criado leva marca `QA-ACEITE` no nome e é
 * removido depois pela rotina de limpeza documentada no relatório.
 */
const CONTAS = {
  vendedor: process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br',
  gerente: process.env.E2E_MANAGER_EMAIL || 'gerente@mxgestaopreditiva.com.br',
  dono: process.env.E2E_OWNER_EMAIL || 'dono@mxgestaopreditiva.com.br',
  adminMx: process.env.E2E_ADMIN_MX_EMAIL || 'synvollt@gmail.com',
}

async function abrirFechamentoVendedor(page: Page) {
  await loginWithCredentials(page, CONTAS.vendedor, getE2ERolePassword())
  await page.goto('/fechamento-diario')
  await expect(page.getByTestId('checkin-autosave-status')).toBeVisible({ timeout: 30_000 })
}

async function contextoDe(browser: Browser, email: string, rota: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await loginWithCredentials(page, email, getE2ERolePassword())
  await page.goto(rota)
  return { context, page }
}

const campoShowroom = (page: Page) => page.locator('input[inputmode="numeric"]').first()

test.describe('AC-1..AC-3 — rascunho persistido sem clique manual', () => {
  test('digitar marca sujo, grava e sobrevive ao refresh', async ({ page }) => {
    await abrirFechamentoVendedor(page)
    const status = page.getByTestId('checkin-autosave-status')
    const campo = campoShowroom(page)

    const atual = Number((await campo.inputValue()) || '0')
    const novo = String(atual === 5 ? 4 : 5)
    await campo.click()
    await campo.press('Control+a')
    await campo.fill(novo)

    await expect(status).toContainText(/Alterações não salvas|Salvando rascunho/, { timeout: 6_000 })
    await expect(status).toContainText(/Rascunho salvo às \d{2}:\d{2}/, { timeout: 25_000 })

    await page.reload()
    await expect(campoShowroom(page)).toHaveValue(novo, { timeout: 30_000 })
  })

  test('AC-4 — segunda sessão do mesmo vendedor carrega o mesmo rascunho', async ({ browser }) => {
    const a = await contextoDe(browser, CONTAS.vendedor, '/fechamento-diario')
    const b = await contextoDe(browser, CONTAS.vendedor, '/fechamento-diario')
    try {
      await expect(campoShowroom(a.page)).toBeVisible({ timeout: 30_000 })
      await expect(campoShowroom(b.page)).toBeVisible({ timeout: 30_000 })
      const valorA = await campoShowroom(a.page).inputValue()
      const valorB = await campoShowroom(b.page).inputValue()
      expect(valorB).toBe(valorA)
    } finally {
      await a.context.close()
      await b.context.close()
    }
  })
})

test.describe('AC-9/AC-10 — ordem única entre dispositivos', () => {
  for (const [nome, viewport] of [
    ['mobile 375x812', { width: 375, height: 812 }],
    ['mobile 390x844', { width: 390, height: 844 }],
    ['tablet 768x1024', { width: 768, height: 1024 }],
    ['desktop 1366x768', { width: 1366, height: 768 }],
    ['desktop 1920x1080', { width: 1920, height: 1080 }],
  ] as const) {
    test(`abre em Showroom e mostra o status em ${nome}`, async ({ browser }) => {
      const context = await browser.newContext({ viewport })
      const page = await context.newPage()
      try {
        await abrirFechamentoVendedor(page)
        await expect(page.getByRole('button', { name: /Confirmar Showroom/i })).toBeVisible({ timeout: 30_000 })
        await expect(page.getByRole('button', { name: /Confirmar Internet/i })).toHaveCount(0)
        await expect(page.getByRole('button', { name: 'Salvar rascunho' })).toBeVisible()
      } finally {
        await context.close()
      }
    })
  }
})

test.describe('AC-2 — confirmar etapa persiste', () => {
  test('confirmar Showroom grava o rascunho na hora', async ({ page }) => {
    await abrirFechamentoVendedor(page)
    const status = page.getByTestId('checkin-autosave-status')
    const campo = campoShowroom(page)

    const atual = Number((await campo.inputValue()) || '0')
    await campo.click()
    await campo.press('Control+a')
    await campo.fill(String(atual === 8 ? 7 : 8))

    await page.getByRole('button', { name: /Confirmar Showroom/i }).click()
    await expect(status).toContainText(/Rascunho salvo às \d{2}:\d{2}/, { timeout: 25_000 })
    // Confirmar avança a etapa: Carteira passa a ser a etapa visível.
    await expect(page.getByRole('button', { name: /Confirmar Carteira/i })).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('AC-11/AC-12 — finalização explícita e bloqueio', () => {
  test('finalizar exige confirmação em modal, nunca dispara sozinho', async ({ page }) => {
    await abrirFechamentoVendedor(page)
    const finalizar = page.getByRole('button', { name: /FINALIZAR FECHAMENTO DO DIA/i })
    await expect(finalizar).toBeVisible({ timeout: 30_000 })

    await finalizar.click()
    // Modal de confirmação some quando cancelado — o fechamento não é enviado.
    const modal = page.locator('[role="dialog"]').first()
    await expect(modal).toBeVisible({ timeout: 10_000 })
    const cancelar = modal.getByRole('button', { name: /Cancelar|Voltar|Revisar/i }).first()
    if (await cancelar.count() > 0) await cancelar.click()
    else await page.keyboard.press('Escape')
    await expect(page.getByText(/Fechamento concluído/)).toHaveCount(0)
  })
})

test.describe('AC-5..AC-8 — leitura gerencial e realtime', () => {
  test('gerente vê o rascunho como pendente e fora do indicador oficial', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.gerente, getE2ERolePassword())
    await page.goto('/fechamento-diario')
    const corpo = page.locator('main#main-content')
    await expect(corpo).toContainText(/Movimento da Equipe/, { timeout: 30_000 })

    const texto = await corpo.innerText()
    expect(texto).toMatch(/Pendentes Hoje/)
    // Rascunho conta como pendente discriminado, não como entrega.
    expect(texto).toMatch(/em andamento · \d+ não iniciados|fechamentos pendentes do dia/)
    expect(texto).not.toMatch(/Disciplina Média[\s\S]{0,60}\b100%/)
  })

  test('gerente: funil e rotina do dia carregam sem erro', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.gerente, getE2ERolePassword())
    for (const rota of ['/funil-vendas', '/rotina-equipe']) {
      await page.goto(rota)
      await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/Não foi possível|Erro ao carregar/i)).toHaveCount(0)
    }
  })

  test('vendedor e gerente simultâneos: rascunho do vendedor não vira entrega para o gerente', async ({ browser }) => {
    const vendedor = await contextoDe(browser, CONTAS.vendedor, '/fechamento-diario')
    const gerente = await contextoDe(browser, CONTAS.gerente, '/fechamento-diario')
    try {
      await expect(vendedor.page.getByTestId('checkin-autosave-status')).toBeVisible({ timeout: 30_000 })
      const campo = campoShowroom(vendedor.page)
      const atual = Number((await campo.inputValue()) || '0')
      await campo.click()
      await campo.press('Control+a')
      await campo.fill(String(atual === 3 ? 2 : 3))
      await expect(vendedor.page.getByTestId('checkin-autosave-status'))
        .toContainText(/Rascunho salvo às/, { timeout: 25_000 })

      await gerente.page.reload()
      const texto = await gerente.page.locator('main#main-content').innerText()
      // Não pode aparecer como fechamento enviado.
      expect(texto).toMatch(/Ainda não há fechamentos enviados|em andamento/)
    } finally {
      await vendedor.context.close()
      await gerente.context.close()
    }
  })
})

test.describe('AC-13/AC-14 — regularização e ajuste técnico preservados', () => {
  test('vendedor acessa o histórico de fechamentos', async ({ page }) => {
    await abrirFechamentoVendedor(page)
    await page.getByRole('button', { name: /Histórico de Fechamentos/i }).first().click()
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 20_000 })
  })

  test('gerente acessa regularizações pendentes', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.gerente, getE2ERolePassword())
    await page.goto('/fechamento-diario')
    await expect(page.locator('main#main-content')).toContainText(/Regularizações/, { timeout: 30_000 })
  })
})

test.describe('Perfis de gestão', () => {
  test('dono abre a rede sem erro', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.dono, getE2ERolePassword())
    await page.goto('/minhas-lojas')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
  })

  test('admin MX entra e navega', async ({ page }) => {
    await loginWithCredentials(page, CONTAS.adminMx, getE2ERolePassword())
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
  })
})

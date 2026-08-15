import { expect, test } from '@playwright/test'
import { getE2ERolePassword, loginWithCredentials } from './e2e-helpers/auth'

/**
 * FASE AG — 33.007/33.011-33.020 smokes de módulos restantes.
 *
 * Percorre as rotas representativas por perfil (Funil, Dono, Admin, Consultoria,
 * PDI/Feedback, Treinamentos, Notificações), lendo conteúdo e registrando erro
 * de console/network (33.020). Read-only: nenhuma mutação de negócio.
 *
 * Credenciais reais via e2e-helpers/auth; skip quando E2E_ROLE_PASSWORD ausente.
 */
const senha = () => getE2ERolePassword()

const CONTAS = {
  vendedor: process.env.E2E_SELLER_EMAIL || 'vendedor@mxgestaopreditiva.com.br',
  gerente: process.env.E2E_MANAGER_EMAIL || 'gerente@mxgestaopreditiva.com.br',
  dono: process.env.E2E_OWNER_EMAIL || 'dono@mxgestaopreditiva.com.br',
  adminMx: process.env.E2E_ADMIN_MX_EMAIL || 'synvollt@gmail.com',
}

/** Registra erros de console/network e falha se houver erro inesperado (33.020). */
async function trackConsoleErrors(page: import('@playwright/test').Page) {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console: ${msg.text().slice(0, 200)}`)
  })
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message.slice(0, 200)}`))
  page.on('response', (res) => {
    if (res.status() >= 500) errors.push(`http ${res.status()}: ${res.url()}`)
  })
  return errors
}

const IGNORED_ERRORS = [/favicon|\.map(?:\?|$)/i]

test.describe('FASE AG 33.007/33.011-33.019 — smokes de módulos por perfil', () => {
  test('vendedor: Funil (meu-funil) e Treinamentos carregam sem erro', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Smoke de módulo representativo roda no desktop.')
    await loginWithCredentials(page, CONTAS.vendedor, senha())

    const errors = await trackConsoleErrors(page)
    await page.goto('/meu-funil')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)

    await page.goto('/universidade-mx')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)

    const relevant = errors.filter((e) => !IGNORED_ERRORS.some((re) => re.test(e)))
    expect(relevant, relevant.join('\n')).toEqual([])
  })

  test('dono: Decisões, Plano Estratégico e Notificações carregam sem erro', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Smoke de módulo representativo roda no desktop.')
    await loginWithCredentials(page, CONTAS.dono, senha())

    const errors = await trackConsoleErrors(page)
    for (const path of ['/decisoes', '/plano-estrategico', '/notificacoes']) {
      await page.goto(path)
      await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)
    }

    const relevant = errors.filter((e) => !IGNORED_ERRORS.some((re) => re.test(e)))
    expect(relevant, relevant.join('\n')).toEqual([])
  })

  test('admin MX: Lojas e Painel carregam sem erro', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Smoke de módulo representativo roda no desktop.')
    await loginWithCredentials(page, CONTAS.adminMx, senha())

    const errors = await trackConsoleErrors(page)
    await page.goto('/lojas')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)

    await page.goto('/painel')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)

    const relevant = errors.filter((e) => !IGNORED_ERRORS.some((re) => re.test(e)))
    expect(relevant, relevant.join('\n')).toEqual([])
  })

  test('gerente: Feedback/PDI e Funil de vendas carregam sem erro', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Smoke de módulo representativo roda no desktop.')
    await loginWithCredentials(page, CONTAS.gerente, senha())

    const errors = await trackConsoleErrors(page)
    await page.goto('/feedbacks-pdis')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)

    await page.goto('/funil-vendas')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)

    const relevant = errors.filter((e) => !IGNORED_ERRORS.some((re) => re.test(e)))
    expect(relevant, relevant.join('\n')).toEqual([])
  })

  test('dono/gerente: Consultoria (falar-consultor) carrega sem erro', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chrome', 'Smoke de módulo representativo roda no desktop.')
    await loginWithCredentials(page, CONTAS.dono, senha())

    const errors = await trackConsoleErrors(page)
    await page.goto('/falar-consultor')
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/Erro|indisponível/i)).toHaveCount(0)

    const relevant = errors.filter((e) => !IGNORED_ERRORS.some((re) => re.test(e)))
    expect(relevant, relevant.join('\n')).toEqual([])
  })
})

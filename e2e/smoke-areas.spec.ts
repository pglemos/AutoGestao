import { expect, test, type Page } from '@playwright/test'

/**
 * FASE AG — smokes das áreas restantes.
 *
 * Cobre rotas que os módulos gerencial (manager-module) e internos MX
 * (internal-mx-waves34) ainda não exercitam por perfil: Decisões do Dono,
 * Configurações/Lojas do Admin, Consultoria, Treinamentos e o fluxo de
 * Notificações/toast. Cada teste navega a rota, aguarda a composição e exige
 * que o conteúdo principal monte sem erro de console — além de verificar o
 * heading canônico da área.
 *
 * Sem snapshot visual: a regressão visual já vive nos specs `visual/*`; aqui
 * o objetivo é o smoke funcional (montagem + ausência de erro) por rota.
 */
const password =
  process.env.E2E_ROLE_PASSWORD ||
  process.env.E2E_AUTH_PASSWORD

const profiles = {
  dono: process.env.E2E_OWNER_EMAIL,
  admin: process.env.E2E_ADMIN_MX_EMAIL,
  consultor: process.env.E2E_CONSULTANT_EMAIL,
  gerente: process.env.E2E_MANAGER_EMAIL,
} as const

const donoRoutes = [
  { path: '/decisoes', heading: /Decis|Painel/ },
] as const

const adminRoutes = [
  { path: '/configuracoes', heading: 'Configurações' },
  { path: '/lojas', heading: /Loja|Rede/ },
  { path: '/consultoria', heading: /Consultoria/ },
  { path: '/consultoria/clientes', heading: /Clientes|Consultoria/ },
] as const

const consultorRoutes = [
  { path: '/consultoria', heading: /Consultoria/ },
  { path: '/consultoria/clientes', heading: /Clientes|Consultoria/ },
] as const

const comumRoutes = [
  { path: '/treinamentos', heading: /Treinamentos|Universidade|Desenvolvimento/ },
  { path: '/notificacoes', heading: /Notificações|Notificações/ },
] as const

async function login(page: Page, email: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password as string)
  await page.click('button[type="submit"]')
  await expect(page.locator('main#main-content').first()).toBeVisible({ timeout: 30_000 })
}

function smoke(profile: keyof typeof profiles, route: { path: string; heading: RegExp | string }) {
  test(`${profile} ${route.path} monta sem erro de console`, async ({ page }) => {
    test.skip(!profiles[profile] || !password, `Credencial E2E de ${profile} não configurada`)
    const errors: string[] = []
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('pageerror', error => errors.push(error.message))

    await login(page, profiles[profile] as string)
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main#main-content').first()).toBeVisible({ timeout: 20_000 })
    // NaN é sintoma de renderização quebrada (números não montados).
    await expect(page.locator('body')).not.toContainText('NaN')
    // O heading canônico da área precisa existir.
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible({ timeout: 15_000 })
    // Erros de runtime/console quebrariam o smoke.
    expect(errors).toEqual([])
  })
}

test.describe('FASE AG — smokes de área por perfil', () => {
  test.describe.configure({ timeout: 120_000 })

  test.describe('Dono — cockpit e decisões', () => {
    for (const route of donoRoutes) smoke('dono', route)
  })

  test.describe('Admin MX — lojas e configurações', () => {
    for (const route of adminRoutes) smoke('admin', route)
  })

  test.describe('Consultor MX — consultoria', () => {
    for (const route of consultorRoutes) smoke('consultor', route)
  })

  test.describe('Rotas comuns — treinamentos e notificações', () => {
    for (const route of comumRoutes) smoke('gerente', route)
  })
})

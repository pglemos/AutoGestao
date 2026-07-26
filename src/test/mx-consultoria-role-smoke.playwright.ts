import { expect, test, type Browser, type Page, type Request } from '@playwright/test'
import {
  createE2EAdminUser,
  createE2EConsultingClient,
  createE2EConsultingVisit,
  createE2EStoreUser,
  deleteE2EConsultingData,
  deleteE2EUser,
  getSupabaseAdmin,
  type E2EUser,
} from './e2e-helpers/supabase-admin'
import { MX_STORE_SLUG, routesForRole } from './e2e-helpers/real-data-role-routes'
import type { UserRole } from '@/types/database'

const STORE_ID = '467a19d1-af51-4b4f-9b05-d67187a2a759'

type RoleCase = {
  role: UserRole
  user: E2EUser
  routes: readonly string[]
  visibleConsultingClientNames?: readonly string[]
  hiddenConsultingClientNames?: readonly string[]
}

async function login(page: Page, user: E2EUser) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', user.email)
  await page.fill('input[type="password"]', user.password)
  await page.click('button[type="submit"]')
  await expect(page.locator('main#main-content').first()).toBeVisible({ timeout: 30_000 })
  await expect.poll(async () => page.evaluate(() => {
    for (const [key, value] of Object.entries(window.localStorage)) {
      if (!key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      try {
        const session = JSON.parse(value) as { user?: { id?: string } }
        if (session.user?.id) return session.user.id
      } catch {
        // Ignore unrelated or incomplete storage entries during auth hydration.
      }
    }
    return null
  }), { message: `login autenticou identidade diferente de ${user.email}`, timeout: 15_000 }).toBe(user.id)
}

async function navigateWithinApp(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
}

function isFiniteSupabaseRequest(request: Request) {
  return request.url().includes('.supabase.co/') && !request.url().includes('/realtime/v1/')
}

async function auditAuthenticatedRole(browser: Browser, roleCase: RoleCase) {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    const pageErrors: string[] = []
    const consoleErrors: string[] = []
    const apiErrors: string[] = []
    const pendingSupabaseRequests = new Set<Request>()
    const successfulBusinessRequestsByRoute = new Map<string, number>()
    let activeRoute = '/login'
    let lastSupabaseActivityAt = Date.now()

    const waitForSupabaseIdle = async (label: string) => {
      await expect.poll(
        () => pendingSupabaseRequests.size === 0 && Date.now() - lastSupabaseActivityAt >= 750,
        { message: `${label} ainda possui consultas Supabase em voo`, timeout: 15_000 },
      ).toBe(true)
    }

    page.on('pageerror', error => pageErrors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') consoleErrors.push(`${activeRoute}: ${message.text()}`)
    })
    page.on('request', request => {
      if (!isFiniteSupabaseRequest(request)) return
      lastSupabaseActivityAt = Date.now()
      pendingSupabaseRequests.add(request)
    })
    page.on('requestfailed', request => {
      if (!isFiniteSupabaseRequest(request)) return
      pendingSupabaseRequests.delete(request)
      lastSupabaseActivityAt = Date.now()
      const failure = request.failure()?.errorText || ''
      if (failure.includes('ERR_ABORTED')) return
      apiErrors.push(`${activeRoute}: ${request.method()} ${request.url()} ${failure}`)
    })
    page.on('response', response => {
      pendingSupabaseRequests.delete(response.request())
      const url = response.url()
      if (!isFiniteSupabaseRequest(response.request())) return
      lastSupabaseActivityAt = Date.now()
      if (/\/(?:rest|functions)\/v1\//.test(url) && response.ok()) {
        successfulBusinessRequestsByRoute.set(activeRoute, (successfulBusinessRequestsByRoute.get(activeRoute) || 0) + 1)
      }
      if (response.status() >= 400) apiErrors.push(`${activeRoute}: ${response.status()} ${response.request().method()} ${url}`)
    })

    await login(page, roleCase.user)
    await waitForSupabaseIdle(`${roleCase.role}: login`)

    for (const route of roleCase.routes) {
      activeRoute = route
      successfulBusinessRequestsByRoute.set(route, 0)
      await navigateWithinApp(page, route)
      // Legacy store workspace routes render their own main landmark, while the
      // owner module exposes its content as a named region instead of a main.
      await expect(
        page.locator('main, [role="region"][aria-label*="Conteúdo"]').first(),
        `${roleCase.role}: ${route}`,
      ).toBeVisible({ timeout: 30_000 })
      await expect(page, `${roleCase.role}: ${route}`).not.toHaveURL(/\/login(?:[?#]|$)/)
      await expect(page.getByText(/Acesso não autorizado|Página não encontrada/i), `${roleCase.role}: ${route}`).toHaveCount(0)
      await expect(page.locator('body'), `${roleCase.role}: ${route}`).not.toContainText(/dados\s+fict[ií]cios|dados\s+demonstrativos|dados\s+de\s+demonstra[cç][aã]o|modelo\s+em\s+valida[cç][aã]o|valida[cç][aã]o\s+visual/i)
      if (route === '/plano-acao') {
        await expect(page.getByRole('heading', { name: 'Plano de Ação', exact: true }).first(), `${roleCase.role}: Plano de Ação não renderizado`).toBeVisible()
      }
      await expect.poll(
        () => successfulBusinessRequestsByRoute.get(route) || 0,
        { message: `${roleCase.role}: ${route} não realizou leitura/escrita real no Supabase`, timeout: 15_000 },
      ).toBeGreaterThan(0)
      await waitForSupabaseIdle(`${roleCase.role}: ${route}`)

      if (route.startsWith('/simulacao/')) {
        const stopSimulation = page.getByRole('button', { name: 'Voltar Admin MX' })
        await expect(stopSimulation, `${roleCase.role}: ${route} não ativou a simulação`).toBeVisible()
        await stopSimulation.click()
        await expect(page).toHaveURL(/\/painel(?:[?#]|$)/)
        await expect(page.getByRole('region', { name: 'Simulação ativa' })).toHaveCount(0)
        await waitForSupabaseIdle(`${roleCase.role}: saída de ${route}`)
      }
    }

    if (roleCase.visibleConsultingClientNames || roleCase.hiddenConsultingClientNames) {
      activeRoute = '/consultoria/clientes'
      await navigateWithinApp(page, activeRoute)
      for (const name of roleCase.visibleConsultingClientNames || []) {
        await expect(page.getByText(name, { exact: false }).first(), `${roleCase.role}: cliente atribuído/administrável ausente`).toBeVisible()
      }
      for (const name of roleCase.hiddenConsultingClientNames || []) {
        await expect(page.getByText(name, { exact: false }), `${roleCase.role}: cliente fora do escopo ficou visível`).toHaveCount(0)
      }
    }

    expect(pageErrors, `${roleCase.role}: erros de página`).toEqual([])
    expect(apiErrors, `${roleCase.role}: falhas HTTP/rede Supabase`).toEqual([])
    expect(consoleErrors, `${roleCase.role}: console.error`).toEqual([])
  } finally {
    await context.close()
  }
}

test.describe('MX CONSULTORIA — todos os módulos autenticados usam dados reais', () => {
  test.describe.configure({ mode: 'serial', timeout: 900_000 })
  const createdUsers: E2EUser[] = []
  const consultingClientIds: string[] = []
  let roleCases: RoleCase[] = []

  test.beforeAll(async () => {
    const admin = getSupabaseAdmin()
    const [{ data: store, error: storeError }, { count: memberships, error: membershipError }, { count: sellers, error: sellersError }] = await Promise.all([
      admin.from('lojas').select('id,name,active,source_mode').eq('id', STORE_ID).single(),
      admin.from('vinculos_loja').select('user_id', { count: 'exact', head: true }).eq('store_id', STORE_ID).eq('is_active', true),
      admin.from('vendedores_loja').select('seller_user_id', { count: 'exact', head: true }).eq('store_id', STORE_ID).eq('is_active', true),
    ])
    expect(storeError).toBeNull()
    expect(membershipError).toBeNull()
    expect(sellersError).toBeNull()
    expect(store).toMatchObject({ id: STORE_ID, name: 'MX CONSULTORIA', active: true, source_mode: 'native_app' })
    expect(memberships || 0).toBeGreaterThan(0)
    expect(sellers || 0).toBeGreaterThan(0)

    const trackCreatedUser = async (create: () => Promise<E2EUser>) => {
      const user = await create()
      createdUsers.push(user)
      return user
    }
    const creations = await Promise.allSettled([
      trackCreatedUser(() => createE2EStoreUser({ storeId: STORE_ID, role: 'vendedor', prefix: 'e2e-real-vendedor', name: 'E2E Dados Reais Vendedor' })),
      trackCreatedUser(() => createE2EStoreUser({ storeId: STORE_ID, role: 'gerente', prefix: 'e2e-real-gerente', name: 'E2E Dados Reais Gerente' })),
      trackCreatedUser(() => createE2EStoreUser({ storeId: STORE_ID, role: 'dono', prefix: 'e2e-real-dono', name: 'E2E Dados Reais Dono' })),
      trackCreatedUser(() => createE2EAdminUser({ role: 'administrador_geral', prefix: 'e2e-real-admin-geral', name: 'E2E Dados Reais Administrador Geral' })),
      trackCreatedUser(() => createE2EAdminUser({ role: 'administrador_mx', prefix: 'e2e-real-admin-mx', name: 'E2E Dados Reais Admin MX' })),
      trackCreatedUser(() => createE2EAdminUser({ role: 'consultor_mx', prefix: 'e2e-real-consultor-mx', name: 'E2E Dados Reais Consultor MX' })),
    ])
    const failedCreation = creations.find(result => result.status === 'rejected')
    if (failedCreation?.status === 'rejected') throw failedCreation.reason
    const [vendedor, gerente, dono, administradorGeral, administradorMx, consultorMx] = creations.map(
      result => (result as PromiseFulfilledResult<E2EUser>).value,
    )

    const expectedRoles = new Map<string, UserRole>([
      [vendedor.id, 'vendedor'],
      [gerente.id, 'gerente'],
      [dono.id, 'dono'],
      [administradorGeral.id, 'administrador_geral'],
      [administradorMx.id, 'administrador_mx'],
      [consultorMx.id, 'consultor_mx'],
    ])
    const { data: createdProfiles, error: createdProfilesError } = await admin
      .from('usuarios')
      .select('id,role')
      .in('id', [...expectedRoles.keys()])
    expect(createdProfilesError).toBeNull()
    expect(createdProfiles).toHaveLength(expectedRoles.size)
    for (const profile of createdProfiles || []) expect(profile.role).toBe(expectedRoles.get(profile.id))

    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const assignedClient = await createE2EConsultingClient({
      name: `E2E Cliente Atribuído ${uniqueSuffix}`,
      createdBy: administradorMx.id,
    })
    consultingClientIds.push(assignedClient.id)
    const unassignedClient = await createE2EConsultingClient({
      name: `E2E Cliente Não Atribuído ${uniqueSuffix}`,
      createdBy: administradorMx.id,
    })
    consultingClientIds.push(unassignedClient.id)
    await createE2EConsultingVisit({
      clientId: assignedClient.id,
      consultantId: consultorMx.id,
      scheduledAt: new Date(Date.now() + 86_400_000),
      objective: `E2E escopo real ${uniqueSuffix}`,
    })

    roleCases = [
      { role: 'vendedor', user: vendedor, routes: routesForRole('vendedor') },
      { role: 'gerente', user: gerente, routes: routesForRole('gerente') },
      { role: 'dono', user: dono, routes: routesForRole('dono') },
      {
        role: 'administrador_geral',
        user: administradorGeral,
        routes: [...routesForRole('administrador_geral'), `/consultoria/clientes/${assignedClient.slug}`, `/consultoria/clientes/${unassignedClient.slug}`],
        visibleConsultingClientNames: [assignedClient.name, unassignedClient.name],
      },
      {
        role: 'administrador_mx',
        user: administradorMx,
        routes: [...routesForRole('administrador_mx'), `/consultoria/clientes/${assignedClient.slug}`, `/consultoria/clientes/${unassignedClient.slug}`],
        visibleConsultingClientNames: [assignedClient.name, unassignedClient.name],
      },
      {
        role: 'consultor_mx',
        user: consultorMx,
        routes: [...routesForRole('consultor_mx'), `/consultoria/clientes/${assignedClient.slug}`, `/consultoria/clientes/${assignedClient.slug}/visitas/1`],
        visibleConsultingClientNames: [assignedClient.name],
        hiddenConsultingClientNames: [unassignedClient.name],
      },
    ]

    const roleFilter = process.env.MX_E2E_ROLE as UserRole | undefined
    if (roleFilter) {
      roleCases = roleCases.filter(roleCase => roleCase.role === roleFilter)
      expect(roleCases, `Perfil E2E desconhecido: ${roleFilter}`).not.toHaveLength(0)
    }
  })

  test.afterAll(async () => {
    await deleteE2EConsultingData(consultingClientIds)
    const cleanup = await Promise.allSettled(createdUsers.map(user => deleteE2EUser(user.id)))
    const failures = cleanup.filter(result => result.status === 'rejected')
    if (failures.length > 0) throw new Error(`Falha ao limpar ${failures.length} identidade(s) E2E temporária(s).`)
  })

  test('percorre todas as superfícies permitidas sem mocks, erros de página ou falhas Supabase', async ({ browser }) => {
    for (const roleCase of roleCases) await auditAuthenticatedRole(browser, roleCase)
  })
})

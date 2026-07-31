import { expect, test } from '@playwright/test'
import { addDays, addWeeks, setHours, setMinutes, startOfWeek } from 'date-fns'
import {
  createE2EAdminUser,
  createE2EConsultingClient,
  createE2EConsultingVisit,
  deleteE2EConsultingData,
  deleteE2EUser,
  getSupabaseAdmin,
  type E2EUser,
} from './e2e-helpers/supabase-admin'
import { getE2EInternalCredentials, loginWithCredentials } from './e2e-helpers/auth'

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(painel|home|loja|lojas)/, { timeout: 15000 }).catch(() => {})
}

function withHour(date: Date, hour: number) {
  return setMinutes(setHours(date, hour), 0)
}

async function expectVisitListed(page: import('@playwright/test').Page, clientName: string) {
  await expect(page.getByRole('heading', { name: clientName })).toHaveCount(1)
}

async function expectVisitNotListed(page: import('@playwright/test').Page, clientName: string) {
  await expect(page.getByRole('heading', { name: clientName })).toHaveCount(0)
}

test.describe('Agenda admin filters', () => {
  const users: E2EUser[] = []
  const clientIds: string[] = []

  test.afterEach(async () => {
    await deleteE2EConsultingData(clientIds.splice(0))
    while (users.length) {
      const user = users.pop()
      if (user) await deleteE2EUser(user.id)
    }
  })

  test('Daniel admin master filters all consultants and date windows: today, week, next week, month, all', async ({ page }, testInfo) => {
    const suffix = `${testInfo.project.name}-${Date.now()}`
    const adminCredentials = getE2EInternalCredentials()
    const { data: loginAdmin, error: loginAdminError } = await getSupabaseAdmin()
      .from('usuarios')
      .select('id')
      .eq('email', adminCredentials.email)
      .single()
    expect(loginAdminError).toBeNull()
    expect(loginAdmin?.id).toBeTruthy()

    const consultantA = await createE2EAdminUser({ prefix: `agenda-a-${suffix}`, name: `Agenda Consultor A ${suffix}`, role: 'consultor_mx' })
    const consultantB = await createE2EAdminUser({ prefix: `agenda-b-${suffix}`, name: `Agenda Consultor B ${suffix}`, role: 'consultor_mx' })
    users.push(consultantA, consultantB)

    const clientToday = await createE2EConsultingClient({ name: `E2E Agenda Hoje ${suffix}`, createdBy: loginAdmin!.id })
    const clientNextWeek = await createE2EConsultingClient({ name: `E2E Agenda Proxima ${suffix}`, createdBy: loginAdmin!.id })
    const clientOtherConsultant = await createE2EConsultingClient({ name: `E2E Agenda Outro ${suffix}`, createdBy: loginAdmin!.id })
    clientIds.push(clientToday.id, clientNextWeek.id, clientOtherConsultant.id)

    const now = new Date()
    const nextWeekDate = addDays(startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 }), 1)
    await createE2EConsultingVisit({ clientId: clientToday.id, consultantId: consultantA.id, scheduledAt: withHour(now, 10), visitNumber: 1 })
    await createE2EConsultingVisit({ clientId: clientNextWeek.id, consultantId: consultantA.id, scheduledAt: withHour(nextWeekDate, 11), visitNumber: 2 })
    await createE2EConsultingVisit({ clientId: clientOtherConsultant.id, consultantId: consultantB.id, scheduledAt: withHour(now, 12), visitNumber: 3 })

    await loginWithCredentials(page, adminCredentials.email, adminCredentials.password)
    await page.goto(`/agenda?range=todos&consultant=${consultantA.id}`)

    // A tela não expõe um título "Agenda MX" — seu único h1 é o mês corrente
    // do calendário (ver docs/audits/2026-07-31-achados-visuais-agenda.md).
    // Ancorar no conteúdo principal e no controle de filtros, que são estáveis.
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Filtros').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('#agenda-consultant-filter')).toHaveValue(consultantA.id)
    await expectVisitListed(page, clientToday.name)
    await expectVisitListed(page, clientNextWeek.name)
    await expectVisitNotListed(page, clientOtherConsultant.name)

    await page.getByRole('button', { name: /^Hoje$/ }).first().click()
    await expect(page).toHaveURL(new RegExp(`consultant=${consultantA.id}`))
    await expect(page).toHaveURL(/range=hoje/)
    await expectVisitListed(page, clientToday.name)
    await expectVisitNotListed(page, clientNextWeek.name)
    await expectVisitNotListed(page, clientOtherConsultant.name)

    await page.getByRole('button', { name: /^Próx\. Semana$/ }).click()
    await expect(page).toHaveURL(/range=proxima_semana/)
    await expectVisitNotListed(page, clientToday.name)
    await expectVisitListed(page, clientNextWeek.name)
    await expectVisitNotListed(page, clientOtherConsultant.name)

    await page.getByRole('button', { name: /^Todos$/ }).first().click()
    await expect(page).not.toHaveURL(/range=/)
    await expectVisitListed(page, clientToday.name)
    await expectVisitListed(page, clientNextWeek.name)
    await expectVisitNotListed(page, clientOtherConsultant.name)

    await page.locator('#agenda-consultant-filter').selectOption('todos')
    await expect(page).not.toHaveURL(/consultant=/)
    await expectVisitListed(page, clientToday.name)
    await expectVisitListed(page, clientNextWeek.name)
    await expectVisitListed(page, clientOtherConsultant.name)

    await page.getByRole('button', { name: /^Semana$/ }).click()
    await expect(page).toHaveURL(/range=semana/)
    await page.getByRole('button', { name: /^Mês$/ }).click()
    await expect(page).toHaveURL(/range=mes/)
  })

  test('consultant cannot see another consultant agenda even with consultant query param', async ({ page }, testInfo) => {
    const suffix = `${testInfo.project.name}-${Date.now()}`
    const admin = await createE2EAdminUser({ prefix: `agenda-admin-${suffix}`, name: 'Daniel Admin Master' })
    const consultantA = await createE2EAdminUser({ prefix: `agenda-own-${suffix}`, name: `Agenda Consultor Proprio ${suffix}`, role: 'consultor_mx' })
    const consultantB = await createE2EAdminUser({ prefix: `agenda-other-${suffix}`, name: `Agenda Consultor Outro ${suffix}`, role: 'consultor_mx' })
    users.push(admin, consultantA, consultantB)

    const ownClient = await createE2EConsultingClient({ name: `E2E Agenda Minha ${suffix}`, createdBy: admin.id })
    const otherClient = await createE2EConsultingClient({ name: `E2E Agenda Alheia ${suffix}`, createdBy: admin.id })
    clientIds.push(ownClient.id, otherClient.id)

    const now = new Date()
    await createE2EConsultingVisit({ clientId: ownClient.id, consultantId: consultantA.id, scheduledAt: withHour(now, 10), visitNumber: 1 })
    await createE2EConsultingVisit({ clientId: otherClient.id, consultantId: consultantB.id, scheduledAt: withHour(now, 11), visitNumber: 1 })

    await login(page, consultantA.email, consultantA.password)
    await page.goto(`/agenda?range=todos&consultant=${consultantB.id}`)

    // A tela não expõe um título "Agenda MX" — seu único h1 é o mês corrente
    // do calendário (ver docs/audits/2026-07-31-achados-visuais-agenda.md).
    // Ancorar no conteúdo principal e no controle de filtros, que são estáveis.
    await expect(page.locator('main#main-content')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Filtros').first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('#agenda-consultant-filter')).toHaveCount(0)
    await expect(page).not.toHaveURL(/consultant=/)
    await expectVisitListed(page, ownClient.name)
    await expectVisitNotListed(page, otherClient.name)
  })
})

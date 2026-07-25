import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const hookSource = readFileSync(new URL('./useManagerHomeOfficialSources.ts', import.meta.url), 'utf8')
const canonicalDashboardSource = readFileSync(
  new URL('../../dashboard-loja/sections/ManagerSellerParityHomeCanonical.tsx', import.meta.url),
  'utf8',
)
const performanceTabSource = readFileSync(
  new URL('../../dashboard-loja/sections/PerformanceTab.tsx', import.meta.url),
  'utf8',
)
const dashboardContainerSource = readFileSync(
  new URL('../../dashboard-loja/DashboardLoja.container.tsx', import.meta.url),
  'utf8',
)

describe('Manager Dashboard official sources', () => {
  test('consolidates and reads the same persisted Hoje plan used by Meta da Loja', () => {
    expect(hookSource).toContain("supabase.rpc('consolidate_store_target_plan'")
    expect(hookSource).toContain(".from('store_target_plans')")
    expect(hookSource).toContain(".eq('horizon', 'hoje')")
    expect(hookSource).toContain(".order('version', { ascending: false })")
  })

  test('counts only confirmed linked appointments with a defined modality', () => {
    expect(hookSource).toContain(".from('agendamentos')")
    expect(hookSource).toContain(".eq('confirmation_status', 'confirmado')")
    expect(hookSource).toContain(".not('modalidade', 'is', null)")
    expect(hookSource).toContain(".not('cliente_id', 'is', null)")
  })

  test('activates the canonical Dashboard in every manager entry path', () => {
    expect(performanceTabSource).toContain("import { ManagerSellerParityHomeCanonical } from './ManagerSellerParityHomeCanonical'")
    expect(performanceTabSource).toContain('<ManagerSellerParityHomeCanonical')
    expect(dashboardContainerSource).toContain("import { ManagerSellerParityHomeCanonical } from './sections/ManagerSellerParityHomeCanonical'")
    expect(dashboardContainerSource).toContain('<ManagerSellerParityHomeCanonical')
  })

  test('uses plan need and ratio instead of the fixed 22-day competing formula', () => {
    expect(canonicalDashboardSource).toContain('useManagerHomeOfficialSources')
    expect(canonicalDashboardSource).toContain('plan?.required_sales')
    expect(canonicalDashboardSource).toContain('plan?.appointments_per_sale')
    expect(canonicalDashboardSource).not.toContain('calculateSalesNeededToday(monthlyGoal, DIAS_UTEIS_MES_PADRAO, salesToday)')
  })

  test('reconciles total appointments with the seller breakdown', () => {
    expect(hookSource).toContain('appointmentsBySeller')
    expect(hookSource).toContain('totalAppointments: appointmentRows.length')
    expect(canonicalDashboardSource).toContain('officialSources.appointmentsBySeller.get(seller.id)')
  })

  test('renders the canonical financial status object without parallel labels', () => {
    expect(canonicalDashboardSource).toContain('item.financialStatus.className')
    expect(canonicalDashboardSource).toContain('item.financialStatus.label')
    expect(canonicalDashboardSource).not.toContain('function financialLabel')
    expect(canonicalDashboardSource).not.toContain('function financialTone')
  })
})

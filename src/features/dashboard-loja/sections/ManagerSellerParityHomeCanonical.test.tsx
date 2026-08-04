import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { ManagerSellerParityHomeCanonical } from './ManagerSellerParityHomeCanonical'

const sessionValues = new Map<string, string>()
const useManagerHomeOfficialSourcesMock = vi.fn()

vi.mock('@/features/manager/home/useManagerHomeOfficialSources', () => ({
  useManagerHomeOfficialSources: (...args: unknown[]) => useManagerHomeOfficialSourcesMock(...args),
}))

beforeAll(() => {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      clear: () => sessionValues.clear(),
      getItem: (key: string) => sessionValues.get(key) ?? null,
      removeItem: (key: string) => sessionValues.delete(key),
      setItem: (key: string, value: string) => sessionValues.set(key, String(value)),
    },
  })

  Object.defineProperty(globalThis.HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => 320,
  })
  Object.defineProperty(globalThis.HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get: () => 256,
  })
  Object.defineProperty(globalThis.HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get: () => 320,
  })
  Object.defineProperty(globalThis.HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 256,
  })
  globalThis.HTMLElement.prototype.getBoundingClientRect = () =>
    ({
      bottom: 256,
      height: 256,
      left: 0,
      right: 320,
      top: 0,
      width: 320,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    }) as DOMRect
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.restoreAllMocks()
  useManagerHomeOfficialSourcesMock.mockReset()
})

describe('ManagerSellerParityHomeCanonical', () => {
  it('declara o contrato inicial de dimensões do ResponsiveContainer do gráfico', () => {
    const source = readFileSync(new URL('./ManagerSellerParityHomeCanonical.tsx', import.meta.url), 'utf8')

    expect(source).toContain('width="100%"')
    expect(source).toContain('height="100%"')
    expect(source).toContain('minWidth={0}')
    expect(source).toContain('minHeight={256}')
    expect(source).toContain('initialDimension={{ width: 320, height: 256 }}')
  })

  it('não emite warning de dimensão negativa no gráfico de agendamentos', () => {
    useManagerHomeOfficialSourcesMock.mockReturnValue({
      appointmentsBySeller: new Map([
        ['seller-1', 3],
        ['seller-2', 1],
      ]),
      error: null,
      loading: false,
      plan: {
        appointments_per_sale: 2,
        business_days_elapsed: 10,
        business_days_total: 22,
        focus_message: 'Priorize confirmações do dia.',
        monthly_goal: 44,
        operational_need: 4,
        required_sales: 2,
        version: 7,
      },
      refresh: vi.fn(async () => undefined),
      totalAppointments: 4,
    })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <MemoryRouter initialEntries={['/home']}>
        <ManagerSellerParityHomeCanonical data={buildData()} alerts={[]} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Agendamentos por Vendedor' })).toBeTruthy()
    expect(
      errorSpy.mock.calls.some(call =>
        call.some(arg =>
          String(arg).includes('The width(-1) and height(-1) of chart should be greater than 0'),
        ),
      ),
    ).toBe(false)
  })
})

function buildData() {
  return {
    selectedStoreId: 'store-1',
    sellers: [seller(1), seller(2)],
    checkins: [checkin(1, { appointments: 3 }), checkin(2, { appointments: 1 })],
    managerMonthlyCheckins: [checkin(1, { sales: 2 }), checkin(2, { sales: 1 })],
    officialMonthlyPerformance: [],
    managerMonthlyPerformance: [],
    alerts: [],
    error: null,
    managerMonthlyError: null,
    referenceDate: '2026-08-04',
    setReferenceDate: vi.fn(),
    isRefetching: false,
    handleRefresh: vi.fn(async () => undefined),
    operationalMetaRules: {
      individual_goal_mode: 'even',
      monthly_goal: 44,
    },
    effectiveMonthlyGoal: 44,
    metrics: {
      goalValue: 44,
      ranking: [],
      storeName: 'MX Consultoria',
      totalAgd: 4,
      totalSales: 0,
    },
  }
}

function seller(index: number) {
  return {
    id: `seller-${index}`,
    name: `Vendedor ${index}`,
    email: `seller-${index}@example.com`,
    role: 'vendedor',
    avatar_url: null,
    is_venda_loja: false,
    active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    checkin_today: true,
  }
}

function checkin(index: number, values: { appointments?: number; sales?: number } = {}) {
  return {
    id: `checkin-${index}-${values.appointments || 0}-${values.sales || 0}`,
    seller_user_id: `seller-${index}`,
    store_id: 'store-1',
    reference_date: '2026-08-04',
    metric_scope: 'daily',
    agd_cart_today: values.appointments || 0,
    agd_net_today: 0,
    vnd_porta_prev_day: values.sales || 0,
    vnd_cart_prev_day: 0,
    vnd_net_prev_day: 0,
  }
}

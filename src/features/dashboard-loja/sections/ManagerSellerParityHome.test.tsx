import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ManagerSellerParityHome } from './ManagerSellerParityHome'

const sessionValues = new Map<string, string>()

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
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('ManagerSellerParityHome Base44 parity', () => {
  it('reproduz o estado Base44 quando o gerente não possui unidade', () => {
    renderHome(buildData({
      selectedStoreId: null,
      sellers: [],
      checkins: [],
      managerMonthlyCheckins: [],
    }))

    expect(screen.getByText('Bem-vindo ao MX Performance')).toBeTruthy()
    expect(screen.getByText('Cadastre sua loja e a meta mensal no módulo do Dono para ativar o Dashboard de Previsibilidade Comercial.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Início' })).toBeNull()
  })

  it('renderiza as formulas Base44 sem seletor editavel de data', () => {
    const { container } = renderHome(buildData())

    expect(screen.getAllByText('1,3 vendas').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2 vendas').length).toBeGreaterThan(0)
    expect(screen.getByText('6 agendamentos')).toBeTruthy()
    expect(screen.getByText('-2')).toBeTruthy()
    expect(container.querySelector('input[type="date"]')).toBeNull()
    expect(screen.getByText('13/07/2026')).toBeTruthy()
  })

  it('não troca a constante Base44 por uma conversão histórica do mês', () => {
    renderHome(buildData({
      checkins: [checkin(1, { appointments: 2 })],
      managerMonthlyCheckins: [checkin(1, { appointments: 1, sales: 5 })],
    }))

    expect(screen.getAllByText('0,7 vendas').length).toBeGreaterThan(0)
    expect(screen.getByText('Regra atual: 1 venda a cada 3 agendamentos')).toBeTruthy()
  })

  it('mostra no maximo cinco vendedores e o realizado mensal real', () => {
    renderHome(buildData({
      sellers: Array.from({ length: 7 }, (_, index) => seller(index + 1)),
      checkins: Array.from({ length: 7 }, (_, index) => checkin(index + 1, { appointments: 7 - index })),
      managerMonthlyCheckins: Array.from({ length: 7 }, (_, index) => checkin(index + 1, { sales: index + 1 })),
    }))

    const team = screen.getByRole('region', { name: 'Equipe em foco' })
    expect(within(team).getAllByText('Vendedor 1').length).toBeGreaterThan(0)
    expect(within(team).getAllByText('Vendedor 5').length).toBeGreaterThan(0)
    expect(within(team).queryByText('Vendedor 6')).toBeNull()
    expect(within(team).queryByText('Vendedor 7')).toBeNull()
    expect(within(team).getByRole('button', { name: /ver toda a equipe/i })).toBeTruthy()
    expect(within(team).getAllByText('1').length).toBeGreaterThan(0)
  })

  it('usa o acumulado oficial de vendas quando os fechamentos diarios estao zerados', () => {
    renderHome(buildData({
      sellers: [seller(1), seller(2), seller(3)],
      checkins: [],
      managerMonthlyCheckins: [],
      officialMonthlyPerformance: [
        { seller_user_id: 'seller-1', vendas_realizadas: 2 },
        { seller_user_id: 'seller-2', vendas_realizadas: 3 },
        { seller_user_id: 'seller-3', vendas_realizadas: 1 },
      ],
    }))

    const team = screen.getByRole('region', { name: 'Equipe em foco' })
    expect(within(team).getAllByText('2').length).toBeGreaterThan(0)
    expect(within(team).getAllByText('3').length).toBeGreaterThan(0)
    expect(within(team).getAllByText('1').length).toBeGreaterThan(0)
  })

  it('mantém o acesso à equipe completa mesmo quando os cinco vendedores já cabem na tabela', () => {
    renderHome(buildData({
      sellers: Array.from({ length: 5 }, (_, index) => seller(index + 1)),
      checkins: [],
      managerMonthlyCheckins: [],
    }))

    expect(within(screen.getByRole('region', { name: 'Equipe em foco' })).getByRole('button', { name: /ver toda a equipe/i })).toBeTruthy()
  })

  it('salva o contexto gerencial antes de navegar para a Meta da Loja', () => {
    renderHome(buildData())

    fireEvent.click(screen.getByRole('button', { name: /ver meta da loja/i }))

    expect(screen.getByTestId('current-location').textContent).toBe('/meta-loja')
    expect(JSON.parse(sessionStorage.getItem('mx_contexto_navegacao') || '{}')).toMatchObject({
      origemNavegacao: 'DASHBOARD_GERENCIAL',
      data: '2026-07-13',
      unidade: 'store-1',
    })
  })
})

function renderHome(data: ReturnType<typeof buildData>) {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <ManagerSellerParityHome data={data as never} alerts={[]} />
      <LocationProbe />
    </MemoryRouter>,
  )
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="current-location">{location.pathname}{location.search}</output>
}

function buildData(overrides: Record<string, unknown> = {}) {
  return {
    selectedStoreId: 'store-1',
    sellers: [seller(1)],
    checkins: [checkin(1, { appointments: 4 })],
    managerMonthlyCheckins: [checkin(1, { sales: 1, appointments: 3 })],
    loading: false,
    error: null,
    managerMonthlyError: null,
    referenceDate: '2026-07-13',
    setReferenceDate: vi.fn(),
    isRefetching: false,
    handleRefresh: vi.fn(async () => undefined),
    operationalMetaRules: {
      monthly_goal: 44,
      individual_goal_mode: 'even',
    },
    effectiveMonthlyGoal: 44,
    metrics: {
      totalSales: 0,
      totalAgd: 4,
      goalValue: 44,
      ranking: [],
      storeName: 'MX Consultoria',
    },
    ...overrides,
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
    reference_date: '2026-07-13',
    metric_scope: 'daily',
    agd_cart_today: values.appointments || 0,
    agd_net_today: 0,
    vnd_porta_prev_day: values.sales || 0,
    vnd_cart_prev_day: 0,
    vnd_net_prev_day: 0,
  }
}

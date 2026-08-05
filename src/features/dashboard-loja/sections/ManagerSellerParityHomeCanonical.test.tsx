import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { ManagerSellerParityHomeCanonical } from './ManagerSellerParityHomeCanonical'

const sessionValues = new Map<string, string>()
const useManagerHomeOfficialSourcesMock = vi.fn()
const resizeObservers = new Set<FakeResizeObserver>()

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

  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver

  Object.defineProperty(globalThis.HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get() {
      return resolveWidth(this as HTMLElement)
    },
  })
  Object.defineProperty(globalThis.HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return resolveHeight(this as HTMLElement)
    },
  })
  Object.defineProperty(globalThis.HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get() {
      return resolveWidth(this as HTMLElement)
    },
  })
  Object.defineProperty(globalThis.HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return resolveHeight(this as HTMLElement)
    },
  })
  globalThis.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    const width = resolveWidth(this as HTMLElement)
    const height = resolveHeight(this as HTMLElement)

    return {
      bottom: height,
      height,
      left: 0,
      right: width,
      top: 0,
      width,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    } as DOMRect
  }
})

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  resizeObservers.clear()
  vi.restoreAllMocks()
  useManagerHomeOfficialSourcesMock.mockReset()
})

describe('ManagerSellerParityHomeCanonical', () => {
  it('renderiza o gráfico com dimensão inicial positiva e sem warnings de sizing do Recharts', async () => {
    const consoleMessages = captureUnexpectedConsole()
    useManagerHomeOfficialSourcesMock.mockReturnValue(buildOfficialSources())

    const { container, rerender } = renderHome({
      data: buildData(),
      viewportWidth: 320,
    })

    const chartHeading = screen.getByRole('heading', { name: 'Agendamentos por Vendedor' })
    const chartCard = chartHeading.closest('article')
    expect(chartCard).toBeTruthy()
    expect(within(chartCard as HTMLElement).getByText('Somatório conciliado: 4 confirmados.')).toBeTruthy()

    const initialSurface = getChartSurface(chartCard as HTMLElement)
    expect(initialSurface).toBeTruthy()
    expect(readNumericAttribute(initialSurface, 'width')).toBe(320)
    expect(readNumericAttribute(initialSurface, 'height')).toBe(256)
    expect(within(chartCard as HTMLElement).getAllByText('MaximilianoExtenso').length).toBeGreaterThan(0)
    expect(consoleMessages).toEqual([])

    rerender(
      <MemoryRouter initialEntries={['/home']}>
        <div style={{ width: '240px' }}>
          <ManagerSellerParityHomeCanonical data={buildData()} alerts={[]} />
          <LocationProbe />
        </div>
      </MemoryRouter>,
    )

    act(() => {
      emitResizeObservers()
    })

    await waitFor(() => {
      const resizedSurface = getChartSurface(container)
      expect(readNumericAttribute(resizedSurface, 'width')).toBe(240)
    })

    expect(readNumericAttribute(getChartSurface(container), 'height')).toBe(256)
    expect(within(chartCard as HTMLElement).getAllByText('MaximilianoExtenso').length).toBeGreaterThan(0)
    expect(consoleMessages).toEqual([])
  })

  it('preserva a navegação por clique no bar e a semântica do cartão do gráfico', async () => {
    const consoleMessages = captureUnexpectedConsole()
    useManagerHomeOfficialSourcesMock.mockReturnValue(buildOfficialSources())

    const { container } = renderHome({
      data: buildData(),
      viewportWidth: 320,
    })

    act(() => {
      emitResizeObservers()
    })

    const chartHeading = screen.getByRole('heading', { name: 'Agendamentos por Vendedor' })
    const chartCard = chartHeading.closest('article')
    expect(chartCard?.tagName).toBe('ARTICLE')

    await waitFor(() => {
      expect(chartCard?.querySelector('.recharts-bar-rectangle path, .recharts-bar-rectangle rect')).toBeTruthy()
    })

    const bar = chartCard?.querySelector('.recharts-bar-rectangle path, .recharts-bar-rectangle rect')
    expect(bar).toBeTruthy()

    fireEvent.click(bar as Element)

    await waitFor(() => {
      expect(screen.getByTestId('current-location').textContent).toBe(
        '/rotina-equipe?busca=MaximilianoExtenso%20da%20Silva',
      )
    })

    expect(JSON.parse(sessionStorage.getItem('mx_contexto_navegacao') || '{}')).toMatchObject({
      origemNavegacao: 'DASHBOARD_GERENCIAL',
      data: '2026-08-04',
      unidade: 'store-1',
      planoVersao: 7,
    })
    expect(consoleMessages).toEqual([])
  })
})

function renderHome({
  data,
  viewportWidth,
}: {
  data: ReturnType<typeof buildData>
  viewportWidth: number
}) {
  return render(
    <MemoryRouter initialEntries={['/home']}>
      <div style={{ width: `${viewportWidth}px` }}>
        <ManagerSellerParityHomeCanonical data={data} alerts={[]} />
        <LocationProbe />
      </div>
    </MemoryRouter>,
  )
}

function LocationProbe() {
  const location = useLocation()

  return <output data-testid="current-location">{location.pathname}{location.search}</output>
}

function captureUnexpectedConsole() {
  const messages: string[] = []
  const push = (channel: 'error' | 'warn', args: unknown[]) => {
    messages.push(`${channel}: ${args.map(arg => String(arg)).join(' ')}`)
  }

  vi.spyOn(console, 'error').mockImplementation((...args) => {
    push('error', args)
  })
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    push('warn', args)
  })

  return messages
}

function getChartSurface(root: ParentNode) {
  const surface = root.querySelector('.recharts-surface')
  expect(surface).toBeTruthy()
  return surface as SVGElement
}

function readNumericAttribute(element: Element, name: string) {
  return Number(element.getAttribute(name))
}

function emitResizeObservers() {
  for (const observer of resizeObservers) {
    observer.emit()
  }
}

function resolveWidth(element: HTMLElement | null): number {
  if (!element) return 0

  const inlineWidth = parsePixels(element.style.width)
  if (inlineWidth !== null) return inlineWidth

  if (element.parentElement) return resolveWidth(element.parentElement)

  return 0
}

function resolveHeight(element: HTMLElement | null): number {
  if (!element) return 0

  const inlineHeight = parsePixels(element.style.height)
  if (inlineHeight !== null) return inlineHeight

  if (element.className.includes('h-64')) return 256
  if (element.parentElement) return resolveHeight(element.parentElement)

  return 0
}

function parsePixels(value: string | null | undefined) {
  if (!value) return null
  const match = value.match(/^(\d+(?:\.\d+)?)px$/)
  return match ? Number(match[1]) : null
}

class FakeResizeObserver {
  private callback: ResizeObserverCallback
  private target: Element | null = null

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    resizeObservers.add(this)
  }

  observe = (target: Element) => {
    this.target = target
  }

  unobserve = (target: Element) => {
    if (this.target === target) this.target = null
  }

  disconnect = () => {
    this.target = null
    resizeObservers.delete(this)
  }

  emit = () => {
    if (!this.target) return

    const width = resolveWidth(this.target as HTMLElement)
    const height = resolveHeight(this.target as HTMLElement)

    this.callback(
      [{
        borderBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
        contentBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
        contentRect: {
          bottom: height,
          height,
          left: 0,
          right: width,
          top: 0,
          width,
          x: 0,
          y: 0,
          toJSON: () => undefined,
        } as DOMRectReadOnly,
        devicePixelContentBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
        target: this.target,
      }],
      this as unknown as ResizeObserver,
    )
  }
}

function buildOfficialSources() {
  return {
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
  }
}

function buildData() {
  return {
    selectedStoreId: 'store-1',
    sellers: [seller(1, 'MaximilianoExtenso da Silva'), seller(2, 'BeatrizMuitoLonga Almeida')],
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

function seller(index: number, name: string) {
  return {
    id: `seller-${index}`,
    name,
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

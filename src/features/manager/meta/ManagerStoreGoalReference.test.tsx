import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ManagerStoreGoalReference } from './ManagerStoreGoalReference'

afterEach(cleanup)

function dashboardData() {
  return {
    referenceDate: '2026-07-15',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    setViewMode: vi.fn(),
    setStartDate: vi.fn(),
    setEndDate: vi.fn(),
    handleRefresh: vi.fn(),
    isRefetching: false,
    operationalMetaRules: { projection_mode: 'calendar' },
    checkins: [{
      seller_user_id: 'ana', reference_date: '2026-07-15',
      vnd_porta_prev_day: 1, vnd_cart_prev_day: 0, vnd_net_prev_day: 0,
      agd_cart_today: 0, agd_net_today: 0, visit_prev_day: 0,
    }],
    metrics: {
      // These cases cover period loading, tables and contextual actions. Keep
      // the unrelated chart out of this fixture without globally mocking Recharts.
      goalValue: 0,
      totalSales: 1,
      ranking: [{
        user_id: 'ana', user_name: 'Ana', vnd_total: 1, meta: 20,
        routine_execution: 80,
      }],
    },
  } as never
}

describe('ManagerStoreGoalReference Base44 parity', () => {
  it('loads the full selected month so the Base44 projection has future dates to draw', () => {
    const data = dashboardData() as unknown as { setStartDate: ReturnType<typeof vi.fn>; setEndDate: ReturnType<typeof vi.fn> }
    render(<MemoryRouter><ManagerStoreGoalReference data={data as never} /></MemoryRouter>)

    expect(data.setStartDate).toHaveBeenCalledWith('2026-07-01')
    expect(data.setEndDate).toHaveBeenCalledWith('2026-07-31')
  })

  it('renders Base44 contribution and channel tables instead of generic summary cards', () => {
    render(<MemoryRouter><ManagerStoreGoalReference data={dashboardData()} /></MemoryRouter>)

    for (const header of ['Vendedor', 'Realizado', 'Meta prop.', 'Resultado', 'Faltam', 'Projeção', 'Consistência', 'Ação']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeTruthy()
    }
    for (const header of ['Canal', 'Oportunidades', 'Vendas', 'Conversão', 'Participação', 'Para 1 venda', 'Situação']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeTruthy()
    }
  })

  it('opens the three Base44 contextual actions for a seller', async () => {
    render(<MemoryRouter><ManagerStoreGoalReference data={dashboardData()} /></MemoryRouter>)

    const actions = screen.getByRole('button', { name: 'Ações para Ana' })
    await act(async () => {
      fireEvent.pointerDown(actions, { button: 0, ctrlKey: false })
      fireEvent.click(actions)
    })

    expect(screen.getByRole('menuitem', { name: 'Ver perfil' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Ver rotina' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Registrar orientação' })).toBeTruthy()
  })
})

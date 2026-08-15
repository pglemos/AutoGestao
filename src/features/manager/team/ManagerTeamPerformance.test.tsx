import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ManagerTeamPerformance } from './ManagerTeamPerformance'

afterEach(() => cleanup())

function dashboardData(loading: boolean, ranking = []) {
  return {
    loading,
    referenceDate: '2026-07-14',
    startDate: '2026-07-01',
    endDate: '2026-07-14',
    setViewMode: vi.fn(),
    setStartDate: vi.fn(),
    setEndDate: vi.fn(),
    selectedStoreId: 'store-1',
    metrics: { ranking },
  } as never
}

describe('ManagerTeamPerformance loading state', () => {
  test('não exibe vazio de vendedores enquanto as consultas ainda carregam', () => {
    render(
      <MemoryRouter>
        <ManagerTeamPerformance data={dashboardData(true)} storeName="Matriz" />
      </MemoryRouter>,
    )

    const region = screen.getByRole('region', { name: 'Performance da equipe' })
    expect(region).toHaveAttribute('aria-busy', 'true')
    expect(region).toHaveClass('flex', 'flex-col', 'gap-5')
    expect(region).not.toHaveClass('min-h-full')
    expect(region).not.toHaveClass('bg-gray-50')
    expect(screen.getByRole('region', { name: 'Carregando coluna Críticos' })).toBeTruthy()
    expect(screen.queryByText('Nenhum vendedor vinculado a este gerente.')).toBeNull()
  })

  test('mantém o estado vazio explícito quando a consulta terminou sem vendedores', () => {
    render(
      <MemoryRouter>
        <ManagerTeamPerformance data={dashboardData(false)} storeName="Matriz" />
      </MemoryRouter>,
    )

    expect(screen.getByText('Nenhum vendedor vinculado a este gerente.')).toBeTruthy()
  })

  test('reproduz o estado vazio usando o EmptyState canônico', () => {
    render(
      <MemoryRouter>
        <ManagerTeamPerformance data={dashboardData(false)} storeName="Matriz" />
      </MemoryRouter>,
    )

    const message = screen.getByText('Nenhum vendedor vinculado a este gerente.')
    const emptyState = message.closest('[data-mx-empty]')
    expect(emptyState).toBeTruthy()
    expect(emptyState).toHaveAttribute('data-mx-empty', 'dataset')
  })
})

describe('ManagerTeamPerformance Base44 parity', () => {
  test('usa a tipografia, controles e raios da referência na composição renderizada', () => {
    render(
      <MemoryRouter>
        <ManagerTeamPerformance
          data={dashboardData(false, [{
            user_id: 'seller-1', user_name: 'Vendedor MX', is_venda_loja: false,
            vnd_total: 0, leads: 0, agd_total: 0, visitas: 0, meta: 10,
            atingimento: 0, projecao: 0, ritmo: 0, efficiency: 0,
            status: { label: '', color: '' }, gap: 10, position: 1,
            routine_execution: null, discipline_score: null,
          }])}
          storeName="Matriz"
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('region', { name: 'Performance da equipe' })).toHaveClass('font-reference-sans')
    expect(screen.getByPlaceholderText('Vendedor...')).toHaveClass('w-44', 'rounded-xl', 'font-normal')
    expect(screen.getByRole('region', { name: 'Visão do Kanban' })).toHaveClass('rounded-2xl')
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true')
  })
})

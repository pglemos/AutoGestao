import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'

const setPeriodo = mock(() => undefined)
const handleRefresh = mock(async () => undefined)

mock.module('@/features/ranking/hooks/useStoreRankingPageData', () => ({
  RANKING_PERIODOS: ['Mensal', 'Trimestral', 'Semestral', 'Anual'],
  useStoreRankingPageData: () => ({
    loading: false,
    error: null,
    periodo: 'Mensal',
    setPeriodo,
    unidade: 'todas',
    setUnidade: mock(() => undefined),
    unidades: [],
    isRefetching: false,
    handleRefresh,
    vendedores: [],
    top3: [],
    posicao: 0,
    totalVendedores: 0,
    atingimento: 0,
    faltamValor: null,
    euVendedor: null,
    metaPeriodo: 0,
    meuId: 'manager-1',
    profile: { id: 'manager-1', name: 'Gerente' },
  }),
}))

const { ManagerRankingReference } = await import('./ManagerRankingReference')

afterEach(() => {
  cleanup()
  setPeriodo.mockClear()
  handleRefresh.mockClear()
})

describe('ManagerRankingReference', () => {
  test('expõe os quatro períodos e não fabrica zeros quando não existe base oficial', () => {
    render(<ManagerRankingReference />)

    for (const periodo of ['Mensal', 'Trimestral', 'Semestral', 'Anual']) {
      expect(screen.getByRole('button', { name: periodo, exact: true })).toBeInTheDocument()
    }
    expect(screen.getAllByText('Sem dados oficiais').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('0 vendas')).toBeNull()
    expect(screen.queryByText('0%')).toBeNull()
    expect(screen.getByText(/Fórmula provisória aguardando decisão do Dono/i)).toBeInTheDocument()
  })

  test('identifica os campos de filtro para acessibilidade e autofill', () => {
    render(<ManagerRankingReference />)

    expect(screen.getByLabelText('Mês de referência do período')).toHaveAttribute('name', 'referenceMonth')
    expect(screen.getByLabelText('Critério do ranking')).toHaveAttribute('name', 'criterion')
  })
})

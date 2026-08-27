import React from 'react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

const setPeriodo = mock(() => {})
const setUnidade = mock((value: string) => {
  storeRankingData.unidade = value
  storeRankingData.vendedores = allVendedores.filter(v => value === 'todas' || v.unidade === value)
  storeRankingData.top3 = storeRankingData.vendedores.slice(0, 3)
  storeRankingData.totalVendedores = storeRankingData.vendedores.length
})

const allVendedores = [
  { id: 'seller-1', nome: 'Lucas Vendedor', foto: null, unidade: 'Centro', vendas: 18, meta: 30, atingimento: 60 },
  { id: 'seller-2', nome: 'Ana Loja Norte', foto: null, unidade: 'Norte', vendas: 12, meta: 30, atingimento: 40 },
  // Sem meta individual: a tela não pode fabricar 0% nem "Abaixo do esperado".
  { id: 'seller-3', nome: 'Bruno Centro', foto: null, unidade: 'Centro', vendas: 9, meta: null, atingimento: null },
]

let storeRankingData = {
  loading: false,
  error: null as string | null,
  periodo: 'Mensal' as const,
  setPeriodo,
  unidade: 'todas',
  setUnidade,
  unidades: ['Centro', 'Norte'],
  isRefetching: false,
  handleRefresh: mock(async () => {}),
  vendedores: allVendedores,
  top3: allVendedores.slice(0, 3),
  posicao: 1,
  totalVendedores: allVendedores.length,
  atingimento: 60,
  faltamValor: null as number | null,
  euVendedor: allVendedores[0],
  metaPeriodo: 90,
  minhaMeta: 30,
  metaCorrida: 30,
  lastUpdatedAt: new Date('2026-08-27T12:00:00Z'),
  rankingEntries: [] as { user_id: string }[],
  individualGoalMode: 'even' as string | null,
  meuId: 'seller-1',
  profile: { id: 'seller-1', name: 'Lucas Vendedor' },
}

mock.module('@/features/ranking/hooks/useStoreRankingPageData', () => ({
  RANKING_PERIODOS: ['Mensal', 'Trimestral', 'Semestral', 'Anual'],
  useStoreRankingPageData: () => storeRankingData,
}))

const { StoreRankingView } = await import('./StoreRankingView')
const { MemoryRouter } = await import('react-router-dom')

function renderView() {
  return render(<MemoryRouter><StoreRankingView /></MemoryRouter>)
}

afterEach(() => {
  cleanup()
  setPeriodo.mockClear()
  setUnidade.mockClear()
  storeRankingData = {
    ...storeRankingData,
    unidade: 'todas',
    vendedores: allVendedores,
    top3: allVendedores.slice(0, 3),
    totalVendedores: allVendedores.length,
  }
})

describe('StoreRankingView', () => {
  it('renders period tabs, unit filter, ordering notice and sections', () => {
    renderView()

    expect(screen.getByRole('heading', { name: 'Ranking' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Período do ranking' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mensal' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Trimestral' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('Filtrar por unidade')).toBeInTheDocument()
    expect(screen.getByText(/Ordenado por volume de vendas/i)).toBeInTheDocument()
    expect(screen.getByText('Pódio do Período')).toBeInTheDocument()
    expect(screen.getByText('Sua posição')).toBeInTheDocument()
    expect(screen.getByText('Corrida do Período')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atualizar ranking' })).toBeInTheDocument()
  })

  it('never fabricates an attainment for a seller without an individual goal', () => {
    renderView()

    const linha = screen.getByRole('button', { name: 'Bruno Centro' }).closest('tr')
    expect(linha).not.toBeNull()
    expect(within(linha as HTMLElement).getByText('Sem meta definida')).toBeInTheDocument()
    expect(within(linha as HTMLElement).queryByText('Abaixo do esperado')).toBeNull()
    expect(within(linha as HTMLElement).queryByText('0%')).toBeNull()
  })

  it('hides the ordering notice when the store has no individual goal rule', () => {
    storeRankingData.individualGoalMode = null
    renderView()
    expect(screen.queryByText(/Ordenado por volume de vendas/i)).toBeNull()
    storeRankingData.individualGoalMode = 'even'
  })

  it('offers a retry when the ranking fails to load', () => {
    storeRankingData.error = 'Não foi possível carregar os lançamentos do ranking.'
    renderView()
    const retry = screen.getByRole('button', { name: /Tentar novamente/i })
    fireEvent.click(retry)
    expect(storeRankingData.handleRefresh).toHaveBeenCalled()
    storeRankingData.error = null
  })
})

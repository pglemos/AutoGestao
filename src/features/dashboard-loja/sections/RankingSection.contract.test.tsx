import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import type { RankingEntry } from '@/types/database'
import type { ViewMode } from '../hooks/useDashboardLojaData'

let saleResult: { data: Record<string, unknown>[] | null; error: { message: string } | null } = { data: [], error: null }
let lastSalesOrFilter = ''

const salesBuilder = {
  select: () => salesBuilder,
  eq: () => salesBuilder,
  gte: () => salesBuilder,
  lte: () => salesBuilder,
  or: (filter: string) => { lastSalesOrFilter = filter; return salesBuilder },
  order: async () => saleResult,
}

globalThis.getComputedStyle ||= (() => ({ animationName: 'none' })) as unknown as typeof getComputedStyle
globalThis.MutationObserver ||= class {
  observe() {}
  disconnect() {}
  takeRecords() { return [] }
} as unknown as typeof MutationObserver

mock.module('@/lib/supabase', () => ({
  supabase: { from: () => salesBuilder },
}))

const { RankingSection } = await import('./RankingSection')

const seller: RankingEntry = {
  user_id: 'seller-a',
  user_name: 'Ana Souza',
  avatar_url: null,
  is_venda_loja: false,
  vnd_total: 4,
  meta: 10,
  leads: 6,
  agd_total: 5,
  visitas: 7,
  atingimento: 40,
  projecao: 8,
}

const props = {
  viewMode: 'month' as ViewMode,
  ranking: [seller],
  mixCanais: [{ label: 'Porta', color: 'bg-brand-primary', pct: 50, tone: 'brand' as const }],
  diagnostics: { diagnostico: 'Diagnóstico da unidade.', sugestao: 'Reforçar fechamento.' },
  storeId: 'loja-1',
  periodStartDate: '2026-08-01',
  periodEndDate: '2026-08-12',
}

function openSellerModal() {
  render(
    <MemoryRouter>
      <RankingSection {...props} />
    </MemoryRouter>,
  )
  fireEvent.click(screen.getAllByTitle('Ver detalhes de Ana Souza')[0])
  return screen.getByRole('dialog')
}

describe('contrato RankingSection — modal canônico (C4-2)', () => {
  beforeEach(() => {
    cleanup()
    saleResult = { data: [], error: null }
    lastSalesOrFilter = ''
  })
  afterEach(() => cleanup())

  it('usa a família Modal canônica, sem overlay customizado no fonte', () => {
    const source = readFileSync(new URL('./RankingSection.tsx', import.meta.url), 'utf8')
    expect(source).toContain("from '@/components/organisms/Modal'")
    expect(source).toMatch(/<Modal\b/)
    expect(source).not.toMatch(/fixed inset-0/)
    expect(source).not.toMatch(/max-h-\[90vh\]/)
    expect(source).not.toContain('aria-modal')
  })

  it('abre o detalhe do vendedor no overlay canônico com textos preservados', async () => {
    const dialog = openSellerModal()
    expect(dialog).toHaveAttribute('data-mx-overlay', 'modal')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(dialog.querySelector('[data-mx-overlay-body="true"]')).not.toBeNull()
    expect(within(dialog).getByText('Ana Souza')).toBeInTheDocument()
    expect(within(dialog).getByText('Período: 01/08/2026 — 12/08/2026')).toBeInTheDocument()
    expect(within(dialog).getByText('Vendas')).toBeInTheDocument()
    expect(within(dialog).getByText('Meta')).toBeInTheDocument()
    expect(within(dialog).getByText('Atingimento')).toBeInTheDocument()
    expect(within(dialog).getByText('Leads')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar modal' })).toHaveClass('mx-overlay-close')
    await waitFor(() => expect(within(dialog).getByText('Vendas registradas (0)')).toBeInTheDocument())
    expect(lastSalesOrFilter).toContain('data_competencia.is.null,data_evento.gte.2026-08-01T00:00:00-03:00,data_evento.lt.2026-08-13T03:00:00.000Z')
  })

  it('renderiza a lista de vendas retornada pelo supabase', async () => {
    saleResult = {
      data: [
        {
          id: 'venda-1',
          data_evento: '2026-08-10T12:00:00Z',
          data_competencia: '2026-08-01',
          canal: 'ativo',
          oportunidade_id: 'op-1',
          oportunidades: {
            etapa: 'fechamento',
            valor_negociado: 45000,
            veiculo_interesse: 'HB20',
            placa_veiculo: 'ABC-1234',
            tipo_veiculo: 'Carro',
            clientes: { nome: 'João Silva' },
          },
        },
      ],
      error: null,
    }
    const dialog = openSellerModal()
    await waitFor(() => expect(within(dialog).getByText('Vendas registradas (1)')).toBeInTheDocument())
    expect(within(dialog).getByText('HB20')).toBeInTheDocument()
    expect(within(dialog).getByText('ABC-1234')).toBeInTheDocument()
    expect(within(dialog).getByText('Carteira (Ativo)')).toBeInTheDocument()
    expect(within(dialog).getByText('Cliente: João Silva')).toBeInTheDocument()
  })

  it('mostra estado de erro do fetch dentro do overlay canônico', async () => {
    saleResult = { data: null, error: { message: 'Falha ao carregar vendas' } }
    const dialog = openSellerModal()
    await waitFor(() => expect(within(dialog).getByText('Falha ao carregar vendas')).toBeInTheDocument())
  })

  it('mostra estado vazio dentro do overlay canônico', async () => {
    const dialog = openSellerModal()
    await waitFor(() =>
      expect(within(dialog).getByText('Nenhuma venda encontrada neste período.')).toBeInTheDocument(),
    )
  })

  it('fecha pelo close canônico e desmonta o diálogo', async () => {
    openSellerModal()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

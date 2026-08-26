import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { VendaLoja } from './hooks/useVendasLoja'

const cancelarVenda = mock(async () => ({ error: null as string | null }))
const refetch = mock(async () => undefined)

const orphanSale: VendaLoja = {
  id: 'event-orphan-1',
  event_id: 'event-orphan-1',
  oportunidade_id: null,
  cliente_id: 'client-1',
  cliente_nome: 'Cliente Órfão',
  veiculo_interesse: 'SUV Turbo',
  valor_negociado: 85000.5,
  etapa: 'ganho',
  seller_user_id: 'seller-1',
  seller_nome: 'Vendedor',
  competencia: '2026-08-23',
  closed_at: null,
  cancelada_em: null,
  motivo_cancelamento: null,
}

mock.module('./hooks/useVendasLoja', () => ({
  useVendasLoja: () => ({
    vendas: [orphanSale],
    loading: false,
    error: null,
    refetch,
    cancelarVenda,
  }),
}))

mock.module('@/lib/toast', () => ({
  toast: {
    error: mock(() => undefined),
    success: mock(() => undefined),
  },
}))

const { VendasFechadasLoja } = await import('./VendasFechadasLoja')

afterEach(() => cleanup())
beforeEach(() => {
  cancelarVenda.mockClear()
  refetch.mockClear()
})

describe('vendas fechadas da loja', () => {
  test('mostra e cancela venda órfã usando o evento oficial', async () => {
    render(<VendasFechadasLoja storeId="store-1" />)

    expect(screen.getByText('Cliente Órfão')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar venda de Cliente Órfão' }))

    expect(screen.getByRole('dialog', { name: 'Cancelar venda' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Motivo do cancelamento *'), {
      target: { value: 'Cliente desistiu após aprovação.' },
    })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar venda' }).at(-1)!)

    await waitFor(() => expect(cancelarVenda).toHaveBeenCalledWith({
      oportunidadeId: null,
      eventoId: 'event-orphan-1',
    }, 'Cliente desistiu após aprovação.'))
  })
})

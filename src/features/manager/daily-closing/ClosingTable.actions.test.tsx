import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ClosingTable } from './ManagerDailyClosing.container'

afterEach(() => cleanup())

/**
 * Atalhos por linha portados da `TabelaMovimento` do Base44: quem não entregou
 * é cobrado dali mesmo, quem entregou tem a correção de leads a um clique, e a
 * regularização pendente continua decidida na linha.
 */
function renderTable(rows: unknown[], overrides: Record<string, unknown> = {}) {
  const props = {
    rows,
    requests: [],
    onReview: vi.fn(),
    onOpenAgenda: vi.fn(),
    onOpenDetails: vi.fn(),
    onRemind: vi.fn(),
    onCorrectLeads: vi.fn(),
    ...overrides,
  }
  render(<ClosingTable {...(props as never)} />)
  return props
}

const seller = { id: 'seller-1', name: 'JOSÉ SILVA' }
const checkin = { id: 'checkin-1', seller_user_id: 'seller-1', submitted_at: null, pontuacao_disciplina_final: 80 }

describe('ClosingTable — ações por linha', () => {
  test('vendedor pendente ganha o botão Cobrar, ligado ao próprio vendedor', () => {
    const props = renderTable([{ seller, checkin: undefined, status: 'Pendente' }])

    fireEvent.click(screen.getByRole('button', { name: 'Cobrar fechamento de JOSÉ SILVA' }))

    expect(props.onRemind).toHaveBeenCalledWith(seller)
    expect(screen.queryByText('Somente consulta')).not.toBeInTheDocument()
  })

  test('vendedor que entregou ganha o atalho de correção de leads com o próprio fechamento', () => {
    const props = renderTable([{ seller, checkin, status: 'Finalizado' }])

    fireEvent.click(screen.getByRole('button', { name: 'Corrigir leads de JOSÉ SILVA' }))

    expect(props.onCorrectLeads).toHaveBeenCalledWith({ seller, checkin })
  })

  test('regularização pendente continua decidida na linha, sem virar cobrança', () => {
    const request = { id: 'req-1', seller_id: 'seller-1' }
    const props = renderTable(
      [{ seller, checkin, status: 'Aguardando aprovação' }],
      { requests: [request] },
    )

    fireEvent.click(screen.getByRole('button', { name: /Aprovar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Recusar/ }))

    expect(props.onReview).toHaveBeenNthCalledWith(1, request, 'approve')
    expect(props.onReview).toHaveBeenNthCalledWith(2, request, 'reject')
    expect(screen.queryByRole('button', { name: /Cobrar fechamento/ })).not.toBeInTheDocument()
  })

  test('linha sem fechamento e sem status pendente permanece somente consulta', () => {
    renderTable([{ seller, checkin: undefined, status: 'Fora do horário' }])

    expect(screen.getByText('Somente consulta')).toBeInTheDocument()
  })
})

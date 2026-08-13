import { type RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { TransferConfirmationDialog, type TransferConfirmationData } from './TransferConfirmationDialog'

const onCloseMock = mock(() => {})
const onConfirmMock = mock(() => {})

const data: TransferConfirmationData = {
  existingUser: {
    id: 'u-1',
    name: 'João Silva',
    email: 'joao@mx.com',
    current_store_id: 'loja-1',
    current_store_name: 'Loja Centro',
  },
  targetStoreName: 'Loja Norte',
  onConfirm: onConfirmMock,
}

function renderDialog(overrides: Record<string, unknown> = {}) {
  return render(
    <TransferConfirmationDialog
      data={data}
      isOpen
      onClose={onCloseMock}
      loading={false}
      {...overrides}
    />,
  )
}

describe('contrato TransferConfirmationDialog — AlertDialog canônico (C4-5)', () => {
  beforeEach(() => {
    cleanup()
    onCloseMock.mockClear()
    onConfirmMock.mockClear()
  })
  afterEach(() => cleanup())

  it('usa a família AlertDialog canônica, sem overlay customizado no fonte', () => {
    const source = readFileSync(new URL('./TransferConfirmationDialog.tsx', import.meta.url), 'utf8')
    expect(source).toContain("from '@/components/ui/alert-dialog'")
    expect(source).toMatch(/<AlertDialog\b/)
    expect(source).not.toMatch(/fixed inset-0/)
    expect(source).not.toContain('AnimatePresence')
    expect(source).not.toContain('aria-modal')
  })

  it('abre o alertdialog canônico com markers, título e ações', () => {
    renderDialog()
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('data-mx-overlay', 'alert-dialog')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(screen.getByText('Transferir integrante de loja?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirmar Transferência' })).toBeInTheDocument()
  })

  it('mantém o ref funcional no conteúdo', () => {
    const ref = { current: null } as RefObject<HTMLDivElement | null>
    renderDialog({ dialogRef: ref })
    expect(ref.current).toBeTruthy()
  })

  it('preserva textos do vínculo e da transferência', () => {
    renderDialog()
    expect(screen.getByText('Vínculo ativo identificado em outra unidade')).toBeInTheDocument()
    expect(screen.getByText('joao@mx.com')).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getAllByText('Loja Centro').length).toBeGreaterThan(0)
    expect(
      screen.getAllByText((content, node) =>
        Boolean(node?.textContent?.includes('Deseja encerrar o vínculo na loja Loja Centro e transferi-lo para a loja Loja Norte')),
      ).length,
    ).toBeGreaterThan(0)
  })

  it('fecha via Cancelar chamando onClose', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('confirma: chama onConfirm e mantém o diálogo aberto (fluxo async do parent)', () => {
    renderDialog()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Transferência' }))
    expect(onConfirmMock).toHaveBeenCalledTimes(1)
    expect(onCloseMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('desabilita os botões durante loading', () => {
    renderDialog({ loading: true })
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Confirmar Transferência' })).toBeDisabled()
  })

  it('não renderiza quando fechado ou sem dados', () => {
    const { rerender } = renderDialog({ isOpen: false })
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    rerender(<TransferConfirmationDialog data={null} isOpen onClose={onCloseMock} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})

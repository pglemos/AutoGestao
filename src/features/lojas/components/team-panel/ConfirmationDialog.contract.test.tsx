import { useRef, useState, type RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { ConfirmationDialog, type PendingConfirmation } from './ConfirmationDialog'

const onConfirmMock = mock(() => {})
const onDismissMock = mock(() => {})
const pending: PendingConfirmation = {
  key: 'k-1',
  title: 'Remover integrante?',
  description: 'Esta ação não pode ser desfeita.',
  label: 'Remover',
  onConfirm: onConfirmMock,
}

function Harness({ initial }: { initial: PendingConfirmation | null }) {
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(initial)
  const ref = useRef<HTMLDivElement | null>(null)
  return (
    <ConfirmationDialog
      pendingConfirmation={pendingConfirmation}
      confirmDialogRef={ref}
      onDismiss={(key) => {
        onDismissMock(key)
        setPendingConfirmation(null)
      }}
    />
  )
}

const ref: { current: HTMLDivElement | null } = { current: null }

describe('contrato ConfirmationDialog — AlertDialog canônico (C4-4)', () => {
  beforeEach(() => {
    cleanup()
    onConfirmMock.mockClear()
    onDismissMock.mockClear()
  })
  afterEach(() => cleanup())

  it('usa a família AlertDialog canônica, sem overlay customizado no fonte', () => {
    const source = readFileSync(new URL('./ConfirmationDialog.tsx', import.meta.url), 'utf8')
    expect(source).toContain("from '@/components/ui/alert-dialog'")
    expect(source).toMatch(/<AlertDialog\b/)
    expect(source).not.toMatch(/fixed inset-0/)
    expect(source).not.toContain('AnimatePresence')
    expect(source).not.toContain('aria-modal')
  })

  it('abre o alertdialog canônico com título, descrição, ações e ref no conteúdo', () => {
    render(<ConfirmationDialog pendingConfirmation={pending} confirmDialogRef={ref as RefObject<HTMLDivElement | null>} onDismiss={onDismissMock} />)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('data-mx-overlay', 'alert-dialog')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(screen.getByText('Remover integrante?')).toBeInTheDocument()
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument()
    expect(ref.current).toBeTruthy()
  })

  it('não renderiza nada quando não há confirmação pendente', () => {
    render(<ConfirmationDialog pendingConfirmation={null} confirmDialogRef={ref as RefObject<HTMLDivElement | null>} onDismiss={onDismissMock} />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('fecha via Cancelar chamando onDismiss com a key', async () => {
    render(<Harness initial={pending} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(onDismissMock).toHaveBeenCalledWith('k-1'))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('confirma: chama onDismiss com a key, executa onConfirm e fecha', async () => {
    render(<Harness initial={pending} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(onConfirmMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(onDismissMock).toHaveBeenCalledWith('k-1'))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })
})

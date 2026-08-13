import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { AlterarProximoPasso } from './AlterarProximoPasso'
import type { Cliente } from '@/lib/schemas/crm.schema'

const onCloseMock = mock(() => {})
const onSalvarMock = mock(async () => ({ error: null }))

const cliente = {
  id: 'cliente-1',
  nome: 'Lara Souza',
  proxima_acao: 'Confirmar orçamento',
  proxima_acao_em: '2026-08-20T15:30:00.000Z',
} as Cliente

function renderModal(overrides: Record<string, unknown> = {}) {
  return render(
    <AlterarProximoPasso
      open
      cliente={cliente}
      onClose={onCloseMock}
      onSalvar={onSalvarMock}
      {...overrides}
    />,
  )
}

describe('contrato AlterarProximoPasso — Modal canônico (C4-6)', () => {
  beforeEach(() => {
    cleanup()
    onCloseMock.mockClear()
    onSalvarMock.mockClear()
    onSalvarMock.mockImplementation(async () => ({ error: null }))
  })
  afterEach(() => cleanup())

  it('usa a família Modal canônica, sem geometria local de overlay', () => {
    const source = readFileSync(new URL('./AlterarProximoPasso.tsx', import.meta.url), 'utf8')
    expect(source).toContain("from '@/components/organisms/Modal'")
    expect(source).toMatch(/<Modal\b/)
    expect(source).not.toMatch(/fixed inset-0/)
    expect(source).not.toContain('aria-modal')
    expect(source).not.toContain('z-[var(--mx-z-modal')
    expect(source).not.toMatch(/<X\b/)
    expect(source).not.toContain('molecules/Card')
  })

  it('expõe o overlay canônico com camada, body e close padronizados', () => {
    renderModal()
    const dialog = screen.getByRole('dialog', { name: 'Alterar próximo passo' })
    expect(dialog).toHaveAttribute('data-mx-overlay', 'modal')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(dialog.querySelector('[data-mx-overlay-body="true"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Fechar modal' })).toHaveClass('mx-overlay-close')
  })

  it('preserva títulos, descrição e conteúdo do formulário', () => {
    renderModal()
    expect(screen.getByText('Alterar próximo passo')).toBeInTheDocument()
    expect(screen.getByText('Defina o que precisa acontecer para Lara evoluir.')).toBeInTheDocument()
    expect(screen.getByText('Sugestões')).toBeInTheDocument()
    expect(screen.getByText('Ligar para qualificar')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Descreva o próximo passo...')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('Confirmar orçamento')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar próximo passo' })).toBeInTheDocument()
  })

  it('inicializa data e horário a partir de proxima_acao_em', () => {
    renderModal()
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    const timeInput = document.querySelector('input[type="time"]') as HTMLInputElement
    expect(dateInput).not.toBeNull()
    expect(timeInput).not.toBeNull()
    expect(dateInput.value).toBe('2026-08-20')
    expect(timeInput.value).toBe('15:30')
  })

  it('salva o próximo passo com payload e fecha no sucesso', async () => {
    renderModal()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ligar agora' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar próximo passo' }))
    await waitFor(() => expect(onSalvarMock).toHaveBeenCalledTimes(1))
    expect(onSalvarMock).toHaveBeenCalledWith({
      proxima_acao: 'Ligar agora',
      proxima_acao_em: '2026-08-20T15:30:00',
    })
    await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1))
  })

  it('mostra estado de loading e desabilita durante o salvamento', async () => {
    let resolve!: (value: { error: string | null }) => void
    onSalvarMock.mockImplementation(
      () => new Promise<{ error: string | null }>((res) => { resolve = res }),
    )
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar próximo passo' }))
    expect(screen.getByText('Salvando...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    resolve({ error: null })
    await waitFor(() => expect(onCloseMock).toHaveBeenCalledTimes(1))
  })

  it('fecha via Cancelar chamando onClose', () => {
    renderModal()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })

  it('não renderiza quando fechado ou sem cliente', () => {
    const { rerender } = renderModal({ open: false })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<AlterarProximoPasso open cliente={null} onClose={onCloseMock} onSalvar={onSalvarMock} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

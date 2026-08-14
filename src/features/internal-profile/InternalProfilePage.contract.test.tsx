import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'

const changePasswordMock = mock(async () => ({ error: null }))
const toastSuccessMock = mock(() => {})
const toastErrorMock = mock(() => {})

globalThis.getComputedStyle ||= (() => ({ animationName: 'none' })) as unknown as typeof getComputedStyle
globalThis.MutationObserver ||= class {
  observe() {}
  disconnect() {}
  takeRecords() { return [] }
} as unknown as typeof MutationObserver

mock.module('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: { id: 'u-1', name: 'Ana MX', email: 'ana@mx.com', avatar_url: null },
    role: 'administrador_mx',
    updateProfile: mock(async () => ({ error: null })),
    changePassword: changePasswordMock,
    signOut: mock(() => {}),
  }),
}))
mock.module('@/lib/toast', () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}))

const { InternalProfilePage } = await import('./InternalProfilePage')

function openPasswordModal() {
  render(<InternalProfilePage />)
  fireEvent.click(screen.getByRole('button', { name: /alterar senha/i }))
  return screen.getByRole('dialog')
}

describe('contrato InternalProfilePage — modal de senha canônico (C4-3)', () => {
  beforeEach(() => {
    cleanup()
    changePasswordMock.mockClear()
    toastErrorMock.mockClear()
    toastSuccessMock.mockClear()
    changePasswordMock.mockImplementation(async () => ({ error: null }))
  })
  afterEach(() => cleanup())

  it('usa a família Modal canônica, sem overlay customizado no fonte', () => {
    const source = readFileSync(new URL('./InternalProfilePage.tsx', import.meta.url), 'utf8')
    expect(source).toContain("from '@/components/organisms/Modal'")
    expect(source).toMatch(/<Modal\b/)
    expect(source).not.toMatch(/fixed inset-0/)
    expect(source).not.toContain('aria-modal')
  })

  it('abre o modal de senha no overlay canônico com títulos, campos e ações', () => {
    const dialog = openPasswordModal()
    expect(dialog).toHaveAttribute('data-mx-overlay', 'modal')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(dialog.querySelector('[data-mx-overlay-body="true"]')).not.toBeNull()
    expect(within(dialog).getByText('Alterar senha')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Nova senha')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Confirmar senha')).toBeInTheDocument()
    expect(within(dialog).getByText('Cancelar')).toBeInTheDocument()
    expect(within(dialog).getByText('Atualizar senha')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar modal' })).toHaveClass('mx-overlay-close')
  })

  it('fecha via Cancelar e desmonta o diálogo', () => {
    openPasswordModal()
    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('valida senhas diferentes e mantém o diálogo aberto', async () => {
    const dialog = openPasswordModal()
    fireEvent.change(within(dialog).getByLabelText('Nova senha'), { target: { value: 'Forte@12345' } })
    fireEvent.change(within(dialog).getByLabelText('Confirmar senha'), { target: { value: 'Diferente@12345' } })
    fireEvent.click(within(dialog).getByText('Atualizar senha'))
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('As senhas não coincidem.'))
    expect(changePasswordMock).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('altera a senha no sucesso: chama changePassword, fecha e notifica', async () => {
    const dialog = openPasswordModal()
    fireEvent.change(within(dialog).getByLabelText('Nova senha'), { target: { value: 'Forte@12345' } })
    fireEvent.change(within(dialog).getByLabelText('Confirmar senha'), { target: { value: 'Forte@12345' } })
    fireEvent.click(within(dialog).getByText('Atualizar senha'))
    await waitFor(() => expect(changePasswordMock).toHaveBeenCalledTimes(1))
    expect(changePasswordMock).toHaveBeenCalledWith('Forte@12345')
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith('Senha alterada com sucesso.'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

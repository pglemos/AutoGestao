import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'

const suggestContentMock = mock(async () => ({ error: null }))
const toastErrorMock = mock(() => {})
const toastSuccessMock = mock(() => {})

globalThis.getComputedStyle ||= (() => ({ animationName: 'none' })) as unknown as typeof getComputedStyle
globalThis.MutationObserver ||= class {
  observe() {}
  disconnect() {}
  takeRecords() { return [] }
} as unknown as typeof MutationObserver

mock.module('@/hooks/useTrainings', () => ({
  useSuggestContent: () => ({ suggestContent: suggestContentMock }),
}))
mock.module('@/lib/toast', () => ({
  toast: { error: toastErrorMock, success: toastSuccessMock },
}))

const { ContentSuggestionDialog } = await import('./ContentSuggestionDialog')

function openDialog() {
  render(<ContentSuggestionDialog />)
  fireEvent.click(screen.getByRole('button', { name: /sugerir tema de aula/i }))
  return screen.getByRole('dialog')
}

describe('contrato ContentSuggestionDialog — overlay canônico (C4-1)', () => {
  beforeEach(() => {
    cleanup()
    suggestContentMock.mockClear()
    toastErrorMock.mockClear()
    toastSuccessMock.mockClear()
    suggestContentMock.mockImplementation(async () => ({ error: null }))
  })
  afterEach(() => cleanup())

  it('usa a família Modal canônica, sem overlay customizado no fonte', () => {
    const source = readFileSync(new URL('./ContentSuggestionDialog.tsx', import.meta.url), 'utf8')
    expect(source).toContain("from '@/components/organisms/Modal'")
    expect(source).toMatch(/<Modal\b/)
    expect(source).not.toMatch(/fixed inset-0/)
    expect(source).not.toMatch(/shadow-2xl/)
    expect(source).not.toContain('role="dialog"')
  })

  it('expõe o overlay canônico com camada, corpo de scroll e close padronizados', () => {
    const dialog = openDialog()
    expect(dialog).toHaveAttribute('data-mx-overlay', 'modal')
    expect(dialog).toHaveAttribute('data-mx-overlay-layer', 'modal')
    expect(dialog.querySelector('[data-mx-overlay-body="true"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Fechar modal' })).toHaveClass('mx-overlay-close')
  })

  it('preserva títulos, descrição e campos do formulário', () => {
    const dialog = openDialog()
    expect(within(dialog).getByText('Sugerir tema de aula')).toBeInTheDocument()
    expect(within(dialog).getByText('A sugestão será enviada para a curadoria do Admin MX.')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('combobox')).toHaveLength(1)
    expect(within(dialog).getByPlaceholderText('Ex.: Como melhorar a conversão de visitas')).toBeInTheDocument()
    expect(within(dialog).getByPlaceholderText('Descreva a dúvida ou situação prática.')).toBeInTheDocument()
    expect(within(dialog).getByText('Cancelar')).toBeInTheDocument()
    expect(within(dialog).getByText('Enviar sugestão')).toBeInTheDocument()
  })

  it('submete o formulário com o payload canônico e fecha no sucesso', async () => {
    const dialog = openDialog()
    fireEvent.change(within(dialog).getByPlaceholderText('Ex.: Como melhorar a conversão de visitas'), {
      target: { value: '  Aula sobre conversão  ' },
    })
    fireEvent.submit(dialog.querySelector('form') as HTMLFormElement)
    await waitFor(() => expect(suggestContentMock).toHaveBeenCalledTimes(1))
    expect(suggestContentMock).toHaveBeenCalledWith({
      theme: 'atendimento',
      title: 'Aula sobre conversão',
      description: null,
      priority: 'medium',
    })
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith('Sugestão enviada ao Admin MX.'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('mostra erro via toast e mantém o diálogo aberto', async () => {
    suggestContentMock.mockImplementation(async () => ({ error: 'Falha de rede' }))
    const dialog = openDialog()
    fireEvent.change(within(dialog).getByPlaceholderText('Ex.: Como melhorar a conversão de visitas'), {
      target: { value: 'Aula X' },
    })
    fireEvent.submit(dialog.querySelector('form') as HTMLFormElement)
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Falha de rede'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

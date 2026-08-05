import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Store } from '@/types/database'

const store = (overrides: Partial<Store> & Pick<Store, 'id' | 'name'>): Store => ({
  manager_email: null,
  legal_name: null,
  cnpj: null,
  address: null,
  administrative_phone: null,
  partners: [],
  parent_loja_id: null,
  active: true,
  source_mode: 'native_app',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
})

const matriz = store({ id: 'matriz', name: 'AG AUTOMÓVEIS', cnpj: '31.534.638/0001-36' })
const filial = store({
  id: 'filial',
  name: 'AG SUL',
  parent_loja_id: 'matriz',
  cnpj: '31.534.638/0002-17',
})
const solta = store({ id: 'solta', name: 'ACERTT' })

const setIsCreateModalOpen = mock(() => undefined)
const setEditingStore = mock(() => undefined)
const handleUnlinkBranch = mock(() => undefined)
const handleLinkExistingStore = mock(async () => undefined)

const baseState = {
  storeSlug: 'ag-automoveis',
  canManage: true,
  loading: false,
  error: null,
  matriz,
  branches: [filial],
  linkableStores: [solta],
  isCreateModalOpen: false,
  setIsCreateModalOpen,
  newStore: { name: '', manager_email: '' },
  setNewStore: () => undefined,
  creating: false,
  handleCreateBranch: async () => undefined,
  linkingStoreId: '',
  setLinkingStoreId: () => undefined,
  linking: false,
  handleLinkExistingStore,
  handleUnlinkBranch,
  editingStore: null,
  setEditingStore,
  savingStore: false,
  handleStoreUpdate: async () => undefined,
  hardDeleteStore: null,
  setHardDeleteStore: () => undefined,
  hardDeleteConfirmation: '',
  setHardDeleteConfirmation: () => undefined,
  hardDeleting: false,
  closeHardDeleteStore: () => undefined,
  confirmHardDeleteStore: async () => undefined,
  refetch: async () => undefined,
}

let state = baseState

mock.module('./useStoreBranches', () => ({ useStoreBranches: () => state }))

const { StoreBranches } = await import('./StoreBranches.container')

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/lojas/ag-automoveis/filiais']}>
      <StoreBranches />
    </MemoryRouter>,
  )

afterEach(() => {
  cleanup()
  setIsCreateModalOpen.mockClear()
  setEditingStore.mockClear()
  handleUnlinkBranch.mockClear()
  state = baseState
})

describe('tela de filiais da matriz', () => {
  it('anuncia a matriz da URL e lista as filiais vinculadas', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /Filiais de AG AUTOMÓVEIS/ })).toBeTruthy()
    expect(screen.getAllByText('AG SUL').length).toBeGreaterThan(0)
    expect(screen.getByText(/1 filial vinculada/)).toBeTruthy()
  })

  it('oferece criar, editar, desvincular e excluir para o Admin MX', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Nova filial/ }))
    expect(setIsCreateModalOpen).toHaveBeenCalled()

    // O DataGrid renderiza a linha em versão desktop e mobile — basta acionar uma.
    fireEvent.click(screen.getAllByRole('button', { name: /Editar cadastro de AG SUL/ })[0])
    expect(setEditingStore).toHaveBeenCalled()

    fireEvent.click(screen.getAllByRole('button', { name: /Desvincular AG SUL da matriz/ })[0])
    expect(handleUnlinkBranch).toHaveBeenCalled()

    expect(screen.getAllByRole('button', { name: /Excluir AG SUL definitivamente/ }).length).toBeGreaterThan(0)
  })

  it('esconde as ações de escrita de quem não é Admin MX', () => {
    state = { ...baseState, canManage: false }
    renderPage()
    expect(screen.queryByRole('button', { name: /Nova filial/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Desvincular/ })).toBeNull()
    expect(screen.getByText(/visão é de leitura/)).toBeTruthy()
  })

  it('avisa quando a unidade da URL já é filial de outra loja', () => {
    state = {
      ...baseState,
      matriz: { ...matriz, parent_loja_id: 'outra' },
      branches: [],
      linkableStores: [],
    }
    renderPage()
    expect(screen.getByRole('alert').textContent).toContain('filial de outra loja')
    expect(screen.getByText(/Nenhuma filial vinculada/)).toBeTruthy()
  })

  it('mostra erro quando o slug não resolve nenhuma loja', () => {
    state = { ...baseState, matriz: null }
    renderPage()
    expect(screen.getByText(/Matriz não encontrada/)).toBeTruthy()
  })
})

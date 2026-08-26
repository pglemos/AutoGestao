import { isAdministradorMx, isPerfilInternoMx } from '@/lib/auth/roles'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const noop = mock(() => undefined)
let sellersError: string | null = null
let pdisError: string | null = null

mock.module('@/features/gerente-feedback/hooks/useStoreFeedback', () => ({
  useStoreFeedback: () => ({
    isLoading: false,
    error: 'Falha ao consultar feedbacks.',
    sellers: [],
    filteredFeedbacks: [],
    canCreateFeedback: false,
    showForm: false,
    saving: false,
    formData: {},
    setShowForm: noop,
    handleSubmit: noop,
    handleShareWhatsApp: noop,
  }),
}))

// `@/hooks/useAuth` reexporta `isAdministradorMx`/`isPerfilInternoMx` de
// `@/lib/auth/roles`. Substituí-las aqui não ficava contido neste arquivo: o
// `mock.module()` do Bun não é desfeito pelo `--isolate` e o override vazava
// para o módulo de origem, fazendo `isPerfilInternoMx('administrador_mx')`
// devolver false na suíte inteira — o DashboardHeader caía na ramificação
// errada. O mock passa a cobrir só o hook, que é o que este teste precisa.
mock.module('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: { id: 'manager-1' }, storeId: 'store-1' }),
  // Reexporta as funções REAIS: elas são puras e o teste não precisa alterá-las.
  isAdministradorMx,
  isPerfilInternoMx,
}))

mock.module('@/hooks/usePDI_MX', () => ({
  usePDI_MX: () => ({
    cargos: [],
    template: null,
    loading: false,
    fetchCargos: async () => [],
    fetchTemplate: async () => null,
    fetchSuggestedActions: async () => [],
    saveSessionBundle: async () => ({ id: null, error: null }),
  }),
  usePDISessions: () => ({
    pdis: [],
    loading: false,
    error: pdisError,
    refetch: noop,
  }),
}))

mock.module('@/hooks/useStores', () => ({
  useStores: () => ({ stores: [], lojas: [], loading: false }),
  useStoresStats: () => ({ stats: [], loading: false }),
  useSellersByStore: () => ({ sellers: [], loading: false, error: sellersError }),
  useAllSellers: () => ({ sellers: [], loading: false }),
}))

const { default: ManagerFeedbackReference } = await import('./ManagerFeedbackReference')
const { default: ManagerPDIReference } = await import('./ManagerPDIReference')

afterEach(cleanup)

describe('Manager development data error states', () => {
  test('exibe erro de Feedback sem mascará-lo como lista vazia', () => {
    render(
      <MemoryRouter>
        <ManagerFeedbackReference />
      </MemoryRouter>,
    )

    expect(screen.getByText('Não foi possível carregar os feedbacks.')).toBeTruthy()
    expect(screen.getByText('Tente novamente em alguns instantes ou contate o suporte.')).toBeTruthy()
    expect(screen.queryByText('Falha ao consultar feedbacks.')).toBeNull()
    expect(screen.queryByText('Nenhum feedback registrado no período.')).toBeNull()
  })

  test('exibe erro de PDI sem mascará-lo como equipe sem PDI', () => {
    pdisError = 'Falha ao consultar PDIs.'
    render(
      <MemoryRouter>
        <ManagerPDIReference />
      </MemoryRouter>,
    )

    expect(screen.getByText('Não foi possível carregar os PDIs.')).toBeTruthy()
    expect(screen.queryByText('Falha ao consultar PDIs.')).toBeNull()
    expect(screen.queryByText('Nenhum vendedor encontrado.')).toBeNull()
    pdisError = null
  })

  test('exibe erro de vendedores sem mascará-lo como equipe vazia', () => {
    pdisError = null
    sellersError = 'Falha ao consultar vendedores.'
    render(
      <MemoryRouter>
        <ManagerPDIReference />
      </MemoryRouter>,
    )

    expect(screen.getByText('Não foi possível carregar os vendedores.')).toBeTruthy()
    expect(screen.queryByText('Falha ao consultar vendedores.')).toBeNull()
    expect(screen.queryByText('Nenhum vendedor encontrado.')).toBeNull()
    sellersError = null
  })
})

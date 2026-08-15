import React from 'react'
import { afterEach, describe, expect, mock, test } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mutationError = new Error('Falha simulada de persistência')
const createClient = mock(async () => { throw mutationError })
const updateClient = mock(async () => { throw mutationError })
const updateMission = mock(async () => { throw mutationError })
const createHistory = mock(async () => ({}))
const createActivity = mock(async () => ({}))
const toast = mock(() => {})
const toastApi = { info: toast, error: toast, success: toast, warning: toast }
const sessionStorageMock = {
  getItem: mock(() => null),
  setItem: mock(() => {}),
  removeItem: mock(() => {}),
  clear: mock(() => {}),
  key: mock(() => null),
  length: 0,
}

Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: sessionStorageMock,
})

const cliente = {
  id: 'cliente-1',
  vendedor_id: 'seller-1',
  loja_id: 'loja-1',
  nome: 'Cliente Resiliência',
  whatsapp: '31999999999',
  telefone: '31999999999',
  momento: 'Novo contato',
  situacao_atual: 'Lead sem resposta',
  proximo_passo: 'Enviar primeira abordagem',
  temperatura: 'Morno',
  canal_comercial: 'Internet',
  canal_origem: 'Internet',
  veiculo_interesse: 'Onix',
}

mock.module('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mock(async () => ({ data: { success: true, text: 'Script de teste' }, error: null })),
    },
  },
}))

mock.module('@/api/base44Client', () => ({
  base44: {
    entities: {
      CarteiraCliente: {
        create: createClient,
        update: updateClient,
        get: mock(async () => cliente),
      },
      CarteiraHistorico: {
        filter: mock(async () => []),
        create: createHistory,
      },
      CarteiraMissao: { update: updateMission },
      AtividadeExecucao: { create: createActivity },
    },
  },
}))

mock.module('@/lib/toast', () => ({ toast: toastApi }))

const [
  { default: NovoClienteModal },
  { default: WhatsAppRoteiro },
  { default: FichaClienteSheet },
  { default: AlterarProximoPasso },
  { default: ExecucaoMissao },
] = await Promise.all([
  import('@/components/carteira/NovoClienteModal.jsx'),
  import('@/components/carteira/WhatsAppRoteiro.jsx'),
  import('@/components/carteira/FichaClienteSheet.jsx'),
  import('@/components/carteira/AlterarProximoPasso.jsx'),
  import('@/components/carteira/ExecucaoMissao.jsx'),
])

afterEach(() => {
  cleanup()
  toast.mockClear()
  createClient.mockClear()
  updateClient.mockClear()
  updateMission.mockClear()
  createHistory.mockClear()
  createActivity.mockClear()
})

describe('carteira mutation resilience', () => {
  test('new-client modal releases loading, preserves fields and surfaces failure', async () => {
    const onClose = mock(() => {})
    render(<NovoClienteModal open onClose={onClose} onCriado={() => {}} vendedorId="seller-1" />)

    fireEvent.change(screen.getByPlaceholderText('Nome completo'), { target: { value: 'Cliente preservado' } })
    fireEvent.change(screen.getByPlaceholderText('(11) 99999-9999'), { target: { value: '31988887777' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar cliente' }))

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(screen.getByPlaceholderText('Nome completo')).toHaveValue('Cliente preservado')
    expect(screen.getByRole('button', { name: 'Adicionar cliente' })).toBeEnabled()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('WhatsApp result keeps the dialog open and releases loading after rejection', async () => {
    const onClose = mock(() => {})
    render(
      <WhatsAppRoteiro
        open
        cliente={cliente}
        autoExpandirRegistro
        onClose={onClose}
        onResultadoRegistrado={() => {}}
      />,
    )

    fireEvent.click((await screen.findByText('Cliente respondeu')).closest('button') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado' }))

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Registrar resultado' })).toBeEnabled()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('client sheet keeps edit mode and releases loading when update fails', async () => {
    const onAtualizado = mock(() => {})
    render(
      <FichaClienteSheet
        clienteId={cliente.id}
        open
        onClose={() => {}}
        onAtualizado={onAtualizado}
        onExecutar={() => {}}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Editar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(screen.getByText('Editar informações')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
    expect(onAtualizado).not.toHaveBeenCalled()
  })

  test('next-step dialog preserves the choice and releases loading after rejection', async () => {
    const onSalvo = mock(() => {})
    render(
      <AlterarProximoPasso
        open
        cliente={cliente}
        pendencias={[]}
        onClose={() => {}}
        onSalvo={onSalvo}
      />,
    )

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-07-20' } })
    fireEvent.click(screen.getAllByText('Enviar primeira abordagem').at(-1)!.closest('button') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: 'Salvar próximo passo' }))

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(dateInput).toHaveValue('2026-07-20')
    expect(screen.getByRole('button', { name: 'Salvar próximo passo' })).toBeEnabled()
    expect(onSalvo).not.toHaveBeenCalled()
  })

  test('mission item does not advance local state when persistence fails', async () => {
    render(
      <ExecucaoMissao
        missao={{ id: 'missao-1', nome: 'Retomar leads', indice_atual: 0 }}
        clientes={[cliente, { ...cliente, id: 'cliente-2', nome: 'Segundo cliente' }]}
        onVoltar={() => {}}
        onConcluida={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Mensagem enviada →' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o progresso da missão')
    expect(screen.getByText('Cliente 1 de 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Mensagem enviada →' })).toBeEnabled()
  })

  test('the WhatsApp flow uses one transactional client mutation without a second history write', async () => {
    const onResultadoRegistrado = mock(() => {})
    updateClient.mockImplementationOnce(async (_id, payload) => ({ ...cliente, ...payload, persisted: true }))
    render(
      <WhatsAppRoteiro
        open
        cliente={cliente}
        autoExpandirRegistro
        onClose={() => {}}
        onResultadoRegistrado={onResultadoRegistrado}
      />,
    )

    fireEvent.click((await screen.findByText('Cliente respondeu')).closest('button') as HTMLButtonElement)
    fireEvent.click(screen.getByRole('button', { name: 'Registrar resultado' }))
    await waitFor(() => expect(updateClient).toHaveBeenCalledTimes(1))

    const [, payload] = updateClient.mock.calls[0]
    expect(payload.historico).toEqual(expect.objectContaining({
      tipo: 'Resultado registrado',
      resultado: 'Cliente respondeu',
    }))
    expect(createHistory).not.toHaveBeenCalled()
    expect(createActivity).not.toHaveBeenCalled()
    expect(onResultadoRegistrado).toHaveBeenCalledWith(expect.objectContaining({ persisted: true }))
  })
})

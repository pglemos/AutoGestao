import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'
import { writeSimulationContext } from '@/hooks/auth/authHelpers'

type RequestRecord = {
  table: string
  filters: Array<[string, unknown]>
}

let requests: RequestRecord[] = []
let tableData: Record<string, unknown> = {}
let rpcCalls: Array<{ functionName: string; args: unknown }> = []
let rpcOnCall: ((functionName: string, args: unknown) => Promise<unknown>) | null = null

function makeBuilder(table: string, fallbackData: unknown) {
  const record: RequestRecord = { table, filters: [] }
  requests.push(record)
  const data = tableData[table] ?? fallbackData
  const builder = {
    select: () => builder,
    eq: (column: string, value: unknown) => {
      record.filters.push([column, value])
      return builder
    },
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data, error: null }),
    then: (resolve: (value: { data: unknown; error: null }) => unknown, reject: (error: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve, reject),
  }
  return builder
}

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
      getUser: mock(async () => ({ data: { user: { id: 'admin-mx-1' } } })),
    },
    rpc: mock(async (functionName: string, args: unknown) => {
      rpcCalls.push({ functionName, args })
      return rpcOnCall
        ? rpcOnCall(functionName, args)
        : { data: { ok: true, cliente_id: 'client-sim-1' }, error: null }
    }),
    from: (table: string) => {
      if (table === 'usuarios') return makeBuilder(table, { role: 'vendedor' })
      return makeBuilder(table, [])
    },
  },
}))

const {
  buildRpcPayload,
  installCarteiraBase44Adapter,
  resolveCarteiraExecutionContext,
} = await import('./installCarteiraBase44Adapter')

afterAll(() => mock.restore())

beforeEach(() => {
  requests = []
  tableData = {}
  rpcCalls = []
  rpcOnCall = null
  window.sessionStorage.clear()
})

describe('Carteira adapter simulated seller scope', () => {
  test('adds the simulated store filter to every client read', async () => {
    writeSimulationContext({
      role: 'vendedor',
      sellerUserId: 'seller-sim-1',
      storeId: 'store-sim-1',
    })
    const base44 = { entities: {} } as { entities: Record<string, { filter?: (...args: unknown[]) => Promise<unknown> }> }

    installCarteiraBase44Adapter(base44)
    await base44.entities.CarteiraCliente?.filter?.()

    const clientsRequest = requests.find(request => request.table === 'clientes')
    expect(clientsRequest?.filters).toContainEqual(['seller_user_id', 'seller-sim-1'])
    expect(clientsRequest?.filters).toContainEqual(['loja_id', 'store-sim-1'])
  })

  test('aplica o mesmo escopo simulado ao histórico', async () => {
    writeSimulationContext({
      role: 'vendedor',
      sellerUserId: 'seller-sim-2',
      storeId: 'store-sim-2',
    })
    const base44 = { entities: {} } as { entities: Record<string, { filter?: (...args: unknown[]) => Promise<unknown> }> }

    installCarteiraBase44Adapter(base44)
    await base44.entities.CarteiraHistorico?.filter?.({ cliente_id: 'client-sim-2' })

    const historyRequest = requests.find(request => request.table === 'eventos_comerciais')
    expect(historyRequest?.filters).toContainEqual(['seller_user_id', 'seller-sim-2'])
    expect(historyRequest?.filters).toContainEqual(['loja_id', 'store-sim-2'])
    expect(historyRequest?.filters).toContainEqual(['cliente_id', 'client-sim-2'])
  })

  test('aplica o mesmo escopo simulado às missões', async () => {
    writeSimulationContext({
      role: 'vendedor',
      sellerUserId: 'seller-sim-3',
      storeId: 'store-sim-3',
    })
    const base44 = { entities: {} } as { entities: Record<string, { filter?: (...args: unknown[]) => Promise<unknown> }> }

    installCarteiraBase44Adapter(base44)
    await base44.entities.CarteiraMissao?.filter?.()

    const missionRequest = requests.find(request => request.table === 'carteira_missoes')
    expect(missionRequest?.filters).toContainEqual(['seller_user_id', 'seller-sim-3'])
    expect(missionRequest?.filters).toContainEqual(['loja_id', 'store-sim-3'])
  })

  test('mantém o contexto capturado quando a simulação muda após a resolução', async () => {
    writeSimulationContext({
      role: 'vendedor',
      sellerUserId: 'seller-before',
      storeId: 'store-before',
    })

    const context = await resolveCarteiraExecutionContext()
    writeSimulationContext({
      role: 'vendedor',
      sellerUserId: 'seller-after',
      storeId: 'store-after',
    })

    expect(buildRpcPayload({ nome: 'Cliente estável' }, null, context)).toMatchObject({
      acting_seller_user_id: 'seller-before',
      acting_store_id: 'store-before',
    })
  })

  test('não relê o contexto global quando o chamador informa execução não simulada', () => {
    writeSimulationContext({
      role: 'vendedor',
      sellerUserId: 'seller-stale',
      storeId: 'store-stale',
    })

    const payload = buildRpcPayload({ nome: 'Cliente administrativo' }, null, {
      authenticatedUserId: 'admin-mx-1',
      sellerUserId: 'admin-mx-1',
      storeId: null,
      isSimulation: false,
    })

    expect(payload).not.toHaveProperty('acting_seller_user_id')
    expect(payload).not.toHaveProperty('acting_store_id')
  })

  test('usa o contexto capturado também para hidratar o cliente após a RPC', async () => {
    writeSimulationContext({
      role: 'vendedor',
      sellerUserId: 'seller-before',
      storeId: 'store-before',
    })
    tableData.clientes = [{
      id: 'client-sim-1',
      seller_user_id: 'seller-before',
      loja_id: 'store-before',
      nome: 'Cliente hidratado',
      status: 'oportunidade',
      updated_at: '2026-08-04T12:00:00.000Z',
    }]
    rpcOnCall = async () => {
      writeSimulationContext({
        role: 'vendedor',
        sellerUserId: 'seller-after',
        storeId: 'store-after',
      })
      return { data: { ok: true, cliente_id: 'client-sim-1' }, error: null }
    }
    const base44 = { entities: {} } as {
      entities: Record<string, { create?: (data: unknown) => Promise<unknown> }>
    }

    installCarteiraBase44Adapter(base44)
    await base44.entities.CarteiraCliente?.create?.({ nome: 'Cliente hidratado' })

    const rpcPayload = (rpcCalls[0]?.args as { p_payload?: Record<string, unknown> }).p_payload
    expect(rpcPayload).toMatchObject({
      acting_seller_user_id: 'seller-before',
      acting_store_id: 'store-before',
    })
    const hydrationRequest = requests.find(request => request.table === 'clientes')
    expect(hydrationRequest?.filters).toContainEqual(['seller_user_id', 'seller-before'])
    expect(hydrationRequest?.filters).toContainEqual(['loja_id', 'store-before'])
  })
})

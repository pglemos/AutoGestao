import { afterAll, describe, expect, mock, test } from 'bun:test'

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
      getUser: mock(async () => ({ data: { user: null } })),
    },
  },
}))

const { buildArrivedVehiclePayload, buildRpcPayload, installCarteiraBase44Adapter } = await import('./installCarteiraBase44Adapter')

afterAll(() => mock.restore())

describe('carteira Base44 adapter contract', () => {
  test('installs the real vehicle-arrival entity required by Plano de Ataque', () => {
    const base44 = { entities: {} } as {
      entities: Record<string, { filter?: unknown; create?: unknown; update?: unknown }>
    }

    installCarteiraBase44Adapter(base44)

    expect(typeof base44.entities.VeiculoChegado?.filter).toBe('function')
    expect(typeof base44.entities.VeiculoChegado?.create).toBe('function')
    expect(typeof base44.entities.VeiculoChegado?.update).toBe('function')
    expect(typeof base44.entities.CarteiraCampanha?.list).toBe('function')
    expect(typeof base44.entities.CarteiraCampanha?.create).toBe('function')
  })

  test('keeps cadastro fields and terminal state in the canonical RPC payload', () => {
    const payload = buildRpcPayload({
      nome: 'João Santos',
      whatsapp: '(11) 99999-9999',
      valor_negociado: '60000',
      financiamento: 'aprovado',
      interesse_troca: true,
      veiculo_troca: 'Polo 2018',
      valor_troca: '30000',
      proposta_enviada: true,
      situacao_atual: 'Venda realizada',
      status_comercial: 'Vendido',
      ativo: false,
    }, 'cliente-1')

    expect(payload).toMatchObject({
      telefone: '(11) 99999-9999',
      potencial_negocio: '60000',
      financiamento: 'aprovado',
      carro_avaliado: true,
      veiculo_troca: 'Polo 2018',
      valor_troca: '30000',
      etapa: 'ganho',
      cliente_status: 'pos_venda',
      proxima_acao: null,
      proxima_acao_em: null,
    })
  })

  test('keeps the structured vehicle-match signals in the canonical RPC payload', () => {
    const payload = buildRpcPayload({
      nome: 'Ana Souza',
      veiculo_interesse: 'VW T-Cross',
      categoria_veiculo: 'suv',
      preco_interesse_min: '90000',
      preco_interesse_max: 130000,
      catalog_model_id: '00000000-0000-0000-0000-000000000001',
      classification_source: 'catalog',
    }, 'cliente-2')

    expect(payload).toMatchObject({
      veiculo_interesse: 'VW T-Cross',
      categoria_veiculo: 'suv',
      preco_interesse_min: 90000,
      preco_interesse_max: 130000,
      catalog_model_id: '00000000-0000-0000-0000-000000000001',
      classification_source: 'catalog',
    })
  })

  test('builds a scoped vehicle update without replacing its owner or status', () => {
    const payload = buildArrivedVehiclePayload({
      marca: '  Volkswagen ',
      modelo: ' T-Cross ',
      versao: ' Highline ',
      ano: '2024',
      preco: '119900',
      data_entrada: '2026-08-25',
      categoria: 'suv',
      catalog_model_id: '00000000-0000-0000-0000-000000000001',
      classification_source: 'catalog',
    }, { storeId: 'store-1', userId: 'seller-1' }, false)

    expect(payload).toMatchObject({
      loja_id: 'store-1',
      marca: 'Volkswagen',
      modelo: 'T-Cross',
      versao: 'Highline',
      preco: 119900,
      categoria: 'suv',
      catalog_model_id: '00000000-0000-0000-0000-000000000001',
      classification_source: 'catalog',
    })
    expect('created_by' in payload).toBe(false)
    expect('status' in payload).toBe(false)
  })
})

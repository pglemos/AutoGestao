import { afterAll, describe, expect, mock, test } from 'bun:test'

mock.module('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mock(() => ({ data: { subscription: { unsubscribe: () => {} } } })),
      getUser: mock(async () => ({ data: { user: null } })),
    },
  },
}))

const { buildRpcPayload, installCarteiraBase44Adapter } = await import('./installCarteiraBase44Adapter')

afterAll(() => mock.restore())

describe('carteira Base44 adapter contract', () => {
  test('installs the real vehicle-arrival entity required by Plano de Ataque', () => {
    const base44 = { entities: {} } as {
      entities: Record<string, { filter?: unknown; create?: unknown }>
    }

    installCarteiraBase44Adapter(base44)

    expect(typeof base44.entities.VeiculoChegado?.filter).toBe('function')
    expect(typeof base44.entities.VeiculoChegado?.create).toBe('function')
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
})

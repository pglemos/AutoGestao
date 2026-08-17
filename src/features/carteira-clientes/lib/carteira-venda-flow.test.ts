import { describe, expect, test } from 'bun:test'
import { buildRpcPayload } from './installCarteiraBase44Adapter.js'
import { mapMxClientToCarteiraVisual } from './carteira-mappers'

describe('Fluxo de Venda Realizada e Transição para Compraram', () => {
  test('buildRpcPayload normaliza valor de venda mascarado e campos de fechamento', () => {
    const payload = buildRpcPayload({
      cliente_id: 'cli-123',
      nome: 'José da Silva',
      veiculo_comprado: 'T-CROSS HIGHLINE 2024',
      valor_venda: 'R$ 135.900,00',
      placa_veiculo: 'ABC1D23',
      data_venda: '2026-08-17',
      financiamento: 'Aprovado',
      situacao_atual: 'Venda realizada',
      status_comercial: 'Vendido',
      vendido: true,
      ativo: false,
    }, 'cli-123')

    expect(payload.cliente_id).toBe('cli-123')
    expect(payload.valor_negociado).toBe(135900)
    expect(payload.potencial_negocio).toBe(135900)
    expect(payload.valor_venda).toBe(135900)
    expect(payload.veiculo_interesse).toBe('T-CROSS HIGHLINE 2024')
    expect(payload.veiculo_comprado).toBe('T-CROSS HIGHLINE 2024')
    expect(payload.placa_veiculo).toBe('ABC1D23')
    expect(payload.data_venda).toBe('2026-08-17')
    expect(payload.etapa).toBe('ganho')
    expect(payload.cliente_status).toBe('pos_venda')
    expect(payload.tipo_evento).toBe('venda_realizada')
    expect(payload.proxima_acao).toBeNull()
    expect(payload.proxima_acao_em).toBeNull()
  })

  test('mapMxClientToCarteiraVisual hidrata cliente ganho com situacao Venda realizada e status Vendido', () => {
    const visual = mapMxClientToCarteiraVisual({
      id: 'cli-jose',
      nome: 'José',
      telefone: '11999999999',
      status: 'pos_venda',
      potencial_negocio: 135900,
      canal_origem: 'Showroom',
      oportunidades: [
        {
          id: 'opp-jose',
          cliente_id: 'cli-jose',
          veiculo_interesse: 'T-CROSS HIGHLINE 2024',
          valor_negociado: 135900,
          etapa: 'ganho',
          closed_at: '2026-08-17T12:00:00Z',
        },
      ],
      agendamentos: [],
    })

    expect(visual.id).toBe('cli-jose')
    expect(visual.situacao_atual).toBe('Venda realizada')
    expect(visual.status_comercial).toBe('Vendido')
    expect(visual.etapa).toBe('ganho')
    expect(visual.valor_negociado).toBe(135900)
    expect(visual.veiculo_interesse).toBe('T-CROSS HIGHLINE 2024')
    expect(visual.proximo_passo).toBe('')
    expect(visual.proxima_acao_data).toBeNull()

    // Valida o critério de classificação de 'Compraram'
    const isComprador = visual.situacao_atual === 'Venda realizada' || visual.status_comercial === 'Vendido' || visual.etapa === 'ganho'
    expect(isComprador).toBe(true)
  })
})

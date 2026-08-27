import { describe, expect, it } from 'bun:test'
import {
  CRM_TIPO_VEICULO_LABEL,
  EventoComercialSchema,
  OportunidadeSchema,
  formatarMoedaBRInput,
  formatarTelefoneBR,
  isTelefoneBRValido,
  normalizarTelefone,
} from './crm.schema'

const baseOportunidade = {
  id: '11111111-1111-4111-8111-111111111111',
  cliente_id: '22222222-2222-4222-8222-222222222222',
  loja_id: '33333333-3333-4333-8333-333333333333',
  seller_user_id: '44444444-4444-4444-8444-444444444444',
  veiculo_interesse: 'Onix LT 1.0',
  valor_negociado: '89000.50',
  etapa: 'prospeccao',
  canal: 'internet',
  sinal: 1000,
  financiamento: 'pendente',
  carro_avaliado: false,
  motivo_perda: null,
  created_at: '2026-06-16T10:00:00.000Z',
  updated_at: '2026-06-16T10:00:00.000Z',
  closed_at: null,
}

describe('OportunidadeSchema', () => {
  it('normaliza tipo_veiculo ausente para null sem descartar oportunidades antigas', () => {
    const parsed = OportunidadeSchema.parse(baseOportunidade)

    expect(parsed.tipo_veiculo).toBeNull()
    expect(parsed.valor_negociado).toBe(89000.5)
  })

  it('aceita categorias de veiculo usadas para comissionamento', () => {
    const parsed = OportunidadeSchema.parse({
      ...baseOportunidade,
      tipo_veiculo: 'caminhao',
    })

    expect(parsed.tipo_veiculo).toBe('caminhao')
    expect(CRM_TIPO_VEICULO_LABEL.caminhao).toBe('Caminhão')
  })

  it('rejeita categoria de veiculo fora do contrato', () => {
    const parsed = OportunidadeSchema.safeParse({
      ...baseOportunidade,
      tipo_veiculo: 'van',
    })

    expect(parsed.success).toBe(false)
  })
})

describe('normalizarTelefone', () => {
  it('remove mascara e mantem so digitos', () => {
    expect(normalizarTelefone('(31) 99999-0000')).toBe('31999990000')
  })

  it('retorna null para vazio, nulo ou sem digitos', () => {
    expect(normalizarTelefone(null)).toBeNull()
    expect(normalizarTelefone(undefined)).toBeNull()
    expect(normalizarTelefone('')).toBeNull()
    expect(normalizarTelefone('---')).toBeNull()
  })

  it('trata numeros com mesma mascara final como o mesmo telefone (dedupe)', () => {
    const a = normalizarTelefone('31 99999-0000')
    const b = normalizarTelefone('(31)999990000')
    expect(a).toBe(b)
  })
})

describe('entrada comercial brasileira', () => {
  it('formata telefone brasileiro e rejeita quantidade de dígitos inválida', () => {
    expect(formatarTelefoneBR('31999990000')).toBe('(31) 99999-0000')
    expect(isTelefoneBRValido('31999990000')).toBe(true)
    expect(isTelefoneBRValido('319999900000')).toBe(false)
  })

  it('formata o valor previsto como moeda sem alterar o valor numérico', () => {
    expect(formatarMoedaBRInput('1234567')).toBe('R$ 12.345,67')
  })
})

describe('EventoComercialSchema', () => {
  const baseEvento = {
    id: '11111111-1111-4111-8111-111111111111',
    cliente_id: '22222222-2222-4222-8222-222222222222',
    oportunidade_id: null,
    agendamento_id: null,
    loja_id: '33333333-3333-4333-8333-333333333333',
    seller_user_id: '44444444-4444-4444-8444-444444444444',
    tipo_evento: 'venda_realizada',
    canal: 'internet',
    modalidade: null,
    data_evento: '2026-06-30T10:00:00.000Z',
    origem_modulo: 'crm',
    observacao: null,
    created_at: '2026-06-30T10:00:00.000Z',
  }

  it('aceita todos os tipos de evento do funil e da central de execucao', () => {
    for (const tipo of [
      'oportunidade_registrada', 'cliente_qualificado', 'agendamento_criado',
      'atendimento_comercial_realizado', 'venda_realizada', 'proposta_enviada',
      'retorno_realizado', 'entrega_realizada', 'garantia_registrada', 'pos_venda_realizado',
    ]) {
      const parsed = EventoComercialSchema.safeParse({ ...baseEvento, tipo_evento: tipo })
      expect(parsed.success).toBe(true)
    }
  })

  it('rejeita tipo de evento fora do contrato', () => {
    const parsed = EventoComercialSchema.safeParse({ ...baseEvento, tipo_evento: 'invalido' })
    expect(parsed.success).toBe(false)
  })
})

describe('teto de valor de veículo', () => {
  it('recusa valor com zeros sobrando e explica o motivo', () => {
    const r = OportunidadeSchema.safeParse({ ...baseOportunidade, valor_negociado: '228000000' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toContain('zeros')
  })

  it('aceita a maior venda real do sistema', () => {
    const r = OportunidadeSchema.safeParse({ ...baseOportunidade, valor_negociado: '239990' })
    expect(r.success).toBe(true)
  })

  it('recusa valor negativo', () => {
    const r = OportunidadeSchema.safeParse({ ...baseOportunidade, valor_negociado: '-1000' })
    expect(r.success).toBe(false)
  })
})

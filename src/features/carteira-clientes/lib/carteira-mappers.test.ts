import { describe, expect, test } from 'bun:test'
import {
  assertNotTerminalPresentation,
  mapMxClientToCarteiraVisual,
  selectActiveOpportunity,
  selectLatestCancelledOpportunity,
  selectLatestClosedOpportunity,
  selectRelevantAppointment,
  situationToStage,
} from './carteira-mappers'

describe('carteira normalized mappers', () => {
  test('selects the newest active opportunity instead of the first relation row', () => {
    const result = selectActiveOpportunity([
      { id: 'closed', etapa: 'perdido', updated_at: '2026-07-16T12:00:00Z' },
      { id: 'old-active', etapa: 'qualificacao', updated_at: '2026-07-14T12:00:00Z' },
      { id: 'current-active', etapa: 'negociacao', updated_at: '2026-07-16T11:00:00Z' },
    ])

    expect(result?.id).toBe('current-active')
  })

  test('selects the nearest open appointment and ignores completed appointments', () => {
    const result = selectRelevantAppointment([
      { id: 'completed', status: 'compareceu', data_hora: '2026-07-16T09:00:00Z' },
      { id: 'later', status: 'confirmado', data_hora: '2026-07-18T09:00:00Z' },
      { id: 'next', status: 'aguardando', data_hora: '2026-07-17T09:00:00Z' },
    ], new Date('2026-07-16T12:00:00Z'))

    expect(result?.id).toBe('next')
  })

  test('maps normalized records to the visual Base44 contract without duplicating identity', () => {
    const result = mapMxClientToCarteiraVisual({
      id: 'client-1',
      loja_id: 'store-1',
      seller_user_id: 'seller-1',
      nome: 'Maria Silva',
      telefone: '31999999999',
      canal_origem: 'internet',
      status: 'oportunidade',
      proxima_acao: 'Confirmar visita',
      proxima_acao_em: '2026-07-17',
      oportunidades: [{
        id: 'op-1',
        etapa: 'negociacao',
        veiculo_interesse: 'Corolla',
        financiamento: 'pendente',
        updated_at: '2026-07-16T10:00:00Z',
      }],
      agendamentos: [{
        id: 'appointment-1',
        status: 'confirmado',
        data_hora: '2026-07-17T15:00:00Z',
      }],
    }, new Date('2026-07-16T12:00:00Z'))

    expect(result.id).toBe('client-1')
    expect(result.oportunidade_id).toBe('op-1')
    expect(result.agendamento_id).toBe('appointment-1')
    expect(result.veiculo_interesse).toBe('Corolla')
    expect(result.situacao_atual).toBe('Visita agendada')
    expect(result.temperatura).toBe('Quente')
  })

  test('advances the funil stage for every "sit" label produced by proximoPassoLib.TRANSICAO', () => {
    // Regressão: essas oito etapas caíam no default 'prospeccao' — a mesma
    // etapa em que a oportunidade já estava — porque nenhum substring do
    // heurístico batia com o texto exato. Resultado: registrar "Cliente
    // respondeu" no primeiro passo não movia a esteira.
    expect(situationToStage({ situacao_atual: 'Cliente respondeu' })).toBe('qualificacao')
    expect(situationToStage({ situacao_atual: 'Cliente quente sem visita' })).toBe('apresentacao')
    expect(situationToStage({ situacao_atual: 'Vai pensar' })).toBe('negociacao')
    expect(situationToStage({ situacao_atual: 'Não compareceu' })).toBe('apresentacao')
    expect(situationToStage({ situacao_atual: 'Visita realizada' })).toBe('apresentacao')
    expect(situationToStage({ situacao_atual: 'Aguardando ação do vendedor' })).toBe('negociacao')
    expect(situationToStage({ situacao_atual: 'Em cadência sem resposta' })).toBe('prospeccao')
  })

  test('status_comercial still wins over the situação text for terminal stages', () => {
    expect(situationToStage({ situacao_atual: 'Cliente respondeu', status_comercial: 'Vendido' })).toBe('ganho')
    expect(situationToStage({ situacao_atual: 'Oportunidade futura', status_comercial: 'Perdido' })).toBe('perdido')
  })

  test('falls back to the substring heuristic for situações outside the known table', () => {
    expect(situationToStage({ situacao_atual: 'Financiamento em análise pelo banco' })).toBe('negociacao')
    expect(situationToStage({ situacao_atual: 'Algo totalmente novo e desconhecido' })).toBe('prospeccao')
  })

})

describe('cancelled sale is a terminal state', () => {
  // Regressão: `CLOSED_STAGES` só continha 'ganho' e 'perdido', mas o enum de
  // produção `crm_etapa_funil` tem 'cancelada'. A oportunidade cancelada era
  // ordenada como ativa e a ficha voltava a mostrar veículo, valor e
  // financiamento da venda revertida como se fosse negociação em andamento.

  test('CAN-03 — a única oportunidade cancelada não é uma oportunidade ativa', () => {
    const opportunities = [{
      id: 'opp-1',
      etapa: 'cancelada',
      closed_at: '2026-07-20T12:00:00Z',
      cancelada_em: '2026-07-27T15:00:00Z',
      motivo_cancelamento: 'Cliente desistiu após aprovação',
      updated_at: '2026-07-27T15:00:00Z',
    }]

    expect(selectActiveOpportunity(opportunities)).toBeNull()
    expect(selectLatestClosedOpportunity(opportunities)?.id).toBe('opp-1')
    expect(selectLatestCancelledOpportunity(opportunities)?.id).toBe('opp-1')
  })

  test('CAN-04 — quando existe uma ativa, ela governa e o cancelamento vira histórico', () => {
    const opportunities = [
      { id: 'opp-cancelled', etapa: 'cancelada', updated_at: '2026-07-27T15:00:00Z' },
      { id: 'opp-active', etapa: 'qualificacao', updated_at: '2026-07-20T10:00:00Z' },
    ]

    expect(selectActiveOpportunity(opportunities)?.id).toBe('opp-active')
    expect(selectLatestCancelledOpportunity(opportunities)?.id).toBe('opp-cancelled')
  })

  test('selectLatestClosedOpportunity ignora oportunidades ainda abertas', () => {
    expect(selectLatestClosedOpportunity([
      { id: 'aberta', etapa: 'negociacao', updated_at: '2026-07-27T15:00:00Z' },
    ])).toBeNull()
  })

  test('CAN-01/CAN-08 — a ficha apresenta Venda cancelada, não uma negociação ativa', () => {
    const result = mapMxClientToCarteiraVisual({
      id: 'client-1',
      nome: 'Maria Silva',
      oportunidades: [{
        id: 'opp-1',
        etapa: 'cancelada',
        veiculo_interesse: 'Corolla',
        valor_negociado: 90000,
        financiamento: 'aprovado',
        closed_at: '2026-07-20T12:00:00Z',
        cancelada_em: '2026-07-27T15:00:00Z',
        cancelada_por: 'user-9',
        motivo_cancelamento: 'Cliente desistiu após aprovação',
        updated_at: '2026-07-27T15:00:00Z',
      }],
      agendamentos: [],
    }, new Date('2026-07-27T18:00:00Z'))

    expect(result.situacao_atual).toBe('Venda cancelada')
    expect(result.status_comercial).toBe('Cancelada')
    expect(result.temperatura).toBe('Frio')
    expect(result.oportunidade_id).toBeNull()
    expect(result.oportunidade_cancelada_id).toBe('opp-1')
    expect(result.motivo_cancelamento).toBe('Cliente desistiu após aprovação')
    expect(result.cancelada_em).toBe('2026-07-27T15:00:00Z')
    expect(result.cancelada_por).toBe('user-9')

    // Nada da venda cancelada pode reaparecer como fato ativo.
    expect(result.veiculo_interesse).toBe('')
    expect(result.valor_negociado).toBe(0)
    expect(result.financiamento).toBe('Não se aplica')
    expect(result.proposta_enviada).toBe(false)
    expect(result.proxima_acao).toBe('')
    expect(result.proximo_passo).toBe('')
  })

  test('CAN-06/CAN-07 — próxima ação e visita antigas não sobrevivem ao cancelamento', () => {
    const result = mapMxClientToCarteiraVisual({
      id: 'client-2',
      nome: 'João',
      proxima_acao: 'Recuperar contato vencido',
      proxima_acao_em: '2026-07-25T10:00:00Z',
      oportunidades: [{ id: 'opp-1', etapa: 'cancelada', updated_at: '2026-07-27T15:00:00Z' }],
      agendamentos: [{ id: 'apt-1', status: 'confirmado', data_hora: '2026-07-30T10:00:00Z' }],
    }, new Date('2026-07-27T18:00:00Z'))

    expect(result.situacao_atual).toBe('Venda cancelada')
    expect(result.visita_agendada_em).toBeNull()
    expect(result.agendamento_id).toBeNull()
    expect(result.proxima_acao_data).toBeNull()
  })

  test('CAN-04 — cliente com cancelada e ativa continua sendo governado pela ativa', () => {
    const result = mapMxClientToCarteiraVisual({
      id: 'client-3',
      nome: 'Ana',
      oportunidades: [
        { id: 'opp-cancelled', etapa: 'cancelada', updated_at: '2026-07-27T15:00:00Z' },
        { id: 'opp-active', etapa: 'qualificacao', veiculo_interesse: 'Onix', updated_at: '2026-07-20T10:00:00Z' },
      ],
      agendamentos: [],
    }, new Date('2026-07-27T18:00:00Z'))

    expect(result.situacao_atual).toBe('Veículo definido')
    expect(result.oportunidade_id).toBe('opp-active')
    expect(result.oportunidade_cancelada_id).toBe('opp-cancelled')
  })

  test('CAN-10 — estados terminais não podem ser rebaixados por situationToStage', () => {
    expect(() => situationToStage({ situacao_atual: 'Venda cancelada' })).toThrow(/terminais/i)
    expect(() => situationToStage({ status_comercial: 'Cancelada' })).toThrow(/terminais/i)
  })

  test('assertNotTerminalPresentation protege o caminho de escrita do adaptador Base44', () => {
    // base44Client.updateCliente derivava `etapa` do rótulo de apresentação e
    // caía em 'prospeccao' para qualquer rótulo desconhecido — inclusive
    // 'Cancelada'. Salvar a ficha reabriria a venda cancelada em produção.
    expect(() => assertNotTerminalPresentation('Venda cancelada', undefined)).toThrow(/terminais/i)
    expect(() => assertNotTerminalPresentation(undefined, 'Cancelada')).toThrow(/terminais/i)
    expect(() => assertNotTerminalPresentation('Em negociação ativa', 'Em Negociação')).not.toThrow()
    expect(() => assertNotTerminalPresentation(undefined, undefined)).not.toThrow()
  })
})

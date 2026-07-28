import { describe, expect, test } from 'bun:test'
import {
  MISSOES,
  SITUACOES_ATUAIS,
  SITUACOES_TERMINAIS,
  STATUS_COMERCIAIS,
  calcularObjetivoEProximoPasso,
  statusComercialColor,
} from '@/components/carteira/carteiraUtils'

// Venda cancelada é um estado terminal próprio. Antes destas regras a situação
// não existia nos vocabulários da carteira, então o cliente com venda
// cancelada continuava elegível para missões, plano de ataque e prioridade,
// e o badge caía no estilo neutro de "situação desconhecida".

const clienteCancelado = {
  id: 'client-1',
  situacao_atual: 'Venda cancelada',
  status_comercial: 'Cancelada',
  temperatura: 'Frio',
  visita_agendada_em: null,
  proxima_acao_data: null,
  ativo: true,
}

describe('venda cancelada na apresentação da carteira', () => {
  test('o vocabulário da carteira conhece a situação e o status', () => {
    expect(SITUACOES_ATUAIS).toContain('Venda cancelada')
    expect(STATUS_COMERCIAIS).toContain('Cancelada')
    expect(SITUACOES_TERMINAIS).toContain('Venda cancelada')
  })

  test('o badge de cancelada não usa verde e se diferencia de perdida', () => {
    const cancelada = statusComercialColor('Cancelada')
    expect(cancelada).not.toContain('green')
    expect(cancelada).not.toBe(statusComercialColor('Perdido'))
    expect(cancelada).not.toBe(statusComercialColor('Vendido'))
  })

  test('o próximo passo é analisar recuperação, não retomar a venda cancelada', () => {
    const { objetivo, proximoPasso } = calcularObjetivoEProximoPasso(clienteCancelado)
    expect(objetivo).toBe('Analisar recuperação')
    expect(proximoPasso).toBe('Analisar recuperação')
  })

  test('CAN-09 — nenhuma missão captura um cliente com venda cancelada', () => {
    const capturadas = MISSOES.filter(missao => missao.filtro(clienteCancelado)).map(missao => missao.id)
    expect(capturadas).toEqual([])
  })

  test('CAN-07 — visita antiga vencida não devolve o cliente cancelado às missões', () => {
    const comVisitaVencida = { ...clienteCancelado, visita_agendada_em: '2020-01-01T10:00:00Z' }
    const capturadas = MISSOES.filter(missao => missao.filtro(comVisitaVencida)).map(missao => missao.id)
    expect(capturadas).toEqual([])
  })
})

import { describe, expect, it } from 'bun:test'

import {
  classifyPriority,
  computePriority,
  POTENTIAL_POINTS,
  URGENCY_POINTS,
} from './priority'

/**
 * Fonte: aba `07 Score_Prioridade` (potencial e faixas) + §32 do prompt mestre
 * (fórmula 45/35/20, tabela de urgência e overrides).
 */

describe('tabelas de pontuação', () => {
  it('potencial usa a escala da planilha', () => {
    expect(POTENTIAL_POINTS).toEqual({
      'Muito alto': 100,
      Alto: 75,
      'Médio': 50,
      Baixo: 25,
    })
  })

  it('urgência usa a escala do prompt', () => {
    expect(URGENCY_POINTS).toEqual({
      clientRespondedAwaitingSeller: 100,
      actionOverdue: 95,
      actionToday: 90,
      actionTomorrow: 75,
      actionWithin3Days: 55,
      actionFuture: 25,
    })
  })
})

describe('classifyPriority — fronteiras exatas (§62)', () => {
  const cases: Array<[number, string]> = [
    [100, 'Máxima'],
    [85, 'Máxima'],
    [84, 'Alta'],
    [70, 'Alta'],
    [69, 'Média'],
    [50, 'Média'],
    [49, 'Baixa'],
    [0, 'Baixa'],
  ]
  for (const [value, expected] of cases) {
    it(`${value} → ${expected}`, () => {
      expect(classifyPriority(value)).toBe(expected)
    })
  }
})

describe('computePriority — fórmula 45/35/20', () => {
  it('risco é o complemento do score', () => {
    const result = computePriority({ urgency: 'actionFuture', potential: 'Baixo', score: 80 })
    expect(result.risk).toBe(20)
  })

  it('calcula o índice exatamente como urgency*0.45 + potential*0.35 + risk*0.20', () => {
    // 90*0.45 + 75*0.35 + 40*0.20 = 40.5 + 26.25 + 8 = 74.75 → 75
    const result = computePriority({ urgency: 'actionToday', potential: 'Alto', score: 60 })
    expect(result.index).toBe(75)
    expect(result.classification).toBe('Alta')
  })

  it('arredonda meio para cima de forma determinística', () => {
    // 25*0.45 + 25*0.35 + 25*0.20 = 25
    expect(computePriority({ urgency: 'actionFuture', potential: 'Baixo', score: 75 }).index).toBe(25)
  })

  it('cenário máximo dá 100', () => {
    const result = computePriority({
      urgency: 'clientRespondedAwaitingSeller',
      potential: 'Muito alto',
      score: 0,
    })
    expect(result.index).toBe(100)
    expect(result.classification).toBe('Máxima')
  })
})

describe('computePriority — overrides (§32)', () => {
  it('cliente respondeu dentro do SLA garante no mínimo Alta', () => {
    const result = computePriority({
      urgency: 'actionFuture',
      potential: 'Baixo',
      score: 100,
      overrides: { clientRespondedWithinSla: true },
    })
    expect(result.classification).toBe('Alta')
    expect(result.appliedOverrides).toContain('clientRespondedWithinSla')
  })

  it('cliente respondeu com SLA vencido força Máxima', () => {
    const result = computePriority({
      urgency: 'actionFuture',
      potential: 'Baixo',
      score: 100,
      overrides: { clientRespondedSlaBreached: true },
    })
    expect(result.classification).toBe('Máxima')
  })

  it('ação vencida há mais de 24h garante no mínimo Alta', () => {
    const result = computePriority({
      urgency: 'actionFuture',
      potential: 'Baixo',
      score: 100,
      overrides: { actionOverdueOver24h: true },
    })
    expect(result.classification).toBe('Alta')
  })

  it.each([
    ['visitToday', 'visita hoje'],
    ['financingApproved', 'financiamento aprovado'],
    ['readyToClose', 'pronto para fechamento'],
  ] as const)('%s garante no mínimo Alta', (override) => {
    const result = computePriority({
      urgency: 'actionFuture',
      potential: 'Baixo',
      score: 100,
      overrides: { [override]: true },
    })
    expect(['Alta', 'Máxima']).toContain(result.classification)
  })

  it('override nunca REBAIXA uma prioridade já mais alta', () => {
    const result = computePriority({
      urgency: 'clientRespondedAwaitingSeller',
      potential: 'Muito alto',
      score: 0,
      overrides: { visitToday: true },
    })
    expect(result.classification).toBe('Máxima')
  })

  it('preserva o índice calculado mesmo quando a classe é elevada', () => {
    const result = computePriority({
      urgency: 'actionFuture',
      potential: 'Baixo',
      score: 100,
      overrides: { visitToday: true },
    })
    // 25*0.45 + 25*0.35 + 0*0.20 = 11.25 + 8.75 + 0 = 20
    expect(result.index).toBe(20)
    expect(result.baseClassification).toBe('Baixa')
    expect(result.classification).toBe('Alta')
  })
})

describe('computePriority — SLA não configurado', () => {
  /**
   * §32 e Exemplo F: SLA ausente não vira 30 minutos inventados
   * e não pode penalizar ninguém.
   */
  it('sem SLA configurado não aplica override de SLA e sinaliza a ausência', () => {
    const result = computePriority({
      urgency: 'actionToday',
      potential: 'Médio',
      score: 70,
      overrides: { clientResponded: true },
      slaMinutes: null,
    })
    expect(result.appliedOverrides).not.toContain('clientRespondedSlaBreached')
    expect(result.slaConfigured).toBe(false)
  })

  it('cliente respondeu sem SLA configurado ainda garante no mínimo Alta', () => {
    const result = computePriority({
      urgency: 'actionFuture',
      potential: 'Baixo',
      score: 100,
      overrides: { clientResponded: true },
      slaMinutes: null,
    })
    expect(result.classification).toBe('Alta')
  })
})

describe('determinismo', () => {
  it('mesma entrada produz exatamente o mesmo resultado', () => {
    const input = { urgency: 'actionTomorrow' as const, potential: 'Alto' as const, score: 55 }
    expect(computePriority(input)).toEqual(computePriority(input))
  })
})

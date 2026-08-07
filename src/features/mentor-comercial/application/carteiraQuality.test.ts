import { describe, expect, test } from 'bun:test'
import {
  computeCarteiraQuality,
  isEligibleForCarteiraQuality,
  type CarteiraOpportunityInput,
} from './carteiraQuality'

describe('isEligibleForCarteiraQuality — Filtros de Elegibilidade', () => {
  test('exclui oportunidade quando needsMentorClassification é true (camelCase)', () => {
    const item: CarteiraOpportunityInput = {
      statusCode: 'INT-N01',
      mentorScore: 85,
      needsMentorClassification: true,
    }
    expect(isEligibleForCarteiraQuality(item)).toBe(false)
  })

  test('exclui oportunidade quando needs_mentor_classification é true (snake_case)', () => {
    const item: CarteiraOpportunityInput = {
      status_code: 'INT-N01',
      mentor_score: 85,
      needs_mentor_classification: true,
    }
    expect(isEligibleForCarteiraQuality(item)).toBe(false)
  })

  test('exclui oportunidade sem score válido (null, undefined ou NaN)', () => {
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'INT-N01', mentorScore: null }),
    ).toBe(false)
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'INT-N01', mentorScore: undefined }),
    ).toBe(false)
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'INT-N01', mentorScore: NaN }),
    ).toBe(false)
  })

  test('exclui vendas encerradas sem ação (VEN-04 e VEN-07)', () => {
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'VEN-04', mentorScore: 90 }),
    ).toBe(false)
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'VEN-07', mentorScore: 90 }),
    ).toBe(false)
  })

  test('exclui perdas encerradas (PER-02, PER-04, INT-C05)', () => {
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'PER-02', mentorScore: 20 }),
    ).toBe(false)
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'PER-04', mentorScore: 20 }),
    ).toBe(false)
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'INT-C05', mentorScore: 20 }),
    ).toBe(false)
  })

  test('exclui cadências encerradas (INT-C06, PER-03)', () => {
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'INT-C06', mentorScore: 40 }),
    ).toBe(false)
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'PER-03', mentorScore: 40 }),
    ).toBe(false)
  })

  test('exclui contato futuro não ativado (INT-Q05, PER-05)', () => {
    expect(
      isEligibleForCarteiraQuality({
        statusCode: 'INT-Q05',
        mentorScore: 70,
        futureActivated: false,
      }),
    ).toBe(false)
    expect(
      isEligibleForCarteiraQuality({
        statusCode: 'PER-05',
        mentorScore: 70,
        futureActivated: false,
      }),
    ).toBe(false)
  })

  test('inclui contato futuro quando ativado (futureActivated = true)', () => {
    expect(
      isEligibleForCarteiraQuality({
        statusCode: 'INT-Q05',
        mentorScore: 70,
        futureActivated: true,
      }),
    ).toBe(true)
    expect(
      isEligibleForCarteiraQuality({
        statusCode: 'PER-05',
        mentorScore: 70,
        future_activated: true,
      }),
    ).toBe(true)
  })

  test('inclui futuras já ativadas por status (PER-06, CAR-C07)', () => {
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'PER-06', mentorScore: 80 }),
    ).toBe(true)
    expect(
      isEligibleForCarteiraQuality({ statusCode: 'CAR-C07', mentorScore: 85 }),
    ).toBe(true)
  })

  test('inclui oportunidades ativas nos pilares principais (negociação, visita, cadência, etc.)', () => {
    const activeStatusCodes = [
      'INT-C01', // Cadência
      'INT-N01', // Proposta / Negociação
      'INT-V01', // Visita
      'FIN-01', // Financiamento
      'TR-01', // Troca
      'REL-01', // Pós-venda ativo
      'REL-07', // Garantia ativa
    ]

    for (const statusCode of activeStatusCodes) {
      expect(
        isEligibleForCarteiraQuality({ statusCode, mentorScore: 80 }),
      ).toBe(true)
    }
  })
})

describe('computeCarteiraQuality — Média e Invariantes', () => {
  test('garante que uma oportunidade NÃO CLASSIFICADA não altera a média nem para cima nem para baixo', () => {
    const baseOpportunities: CarteiraOpportunityInput[] = [
      { id: '1', statusCode: 'INT-N01', mentorScore: 80 },
      { id: '2', statusCode: 'INT-V01', mentorScore: 100 },
    ]

    const baseResult = computeCarteiraQuality(baseOpportunities)
    expect(baseResult.averageScore).toBe(90) // (80 + 100) / 2
    expect(baseResult.totalEligible).toBe(2)
    expect(baseResult.totalExcluded).toBe(0)

    // Adiciona oportunidade não classificada com score 0
    const oppsWithUnclassifiedZero = [
      ...baseOpportunities,
      { id: '3', statusCode: 'INT-N01', mentorScore: 0, needsMentorClassification: true },
    ]
    const resZero = computeCarteiraQuality(oppsWithUnclassifiedZero)
    expect(resZero.averageScore).toBe(90)
    expect(resZero.totalEligible).toBe(2)
    expect(resZero.totalExcluded).toBe(1)

    // Adiciona oportunidade não classificada com score 100
    const oppsWithUnclassifiedHundred = [
      ...baseOpportunities,
      { id: '4', statusCode: 'INT-N01', mentorScore: 100, needs_mentor_classification: true },
    ]
    const resHundred = computeCarteiraQuality(oppsWithUnclassifiedHundred)
    expect(resHundred.averageScore).toBe(90)
    expect(resHundred.totalEligible).toBe(2)
    expect(resHundred.totalExcluded).toBe(1)
  })

  test('calcula distribuição de classes e percentuais corretamente', () => {
    const opportunities: CarteiraOpportunityInput[] = [
      { id: '1', statusCode: 'INT-N01', mentorScore: 95 }, // Excelente
      { id: '2', statusCode: 'INT-N02', mentorScore: 80 }, // Boa
      { id: '3', statusCode: 'INT-V01', mentorScore: 60 }, // Atenção
      { id: '4', statusCode: 'FIN-01', mentorScore: 45 }, // Crítica
    ]

    const result = computeCarteiraQuality(opportunities)

    expect(result.totalEligible).toBe(4)
    expect(result.averageScore).toBe(70) // (95 + 80 + 60 + 45) / 4 = 70
    expect(result.overallClassification).toBe('Atenção')

    expect(result.distribution.Excelente.count).toBe(1)
    expect(result.distribution.Excelente.percentage).toBe(25)

    expect(result.distribution.Boa.count).toBe(1)
    expect(result.distribution.Boa.percentage).toBe(25)

    expect(result.distribution.Atenção.count).toBe(1)
    expect(result.distribution.Atenção.percentage).toBe(25)

    expect(result.distribution.Crítica.count).toBe(1)
    expect(result.distribution.Crítica.percentage).toBe(25)
  })

  test('identifica corretamente itens de "alto potencial em risco"', () => {
    const opportunities: CarteiraOpportunityInput[] = [
      // Alto potencial com score baixo (< 75) -> EM RISCO
      {
        opportunityId: 'opp-1',
        clientId: 'cli-1',
        clientName: 'João Silva',
        statusCode: 'INT-N01',
        potential: 'Alto',
        mentorScore: 50,
      },
      // Muito alto potencial com score crítico (< 75) -> EM RISCO
      {
        opportunity_id: 'opp-2',
        client_id: 'cli-2',
        client_name: 'Maria Souza',
        status_code: 'FIN-06',
        potential: 'Muito alto',
        mentor_score: 40,
      },
      // Alto potencial com score bom (80 >= 75) -> NÃO ESTÁ EM RISCO
      {
        opportunityId: 'opp-3',
        statusCode: 'INT-V01',
        potential: 'Alto',
        mentorScore: 80,
      },
      // Baixo potencial com score baixo -> NÃO É ALTO POTENCIAL
      {
        opportunityId: 'opp-4',
        statusCode: 'INT-C01',
        potential: 'Baixo',
        mentorScore: 30,
      },
    ]

    const result = computeCarteiraQuality(opportunities)

    expect(result.highPotentialAtRisk.length).toBe(2)

    expect(result.highPotentialAtRisk[0].opportunityId).toBe('opp-1')
    expect(result.highPotentialAtRisk[0].clientName).toBe('João Silva')
    expect(result.highPotentialAtRisk[0].potential).toBe('Alto')
    expect(result.highPotentialAtRisk[0].score).toBe(50)
    expect(result.highPotentialAtRisk[0].scoreClassification).toBe('Atenção')

    expect(result.highPotentialAtRisk[1].opportunityId).toBe('opp-2')
    expect(result.highPotentialAtRisk[1].clientName).toBe('Maria Souza')
    expect(result.highPotentialAtRisk[1].potential).toBe('Muito alto')
    expect(result.highPotentialAtRisk[1].score).toBe(40)
    expect(result.highPotentialAtRisk[1].scoreClassification).toBe('Crítica')
  })

  test('retorna valores zerados coerentes quando lista está vazia ou sem elegíveis', () => {
    const emptyResult = computeCarteiraQuality([])
    expect(emptyResult.totalAnalyzed).toBe(0)
    expect(emptyResult.totalEligible).toBe(0)
    expect(emptyResult.totalExcluded).toBe(0)
    expect(emptyResult.averageScore).toBe(0)
    expect(emptyResult.highPotentialAtRisk).toEqual([])

    const onlyExcludedResult = computeCarteiraQuality([
      { statusCode: 'VEN-04', mentorScore: 100 },
      { statusCode: 'PER-02', mentorScore: 0 },
    ])
    expect(onlyExcludedResult.totalAnalyzed).toBe(2)
    expect(onlyExcludedResult.totalEligible).toBe(0)
    expect(onlyExcludedResult.totalExcluded).toBe(2)
    expect(onlyExcludedResult.averageScore).toBe(0)
  })
})

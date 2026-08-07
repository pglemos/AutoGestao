import { describe, expect, it } from 'bun:test'
import type { MentorDecision, OpportunityFacts } from '../engine/engine'
import { buildFichaBlocks } from './fichaBlocks'

function createMockFacts(): OpportunityFacts {
  return {
    statusCode: 'INT-Q01',
    nextActionAt: new Date('2026-08-10T10:00:00Z'),
    clientRespondedAt: new Date('2026-08-06T14:30:00Z'),
    clientNeverResponded: false,
    appointmentAt: new Date('2026-08-12T15:00:00Z'),
    cadenceAttempt: 2,
    cadenceState: {
      cadenceId: 'CAD-01',
      currentAttempt: 2,
      totalAttempts: 5,
      pendingAttempts: 1,
      status: 'active',
      nextActionAt: new Date('2026-08-10T10:00:00Z'),
      startedAt: new Date('2026-08-01T10:00:00Z'),
      responsible: 'Vendedor',
      attackEligible: false,
      steps: [],
      lastIdempotencyKey: null,
    },
    quality: {
      status: 'complete',
      nextStep: 'complete',
      execution: 'onTime',
      cadence: 'respected',
      history: 'complete',
    },
    pendingFlags: ['FLAG_VALIDAR_FINANCIAMENTO'],
    returnStatusCode: null,
  }
}

function createMockDecision(): MentorDecision {
  return {
    statusCode: 'INT-Q01',
    previousStatusCode: 'INT-Q01',
    returnStatusCode: null,
    statusLabel: 'Qualificação em Andamento',
    family: 'Qualificação',
    channel: 'WhatsApp',
    responsible: 'Vendedor',
    temperature: 'Quente',
    objective: 'Entender necessidade do cliente',
    nextStep: 'Mandar opções de modelos selecionados',
    potential: 'Alto',
    cadenceCode: 'CAD-01',
    cadenceMode: null,
    cadenceStep: 2,
    cadenceState: {
      cadenceId: 'CAD-01',
      currentAttempt: 2,
      totalAttempts: 5,
      pendingAttempts: 1,
      status: 'active',
      nextActionAt: new Date('2026-08-10T10:00:00Z'),
      startedAt: new Date('2026-08-01T10:00:00Z'),
      responsible: 'Vendedor',
      attackEligible: false,
      steps: [],
      lastIdempotencyKey: null,
    },
    script: {
      resolved: true,
      scriptId: 'SCR-INT-CAD01-T2',
      reason: 'RESOLVED',
      allowWhatsApp: true,
      scriptReady: true,
    } as any,
    scriptRef: 'SCR-INT-CAD01-T2',
    nextActionAt: new Date('2026-08-10T10:00:00Z'),
    pendingFlags: ['FLAG_VALIDAR_FINANCIAMENTO'],
    score: {
      total: 100,
      breakdown: {
        status: 15,
        nextStep: 20,
        execution: 30,
        cadence: 20,
        history: 15,
      },
      classification: 'Excelente',
      alerts: [],
      clientNeverResponded: false,
    },
    priority: {
      index: 88,
      classification: 'Máxima',
      urgencyPoints: 100,
      potentialPoints: 75,
      risk: 0,
      appliedOverrides: ['clientResponded'],
      slaConfigured: true,
      baseClassification: 'Alta',
    },
    urgency: 'clientRespondedAwaitingSeller',
    centralAction: true,
    centralRule: 'sim',
    attackEligible: false,
    transition: null,
    requiresManualUpdate: false,
    explanations: ['Cliente respondeu e aguarda vendedor.'],
    ruleVersion: 'v1',
  }
}

describe('buildFichaBlocks', () => {
  it('retorna exatamente 5 blocos montados', () => {
    const decision = createMockDecision()
    const facts = createMockFacts()
    const result = buildFichaBlocks(decision, facts)

    expect(result.blocks.length).toBe(5)
    expect(result.header).toBeDefined()
    expect(result.nextAction).toBeDefined()
    expect(result.whatWeKnow).toBeDefined()
    expect(result.whatIsMissing).toBeDefined()
    expect(result.history).toBeDefined()
  })

  it('1. Bloco Cabeçalho: separa visualmente e no código Score (Qualidade) vs Prioridade (Urgência)', () => {
    const decision = createMockDecision()
    const facts = createMockFacts()
    const result = buildFichaBlocks(decision, facts, {
      clientName: 'João da Silva',
      vehicleName: 'Toyota Corolla 2.0',
    })

    const { header } = result
    expect(header.id).toBe('cabecalho')
    expect(header.title).toBe('Cabeçalho da Oportunidade')
    expect(header.clientName).toBe('João da Silva')
    expect(header.vehicleName).toBe('Toyota Corolla 2.0')
    expect(header.statusLabel).toBe('Qualificação em Andamento')

    // Score (Qualidade de Condução)
    expect(header.score.total).toBe(100)
    expect(header.score.classification).toBe('Excelente')
    expect(header.score.breakdown.execution).toBe(30)

    // Prioridade (Urgência da Ação)
    expect(header.priority.index).toBe(88)
    expect(header.priority.classification).toBe('Máxima')
    expect(header.priority.urgencyLevel).toBe('clientRespondedAwaitingSeller')
    expect(header.priority.appliedOverrides).toContain('clientResponded')
  })

  it('2. Bloco Próxima Ação Recomendada: traz próximo passo, objetivo, cadência e script', () => {
    const decision = createMockDecision()
    const facts = createMockFacts()
    const result = buildFichaBlocks(decision, facts)

    const { nextAction } = result
    expect(nextAction.id).toBe('proxima_acao')
    expect(nextAction.title).toBe('Próxima Ação Recomendada')
    expect(nextAction.nextStep).toBe('Mandar opções de modelos selecionados')
    expect(nextAction.objective).toBe('Entender necessidade do cliente')
    expect(nextAction.cadenceCode).toBe('CAD-01')
    expect(nextAction.cadenceStep).toBe(2)
    expect(nextAction.totalCadenceAttempts).toBe(5)
    expect(nextAction.scriptId).toBe('SCR-INT-CAD01-T2')
    expect(nextAction.centralAction).toBe(true)
  })

  it('3. Bloco O que Sabemos: consolida fatos da oportunidade e qualidade dos pilares', () => {
    const decision = createMockDecision()
    const facts = createMockFacts()
    const result = buildFichaBlocks(decision, facts)

    const { whatWeKnow } = result
    expect(whatWeKnow.id).toBe('o_que_sabemos')
    expect(whatWeKnow.title).toBe('O que Sabemos')
    expect(whatWeKnow.clientInteractionStatus).toContain('Cliente respondeu em')
    expect(whatWeKnow.qualityDetails.status).toBe('complete')
    expect(whatWeKnow.potential).toBe('Alto')
    expect(whatWeKnow.temperature).toBe('Quente')
  })

  it('4. Bloco O que Falta para Evoluir: expõe pendências, alertas e lacunas de pilares', () => {
    const decision = createMockDecision()
    // Mock com score parcial para ter pilares ausentes
    decision.score.total = 60
    decision.score.breakdown = {
      status: 15,
      nextStep: 10,
      execution: 10,
      cadence: 10,
      history: 15,
    }
    decision.score.alerts = ['no_next_action']

    const facts = createMockFacts()
    const result = buildFichaBlocks(decision, facts, {
      missingScriptVariables: ['nome', 'veiculo'],
    })

    const { whatIsMissing } = result
    expect(whatIsMissing.id).toBe('o_que_falta')
    expect(whatIsMissing.title).toBe('O que Falta para Evoluir')
    expect(whatIsMissing.pendingFlags).toContain('FLAG_VALIDAR_FINANCIAMENTO')
    expect(whatIsMissing.scoreAlerts).toContain('no_next_action')
    expect(whatIsMissing.missingScriptVariables).toEqual(['nome', 'veiculo'])
    expect(whatIsMissing.missingPillars.length).toBeGreaterThan(0)
  })

  it('5. Bloco Histórico: mantém linha do tempo e resumo de transição', () => {
    const decision = createMockDecision()
    decision.transition = {
      matched: true,
      fromStatus: 'Qualificação em Andamento',
      toStatus: 'Visita Agendada',
      result: 'Agendou visita',
      precedence: 'REGLA_01',
      requiresManualUpdate: false,
    }
    const facts = createMockFacts()
    const historyEntries = [
      {
        at: new Date('2026-08-05T10:00:00Z'),
        description: 'Primeiro contato enviado via WhatsApp',
        statusCode: 'INT-Q01',
        result: 'Mensagem enviada',
      },
    ]

    const result = buildFichaBlocks(decision, facts, { historyEntries })

    const { history } = result
    expect(history.id).toBe('historico')
    expect(history.title).toBe('Histórico')
    expect(history.entries.length).toBe(1)
    expect(history.entries[0].description).toBe('Primeiro contato enviado via WhatsApp')
    expect(history.transitionSummary).toContain('Visita Agendada')
  })
})

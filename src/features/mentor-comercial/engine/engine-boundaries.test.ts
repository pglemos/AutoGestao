import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import {
  resolveMentorDecision,
  type CadenceDefinition,
  type MentorDecisionInput,
  type OpportunityFacts,
  type RuleCatalog,
  type StatusDefinition,
  type StoreSettings,
  type TransitionRule,
} from './engine'

import {
  classifyScore,
  computeScore,
  type CadenceQuality,
  type ExecutionQuality,
} from './score'

import {
  classifyPriority,
  computePriority,
} from './priority'

const RULES_DIR = path.resolve(import.meta.dir, '../../../../rules/mentor-comercial/v1')

const readRecords = <T>(name: string): T[] =>
  (JSON.parse(readFileSync(path.join(RULES_DIR, name), 'utf8')).records as T[])

const catalog: RuleCatalog = {
  version: 'v1',
  statuses: readRecords<StatusDefinition>('statuses.json'),
  cadences: readRecords<CadenceDefinition>('cadences.json'),
  cadenceSteps: readRecords<{ cadenceId: string; attempt: string; offset: string }>('cadence-steps.json'),
  scriptIds: new Set(readRecords<{ scriptId: string }>('scripts.json').map((s) => s.scriptId)),
  transitions: readRecords<TransitionRule>('transitions.json'),
}

const NOW = new Date('2026-08-10T09:00:00.000Z')

const defaultSettings: StoreSettings = {
  sellerResponseSlaMinutes: null,
  postSaleEnabled: false,
  warrantyFollowupEnabled: false,
}

const buildFacts = (statusCode: string): OpportunityFacts => ({
  statusCode,
  nextActionAt: new Date('2026-08-10T10:00:00.000Z'),
  clientRespondedAt: null,
  clientNeverResponded: false,
  appointmentAt: null,
  cadenceAttempt: 1,
  cadenceState: null,
  quality: {
    status: 'complete',
    nextStep: 'complete',
    execution: 'onTime',
    cadence: 'respected',
    history: 'complete',
  },
  pendingFlags: [],
  returnStatusCode: null,
})

describe('1. Valores de fronteira de score (89/90, 74/75, 49/50)', () => {
  it('classifica 89 como Boa e 90 como Excelente', () => {
    expect(classifyScore(89)).toBe('Boa')
    expect(classifyScore(90)).toBe('Excelente')
  })

  it('classifica 74 como Atenção e 75 como Boa', () => {
    expect(classifyScore(74)).toBe('Atenção')
    expect(classifyScore(75)).toBe('Boa')
  })

  it('classifica 49 como Crítica e 50 como Atenção', () => {
    expect(classifyScore(49)).toBe('Crítica')
    expect(classifyScore(50)).toBe('Atenção')
  })

  it('reproduz classificações de fronteira via computeScore', () => {
    const score90 = computeScore({
      status: 'complete',
      nextStep: 'complete',
      execution: 'onTime',
      cadence: 'partial',
      history: 'complete',
    })
    expect(score90.total).toBe(90)
    expect(score90.classification).toBe('Excelente')

    const score86 = computeScore({
      status: 'partial',
      nextStep: 'complete',
      execution: 'onTime',
      cadence: 'respected',
      history: 'partial',
    })
    expect(score86.total).toBe(86)
    expect(score86.classification).toBe('Boa')

    const score75 = computeScore({
      status: 'complete',
      nextStep: 'partial',
      execution: 'dueToday',
      cadence: 'partial',
      history: 'complete',
    })
    expect(score75.total).toBe(75)
    expect(score75.classification).toBe('Boa')

    const score68 = computeScore({
      status: 'complete',
      nextStep: 'partial',
      execution: 'dueToday',
      cadence: 'partial',
      history: 'partial',
    })
    expect(score68.total).toBe(68)
    expect(score68.classification).toBe('Atenção')

    const score53 = computeScore({
      status: 'complete',
      nextStep: 'partial',
      execution: 'lateUnder24h',
      cadence: 'partial',
      history: 'partial',
    })
    expect(score53.total).toBe(53)
    expect(score53.classification).toBe('Atenção')

    const score46 = computeScore({
      status: 'partial',
      nextStep: 'partial',
      execution: 'lateUnder24h',
      cadence: 'partial',
      history: 'partial',
    })
    expect(score46.total).toBe(46)
    expect(score46.classification).toBe('Crítica')
  })
})

describe('2. Valores de fronteira de prioridade (84/85, 69/70, 49/50)', () => {
  it('classifica 84 como Alta e 85 como Máxima', () => {
    expect(classifyPriority(84)).toBe('Alta')
    expect(classifyPriority(85)).toBe('Máxima')
  })

  it('classifica 69 como Média e 70 como Alta', () => {
    expect(classifyPriority(69)).toBe('Média')
    expect(classifyPriority(70)).toBe('Alta')
  })

  it('classifica 49 como Baixa e 50 como Média', () => {
    expect(classifyPriority(49)).toBe('Baixa')
    expect(classifyPriority(50)).toBe('Média')
  })

  it('reproduz cálculo e classificação de prioridade nas fronteiras exatas', () => {
    const res85 = computePriority({
      urgency: 'clientRespondedAwaitingSeller',
      potential: 'Muito alto',
      score: 75,
    })
    expect(res85.index).toBe(85)
    expect(res85.baseClassification).toBe('Máxima')

    const res84 = computePriority({
      urgency: 'clientRespondedAwaitingSeller',
      potential: 'Muito alto',
      score: 78,
    })
    expect(res84.index).toBe(84)
    expect(res84.baseClassification).toBe('Alta')

    const res70 = computePriority({
      urgency: 'actionToday',
      potential: 'Médio',
      score: 40,
    })
    expect(res70.index).toBe(70)
    expect(res70.baseClassification).toBe('Alta')

    const res69 = computePriority({
      urgency: 'actionToday',
      potential: 'Médio',
      score: 45,
    })
    expect(res69.index).toBe(69)
    expect(res69.baseClassification).toBe('Média')

    const res50 = computePriority({
      urgency: 'actionTomorrow',
      potential: 'Baixo',
      score: 63,
    })
    expect(res50.index).toBe(50)
    expect(res50.baseClassification).toBe('Média')

    const res49 = computePriority({
      urgency: 'actionTomorrow',
      potential: 'Baixo',
      score: 68,
    })
    expect(res49.index).toBe(49)
    expect(res49.baseClassification).toBe('Baixa')
  })
})

describe('3. Todos os 5 estados de ExecutionQuality', () => {
  const executionStates: Array<{ state: ExecutionQuality; expectedPoints: number }> = [
    { state: 'onTime', expectedPoints: 30 },
    { state: 'dueToday', expectedPoints: 25 },
    { state: 'lateUnder24h', expectedPoints: 10 },
    { state: 'lateOver24h', expectedPoints: 0 },
    { state: 'awaitingSellerResponse', expectedPoints: 0 },
  ]

  for (const { state, expectedPoints } of executionStates) {
    it(`avalia corretamente o estado de execução "${state}" com ${expectedPoints} pontos`, () => {
      const res = computeScore({ execution: state })
      expect(res.breakdown.execution).toBe(expectedPoints)
    })
  }
})

describe('4. Todos os 4 estados de CadenceQuality', () => {
  const cadenceStates: Array<{ state: CadenceQuality; expectedPoints: number }> = [
    { state: 'respected', expectedPoints: 20 },
    { state: 'completedWithoutResponse', expectedPoints: 20 },
    { state: 'partial', expectedPoints: 10 },
    { state: 'broken', expectedPoints: 0 },
  ]

  for (const { state, expectedPoints } of cadenceStates) {
    it(`avalia corretamente o estado de cadência "${state}" com ${expectedPoints} pontos`, () => {
      const res = computeScore({ cadence: state })
      expect(res.breakdown.cadence).toBe(expectedPoints)
    })
  }
})

describe('5. Status inexistente passado ao engine', () => {
  it('lança erro claro e não retorna decisão quando o status é desconhecido', () => {
    const invalidFacts = buildFacts('INVALID_STATUS_CODE')
    expect(() =>
      resolveMentorDecision({
        facts: invalidFacts,
        storeSettings: defaultSettings,
        catalog,
        now: NOW,
      }),
    ).toThrow(/Status desconhecido no catálogo/i)
  })
})

describe('6. Cada uma das 9 famílias de status resolve uma decisão sem lançar exceção', () => {
  it('verifica que existem exatamente 9 famílias no catálogo', () => {
    const families = new Set(catalog.statuses.map((s) => s.family))
    expect(families.size).toBe(9)
  })

  it('resolve decisão com sucesso para pelo menos um status de cada família', () => {
    const families = [...new Set(catalog.statuses.map((s) => s.family))]
    for (const family of families) {
      const statusDef = catalog.statuses.find((s) => s.family === family)
      expect(statusDef).toBeDefined()
      if (!statusDef) continue

      const facts = buildFacts(statusDef.statusId)
      const decision = resolveMentorDecision({
        facts,
        storeSettings: defaultSettings,
        catalog,
        now: NOW,
      })

      expect(decision.family).toBe(family)
      expect(decision.statusCode).toBe(statusDef.statusId)
    }
  })
})

describe('7. Todos os 86 status produzem decisão válida', () => {
  it('verifica que há 86 status no catálogo v1', () => {
    expect(catalog.statuses.length).toBe(86)
  })

  it('produz decisão com status, responsável, objetivo e próximo passo não vazios para cada um dos 86 status', () => {
    for (const statusDef of catalog.statuses) {
      const facts = buildFacts(statusDef.statusId)
      const decision = resolveMentorDecision({
        facts,
        storeSettings: defaultSettings,
        catalog,
        now: NOW,
      })

      expect(decision.statusCode).toBe(statusDef.statusId)
      expect(decision.statusCode.trim().length).toBeGreaterThan(0)

      expect(decision.responsible).toBeDefined()
      expect(decision.responsible.trim().length).toBeGreaterThan(0)

      expect(decision.objective).toBeDefined()
      expect(decision.objective.trim().length).toBeGreaterThan(0)

      expect(decision.nextStep).toBeDefined()
      expect(decision.nextStep.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('8. Determinismo para 20 status distintos', () => {
  it('garante que duas chamadas idênticas produzem resultado idêntico para 20 status distintos', () => {
    const sampleStatuses = catalog.statuses.slice(0, 20)
    expect(sampleStatuses.length).toBe(20)

    for (const statusDef of sampleStatuses) {
      const facts = buildFacts(statusDef.statusId)
      const input: MentorDecisionInput = {
        facts,
        storeSettings: defaultSettings,
        catalog,
        now: NOW,
      }

      const decision1 = resolveMentorDecision(input)
      const decision2 = resolveMentorDecision(input)

      expect(decision1).toEqual(decision2)
    }
  })
})

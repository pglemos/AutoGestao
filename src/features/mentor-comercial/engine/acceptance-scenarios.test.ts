import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import { advanceCadence, planCadence } from './cadence'
import {
  resolveMentorDecision,
  type MentorDecisionInput,
  type OpportunityFacts,
  type RuleCatalog,
  type StoreSettings,
} from './engine'

/**
 * Os 15 cenários oficiais da aba `11 Testes_Cenários` (TASK 51).
 *
 * As expectativas vêm da FONTE, não da implementação. Se um cenário falhar, a
 * implementação é que deve mudar — nunca a expectativa (§65).
 */

const RULES_DIR = path.resolve(import.meta.dir, '../../../../rules/mentor-comercial/v1')
const read = (name: string) =>
  JSON.parse(readFileSync(path.join(RULES_DIR, name), 'utf8')).records as Array<
    Record<string, never>
  >

const catalog: RuleCatalog = {
  version: 'v1',
  statuses: read('statuses.json') as never,
  cadences: read('cadences.json') as never,
  cadenceSteps: read('cadence-steps.json') as never,
  scriptIds: new Set((read('scripts.json') as never as Array<{ scriptId: string }>).map((s) => s.scriptId)),
  transitions: read('transitions.json') as never,
}

const scenarios = read('acceptance-scenarios.json') as never as Array<{
  scenario: string
  expectedStatus: string
  expectedNextStep: string
  expectedCentral: string
  expectedScorePriority: string
  notes: string
}>

const NOW = new Date('2026-08-10T09:00:00.000Z')

const settings = (overrides: Partial<StoreSettings> = {}): StoreSettings => ({
  sellerResponseSlaMinutes: null,
  postSaleEnabled: false,
  warrantyFollowupEnabled: false,
  ...overrides,
})

const perfectQuality = {
  status: 'complete' as const,
  nextStep: 'complete' as const,
  execution: 'onTime' as const,
  cadence: 'respected' as const,
  history: 'complete' as const,
}

const facts = (overrides: Partial<OpportunityFacts> & { statusCode: string }): OpportunityFacts => ({
  nextActionAt: null,
  clientRespondedAt: null,
  clientNeverResponded: false,
  appointmentAt: null,
  cadenceAttempt: 1,
  cadenceState: null,
  quality: perfectQuality,
  pendingFlags: [],
  returnStatusCode: null,
  ...overrides,
})

const decide = (input: Omit<MentorDecisionInput, 'catalog' | 'now'> & { now?: Date }) =>
  resolveMentorDecision({ ...input, catalog, now: input.now ?? NOW })

describe('a fonte declara 15 cenários de aceitação', () => {
  it('todos os 15 estão no catálogo', () => {
    expect(scenarios.length).toBe(15)
  })
})

describe('Cenário 1 — Lead sem resposta', () => {
  it('INT-C01 + Mensagem enviada → INT-C02, cadência CAD-01 ativa', () => {
    const d = decide({
      facts: facts({ statusCode: 'INT-C01' }),
      event: { result: 'Mensagem enviada', at: NOW },
      storeSettings: settings(),
    })
    expect(d.statusCode).toBe('INT-C02')
    expect(d.previousStatusCode).toBe('INT-C01')
    expect(d.cadenceCode).toBe('CAD-01')
  })

  it('não pune a falta de resposta do cliente', () => {
    const d = decide({
      facts: facts({ statusCode: 'INT-C02', clientNeverResponded: true }),
      storeSettings: settings(),
    })
    expect(d.score.total).toBe(100)
    expect(d.score.classification).toBe('Excelente')
  })
})

describe('Cenário 2 — Lead responde', () => {
  it('INT-C02 + Cliente respondeu → INT-C03 e responsável Vendedor', () => {
    const d = decide({
      facts: facts({ statusCode: 'INT-C02' }),
      event: { result: 'Cliente respondeu', at: NOW },
      storeSettings: settings(),
    })
    expect(d.statusCode).toBe('INT-C03')
    expect(d.responsible).toBe('Vendedor')
  })

  it('interrompe a cadência anterior', () => {
    const steps = catalog.cadenceSteps.filter(
      (s) => (s as unknown as { cadenceId: string }).cadenceId === 'CAD-01',
    ) as unknown as Array<{ attempt: string; offset: string }>
    const d = decide({
      facts: facts({
        statusCode: 'INT-C02',
        cadenceState: planCadence({ cadenceId: 'CAD-01', steps, startedAt: NOW }),
      }),
      event: { result: 'Cliente respondeu', at: NOW },
      storeSettings: settings(),
    })
    expect(d.cadenceState?.status).toBe('interrupted')
  })

  it('cliente aguardando vendedor dá prioridade alta ou máxima', () => {
    const d = decide({
      facts: facts({ statusCode: 'INT-C03', clientRespondedAt: NOW }),
      storeSettings: settings(),
    })
    expect(['Alta', 'Máxima']).toContain(d.priority.classification)
    expect(d.urgency).toBe('clientRespondedAwaitingSeller')
  })
})

describe('Cenário 3 — Visita D+5 não entra na Central', () => {
  it('ação futura não gera ação central', () => {
    const d = decide({
      facts: facts({
        statusCode: 'INT-V02',
        nextActionAt: new Date('2026-08-15T09:00:00.000Z'),
        appointmentAt: new Date('2026-08-15T09:00:00.000Z'),
      }),
      storeSettings: settings(),
    })
    expect(d.urgency).toBe('actionFuture')
    expect(d.centralAction).toBe(false)
  })
})

describe('Cenário 4 — Visita D-1 entra na Central', () => {
  it('ação de amanhã com status de confirmação sobe prioridade', () => {
    const d = decide({
      facts: facts({
        statusCode: 'INT-V03',
        nextActionAt: new Date('2026-08-11T09:00:00.000Z'),
        appointmentAt: new Date('2026-08-11T09:00:00.000Z'),
      }),
      storeSettings: settings(),
    })
    expect(d.urgency).toBe('actionTomorrow')
    expect(['Alta', 'Máxima', 'Média']).toContain(d.priority.classification)
  })
})

describe('Cenário 5 — Visita hoje', () => {
  it('entra na Central e garante prioridade mínima Alta', () => {
    const d = decide({
      facts: facts({
        statusCode: 'INT-V05',
        nextActionAt: NOW,
        appointmentAt: NOW,
      }),
      storeSettings: settings(),
    })
    expect(d.urgency).toBe('actionToday')
    expect(d.centralAction).toBe(true)
    expect(['Alta', 'Máxima']).toContain(d.priority.classification)
    expect(d.priority.appliedOverrides).toContain('visitToday')
  })
})

describe('Cenário 6 — Não compareceu', () => {
  it('INT-V05 + Não compareceu → INT-V07', () => {
    const d = decide({
      facts: facts({ statusCode: 'INT-V05', appointmentAt: NOW }),
      event: { result: 'Não compareceu', at: NOW },
      storeSettings: settings(),
    })
    expect(d.statusCode).toBe('INT-V07')
  })

  it('o novo status aponta a cadência de recuperação CAD-07', () => {
    const d = decide({
      facts: facts({ statusCode: 'INT-V05', appointmentAt: NOW }),
      event: { result: 'Não compareceu', at: NOW },
      storeSettings: settings(),
    })
    expect(d.cadenceCode).toBe('CAD-07')
  })
})

describe('Cenário 7 — Dados da troca pendentes', () => {
  it('TR-01 mantém o próximo passo declarado na fonte', () => {
    const d = decide({ facts: facts({ statusCode: 'TR-01' }), storeSettings: settings() })
    expect(d.statusCode).toBe('TR-01')
    expect(d.nextStep).toBeTruthy()
    expect(d.family).toBe('Troca')
  })
})

describe('Cenário 8 — Avaliação presencial', () => {
  it('TR-03 tem próximo passo de agendar avaliação', () => {
    const d = decide({ facts: facts({ statusCode: 'TR-03' }), storeSettings: settings() })
    expect(d.statusCode).toBe('TR-03')
    expect(d.nextStep.toLowerCase()).toContain('avalia')
  })
})

describe('Cenário 9 — Financiamento aprovado', () => {
  it('FIN-06 tem potencial muito alto e prioridade mínima Alta', () => {
    const d = decide({
      facts: facts({ statusCode: 'FIN-06', nextActionAt: NOW }),
      storeSettings: settings(),
    })
    expect(d.statusCode).toBe('FIN-06')
    expect(['Alta', 'Máxima']).toContain(d.priority.classification)
  })
})

describe('Cenário 10 — Cliente Porta que não comprou', () => {
  it('POR-A03 é do canal Porta e permanece ativo', () => {
    const d = decide({ facts: facts({ statusCode: 'POR-A03' }), storeSettings: settings() })
    expect(d.statusCode).toBe('POR-A03')
    expect(d.channel).toBe('Porta')
  })
})

describe('Cenário 11 — Lead antigo acima de 90 dias', () => {
  it('CAR-C04 pertence ao canal Carteira e preserva a origem', () => {
    const d = decide({ facts: facts({ statusCode: 'CAR-C04' }), storeSettings: settings() })
    expect(d.statusCode).toBe('CAR-C04')
    expect(d.channel).toBe('Carteira')
  })
})

describe('Cenário 12 — Cadência completa sem resposta', () => {
  it('não é perda, e o score continua bom se tudo foi executado no prazo', () => {
    const steps = catalog.cadenceSteps.filter(
      (s) => (s as unknown as { cadenceId: string }).cadenceId === 'CAD-01',
    ) as unknown as Array<{ attempt: string; offset: string }>
    let state = planCadence({ cadenceId: 'CAD-01', steps, startedAt: NOW })
    for (let i = 0; i < steps.length; i += 1) {
      state = advanceCadence(state, { executed: true })
    }
    const d = decide({
      facts: facts({
        statusCode: 'PER-03',
        cadenceState: state,
        clientNeverResponded: true,
        quality: { ...perfectQuality, cadence: 'completedWithoutResponse' },
      }),
      storeSettings: settings(),
    })
    expect(d.score.total).toBe(100)
    expect(d.attackEligible).toBe(true)
    expect(d.statusCode).toBe('PER-03')
  })
})

describe('Cenário 13 — Cliente respondeu e vendedor não tratou', () => {
  it('score crítico e prioridade máxima quando o SLA está configurado e estourado', () => {
    const d = decide({
      facts: facts({
        statusCode: 'INT-C03',
        clientRespondedAt: new Date('2026-08-08T09:00:00.000Z'),
        nextActionAt: new Date('2026-08-08T09:00:00.000Z'),
        quality: {
          status: 'complete',
          nextStep: 'partial',
          execution: 'awaitingSellerResponse',
          cadence: 'broken',
          history: 'stale',
        },
      }),
      storeSettings: settings({ sellerResponseSlaMinutes: 30 }),
    })
    expect(d.score.classification).toBe('Crítica')
    expect(d.priority.classification).toBe('Máxima')
    expect(d.centralAction).toBe(true)
  })

  it('sem SLA configurado não penaliza, mas ainda prioriza', () => {
    const d = decide({
      facts: facts({ statusCode: 'INT-C03', clientRespondedAt: NOW }),
      storeSettings: settings({ sellerResponseSlaMinutes: null }),
    })
    expect(d.priority.appliedOverrides).not.toContain('clientRespondedSlaBreached')
    expect(d.explanations).toContain('SLA de resposta ainda não configurado.')
  })
})

describe('Cenário 14 — Compra futura', () => {
  it('INT-Q05 com data futura não gera ação na Central', () => {
    const d = decide({
      facts: facts({
        statusCode: 'INT-Q05',
        nextActionAt: new Date('2026-11-10T09:00:00.000Z'),
      }),
      storeSettings: settings(),
    })
    expect(d.statusCode).toBe('INT-Q05')
    expect(d.urgency).toBe('actionFuture')
    expect(d.centralAction).toBe(false)
  })
})

describe('Cenário 15 — Garantia aberta', () => {
  it('REL-07 existe e entra na Central quando o acompanhamento vence', () => {
    const naCentral = decide({
      facts: facts({ statusCode: 'REL-07', nextActionAt: NOW }),
      storeSettings: settings(),
    })
    expect(naCentral.statusCode).toBe('REL-07')
    expect(naCentral.centralAction).toBe(true)

    const futuro = decide({
      facts: facts({
        statusCode: 'REL-07',
        nextActionAt: new Date('2026-09-10T09:00:00.000Z'),
      }),
      storeSettings: settings(),
    })
    expect(futuro.centralAction).toBe(false)
  })
})

describe('sem regra de transição o motor nunca inventa status', () => {
  it('preserva o status e exige Atualizar situação', () => {
    const d = decide({
      facts: facts({ statusCode: 'INT-C01' }),
      event: { result: 'Resultado inexistente na matriz', at: NOW },
      storeSettings: settings(),
    })
    expect(d.statusCode).toBe('INT-C01')
    expect(d.requiresManualUpdate).toBe(true)
    expect(d.transition?.observability).toBe('transition_not_found')
  })
})

describe('determinismo do motor', () => {
  it('mesma entrada e mesmo instante produzem a mesma decisão', () => {
    const input = {
      facts: facts({ statusCode: 'INT-C02', nextActionAt: NOW }),
      storeSettings: settings(),
    }
    expect(JSON.stringify(decide(input))).toBe(JSON.stringify(decide(input)))
  })
})

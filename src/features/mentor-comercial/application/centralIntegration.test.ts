import { readFileSync } from 'node:fs'
import path from 'node:path'

import { beforeEach, describe, expect, it } from 'bun:test'

import type {
  MentorDecision,
  OpportunityFacts,
  RuleCatalog,
  StoreSettings,
} from '../engine/engine'
import {
  buildClientDeepLink,
  completeCentralAction,
  createCentralExecutionActionPayload,
  evaluateCentralActionTrigger,
  mapUpsertToExecutionPayload,
  _resetIdempotencyRegistryForTesting,
  type CentralExecutionActionPayload,
  type CentralIntegrationRepository,
} from './centralIntegration'
import {
  buildCentralActionKey,
  type CentralActionUpsert,
  type HistoryEntry,
  type OpportunityRef,
  type ScoreSnapshotEntry,
} from './mentorApplicationService'

const RULES_DIR = path.resolve(
  import.meta.dir,
  '../../../../rules/mentor-comercial/v1',
)

const read = (name: string) =>
  JSON.parse(readFileSync(path.join(RULES_DIR, name), 'utf8')).records

const catalog: RuleCatalog = {
  version: 'v1',
  statuses: read('statuses.json'),
  cadences: read('cadences.json'),
  cadenceSteps: read('cadence-steps.json'),
  scriptIds: new Set(
    read('scripts.json').map((s: { scriptId: string }) => s.scriptId),
  ),
  transitions: read('transitions.json'),
}

const NOW = new Date('2026-08-10T10:00:00.000Z')

const ref: OpportunityRef = {
  opportunityId: 'opp-100',
  clientId: 'cli-200',
  storeId: 'loja-1',
  sellerId: 'vend-1',
}

class TestCentralRepository implements CentralIntegrationRepository {
  calls: string[] = []
  actions = new Map<string, CentralActionUpsert>()
  executionActions = new Map<string, CentralExecutionActionPayload>()
  completedActions = new Set<string>()
  history: HistoryEntry[] = []
  snapshots: ScoreSnapshotEntry[] = []
  savedDecisions: MentorDecision[] = []
  removedActions: string[] = []

  constructor(
    private facts: OpportunityFacts,
    private settings: StoreSettings = {
      sellerResponseSlaMinutes: null,
      postSaleEnabled: true,
      warrantyFollowupEnabled: true,
    },
  ) {}

  private track(name: string) {
    this.calls.push(name)
  }

  async loadFacts() {
    return this.facts
  }
  async loadStoreSettings() {
    return this.settings
  }
  async loadCatalog() {
    return catalog
  }
  async saveOpportunityState(_r: OpportunityRef, decision: MentorDecision) {
    this.track('saveOpportunityState')
    this.savedDecisions.push(decision)
  }
  async savePendingFlags() {
    this.track('savePendingFlags')
  }
  async saveCadenceState() {
    this.track('saveCadenceState')
  }
  async upsertCentralAction(action: CentralActionUpsert) {
    this.track('upsertCentralAction')
    this.actions.set(action.idempotencyKey, action)
  }
  async removeCentralAction(opportunityId: string, reason: string) {
    this.track('removeCentralAction')
    this.removedActions.push(`${opportunityId}:${reason}`)
  }
  async appendHistory(entry: HistoryEntry) {
    this.track('appendHistory')
    if (this.history.some((h) => h.idempotencyKey === entry.idempotencyKey)) return
    this.history.push(entry)
  }
  async appendScoreSnapshot(entry: ScoreSnapshotEntry) {
    this.track('appendScoreSnapshot')
    if (this.snapshots.some((s) => s.idempotencyKey === entry.idempotencyKey)) return
    this.snapshots.push(entry)
  }
  async isActionCompleted(actionId: string): Promise<boolean> {
    return this.completedActions.has(actionId)
  }
  async markActionCompleted(
    actionId: string,
    completedAt: Date,
    result: string,
  ): Promise<void> {
    this.track('markActionCompleted')
    this.completedActions.add(actionId)
    const existing = this.executionActions.get(actionId)
    if (existing) {
      existing.status = 'completed'
      existing.completedAt = completedAt
      existing.completionResult = result
    }
  }
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return await work()
  }
}

const baseFacts = (overrides: Partial<OpportunityFacts> = {}): OpportunityFacts => ({
  statusCode: 'INT-C03',
  nextActionAt: NOW,
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
  ...overrides,
})

const baseSettings: StoreSettings = {
  sellerResponseSlaMinutes: 30,
  postSaleEnabled: true,
  warrantyFollowupEnabled: true,
}

describe('TASK 31 — Gatilhos de criação de ação na Central', () => {
  beforeEach(() => {
    _resetIdempotencyRegistryForTesting()
  })

  it('1. Próxima ação hoje ativa gatilho next_action_today', () => {
    const result = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: NOW }),
        storeSettings: baseSettings,
      },
      NOW,
    )
    expect(result.shouldCreate).toBe(true)
    expect(result.triggerReasons).toContain('next_action_today')
  })

  it('2. Visita hoje ativa gatilho visit_today', () => {
    const result = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: null, appointmentAt: NOW }),
        storeSettings: baseSettings,
      },
      NOW,
    )
    expect(result.shouldCreate).toBe(true)
    expect(result.triggerReasons).toContain('visit_today')
  })

  it('3. Confirmação vence hoje ativa gatilho confirmation_today', () => {
    const result = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: null }),
        storeSettings: baseSettings,
        extendedDates: { confirmationDueAt: NOW },
      },
      NOW,
    )
    expect(result.shouldCreate).toBe(true)
    expect(result.triggerReasons).toContain('confirmation_today')
  })

  it('4. Cliente respondeu ativa gatilho client_responded', () => {
    const result = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: null, clientRespondedAt: NOW }),
        storeSettings: baseSettings,
      },
      NOW,
    )
    expect(result.shouldCreate).toBe(true)
    expect(result.triggerReasons).toContain('client_responded')
  })

  it('5. Pós-venda hoje ativa gatilho post_sale_today quando habilitado', () => {
    const enabledResult = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: null }),
        storeSettings: { ...baseSettings, postSaleEnabled: true },
        extendedDates: { postSaleAt: NOW },
      },
      NOW,
    )
    expect(enabledResult.shouldCreate).toBe(true)
    expect(enabledResult.triggerReasons).toContain('post_sale_today')

    const disabledResult = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: null }),
        storeSettings: { ...baseSettings, postSaleEnabled: false },
        extendedDates: { postSaleAt: NOW },
      },
      NOW,
    )
    expect(disabledResult.triggerReasons).not.toContain('post_sale_today')
  })

  it('6. Garantia hoje ativa gatilho warranty_today quando habilitada', () => {
    const enabledResult = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: null }),
        storeSettings: { ...baseSettings, warrantyFollowupEnabled: true },
        extendedDates: { warrantyAt: NOW },
      },
      NOW,
    )
    expect(enabledResult.shouldCreate).toBe(true)
    expect(enabledResult.triggerReasons).toContain('warranty_today')

    const disabledResult = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: null }),
        storeSettings: { ...baseSettings, warrantyFollowupEnabled: false },
        extendedDates: { warrantyAt: NOW },
      },
      NOW,
    )
    expect(disabledResult.triggerReasons).not.toContain('warranty_today')
  })

  it('7. Entrega hoje ativa gatilho delivery_today quando habilitada', () => {
    const result = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: null }),
        storeSettings: baseSettings,
        extendedDates: { deliveryAt: NOW },
      },
      NOW,
    )
    expect(result.shouldCreate).toBe(true)
    expect(result.triggerReasons).toContain('delivery_today')
  })

  it('8. Aniversário hoje ativa gatilho birthday_today quando aplicável', () => {
    const result = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: null }),
        storeSettings: baseSettings,
        clientInfo: { birthday: '1990-08-10T00:00:00.000Z' },
      },
      NOW,
    )
    expect(result.shouldCreate).toBe(true)
    expect(result.triggerReasons).toContain('birthday_today')
  })

  it('Nenhum gatilho ativado quando datas não coincidem', () => {
    const futureDate = new Date('2026-12-25T10:00:00.000Z')
    const result = evaluateCentralActionTrigger(
      {
        ref,
        facts: baseFacts({ nextActionAt: futureDate, appointmentAt: null }),
        storeSettings: baseSettings,
        extendedDates: { postSaleAt: futureDate },
      },
      NOW,
    )
    expect(result.shouldCreate).toBe(false)
    expect(result.triggerReasons).toHaveLength(0)
  })
})

describe('TASK 31 — Estrutura e vínculo inequívoco da ação', () => {
  it('cria payload com os 7 campos de vínculo inequívoco', () => {
    const payload = createCentralExecutionActionPayload(
      ref,
      'INT-C03',
      'Atendimento',
      NOW,
      'Fazer Follow-up',
      'Manter contato com cliente',
      'Alta',
      'mentor_comercial',
    )

    expect(payload.clientId).toBe('cli-200')
    expect(payload.opportunityId).toBe('opp-100')
    expect(payload.statusCode).toBe('INT-C03')
    expect(payload.activityType).toBe('Atendimento')
    expect(payload.dateTime).toBe(NOW)
    expect(payload.source).toBe('mentor_comercial')
    expect(payload.actionId).toBe(
      buildCentralActionKey('opp-100', 'INT-C03', NOW),
    )
  })

  it('actionId é determinístico e idempotente', () => {
    const actionId1 = buildCentralActionKey('opp-100', 'INT-C03', NOW)
    const actionId2 = buildCentralActionKey('opp-100', 'INT-C03', NOW)
    expect(actionId1).toBe(actionId2)
  })

  it('mapUpsertToExecutionPayload converte CentralActionUpsert corretamente', () => {
    const upsert: CentralActionUpsert = {
      idempotencyKey: 'key-123',
      opportunityId: 'opp-100',
      clientId: 'cli-200',
      storeId: 'loja-1',
      sellerId: 'vend-1',
      activityType: 'Visita',
      title: 'Realizar Test Drive',
      objective: 'Fechar proposta',
      dueAt: NOW,
      statusCode: 'INT-C03',
      priority: 'Alta',
      sourceType: 'mentor_comercial',
    }

    const mapped = mapUpsertToExecutionPayload(upsert)
    expect(mapped.actionId).toBe('key-123')
    expect(mapped.clientId).toBe('cli-200')
    expect(mapped.opportunityId).toBe('opp-100')
    expect(mapped.statusCode).toBe('INT-C03')
    expect(mapped.activityType).toBe('Visita')
    expect(mapped.dateTime).toBe(NOW)
    expect(mapped.source).toBe('mentor_comercial')
  })
})

describe('TASK 32 — Conclusão pela Central e Idempotência', () => {
  beforeEach(() => {
    _resetIdempotencyRegistryForTesting()
  })

  it('conclui action, atualiza Mentor, grava histórico, recalcula score/prioridade e preserva oportunidade', async () => {
    const repo = new TestCentralRepository(baseFacts({ statusCode: 'INT-C01' }))
    const actionId = buildCentralActionKey('opp-100', 'INT-C01', NOW)

    repo.executionActions.set(actionId, {
      actionId,
      clientId: ref.clientId,
      opportunityId: ref.opportunityId,
      storeId: ref.storeId,
      sellerId: ref.sellerId,
      statusCode: 'INT-C01',
      activityType: 'Atendimento',
      dateTime: NOW,
      source: 'mentor_comercial',
      title: 'Mensagem inicial',
      objective: null,
      priority: 'Média',
      status: 'pending',
    })

    const completion = await completeCentralAction(repo, {
      ref,
      actionId,
      result: 'Mensagem enviada',
      now: NOW,
    })

    expect(completion.status).toBe('completed')
    expect(completion.alreadyCompleted).toBe(false)
    expect(completion.mentorResult).not.toBeNull()
    expect(completion.mentorResult?.decision.statusCode).toBe('INT-C02')

    // Grava histórico
    expect(repo.history.length).toBe(1)
    expect(repo.history[0].previousStatusCode).toBe('INT-C01')
    expect(repo.history[0].result).toBe('Mensagem enviada')

    // Recalcula score e prioridade
    expect(repo.snapshots.length).toBe(1)
    expect(repo.snapshots[0].score).toBeDefined()

    // PRESERVA a action concluída e a oportunidade
    expect(repo.completedActions.has(actionId)).toBe(true)
    expect(repo.savedDecisions.length).toBe(1)
    const storedAction = repo.executionActions.get(actionId)
    expect(storedAction?.status).toBe('completed')
    expect(storedAction?.completionResult).toBe('Mensagem enviada')
  })

  it('Operação idempotente: clique duplo não duplica evento, histórico nem snapshot', async () => {
    const repo = new TestCentralRepository(baseFacts({ statusCode: 'INT-C01' }))
    const actionId = buildCentralActionKey('opp-100', 'INT-C01', NOW)

    // Primeira chamada
    const res1 = await completeCentralAction(repo, {
      ref,
      actionId,
      result: 'Mensagem enviada',
      now: NOW,
      idempotencyKey: 'dup-click-1',
    })

    // Segunda chamada simultânea/subsequente (clique duplo)
    const res2 = await completeCentralAction(repo, {
      ref,
      actionId,
      result: 'Mensagem enviada',
      now: NOW,
      idempotencyKey: 'dup-click-1',
    })

    expect(res1.alreadyCompleted).toBe(false)
    expect(res2.alreadyCompleted).toBe(true)
    expect(res2.mentorResult).toBeNull()

    // Histórico e score snapshots contêm APENAS 1 registro
    expect(repo.history.length).toBe(1)
    expect(repo.snapshots.length).toBe(1)
  })
})

describe('TASK 33 — Deep Link buildClientDeepLink', () => {
  it('é uma função pura que monta o destino de Abrir cliente contendo clientId e opportunityId', () => {
    const link = buildClientDeepLink('cli-200', 'opp-100')
    expect(link).toContain('clientId=cli-200')
    expect(link).toContain('opportunityId=opp-100')
    expect(link.startsWith('/carteira/cliente?')).toBe(true)
  })

  it('funciona recebendo objeto de parâmetros', () => {
    const link = buildClientDeepLink({
      clientId: 'cli-abc',
      opportunityId: 'opp-xyz',
      tab: 'historico',
    })
    expect(link).toContain('clientId=cli-abc')
    expect(link).toContain('opportunityId=opp-xyz')
    expect(link).toContain('tab=historico')
  })

  it('lança exceção se clientId ou opportunityId estiverem vazios', () => {
    expect(() => buildClientDeepLink('', 'opp-100')).toThrow()
    expect(() => buildClientDeepLink('cli-200', '')).toThrow()
  })
})

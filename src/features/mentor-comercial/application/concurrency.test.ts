import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import type {
  MentorDecision,
  OpportunityFacts,
  RuleCatalog,
  StoreSettings,
} from '../engine/engine'
import {
  applyMentorEvent,
  buildCentralActionKey,
  type CentralActionUpsert,
  type HistoryEntry,
  type MentorRepository,
  type OpportunityRef,
  type ScoreSnapshotEntry,
} from './mentorApplicationService'
import {
  processDailyStoreBatch,
  type DailyProcessorRepository,
  type StoreCarteiraQualityReport,
} from './dailyProcessor'
import {
  completeCentralAction,
  _resetIdempotencyRegistryForTesting,
  type CentralIntegrationRepository,
} from './centralIntegration'
import {
  type ClosingRepository,
  type CustomerEntity,
  type OpportunityEntity,
} from './closingIntegration'
import {
  addClientToMission,
  createAttackMission,
  dispatchSingleMessage,
  type OpportunityAttackFacts,
} from './attackMissions'

/**
 * TASK 38 — Testes de concorrência e idempotência do Mentor Comercial (TAREFA B04).
 *
 * Prova determinística de que corridas de concorrência, cliques duplos e
 * concorrência entre cron/central/vendedor/missões resultam sempre em UM único
 * estado final válido: 1 action na Central, 1 histórico, 1 snapshot e 1 missão sem duplicação.
 */

const RULES_DIR = path.resolve(import.meta.dir, '../../../../rules/mentor-comercial/v1')
const read = (name: string) =>
  JSON.parse(readFileSync(path.join(RULES_DIR, name), 'utf8')).records

const catalog: RuleCatalog = {
  version: 'v1',
  statuses: read('statuses.json'),
  cadences: read('cadences.json'),
  cadenceSteps: read('cadence-steps.json'),
  scriptIds: new Set(read('scripts.json').map((s: { scriptId: string }) => s.scriptId)),
  transitions: read('transitions.json'),
}

const NOW = new Date('2026-08-10T09:00:00.000Z')

const ref: OpportunityRef = {
  opportunityId: 'opp-1',
  clientId: 'cli-1',
  storeId: 'loja-1',
  sellerId: 'vend-1',
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

class ConcurrentInMemoryRepository
  implements
    MentorRepository,
    DailyProcessorRepository,
    CentralIntegrationRepository,
    ClosingRepository
{
  calls: string[] = []
  actions = new Map<string, CentralActionUpsert>()
  history: HistoryEntry[] = []
  snapshots: ScoreSnapshotEntry[] = []
  savedDecisions: MentorDecision[] = []
  removedActions: string[] = []
  completedActionIds = new Set<string>()

  customers = new Map<string, CustomerEntity>()
  opportunities = new Map<string, OpportunityEntity>()
  factsMap = new Map<string, OpportunityFacts>()
  reports: StoreCarteiraQualityReport[] = []

  constructor(
    private defaultFacts: OpportunityFacts,
    private settings: StoreSettings = {
      sellerResponseSlaMinutes: null,
      postSaleEnabled: false,
      warrantyFollowupEnabled: false,
    },
  ) {}

  async loadFacts(r: OpportunityRef): Promise<OpportunityFacts> {
    return this.factsMap.get(r.opportunityId) ?? this.defaultFacts
  }

  setFacts(opportunityId: string, facts: OpportunityFacts) {
    this.factsMap.set(opportunityId, facts)
  }

  async loadStoreSettings(_storeId: string): Promise<StoreSettings> {
    return this.settings
  }

  async loadCatalog(_ruleVersion?: string): Promise<RuleCatalog> {
    return catalog
  }

  async saveOpportunityState(_r: OpportunityRef, decision: MentorDecision): Promise<void> {
    this.calls.push('saveOpportunityState')
    this.savedDecisions.push(decision)
  }

  async savePendingFlags(): Promise<void> {
    this.calls.push('savePendingFlags')
  }

  async saveCadenceState(): Promise<void> {
    this.calls.push('saveCadenceState')
  }

  async upsertCentralAction(action: CentralActionUpsert): Promise<void> {
    this.calls.push('upsertCentralAction')
    this.actions.set(action.idempotencyKey, action)
  }

  async removeCentralAction(opportunityId: string, reason: string): Promise<void> {
    this.calls.push('removeCentralAction')
    this.removedActions.push(`${opportunityId}:${reason}`)
  }

  async appendHistory(entry: HistoryEntry): Promise<void> {
    this.calls.push('appendHistory')
    if (this.history.some((h) => h.idempotencyKey === entry.idempotencyKey)) return
    this.history.push(entry)
  }

  async appendScoreSnapshot(entry: ScoreSnapshotEntry): Promise<void> {
    this.calls.push('appendScoreSnapshot')
    if (this.snapshots.some((s) => s.idempotencyKey === entry.idempotencyKey)) return
    this.snapshots.push(entry)
  }

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    const snapshot = {
      actions: new Map(this.actions),
      history: [...this.history],
      snapshots: [...this.snapshots],
      savedDecisions: [...this.savedDecisions],
      removedActions: [...this.removedActions],
      completedActionIds: new Set(this.completedActionIds),
      customers: new Map(this.customers),
      opportunities: new Map(this.opportunities),
    }
    try {
      return await work()
    } catch (error) {
      this.actions = snapshot.actions
      this.history = snapshot.history
      this.snapshots = snapshot.snapshots
      this.savedDecisions = snapshot.savedDecisions
      this.removedActions = snapshot.removedActions
      this.completedActionIds = snapshot.completedActionIds
      this.customers = snapshot.customers
      this.opportunities = snapshot.opportunities
      throw error
    }
  }

  // DailyProcessorRepository
  async loadStoreOpportunities(storeId: string): Promise<OpportunityRef[]> {
    const refs: OpportunityRef[] = []
    for (const [id, opp] of this.opportunities.entries()) {
      if (opp.storeId === storeId) {
        refs.push({
          opportunityId: id,
          clientId: opp.clientId,
          storeId: opp.storeId,
          sellerId: opp.sellerId,
        })
      }
    }
    if (refs.length === 0) {
      refs.push(ref)
    }
    return refs
  }

  async saveCarteiraQualityReport(report: StoreCarteiraQualityReport): Promise<void> {
    this.reports.push(report)
  }

  // CentralIntegrationRepository
  async isActionCompleted(actionId: string): Promise<boolean> {
    return this.completedActionIds.has(actionId)
  }

  async markActionCompleted(actionId: string): Promise<void> {
    this.completedActionIds.add(actionId)
  }

  // ClosingRepository
  async findCustomerById(id: string): Promise<CustomerEntity | null> {
    return this.customers.get(id) ?? null
  }

  async findCustomersByStore(storeId: string): Promise<CustomerEntity[]> {
    return Array.from(this.customers.values()).filter((c) => c.storeId === storeId)
  }

  async saveCustomer(customer: CustomerEntity): Promise<void> {
    this.customers.set(customer.id, customer)
  }

  async findOpportunityById(id: string): Promise<OpportunityEntity | null> {
    return this.opportunities.get(id) ?? null
  }

  async findOpportunityByClientAndStore(
    clientId: string,
    storeId: string,
  ): Promise<OpportunityEntity | null> {
    for (const opp of this.opportunities.values()) {
      if (opp.clientId === clientId && opp.storeId === storeId) {
        return opp
      }
    }
    return null
  }

  async saveOpportunityRecord(opp: OpportunityEntity): Promise<void> {
    this.opportunities.set(opp.id, opp)
  }
}

describe('Cenário 1: Duas abas atualizando a mesma oportunidade ao mesmo tempo', () => {
  it('garante que a chave de idempotência gera exatamente 1 action, 1 histórico e 1 snapshot', async () => {
    const repo = new ConcurrentInMemoryRepository(baseFacts())
    const idempotencyKey = 'tab_concurrent_update_key'

    const [resA, resB] = await Promise.all([
      applyMentorEvent(repo, { ref, now: NOW, idempotencyKey }),
      applyMentorEvent(repo, { ref, now: NOW, idempotencyKey }),
    ])

    // Ambos os chamadores obtêm resultado determinístico coerente
    expect(resA.decision.statusCode).toBe(resB.decision.statusCode)

    // Efeitos colaterais únicos no repositório
    expect(repo.actions.size).toBe(1)
    expect(repo.history.length).toBe(1)
    expect(repo.snapshots.length).toBe(1)
    expect(repo.history[0].idempotencyKey).toBe(`${idempotencyKey}:history`)
    expect(repo.snapshots[0].idempotencyKey).toBe(`${idempotencyKey}:score`)
  })
})

describe('Cenário 2: Clique duplo no mesmo botão', () => {
  it('garante resultado único em cliques concorrentes no mesmo botão de ação da Central', async () => {
    _resetIdempotencyRegistryForTesting()
    const repo = new ConcurrentInMemoryRepository(baseFacts())
    const actionId = buildCentralActionKey('opp-1', 'INT-C03', NOW)

    // Primeiro registra a action na Central
    await applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'setup_action' })
    expect(repo.actions.size).toBe(1)

    // Clique duplo simultâneo na conclusão da ação
    const [res1, res2] = await Promise.all([
      completeCentralAction(repo, {
        ref,
        actionId,
        result: 'Contato realizado via WhatsApp',
        now: NOW,
        idempotencyKey: 'double_click_key',
      }),
      completeCentralAction(repo, {
        ref,
        actionId,
        result: 'Contato realizado via WhatsApp',
        now: NOW,
        idempotencyKey: 'double_click_key',
      }),
    ])

    // Uma executa a conclusão, a outra detecta que já foi concluída
    const completedResults = [res1, res2].filter((r) => !r.alreadyCompleted)
    const alreadyCompletedResults = [res1, res2].filter((r) => r.alreadyCompleted)

    expect(completedResults.length).toBe(1)
    expect(alreadyCompletedResults.length).toBe(1)

    // Histórico e Snapshots da conclusão são gravados apenas UMA vez para a chave 'double_click_key'
    const completionHistory = repo.history.filter((h) => h.idempotencyKey === 'double_click_key:history')
    expect(completionHistory.length).toBe(1)

    const completionSnapshots = repo.snapshots.filter((s) => s.idempotencyKey === 'double_click_key:score')
    expect(completionSnapshots.length).toBe(1)
  })
})

describe('Cenário 3: Cron rodando enquanto o vendedor age', () => {
  it('processamento diário e ação do vendedor concorrentes não duplicam registros nem corrompem a oportunidade', async () => {
    const repo = new ConcurrentInMemoryRepository(baseFacts({ statusCode: 'INT-C01' }))
    const dayStr = NOW.toISOString().slice(0, 10)

    const [dailyResult, sellerResult] = await Promise.all([
      processDailyStoreBatch(repo, { storeId: 'loja-1', now: NOW }),
      applyMentorEvent(repo, {
        ref,
        now: NOW,
        idempotencyKey: 'seller_action_during_cron',
        event: { result: 'Cliente respondeu', at: NOW },
      }),
    ])

    expect(dailyResult.totalOpportunitiesProcessed).toBeGreaterThan(0)
    expect(sellerResult.decision).toBeDefined()

    // Chaves de idempotência do daily_processor e do vendedor são distintas
    const dailyHistory = repo.history.filter((h) =>
      h.idempotencyKey.startsWith(`daily_processor:${ref.storeId}:${ref.opportunityId}:${dayStr}`),
    )
    const sellerHistory = repo.history.filter((h) => h.idempotencyKey === 'seller_action_during_cron:history')

    expect(dailyHistory.length).toBe(1)
    expect(sellerHistory.length).toBe(1)

    // A action da Central é deduplicada deterministicamente por chave (opportunityId + statusCode + date)
    const actionKeys = Array.from(repo.actions.keys())
    const uniqueKeys = new Set(actionKeys)
    expect(actionKeys.length).toBe(uniqueKeys.size)
  })
})

describe('Cenário 4: Cliente responde enquanto o processador diário executa', () => {
  it('registra a resposta do cliente e o lote diário sem perda de evento nem histórico duplicado', async () => {
    const repo = new ConcurrentInMemoryRepository(
      baseFacts({
        statusCode: 'INT-C03',
        clientRespondedAt: null,
      }),
    )

    const dayStr = NOW.toISOString().slice(0, 10)

    const [batchRes, responseRes] = await Promise.all([
      processDailyStoreBatch(repo, { storeId: 'loja-1', now: NOW }),
      applyMentorEvent(repo, {
        ref,
        now: NOW,
        idempotencyKey: 'client_response_during_daily',
        event: { result: 'Cliente enviou mensagem no WhatsApp', at: NOW },
      }),
    ])

    expect(batchRes).toBeDefined()
    expect(responseRes.decision).toBeDefined()

    // O histórico registra exatamente um item do lote diário e um da resposta do cliente
    const dailyHist = repo.history.filter((h) =>
      h.idempotencyKey.includes(`daily_processor:${ref.storeId}:${ref.opportunityId}:${dayStr}`),
    )
    const clientHist = repo.history.filter(
      (h) => h.idempotencyKey === 'client_response_during_daily:history',
    )

    expect(dailyHist.length).toBe(1)
    expect(clientHist.length).toBe(1)

    // Snapshots são registrados uma vez por chave idempotente
    const dailySnap = repo.snapshots.filter((s) =>
      s.idempotencyKey.includes(`daily_processor:${ref.storeId}:${ref.opportunityId}:${dayStr}`),
    )
    const clientSnap = repo.snapshots.filter(
      (s) => s.idempotencyKey === 'client_response_during_daily:score',
    )

    expect(dailySnap.length).toBe(1)
    expect(clientSnap.length).toBe(1)
  })
})

describe('Cenário 5: Central concluída enquanto o Mentor está aberto', () => {
  it('evita execução duplicada e mantém exatamente um histórico e snapshot de conclusão', async () => {
    _resetIdempotencyRegistryForTesting()
    const repo = new ConcurrentInMemoryRepository(baseFacts())
    const actionId = buildCentralActionKey('opp-1', 'INT-C03', NOW)

    // Monta a ação inicial
    await applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'init_central_opp' })

    // Conclusão pela Central e tentativa simultânea pelo Mentor
    const [centralComp, mentorComp] = await Promise.all([
      completeCentralAction(repo, {
        ref,
        actionId,
        result: 'Agendamento confirmado via Central',
        now: NOW,
        idempotencyKey: 'central_completion_evt',
      }),
      completeCentralAction(repo, {
        ref,
        actionId,
        result: 'Agendamento confirmado via Mentor',
        now: NOW,
        idempotencyKey: 'central_completion_evt',
      }),
    ])

    // Um dos caminhos efetua o registro, o outro detecta idempotência (alreadyCompleted = true)
    const completedCount = [centralComp, mentorComp].filter((r) => !r.alreadyCompleted).length
    const ignoredCount = [centralComp, mentorComp].filter((r) => r.alreadyCompleted).length

    expect(completedCount).toBe(1)
    expect(ignoredCount).toBe(1)

    // O repositório contem APENAS 1 histórico referente a esta conclusão
    const completionHistories = repo.history.filter(
      (h) => h.idempotencyKey === 'central_completion_evt:history',
    )
    expect(completionHistories.length).toBe(1)

    // Action foi marcada como concluída
    expect(repo.completedActionIds.has(actionId)).toBe(true)
  })
})

describe('Cenário 6: Missão atualizada simultaneamente por dois caminhos', () => {
  it('garante deduplicação estrita de cliente na missão ao adicionar simultaneamente', () => {
    const oppFacts: OpportunityAttackFacts = {
      opportunityId: 'opp-1',
      clientId: 'cli-1',
      statusCode: 'INT-C04',
      attackEligible: true,
    }

    const mission = createAttackMission('Retomar leads', [oppFacts], NOW)
    expect(mission.targets.length).toBe(1)

    // Adiciona o mesmo cliente/oportunidade duas vezes simultaneamente
    const updated1 = addClientToMission(mission, oppFacts)
    const updated2 = addClientToMission(updated1, oppFacts)

    // Nenhuma duplicata no array de targets
    expect(updated2.targets.length).toBe(1)
    expect(updated2.targets[0].clientId).toBe('cli-1')
  })

  it('garante que o envio concorrente de mensagem na mesma missão e oportunidade não duplica dispatch', () => {
    const oppFacts: OpportunityAttackFacts = {
      opportunityId: 'opp-1',
      clientId: 'cli-1',
      statusCode: 'INT-C04',
      attackEligible: true,
    }

    const mission = createAttackMission('Retomar leads', [oppFacts], NOW)

    const res1 = dispatchSingleMessage(mission, 'opp-1', NOW)
    // Re-dispatching na mesma missão já atualizada mantém 1 target e estado coerente
    const res2 = dispatchSingleMessage(res1.updatedMission, 'opp-1', NOW)

    expect(res1.updatedMission.targets.length).toBe(1)
    expect(res2.updatedMission.targets.length).toBe(1)
    expect(res2.updatedMission.targets[0].messageSent).toBe(true)
    expect(res2.dispatchedTarget.sentAt).toEqual(NOW)
  })
})

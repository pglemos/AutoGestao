import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import type { MentorDecision, OpportunityFacts, RuleCatalog, StoreSettings } from '../engine/engine'
import {
  computeStoreCarteiraQuality,
  processDailyStoreBatch,
  type DailyProcessorRepository,
  type StoreCarteiraQualityReport,
} from './dailyProcessor'
import type { CentralActionUpsert, HistoryEntry, OpportunityRef, ScoreSnapshotEntry } from './mentorApplicationService'

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

class InMemoryDailyProcessorRepository implements DailyProcessorRepository {
  opportunitiesMap = new Map<string, { ref: OpportunityRef; facts: OpportunityFacts }>()
  actions = new Map<string, CentralActionUpsert>()
  history: HistoryEntry[] = []
  snapshots: ScoreSnapshotEntry[] = []
  savedDecisions: MentorDecision[] = []
  removedActions: string[] = []
  carteiraQualityReports: StoreCarteiraQualityReport[] = []

  constructor(
    private settings: StoreSettings = {
      sellerResponseSlaMinutes: null,
      postSaleEnabled: false,
      warrantyFollowupEnabled: false,
    },
  ) {}

  addOpportunity(ref: OpportunityRef, facts: OpportunityFacts) {
    this.opportunitiesMap.set(ref.opportunityId, { ref, facts })
  }

  async loadStoreOpportunities(storeId: string): Promise<OpportunityRef[]> {
    const list: OpportunityRef[] = []
    for (const item of this.opportunitiesMap.values()) {
      if (item.ref.storeId === storeId) {
        list.push(item.ref)
      }
    }
    return list
  }

  async loadFacts(ref: OpportunityRef): Promise<OpportunityFacts> {
    const item = this.opportunitiesMap.get(ref.opportunityId)
    if (!item) throw new Error(`Oportunidade ${ref.opportunityId} não encontrada`)
    return item.facts
  }

  async loadStoreSettings(): Promise<StoreSettings> {
    return this.settings
  }

  async loadCatalog(): Promise<RuleCatalog> {
    return catalog
  }

  async saveOpportunityState(ref: OpportunityRef, decision: MentorDecision): Promise<void> {
    this.savedDecisions.push(decision)
    const item = this.opportunitiesMap.get(ref.opportunityId)
    if (item) {
      item.facts = {
        ...item.facts,
        statusCode: decision.statusCode,
        nextActionAt: decision.nextActionAt,
        cadenceState: decision.cadenceState,
        pendingFlags: decision.pendingFlags,
      }
    }
  }

  async savePendingFlags(): Promise<void> {}
  async saveCadenceState(): Promise<void> {}

  async upsertCentralAction(action: CentralActionUpsert): Promise<void> {
    this.actions.set(action.idempotencyKey, action)
  }

  async removeCentralAction(opportunityId: string, reason: string): Promise<void> {
    this.removedActions.push(`${opportunityId}:${reason}`)
  }

  async appendHistory(entry: HistoryEntry): Promise<void> {
    if (this.history.some((h) => h.idempotencyKey === entry.idempotencyKey)) return
    this.history.push(entry)
  }

  async appendScoreSnapshot(entry: ScoreSnapshotEntry): Promise<void> {
    if (this.snapshots.some((s) => s.idempotencyKey === entry.idempotencyKey)) return
    this.snapshots.push(entry)
  }

  async saveCarteiraQualityReport(report: StoreCarteiraQualityReport): Promise<void> {
    this.carteiraQualityReports.push(report)
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

describe('DailyProcessor - processDailyStoreBatch', () => {
  it('IDEMPOTÊNCIA: rodar 1, 2 e 5 vezes com o mesmo now produz exatamente o mesmo resultado', async () => {
    const repo = new InMemoryDailyProcessorRepository()
    const ref1: OpportunityRef = {
      opportunityId: 'opp-1',
      clientId: 'cli-1',
      storeId: 'loja-1',
      sellerId: 'vend-1',
    }
    const ref2: OpportunityRef = {
      opportunityId: 'opp-2',
      clientId: 'cli-2',
      storeId: 'loja-1',
      sellerId: 'vend-2',
    }

    repo.addOpportunity(ref1, baseFacts({ statusCode: 'INT-C03', nextActionAt: NOW }))
    repo.addOpportunity(ref2, baseFacts({ statusCode: 'INT-Q04', nextActionAt: NOW }))

    // Execução 1
    const res1 = await processDailyStoreBatch(repo, { storeId: 'loja-1', now: NOW })
    const actionsCount1 = repo.actions.size
    const historyCount1 = repo.history.length
    const snapshotsCount1 = repo.snapshots.length

    // Execução 2
    const res2 = await processDailyStoreBatch(repo, { storeId: 'loja-1', now: NOW })
    expect(repo.actions.size).toBe(actionsCount1)
    expect(repo.history.length).toBe(historyCount1)
    expect(repo.snapshots.length).toBe(snapshotsCount1)
    expect(res2.totalOpportunitiesProcessed).toBe(res1.totalOpportunitiesProcessed)

    // Execuções 3, 4, 5
    await processDailyStoreBatch(repo, { storeId: 'loja-1', now: NOW })
    await processDailyStoreBatch(repo, { storeId: 'loja-1', now: NOW })
    const res5 = await processDailyStoreBatch(repo, { storeId: 'loja-1', now: NOW })

    expect(repo.actions.size).toBe(actionsCount1)
    expect(repo.history.length).toBe(historyCount1)
    expect(repo.snapshots.length).toBe(snapshotsCount1)
    expect(res5.carteiraQuality.averageScore).toBe(res1.carteiraQuality.averageScore)
  })

  it('ordem de execução: atualiza visita D0 para status correto', async () => {
    const repo = new InMemoryDailyProcessorRepository()
    const ref: OpportunityRef = {
      opportunityId: 'opp-visit',
      clientId: 'cli-visit',
      storeId: 'loja-1',
      sellerId: 'vend-1',
    }

    repo.addOpportunity(
      ref,
      baseFacts({
        statusCode: 'INT-V02',
        appointmentAt: NOW, // D0
        nextActionAt: NOW,
      }),
    )

    const res = await processDailyStoreBatch(repo, { storeId: 'loja-1', now: NOW })
    expect(res.updatedVisitsCount).toBe(1)
    expect(res.opportunitiesResults[0].decision.statusCode).toBe('INT-V05')
  })

  it('encontra ações vencidas e atualiza qualidade de execução', async () => {
    const repo = new InMemoryDailyProcessorRepository()
    const overdueDate = new Date(NOW.getTime() - 2 * 86_400_000) // 2 dias atrás
    const ref: OpportunityRef = {
      opportunityId: 'opp-overdue',
      clientId: 'cli-overdue',
      storeId: 'loja-1',
      sellerId: 'vend-1',
    }

    repo.addOpportunity(
      ref,
      baseFacts({
        statusCode: 'INT-C03',
        nextActionAt: overdueDate,
      }),
    )

    const res = await processDailyStoreBatch(repo, { storeId: 'loja-1', now: NOW })
    expect(res.overdueActionsCount).toBe(1)
    expect(repo.snapshots[0].priorityClass).toBe('Alta')
  })

  it('calcula Qualidade da Carteira da loja corretamente', () => {
    const report = computeStoreCarteiraQuality('loja-1', NOW, [
      {
        decision: {
          score: { total: 100, classification: 'Excelente', breakdown: {} as any, alerts: [], clientNeverResponded: false },
          priority: { classification: 'Máxima' } as any,
          urgency: 'actionToday',
          attackEligible: false,
        } as any,
        facts: baseFacts(),
      },
      {
        decision: {
          score: { total: 50, classification: 'Atenção', breakdown: {} as any, alerts: [], clientNeverResponded: false },
          priority: { classification: 'Média' } as any,
          urgency: 'actionOverdue',
          attackEligible: true,
        } as any,
        facts: baseFacts(),
      },
    ])

    expect(report.totalOpportunities).toBe(2)
    expect(report.averageScore).toBe(75)
    expect(report.scoreClassificationDistribution.Excelente).toBe(1)
    expect(report.scoreClassificationDistribution.Atenção).toBe(1)
    expect(report.overdueActionsCount).toBe(1)
    expect(report.attackEligibleCount).toBe(1)
  })
})

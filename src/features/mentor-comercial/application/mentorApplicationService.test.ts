import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import type { MentorDecision, OpportunityFacts, RuleCatalog, StoreSettings } from '../engine/engine'
import {
  applyMentorEvent,
  buildCentralActionKey,
  type CentralActionUpsert,
  type HistoryEntry,
  type MentorRepository,
  type OpportunityRef,
  type ScoreSnapshotEntry,
} from './mentorApplicationService'

/**
 * Testa a ORQUESTRAÇÃO: ordem das operações, idempotência e rollback.
 * O repositório é in-memory, então as invariantes são verificáveis sem banco.
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

class InMemoryRepository implements MentorRepository {
  calls: string[] = []
  actions = new Map<string, CentralActionUpsert>()
  history: HistoryEntry[] = []
  snapshots: ScoreSnapshotEntry[] = []
  savedDecisions: MentorDecision[] = []
  removedActions: string[] = []
  failOn: string | null = null

  constructor(
    private facts: OpportunityFacts,
    private settings: StoreSettings = {
      sellerResponseSlaMinutes: null,
      postSaleEnabled: false,
      warrantyFollowupEnabled: false,
    },
  ) {}

  private track(name: string) {
    this.calls.push(name)
    if (this.failOn === name) throw new Error(`falha simulada em ${name}`)
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
    // Espelha o índice único do banco: mesma chave sobrescreve, não duplica.
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
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    const snapshot = {
      actions: new Map(this.actions),
      history: [...this.history],
      snapshots: [...this.snapshots],
      savedDecisions: [...this.savedDecisions],
      removedActions: [...this.removedActions],
    }
    try {
      return await work()
    } catch (error) {
      this.actions = snapshot.actions
      this.history = snapshot.history
      this.snapshots = snapshot.snapshots
      this.savedDecisions = snapshot.savedDecisions
      this.removedActions = snapshot.removedActions
      throw error
    }
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

describe('buildCentralActionKey', () => {
  it('é determinística: mesma oportunidade, status e dia dão a mesma chave', () => {
    const a = buildCentralActionKey('opp-1', 'INT-C03', new Date('2026-08-10T09:00:00Z'))
    const b = buildCentralActionKey('opp-1', 'INT-C03', new Date('2026-08-10T18:30:00Z'))
    expect(a).toBe(b)
  })

  it('muda quando o status muda', () => {
    const a = buildCentralActionKey('opp-1', 'INT-C03', NOW)
    const b = buildCentralActionKey('opp-1', 'INT-C05', NOW)
    expect(a).not.toBe(b)
  })
})

describe('ordem de persistência', () => {
  it('grava oportunidade, flags, cadência, Central, histórico e score nessa ordem', async () => {
    const repo = new InMemoryRepository(baseFacts())
    await applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'k1' })
    expect(repo.calls).toEqual([
      'saveOpportunityState',
      'savePendingFlags',
      'saveCadenceState',
      'upsertCentralAction',
      'appendHistory',
      'appendScoreSnapshot',
    ])
  })
})

describe('idempotência', () => {
  it('aplicar o mesmo fato cinco vezes não cria action duplicada', async () => {
    const repo = new InMemoryRepository(baseFacts())
    for (let i = 0; i < 5; i += 1) {
      await applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'k1' })
    }
    expect(repo.actions.size).toBe(1)
  })

  it('aplicar o mesmo fato cinco vezes não duplica histórico nem snapshot', async () => {
    const repo = new InMemoryRepository(baseFacts())
    for (let i = 0; i < 5; i += 1) {
      await applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'k1' })
    }
    expect(repo.history.length).toBe(1)
    expect(repo.snapshots.length).toBe(1)
  })

  it('clique duplo no mesmo instante produz exatamente um efeito', async () => {
    const repo = new InMemoryRepository(baseFacts())
    await Promise.all([
      applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'dup' }),
      applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'dup' }),
    ])
    expect(repo.actions.size).toBe(1)
    expect(repo.history.length).toBe(1)
  })
})

describe('Central sai da visão ativa quando não há ação', () => {
  it('remove a action quando o status não pede Central', async () => {
    const repo = new InMemoryRepository(
      baseFacts({ statusCode: 'INT-Q05', nextActionAt: new Date('2026-12-01T09:00:00Z') }),
    )
    const result = await applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'k2' })
    expect(result.centralAction).toBeNull()
    expect(repo.removedActions).toContain('opp-1:no_central_action')
    expect(repo.actions.size).toBe(0)
  })
})

describe('rollback', () => {
  it('falha ao gravar histórico reverte a action e o estado já escritos', async () => {
    const repo = new InMemoryRepository(baseFacts())
    repo.failOn = 'appendHistory'
    await expect(applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'k3' })).rejects.toThrow(
      'falha simulada em appendHistory',
    )
    expect(repo.actions.size).toBe(0)
    expect(repo.savedDecisions.length).toBe(0)
    expect(repo.snapshots.length).toBe(0)
  })

  it('não deixa oportunidade avançada com Central desatualizada', async () => {
    const repo = new InMemoryRepository(baseFacts())
    repo.failOn = 'upsertCentralAction'
    await expect(applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'k4' })).rejects.toThrow()
    expect(repo.savedDecisions.length).toBe(0)
    expect(repo.actions.size).toBe(0)
  })
})

describe('evento do vendedor', () => {
  it('registra o resultado no histórico e move o status', async () => {
    const repo = new InMemoryRepository(baseFacts({ statusCode: 'INT-C01', nextActionAt: NOW }))
    const result = await applyMentorEvent(repo, {
      ref,
      now: NOW,
      idempotencyKey: 'k5',
      event: { result: 'Mensagem enviada', at: NOW },
    })
    expect(result.decision.statusCode).toBe('INT-C02')
    expect(repo.history[0].previousStatusCode).toBe('INT-C01')
    expect(repo.history[0].result).toBe('Mensagem enviada')
  })

  it('score snapshot registra o breakdown dos cinco pilares', async () => {
    const repo = new InMemoryRepository(baseFacts())
    await applyMentorEvent(repo, { ref, now: NOW, idempotencyKey: 'k6' })
    expect(Object.keys(repo.snapshots[0].breakdown).sort()).toEqual([
      'cadence',
      'execution',
      'history',
      'nextStep',
      'status',
    ])
    expect(repo.snapshots[0].score).toBe(100)
  })
})

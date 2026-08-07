import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import type { MentorDecision, OpportunityFacts, RuleCatalog, StoreSettings } from '../engine/engine'
import {
  adjustOrDeleteClosingEntry,
  findMatchingCustomer,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  processClosingEntry,
  resolveClosingStatusCode,
  resolveVisitStatusByDate,
  type ClosingEntryInput,
  type ClosingRepository,
  type CustomerEntity,
  type OpportunityEntity,
} from './closingIntegration'
import type {
  CentralActionUpsert,
  HistoryEntry,
  OpportunityRef,
  ScoreSnapshotEntry,
} from './mentorApplicationService'

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

const NOW = new Date('2026-08-10T10:00:00.000Z')

class InMemoryClosingRepository implements ClosingRepository {
  customers = new Map<string, CustomerEntity>()
  opportunities = new Map<string, OpportunityEntity>()
  actions = new Map<string, CentralActionUpsert>()
  history: HistoryEntry[] = []
  snapshots: ScoreSnapshotEntry[] = []
  savedDecisions: MentorDecision[] = []
  removedActions: string[] = []

  constructor(
    private storeSettings: StoreSettings = {
      sellerResponseSlaMinutes: null,
      postSaleEnabled: false,
      warrantyFollowupEnabled: false,
    },
  ) {}

  async findCustomerById(id: string) {
    return this.customers.get(id) ?? null
  }
  async findCustomersByStore(storeId: string) {
    return Array.from(this.customers.values()).filter((c) => c.storeId === storeId)
  }
  async saveCustomer(customer: CustomerEntity) {
    this.customers.set(customer.id, customer)
  }

  async findOpportunityById(id: string) {
    return this.opportunities.get(id) ?? null
  }
  async findOpportunityByClientAndStore(clientId: string, storeId: string) {
    return (
      Array.from(this.opportunities.values()).find(
        (o) => o.clientId === clientId && o.storeId === storeId,
      ) ?? null
    )
  }
  async saveOpportunityRecord(opp: OpportunityEntity) {
    this.opportunities.set(opp.id, opp)
  }

  async loadFacts(ref: OpportunityRef): Promise<OpportunityFacts> {
    const opp = this.opportunities.get(ref.opportunityId)
    return {
      statusCode: opp?.currentStatusCode ?? 'INT-C01',
      nextActionAt: opp?.appointmentAt ?? null,
      clientRespondedAt: null,
      clientNeverResponded: false,
      appointmentAt: opp?.appointmentAt ?? null,
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
    }
  }

  async loadStoreSettings() {
    return this.storeSettings
  }

  async loadCatalog() {
    return catalog
  }

  async saveOpportunityState(_r: OpportunityRef, decision: MentorDecision) {
    this.savedDecisions.push(decision)
  }

  async savePendingFlags() {}

  async saveCadenceState() {}

  async upsertCentralAction(action: CentralActionUpsert) {
    this.actions.set(action.idempotencyKey, action)
  }

  async removeCentralAction(opportunityId: string, reason: string) {
    this.removedActions.push(`${opportunityId}:${reason}`)
  }

  async appendHistory(entry: HistoryEntry) {
    if (this.history.some((h) => h.idempotencyKey === entry.idempotencyKey)) return
    this.history.push(entry)
  }

  async appendScoreSnapshot(entry: ScoreSnapshotEntry) {
    if (this.snapshots.some((s) => s.idempotencyKey === entry.idempotencyKey)) return
    this.snapshots.push(entry)
  }

  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    return await work()
  }
}

describe('Funções de normalização', () => {
  it('normalizePhone remove não dígitos', () => {
    expect(normalizePhone('(11) 99887-6655')).toBe('11998876655')
    expect(normalizePhone(null)).toBe('')
  })

  it('normalizeEmail converte para minúsculas e remove espaços', () => {
    expect(normalizeEmail('  Teste@Domain.Com  ')).toBe('teste@domain.com')
    expect(normalizeEmail(null)).toBe('')
  })

  it('normalizeName remove acentos e caracteres especiais', () => {
    expect(normalizeName(' João  da Silva ')).toBe('joao da silva')
    expect(normalizeName(null)).toBe('')
  })
})

describe('Deduplicação de cliente', () => {
  const existing: CustomerEntity[] = [
    {
      id: 'cli-1',
      storeId: 'loja-1',
      name: 'Carlos Silva',
      phone: '11999991111',
      whatsapp: '11999992222',
      email: 'carlos@email.com',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]

  it('deduplica por telefone normalizado', () => {
    const match = findMatchingCustomer(
      { name: 'Outro Nome', phone: '(11) 99999-1111' },
      existing,
    )
    expect(match?.id).toBe('cli-1')
  })

  it('deduplica por WhatsApp', () => {
    const match = findMatchingCustomer(
      { name: 'Outro Nome', phone: '11888880000', whatsapp: '11999992222' },
      existing,
    )
    expect(match?.id).toBe('cli-1')
  })

  it('deduplica por e-mail', () => {
    const match = findMatchingCustomer(
      { name: 'Carlos Santos', phone: '11777770000', email: 'Carlos@email.com' },
      existing,
    )
    expect(match?.id).toBe('cli-1')
  })

  it('deduplica por nome + telefone parcial (últimos 8 dígitos)', () => {
    const match = findMatchingCustomer(
      { name: 'Carlos Silva', phone: '551199991111' },
      existing,
    )
    expect(match?.id).toBe('cli-1')
  })

  it('não agrupa clientes diferentes quando os dados não batem', () => {
    const match = findMatchingCustomer(
      { name: 'Maria Oliveira', phone: '11988887777', email: 'maria@email.com' },
      existing,
    )
    expect(match).toBeNull()
  })
})

describe('Resolução de status de visita por data', () => {
  it('visita para o mesmo dia vira INT-V05', () => {
    const status = resolveVisitStatusByDate(new Date('2026-08-10T14:00:00Z'), NOW)
    expect(status).toBe('INT-V05')
  })

  it('visita para D+1 vira INT-V03', () => {
    const status = resolveVisitStatusByDate(new Date('2026-08-11T14:00:00Z'), NOW)
    expect(status).toBe('INT-V03')
  })

  it('visita para D+2 vira INT-V03', () => {
    const status = resolveVisitStatusByDate(new Date('2026-08-12T14:00:00Z'), NOW)
    expect(status).toBe('INT-V03')
  })

  it('visita para D+5 vira INT-V02', () => {
    const status = resolveVisitStatusByDate(new Date('2026-08-15T14:00:00Z'), NOW)
    expect(status).toBe('INT-V02')
  })
})

describe('Resolução de status do Fechamento Diário', () => {
  it('Venda Sim vira VEN-04', () => {
    const status = resolveClosingStatusCode({ saleStatus: 'sim', now: NOW })
    expect(status).toBe('VEN-04')
  })

  it('Venda Não exige motivo de perda', () => {
    expect(() =>
      resolveClosingStatusCode({ saleStatus: 'nao', lossReason: '', now: NOW }),
    ).toThrow('Motivo de perda é obrigatório para Venda Não.')
  })

  it('Venda Não com motivo vira PER-01', () => {
    const status = resolveClosingStatusCode({
      saleStatus: 'nao',
      lossReason: 'Preço alto',
      now: NOW,
    })
    expect(status).toBe('PER-01')
  })

  it('Negociação sem agendamento vira INT-Q04', () => {
    const status = resolveClosingStatusCode({ saleStatus: 'negociacao', now: NOW })
    expect(status).toBe('INT-Q04')
  })
})

describe('processClosingEntry e Invariante de Reagendamento', () => {
  it('TESTE OBRIGATÓRIO: reagendar duas vezes seguidas mantém 1 cliente e 1 oportunidade', async () => {
    const repo = new InMemoryClosingRepository()

    const inputFirst: ClosingEntryInput = {
      idempotencyKey: 'agendamento-1',
      storeId: 'loja-100',
      sellerId: 'vend-1',
      client: {
        name: 'Ana Souza',
        phone: '11977776666',
        email: 'ana@email.com',
      },
      saleStatus: 'negociacao',
      appointmentAt: new Date('2026-08-12T15:00:00.000Z'), // D+2 -> INT-V03
      now: NOW,
    }

    const firstResult = await processClosingEntry(repo, inputFirst)
    expect(firstResult.isNewCustomer).toBe(true)
    expect(firstResult.isNewOpportunity).toBe(true)
    expect(repo.customers.size).toBe(1)
    expect(repo.opportunities.size).toBe(1)
    expect(firstResult.opportunity.currentStatusCode).toBe('INT-V03')

    // Reagendamento 1: altera a data para D+5
    const inputSecond: ClosingEntryInput = {
      idempotencyKey: 'reagendamento-1',
      storeId: 'loja-100',
      sellerId: 'vend-1',
      client: {
        name: 'Ana Souza',
        phone: '(11) 97777-6666',
      },
      saleStatus: 'negociacao',
      appointmentAt: new Date('2026-08-15T15:00:00.000Z'), // D+5 -> INT-V02
      now: new Date('2026-08-10T11:00:00.000Z'),
    }

    const secondResult = await processClosingEntry(repo, inputSecond)
    expect(secondResult.isNewCustomer).toBe(false)
    expect(secondResult.isNewOpportunity).toBe(false)
    expect(secondResult.customer.id).toBe(firstResult.customer.id)
    expect(secondResult.opportunity.id).toBe(firstResult.opportunity.id)
    expect(repo.customers.size).toBe(1)
    expect(repo.opportunities.size).toBe(1)
    expect(secondResult.opportunity.currentStatusCode).toBe('INT-V02')

    // Reagendamento 2: altera a data para Hoje
    const inputThird: ClosingEntryInput = {
      idempotencyKey: 'reagendamento-2',
      storeId: 'loja-100',
      sellerId: 'vend-1',
      client: {
        name: 'Ana Souza',
        phone: '11977776666',
      },
      saleStatus: 'negociacao',
      appointmentAt: new Date('2026-08-10T16:00:00.000Z'), // Hoje -> INT-V05
      now: new Date('2026-08-10T12:00:00.000Z'),
    }

    const thirdResult = await processClosingEntry(repo, inputThird)
    expect(thirdResult.isNewCustomer).toBe(false)
    expect(thirdResult.isNewOpportunity).toBe(false)
    expect(thirdResult.customer.id).toBe(firstResult.customer.id)
    expect(thirdResult.opportunity.id).toBe(firstResult.opportunity.id)
    expect(repo.customers.size).toBe(1)
    expect(repo.opportunities.size).toBe(1)
    expect(thirdResult.opportunity.currentStatusCode).toBe('INT-V05')
  })

  it('Venda Sim grava histórico e transita status para VEN-04', async () => {
    const repo = new InMemoryClosingRepository()

    const input: ClosingEntryInput = {
      idempotencyKey: 'venda-1',
      storeId: 'loja-100',
      sellerId: 'vend-1',
      client: {
        name: 'Bruno Lima',
        phone: '11966665555',
      },
      saleStatus: 'sim',
      saleValue: 85000,
      now: NOW,
    }

    const result = await processClosingEntry(repo, input)
    expect(result.opportunity.currentStatusCode).toBe('VEN-04')
    expect(result.opportunity.saleValue).toBe(85000)
    expect(repo.history.length).toBeGreaterThan(0)
  })

  it('Exclusão/Ajuste preserva o cliente e registra histórico', async () => {
    const repo = new InMemoryClosingRepository()

    const input: ClosingEntryInput = {
      idempotencyKey: 'entry-orig',
      storeId: 'loja-100',
      sellerId: 'vend-1',
      client: {
        name: 'Clara Mendes',
        phone: '11955554444',
      },
      saleStatus: 'negociacao',
      now: NOW,
    }

    const result = await processClosingEntry(repo, input)
    expect(repo.customers.size).toBe(1)

    await adjustOrDeleteClosingEntry(repo, {
      opportunityId: result.opportunity.id,
      clientId: result.customer.id,
      storeId: 'loja-100',
      sellerId: 'vend-1',
      reason: 'Lançamento duplicado por engano',
      now: NOW,
      idempotencyKey: 'adj-1',
    })

    expect(repo.customers.size).toBe(1)
    expect(repo.history.some((h) => h.result === 'Lançamento duplicado por engano')).toBe(true)
  })
})

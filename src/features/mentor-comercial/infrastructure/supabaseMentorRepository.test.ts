import { describe, expect, it } from 'bun:test'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { CentralActionUpsert, HistoryEntry, OpportunityRef, ScoreSnapshotEntry } from '../application/mentorApplicationService'
import type { MentorDecision } from '../engine/engine'
import { SupabaseMentorRepository } from './supabaseMentorRepository'

/**
 * Mock builder leve para SupabaseClient sem chamadas de rede.
 */
function createMockSupabaseClient(tableResponses: Record<string, { data: unknown; error?: unknown }>) {
  const queryLog: Array<{ table: string; method: string; args: unknown[] }> = []

  const mockQueryBuilder = (table: string) => {
    const builder: Record<string, unknown> = {
      select: (...args: unknown[]) => {
        queryLog.push({ table, method: 'select', args })
        return builder
      },
      eq: (...args: unknown[]) => {
        queryLog.push({ table, method: 'eq', args })
        return builder
      },
      in: (...args: unknown[]) => {
        queryLog.push({ table, method: 'in', args })
        return builder
      },
      order: (...args: unknown[]) => {
        queryLog.push({ table, method: 'order', args })
        return builder
      },
      update: (...args: unknown[]) => {
        queryLog.push({ table, method: 'update', args })
        return builder
      },
      insert: (...args: unknown[]) => {
        queryLog.push({ table, method: 'insert', args })
        return builder
      },
      upsert: (...args: unknown[]) => {
        queryLog.push({ table, method: 'upsert', args })
        return builder
      },
      maybeSingle: async () => {
        queryLog.push({ table, method: 'maybeSingle', args: [] })
        const res = tableResponses[table] ?? { data: null, error: null }
        return { data: res.data, error: res.error ?? null }
      },
      then: (onfulfilled: (value: { data: unknown; error: unknown }) => unknown) => {
        const res = tableResponses[table] ?? { data: [], error: null }
        return Promise.resolve({ data: res.data, error: res.error ?? null }).then(onfulfilled)
      },
    }
    return builder
  }

  const client = {
    from: (table: string) => mockQueryBuilder(table),
  } as unknown as SupabaseClient

  return { client, queryLog }
}

const mockRef: OpportunityRef = {
  opportunityId: 'opp-123',
  clientId: 'cli-123',
  storeId: 'loja-123',
  sellerId: 'seller-123',
}

describe('SupabaseMentorRepository', () => {
  describe('loadCatalog e Cache', () => {
    it('carrega o catálogo das 5 tabelas e armazena em cache na memória', async () => {
      const mockData = {
        mentor_status_definitions: {
          data: [
            {
              status_code: 'ST-01',
              channel: 'Porta',
              family: 'Atendimento',
              label: 'Primeiro Contato',
              responsible: 'Vendedor',
              objective: 'Iniciar atendimento',
              next_step: 'Enviar mensagem',
            },
          ],
        },
        mentor_cadences: {
          data: [{ cadence_code: 'CAD-01', attempts_label: '3', day_pattern: 'D0, D+2, D+5' }],
        },
        mentor_cadence_steps: {
          data: [{ cadence_code: 'CAD-01', attempt_label: '1', offset_label: 'D0', step_order: 1 }],
        },
        mentor_scripts: {
          data: [{ script_code: 'SCR-01', body: 'Olá' }],
        },
        mentor_transitions: {
          data: [
            {
              family: 'Atendimento',
              from_status_or_context: 'Primeiro Contato',
              result: 'Mensagem enviada',
              to_status: 'Aguardando Cliente',
            },
          ],
        },
      }

      const { client, queryLog } = createMockSupabaseClient(mockData)
      const repo = new SupabaseMentorRepository(client)

      // Primeira busca: lê do "banco"
      const catalog1 = await repo.loadCatalog('v1')
      expect(catalog1.version).toBe('v1')
      expect(catalog1.statuses.length).toBe(1)
      expect(catalog1.statuses[0].statusId).toBe('ST-01')
      expect(catalog1.scriptIds.has('SCR-01')).toBe(true)

      const selectCount = queryLog.filter((q) => q.method === 'select').length
      expect(selectCount).toBe(5)

      // Segunda busca: deve vir do cache (nenhuma nova query)
      const catalog2 = await repo.loadCatalog('v1')
      expect(catalog2).toBe(catalog1)
      const selectCountAfter = queryLog.filter((q) => q.method === 'select').length
      expect(selectCountAfter).toBe(5)
    })
  })

  describe('loadStoreSettings', () => {
    it('retorna configurações padrão caso a loja não possua registro', async () => {
      const { client } = createMockSupabaseClient({})
      const repo = new SupabaseMentorRepository(client)

      const settings = await repo.loadStoreSettings('loja-sem-config')
      expect(settings.sellerResponseSlaMinutes).toBeNull()
      expect(settings.postSaleEnabled).toBe(false)
      expect(settings.warrantyFollowupEnabled).toBe(false)
    })

    it('retorna as configurações mapeadas da loja', async () => {
      const { client } = createMockSupabaseClient({
        store_commercial_settings: {
          data: {
            seller_response_sla_minutes: 30,
            post_sale_enabled: true,
            warranty_followup_enabled: false,
          },
        },
      })
      const repo = new SupabaseMentorRepository(client)

      const settings = await repo.loadStoreSettings('loja-123')
      expect(settings.sellerResponseSlaMinutes).toBe(30)
      expect(settings.postSaleEnabled).toBe(true)
      expect(settings.warrantyFollowupEnabled).toBe(false)
    })
  })

  describe('loadFacts', () => {
    it('monta os fatos a partir de oportunidades, cadencia_estado_cliente e mentor_pending_flags', async () => {
      const { client } = createMockSupabaseClient({
        oportunidades: {
          data: {
            current_status_code: 'ST-01',
            next_action_at: '2026-08-10T10:00:00Z',
            appointment_at: null,
            return_status_code: null,
            current_cadence_step: 1,
            current_next_step: 'Ligar',
          },
        },
        cadencia_estado_cliente: {
          data: {
            status: 'ativo',
            historico: [
              {
                cadenceId: 'CAD-01',
                currentAttempt: 1,
                totalAttempts: 3,
                pendingAttempts: 1,
                status: 'active',
                nextActionAt: '2026-08-10T10:00:00Z',
                startedAt: '2026-08-01T00:00:00Z',
                responsible: 'Vendedor',
                attackEligible: false,
                steps: [],
                lastIdempotencyKey: null,
              },
            ],
          },
        },
        mentor_pending_flags: {
          data: [{ flag_code: 'FLAG_DOC_PENDING' }],
        },
      })

      const repo = new SupabaseMentorRepository(client)
      const facts = await repo.loadFacts(mockRef)

      expect(facts.statusCode).toBe('ST-01')
      expect(facts.nextActionAt).toEqual(new Date('2026-08-10T10:00:00Z'))
      expect(facts.pendingFlags).toEqual(['FLAG_DOC_PENDING'])
      expect(facts.cadenceState?.cadenceId).toBe('CAD-01')
    })
  })

  describe('saveOpportunityState e persintências', () => {
    it('executa update em oportunidades com as colunas mentor_*', async () => {
      const { client, queryLog } = createMockSupabaseClient({})
      const repo = new SupabaseMentorRepository(client)

      const mockDecision = {
        statusCode: 'ST-02',
        previousStatusCode: 'ST-01',
        returnStatusCode: null,
        statusLabel: 'Aguardando',
        family: 'Atendimento',
        channel: 'Porta',
        responsible: 'Vendedor',
        temperature: 'Quente',
        objective: 'Acompanhar',
        nextStep: 'Ligar',
        potential: 'Alto',
        cadenceCode: 'CAD-01',
        cadenceMode: null,
        cadenceStep: 2,
        cadenceState: null,
        script: { code: 'SCR-01', body: 'Olá', placeholders: [], reason: 'OK' },
        scriptRef: 'SCR-01',
        nextActionAt: new Date('2026-08-10T15:00:00Z'),
        pendingFlags: [],
        score: {
          total: 100,
          breakdown: { status: 15, nextStep: 20, execution: 30, cadence: 20, history: 15 },
          classification: 'Excelente',
          alerts: [],
          clientNeverResponded: false,
        },
        priority: { index: 80, classification: 'Alta', urgencyPoints: 40, potentialPoints: 40 },
        urgency: 'actionToday',
        centralAction: true,
        centralRule: 'Sim',
        attackEligible: false,
        transition: null,
        requiresManualUpdate: false,
        explanations: [],
        ruleVersion: 'v1',
      } as unknown as MentorDecision

      await repo.saveOpportunityState(mockRef, mockDecision)

      const updateQuery = queryLog.find((q) => q.table === 'oportunidades' && q.method === 'update')
      expect(updateQuery).toBeDefined()
    })

    it('upsertCentralAction grava na tabela execution_actions com idempotency_key', async () => {
      const { client, queryLog } = createMockSupabaseClient({})
      const repo = new SupabaseMentorRepository(client)

      const action: CentralActionUpsert = {
        idempotencyKey: 'mentor:opp-123:ST-02:2026-08-10',
        opportunityId: 'opp-123',
        clientId: 'cli-123',
        storeId: 'loja-123',
        sellerId: 'seller-123',
        activityType: 'Atendimento',
        title: 'Ligar para cliente',
        objective: 'Confirmar interesse',
        dueAt: new Date('2026-08-10T10:00:00Z'),
        statusCode: 'ST-02',
        priority: 'Alta',
        sourceType: 'mentor_comercial',
      }

      await repo.upsertCentralAction(action)

      const upsertQuery = queryLog.find((q) => q.table === 'execution_actions' && q.method === 'upsert')
      expect(upsertQuery).toBeDefined()
    })

    it('appendHistory insere em eventos_comerciais com idempotency_key', async () => {
      const { client, queryLog } = createMockSupabaseClient({})
      const repo = new SupabaseMentorRepository(client)

      const entry: HistoryEntry = {
        opportunityId: 'opp-123',
        clientId: 'cli-123',
        storeId: 'loja-123',
        sellerId: 'seller-123',
        eventType: 'mentor_transition',
        previousStatusCode: 'ST-01',
        statusCode: 'ST-02',
        result: 'Mensagem enviada',
        idempotencyKey: 'key-hist-1',
        occurredAt: new Date('2026-08-10T10:00:00Z'),
      }

      await repo.appendHistory(entry)

      const upsertQuery = queryLog.find((q) => q.table === 'eventos_comerciais' && q.method === 'upsert')
      expect(upsertQuery).toBeDefined()
    })

    it('appendScoreSnapshot insere em mentor_score_snapshots', async () => {
      const { client, queryLog } = createMockSupabaseClient({})
      const repo = new SupabaseMentorRepository(client)

      const snapshot: ScoreSnapshotEntry = {
        opportunityId: 'opp-123',
        storeId: 'loja-123',
        sellerId: 'seller-123',
        score: 95,
        scoreClass: 'Excelente',
        breakdown: { status: 15, nextStep: 20, execution: 30, cadence: 15, history: 15 },
        priorityIndex: 85,
        priorityClass: 'Alta',
        reason: 'recalculation',
        ruleVersion: 'v1',
        idempotencyKey: 'key-score-1',
      }

      await repo.appendScoreSnapshot(snapshot)

      const upsertQuery = queryLog.find((q) => q.table === 'mentor_score_snapshots' && q.method === 'upsert')
      expect(upsertQuery).toBeDefined()
    })
  })

  describe('runInTransaction', () => {
    it('executa a função de trabalho fornecida', async () => {
      const { client } = createMockSupabaseClient({})
      const repo = new SupabaseMentorRepository(client)

      const res = await repo.runInTransaction(async () => 'ok')
      expect(res).toBe('ok')
    })
  })
})

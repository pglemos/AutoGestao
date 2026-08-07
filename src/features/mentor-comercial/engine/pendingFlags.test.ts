import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import type { OpportunityFacts, RuleCatalog, StoreSettings } from './engine'
import {
  enterSubProcess,
  isPendingStatus,
  isStatusValidInCatalog,
  resolveSubProcess,
} from './pendingFlags'

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

const NOW = new Date('2026-08-10T09:00:00.000Z')

const defaultSettings: StoreSettings = {
  sellerResponseSlaMinutes: null,
  postSaleEnabled: false,
  warrantyFollowupEnabled: false,
}

const buildFacts = (overrides: Partial<OpportunityFacts> = {}): OpportunityFacts => ({
  statusCode: 'INT-Q04',
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
  ...overrides,
})

describe('Pending Flags & Return Status (TASK 13 e 27)', () => {
  it('valida se códigos de status existem no catálogo', () => {
    expect(isStatusValidInCatalog('INT-Q04', catalog)).toBe(true)
    expect(isStatusValidInCatalog('FIN-01', catalog)).toBe(true)
    expect(isStatusValidInCatalog('STATUS_INEXISTENTE', catalog)).toBe(false)
    expect(isStatusValidInCatalog(null, catalog)).toBe(false)
  })

  it('identifica corretamente status de pendência/sub-processo', () => {
    expect(isPendingStatus('FIN-01', catalog)).toBe(true)
    expect(isPendingStatus('TR-01', catalog)).toBe(true)
    expect(isPendingStatus('INT-N10', catalog)).toBe(true)
    expect(isPendingStatus('INT-Q04', catalog)).toBe(false)
  })

  it('registra entrada em sub-processo salvando return_status = A', () => {
    const result = enterSubProcess({
      currentStatusCode: 'INT-Q04',
      returnStatusCode: null,
      pendingFlags: [],
      flagToAdd: 'financing_interest',
      targetStatusCode: 'FIN-01',
      catalog,
    })

    expect(result.statusCode).toBe('FIN-01')
    expect(result.returnStatusCode).toBe('INT-Q04')
    expect(result.pendingFlags).toEqual(['financing_interest'])
    expect(result.hasActivePendingFlags).toBe(true)
  })

  it('preserva o return_status original se nova flag for adicionada durante sub-processo ativo', () => {
    const step1 = enterSubProcess({
      currentStatusCode: 'INT-Q04',
      returnStatusCode: null,
      pendingFlags: [],
      flagToAdd: 'financing_interest',
      targetStatusCode: 'FIN-01',
      catalog,
    })

    const step2 = enterSubProcess({
      currentStatusCode: step1.statusCode,
      returnStatusCode: step1.returnStatusCode,
      pendingFlags: step1.pendingFlags,
      flagToAdd: 'spouse_decision',
      targetStatusCode: 'INT-N10',
      catalog,
    })

    expect(step2.statusCode).toBe('INT-N10')
    expect(step2.returnStatusCode).toBe('INT-Q04')
    expect(step2.pendingFlags).toEqual(['financing_interest', 'spouse_decision'])
    expect(step2.hasActivePendingFlags).toBe(true)
  })

  it('teste obrigatório: múltiplas flags simultâneas — resolver uma NÃO retorna a A se outra continuar aberta', () => {
    // Status A = INT-Q04
    // 1. Entram duas pendências: financing_interest + spouse_decision
    const activeSubProcess = enterSubProcess({
      currentStatusCode: 'INT-Q04',
      returnStatusCode: null,
      pendingFlags: [],
      flagToAdd: ['financing_interest', 'spouse_decision'],
      targetStatusCode: 'FIN-01',
      catalog,
    })

    expect(activeSubProcess.statusCode).toBe('FIN-01')
    expect(activeSubProcess.returnStatusCode).toBe('INT-Q04')
    expect(activeSubProcess.pendingFlags).toEqual(['financing_interest', 'spouse_decision'])

    // 2. Resolve a primeira pendência (financing_interest)
    const afterFirstResolve = resolveSubProcess({
      currentStatusCode: activeSubProcess.statusCode,
      returnStatusCode: activeSubProcess.returnStatusCode,
      pendingFlags: activeSubProcess.pendingFlags,
      flagToResolve: 'financing_interest',
      catalog,
    })

    // Deve PERMANECER em pendência e NÃO voltar a status A
    expect(afterFirstResolve.statusCode).toBe('FIN-01')
    expect(afterFirstResolve.returnStatusCode).toBe('INT-Q04')
    expect(afterFirstResolve.pendingFlags).toEqual(['spouse_decision'])
    expect(afterFirstResolve.hasActivePendingFlags).toBe(true)

    // 3. Resolve a segunda pendência (spouse_decision)
    const afterSecondResolve = resolveSubProcess({
      currentStatusCode: afterFirstResolve.statusCode,
      returnStatusCode: afterFirstResolve.returnStatusCode,
      pendingFlags: afterFirstResolve.pendingFlags,
      flagToResolve: 'spouse_decision',
      catalog,
    })

    // Sem pendências restantes: DEVE VOLTAR ao status A (INT-Q04) e limpar returnStatusCode
    expect(afterSecondResolve.statusCode).toBe('INT-Q04')
    expect(afterSecondResolve.returnStatusCode).toBeNull()
    expect(afterSecondResolve.pendingFlags).toEqual([])
    expect(afterSecondResolve.hasActivePendingFlags).toBe(false)
  })

  it('se status A não for mais válido, o engine resolve o próximo status determinístico ao quitar pendências', () => {
    const facts = buildFacts({
      statusCode: 'FIN-01',
      returnStatusCode: 'CÓDIGO_INVÁLIDO_OU_ARQUIVADO',
      pendingFlags: ['financing_interest'],
    })

    const result = resolveSubProcess({
      currentStatusCode: facts.statusCode,
      returnStatusCode: facts.returnStatusCode,
      pendingFlags: facts.pendingFlags,
      flagToResolve: 'financing_interest',
      catalog,
      facts,
      storeSettings: defaultSettings,
      now: NOW,
    })

    expect(result.pendingFlags).toEqual([])
    expect(result.returnStatusCode).toBeNull()
    expect(isStatusValidInCatalog(result.statusCode, catalog)).toBe(true)
    expect(result.hasActivePendingFlags).toBe(false)
  })
})

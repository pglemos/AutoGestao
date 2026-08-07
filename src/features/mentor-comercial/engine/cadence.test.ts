import { describe, expect, it } from 'bun:test'

import {
  advanceCadence,
  isCadenceRef,
  parseOffset,
  planCadence,
  registerClientResponse,
} from './cadence'
import type { CadenceState } from './cadence'

/**
 * Cadence Engine (TASK 15). Fonte: abas `03 Cadências` e `04 Passos_Cadência`.
 *
 * Invariantes obrigatórias:
 *  - uma única tentativa pendente por oportunidade/cadência
 *  - a próxima tentativa só nasce depois da anterior ser executada
 *  - cliente sem resposta NÃO faz a cadência avançar sozinha
 *  - cliente respondeu interrompe a cadência
 *  - fim da cadência sem resposta NÃO é perda
 *  - reprocessar é idempotente
 */

const CAD01_STEPS = [
  { attempt: '1', offset: 'D0' },
  { attempt: '2', offset: 'D+1' },
  { attempt: '3', offset: 'D+2' },
  { attempt: '4', offset: 'D+3' },
  { attempt: '5', offset: 'D+7' },
  { attempt: '6', offset: 'D+13' },
]

const START = new Date('2026-08-10T09:00:00.000Z') // segunda-feira

describe('isCadenceRef — coluna polimórfica da aba Status', () => {
  it('aceita referências CAD-*', () => {
    expect(isCadenceRef('CAD-01')).toBe(true)
    expect(isCadenceRef('CAD-13')).toBe(true)
  })

  it('rejeita diretivas de modo que não são cadência', () => {
    for (const directive of [
      'Automática',
      'Ação imediata',
      'Central',
      'Sem cadência',
      'Derivada pela data',
      'Verificação periódica',
    ]) {
      expect(isCadenceRef(directive)).toBe(false)
    }
  })
})

describe('parseOffset', () => {
  it('converte offsets numéricos de dias corridos', () => {
    expect(parseOffset('D0')).toEqual({ kind: 'calendarDays', days: 0 })
    expect(parseOffset('D+13')).toEqual({ kind: 'calendarDays', days: 13 })
    expect(parseOffset('D-2')).toEqual({ kind: 'calendarDays', days: -2 })
  })

  it('converte marcos em meses de CAD-13', () => {
    expect(parseOffset('12m')).toEqual({ kind: 'months', months: 12 })
    expect(parseOffset('24m')).toEqual({ kind: 'months', months: 24 })
  })

  it('reconhece offsets de dia útil de CAD-11', () => {
    expect(parseOffset('Dia útil')).toEqual({ kind: 'businessDay', days: 0 })
    expect(parseOffset('Próximo dia útil')).toEqual({ kind: 'businessDay', days: 1 })
  })

  it('reconhece offsets dependentes de configuração da loja', () => {
    expect(parseOffset('Configuração')).toEqual({ kind: 'storeConfigured' })
    expect(parseOffset('Data programada')).toEqual({ kind: 'scheduledDate' })
  })

  it('offset desconhecido não vira zero silencioso', () => {
    expect(parseOffset('vish')).toEqual({ kind: 'unknown', raw: 'vish' })
  })
})

describe('planCadence — uma tentativa pendente por vez', () => {
  it('inicia na tentativa 1 e agenda apenas ela', () => {
    const state = planCadence({ cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START })
    expect(state.currentAttempt).toBe(1)
    expect(state.totalAttempts).toBe(6)
    expect(state.status).toBe('active')
    expect(state.nextActionAt?.toISOString()).toBe('2026-08-10T09:00:00.000Z')
  })

  it('não expõe mais de uma tentativa pendente', () => {
    const state = planCadence({ cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START })
    expect(state.pendingAttempts).toBe(1)
  })
})

describe('advanceCadence — só avança com execução real', () => {
  const base = () => planCadence({ cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START })

  it('avança para a tentativa 2 em D+1 quando a 1 foi executada', () => {
    const next = advanceCadence(base(), { executed: true })
    expect(next.currentAttempt).toBe(2)
    expect(next.nextActionAt?.toISOString()).toBe('2026-08-11T09:00:00.000Z')
  })

  it('NÃO avança quando a tentativa não foi executada', () => {
    const state = base()
    const next = advanceCadence(state, { executed: false })
    expect(next.currentAttempt).toBe(1)
    expect(next).toEqual(state)
  })

  it('a passagem do tempo sozinha não avança a cadência', () => {
    const state = base()
    const next = advanceCadence(state, { executed: false, now: new Date('2026-09-30T09:00:00Z') })
    expect(next.currentAttempt).toBe(1)
  })

  it('respeita o padrão de dias completo de CAD-01', () => {
    let state = base()
    const dates: string[] = [state.nextActionAt!.toISOString().slice(0, 10)]
    for (let i = 0; i < 5; i += 1) {
      state = advanceCadence(state, { executed: true })
      dates.push(state.nextActionAt!.toISOString().slice(0, 10))
    }
    expect(dates).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-17',
      '2026-08-23',
    ])
  })
})

describe('fim da cadência sem resposta não é perda', () => {
  it('encerra como completedWithoutResponse e fica elegível ao Plano de Ataque', () => {
    let state = planCadence({ cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START })
    for (let i = 0; i < 6; i += 1) state = advanceCadence(state, { executed: true })
    expect(state.status).toBe('completedWithoutResponse')
    expect(state.attackEligible).toBe(true)
    expect(state.nextActionAt).toBeNull()
  })

  it('nunca marca perda automaticamente', () => {
    let state = planCadence({ cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START })
    for (let i = 0; i < 6; i += 1) state = advanceCadence(state, { executed: true })
    expect(state.status).not.toBe('lost')
  })

  it('avançar além do fim é no-op idempotente', () => {
    let state = planCadence({ cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START })
    for (let i = 0; i < 6; i += 1) state = advanceCadence(state, { executed: true })
    const after = advanceCadence(advanceCadence(state, { executed: true }), { executed: true })
    expect(after).toEqual(state)
  })
})

describe('cliente respondeu interrompe a cadência', () => {
  it('marca interrupted e passa a responsabilidade ao vendedor', () => {
    const state = planCadence({ cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START })
    const next = registerClientResponse(state, { at: new Date('2026-08-10T15:00:00Z') })
    expect(next.status).toBe('interrupted')
    expect(next.nextActionAt).toBeNull()
    expect(next.responsible).toBe('Vendedor')
  })

  it('cadência interrompida não avança mais', () => {
    const state = planCadence({ cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START })
    const interrupted = registerClientResponse(state, { at: START })
    expect(advanceCadence(interrupted, { executed: true })).toEqual(interrupted)
  })

  it('registrar resposta duas vezes é idempotente', () => {
    const state = planCadence({ cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START })
    const once = registerClientResponse(state, { at: START })
    const twice = registerClientResponse(once, { at: START })
    expect(twice).toEqual(once)
  })
})

describe('idempotência de reprocessamento', () => {
  it('planejar a mesma cadência repetidas vezes dá o mesmo estado', () => {
    const args = { cadenceId: 'CAD-01', steps: CAD01_STEPS, startedAt: START }
    expect(planCadence(args)).toEqual(planCadence(args))
  })

  it('executar 1, 2 e 5 vezes o mesmo avanço não cresce indevidamente', () => {
    const state: CadenceState = planCadence({
      cadenceId: 'CAD-01',
      steps: CAD01_STEPS,
      startedAt: START,
    })
    const once = advanceCadence(state, { executed: true, idempotencyKey: 'k1' })
    let many = once
    for (let i = 0; i < 4; i += 1) {
      many = advanceCadence(many, { executed: true, idempotencyKey: 'k1' })
    }
    expect(many).toEqual(once)
  })
})

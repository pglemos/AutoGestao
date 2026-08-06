import { describe, expect, test } from 'bun:test'
import type { AutosaveState } from './checkin-autosave.types'
import { CHECKIN_TELEMETRY, emitAutosaveTelemetry, emitRealtimeTelemetry } from './autosave-telemetry'

const state = (patch: Partial<AutosaveState>): AutosaveState => ({
  status: 'idle',
  lastSavedAt: null,
  revision: 1,
  error: null,
  serverRevision: null,
  pending: false,
  ...patch,
})

const context = { referenceDate: '2026-08-04', checkinId: 'checkin-1' }
const sempre = () => 0
const nunca = () => 0.99

describe('telemetria do autosave', () => {
  test('falha sempre é registrada', () => {
    expect(emitAutosaveTelemetry(state({ status: 'saving' }), state({ status: 'error', error: 'timeout' }), context, nunca))
      .toBe(CHECKIN_TELEMETRY.autosaveFailed)
  })

  test('conflito é registrado com o código do servidor', () => {
    expect(emitAutosaveTelemetry(state({ status: 'saving' }), state({ status: 'conflict', serverRevision: 5 }), context, nunca))
      .toBe(CHECKIN_TELEMETRY.autosaveConflict)
  })

  test('offline é registrado', () => {
    expect(emitAutosaveTelemetry(state({ status: 'dirty' }), state({ status: 'offline' }), context, nunca))
      .toBe(CHECKIN_TELEMETRY.autosaveOffline)
  })

  test('sucesso é amostrado — não gera um log por tecla', () => {
    expect(emitAutosaveTelemetry(state({ status: 'saving' }), state({ status: 'saved' }), context, nunca)).toBeNull()
    expect(emitAutosaveTelemetry(state({ status: 'saving' }), state({ status: 'saved' }), context, sempre))
      .toBe(CHECKIN_TELEMETRY.autosaveSucceeded)
  })

  test('re-render no mesmo estado não repete sinal', () => {
    expect(emitAutosaveTelemetry(state({ status: 'error' }), state({ status: 'error' }), context, sempre)).toBeNull()
  })

  test('canal realtime saudável não gera ruído', () => {
    expect(emitRealtimeTelemetry('SUBSCRIBED', 'eventos_comerciais')).toBeNull()
    expect(emitRealtimeTelemetry('CHANNEL_ERROR', 'eventos_comerciais'))
      .toBe(CHECKIN_TELEMETRY.realtimeChannelFailed)
  })

  test('nomes dos sinais são estáveis (chave de busca em incidente)', () => {
    expect(Object.values(CHECKIN_TELEMETRY)).toEqual([
      'checkin_autosave_started',
      'checkin_autosave_succeeded',
      'checkin_autosave_failed',
      'checkin_autosave_conflict',
      'checkin_autosave_offline',
      'checkin_finalization_started',
      'checkin_finalization_succeeded',
      'checkin_finalization_failed',
      'commercial_event_transaction_failed',
      'realtime_channel_failed',
      'realtime_fallback_enabled',
    ])
  })
})

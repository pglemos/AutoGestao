import { describe, expect, test } from 'bun:test'
import { buildReprocessingFingerprint, INITIAL_REPROCESSING_STATE, reprocessingReducer } from './reprocessingState'

describe('reprocessing state', () => {
  test('fingerprint is deterministic for object key order', () => {
    expect(buildReprocessingFingerprint('csv', { b: 2, a: 1 })).toBe(buildReprocessingFingerprint('csv', { a: 1, b: 2 }))
  })
  test('duplicate in-flight start is ignored and failure preserves params', () => {
    const input = reprocessingReducer(INITIAL_REPROCESSING_STATE, { type: 'set-input', operation: 'csv', params: { storeId: '1' } })
    const fingerprint = buildReprocessingFingerprint(input.operation, input.params)
    const running = reprocessingReducer(input, { type: 'start-run', fingerprint })
    expect(reprocessingReducer(running, { type: 'start-run', fingerprint })).toBe(running)
    const failed = reprocessingReducer(running, { type: 'fail', error: 'Falha' })
    expect(failed.params).toEqual({ storeId: '1' })
    expect(failed.runState).toBe('error')
  })
})

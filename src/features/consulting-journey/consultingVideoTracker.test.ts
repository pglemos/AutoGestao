import { describe, expect, test } from 'bun:test'
import { createConsultingVideoTracker } from './consultingVideoTracker'

describe('consultingVideoTracker', () => {
  test('acumula somente deslocamento plausível durante reprodução', () => {
    const tracker = createConsultingVideoTracker({ positionSeconds: 10, sampledAtMs: 1_000 })
    tracker.sample({ positionSeconds: 12, sampledAtMs: 3_000, playing: true })
    tracker.sample({ positionSeconds: 590, sampledAtMs: 5_000, playing: true })
    expect(tracker.drainPlayedDelta()).toBe(2)
  })

  test('retomada começa do ponto salvo sem contar o seek inicial', () => {
    const tracker = createConsultingVideoTracker({ positionSeconds: 120, sampledAtMs: 1_000 })
    tracker.sample({ positionSeconds: 120, sampledAtMs: 2_000, playing: false })
    tracker.sample({ positionSeconds: 125, sampledAtMs: 7_000, playing: true })
    expect(tracker.drainPlayedDelta()).toBe(5)
    expect(tracker.currentPosition()).toBe(125)
  })
})

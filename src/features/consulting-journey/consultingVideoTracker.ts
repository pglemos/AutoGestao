import { calculateEffectivePlayedDelta } from './consultingJourneyRules'

export function createConsultingVideoTracker(initial: { positionSeconds: number; sampledAtMs?: number }) {
  let positionSeconds = Math.max(0, initial.positionSeconds)
  let sampledAtMs = initial.sampledAtMs ?? Date.now()
  let pendingPlayedDelta = 0

  return {
    sample(input: { positionSeconds: number; sampledAtMs?: number; playing: boolean }): number {
      const nextAt = input.sampledAtMs ?? Date.now()
      const elapsedSeconds = Math.max(0, (nextAt - sampledAtMs) / 1000)
      const delta = calculateEffectivePlayedDelta({
        previousPosition: positionSeconds,
        currentPosition: input.positionSeconds,
        elapsedSeconds,
        playing: input.playing,
      })
      positionSeconds = Math.max(0, input.positionSeconds)
      sampledAtMs = nextAt
      pendingPlayedDelta += delta
      return delta
    },
    drainPlayedDelta(): number {
      const result = Math.max(0, Math.round(pendingPlayedDelta))
      pendingPlayedDelta = 0
      return result
    },
    currentPosition(): number {
      return positionSeconds
    },
    reset(position: number, atMs = Date.now()): void {
      positionSeconds = Math.max(0, position)
      sampledAtMs = atMs
      pendingPlayedDelta = 0
    },
  }
}

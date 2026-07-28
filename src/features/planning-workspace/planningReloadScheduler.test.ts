import { describe, expect, test } from 'bun:test'
import { createPlanningReloadScheduler } from './planningReloadScheduler'

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('createPlanningReloadScheduler', () => {
  test('agrupa rajada em uma recarga', async () => {
    let calls = 0
    const scheduler = createPlanningReloadScheduler(() => { calls += 1 }, { debounceMs: 5, maxWaitMs: 20 })
    scheduler.schedule()
    scheduler.schedule()
    scheduler.schedule()
    await sleep(15)
    expect(calls).toBe(1)
    scheduler.dispose()
  })

  test('enfileira exatamente uma recarga final durante operação em andamento', async () => {
    let calls = 0
    let release: (() => void) | null = null
    const scheduler = createPlanningReloadScheduler(async () => {
      calls += 1
      if (calls === 1) await new Promise<void>(resolve => { release = resolve })
    }, { debounceMs: 1, maxWaitMs: 5 })

    scheduler.flush()
    await sleep(1)
    scheduler.schedule()
    scheduler.schedule()
    await sleep(5)
    expect(calls).toBe(1)
    release?.()
    await sleep(5)
    expect(calls).toBe(2)
    scheduler.dispose()
  })
})

import { describe, expect, test } from 'bun:test'
import { createConsultingJourneyLoadCoordinator } from './consultingJourneyLoadCoordinator'

describe('consultingJourneyLoadCoordinator', () => {
  test('ignora resposta obsoleta após troca de loja', async () => {
    const resolvers = new Map<string, (value: unknown) => void>()
    const repository = {
      load: (storeId: string) => new Promise(resolve => resolvers.set(storeId, resolve)),
    }
    const snapshots: unknown[] = []
    const coordinator = createConsultingJourneyLoadCoordinator(repository as never, (value: unknown) => snapshots.push(value), () => {})
    const first = coordinator.load('store-1')
    const second = coordinator.load('store-2')
    resolvers.get('store-2')?.({ storeId: 'store-2' })
    await second
    resolvers.get('store-1')?.({ storeId: 'store-1' })
    await first
    expect(snapshots).toEqual([{ storeId: 'store-2' }])
  })
})

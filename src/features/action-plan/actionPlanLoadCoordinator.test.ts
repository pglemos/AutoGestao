import { describe, expect, test } from 'bun:test'
import { createActionPlanLoadCoordinator } from './actionPlanLoadCoordinator'
import type { ActionPlanRepository } from './actionPlan.types'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(next => { resolve = next })
  return { promise, resolve }
}

describe('actionPlanLoadCoordinator', () => {
  test('sem loja produz snapshot vazio sem consultar o repositório', async () => {
    let calls = 0
    const repository = { getActions: async () => { calls += 1; return [] }, getResponsiblePeople: async () => [] } as unknown as ActionPlanRepository
    const snapshots: unknown[] = []
    const coordinator = createActionPlanLoadCoordinator(repository, snapshot => snapshots.push(snapshot))
    await coordinator.load(null)
    expect(calls).toBe(0)
    expect(snapshots).toEqual([{ storeId: null, actions: [], responsiblePeople: [] }])
  })

  test('ignora resposta obsoleta quando a loja muda', async () => {
    const storeA = deferred<never[]>()
    const repository = {
      getActions: ({ storeId }: { storeId?: string | null }) => storeId === 'A' ? storeA.promise : Promise.resolve([{ id: 'B' }]),
      getResponsiblePeople: async ({ storeId }: { storeId?: string | null }) => [String(storeId)],
    } as unknown as ActionPlanRepository
    const snapshots: Array<{ storeId: string | null }> = []
    const coordinator = createActionPlanLoadCoordinator(repository, snapshot => snapshots.push(snapshot))
    const first = coordinator.load('A')
    await coordinator.load('B')
    storeA.resolve([])
    await first
    expect(snapshots.map(item => item.storeId)).toEqual(['B'])
  })

  test('carrega ações e responsáveis da mesma loja', async () => {
    const repository = {
      getActions: async ({ storeId }: { storeId?: string | null }) => [{ id: `action-${storeId}` }],
      getResponsiblePeople: async ({ storeId }: { storeId?: string | null }) => [`person-${storeId}`],
    } as unknown as ActionPlanRepository
    const snapshots: unknown[] = []
    const coordinator = createActionPlanLoadCoordinator(repository, snapshot => snapshots.push(snapshot))
    await coordinator.load('store-1')
    expect(snapshots).toEqual([{ storeId: 'store-1', actions: [{ id: 'action-store-1' }], responsiblePeople: ['person-store-1'] }])
  })
})

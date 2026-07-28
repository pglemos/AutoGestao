import type { ActionPlanItem, ActionPlanRepository } from './actionPlan.types'

export type ActionPlanSnapshot = {
  storeId: string | null
  actions: ActionPlanItem[]
  responsiblePeople: string[]
}

export type ActionPlanLoadCoordinator = {
  load(storeId: string | null): Promise<void>
  invalidate(): void
}

export function createActionPlanLoadCoordinator(
  repository: Pick<ActionPlanRepository, 'getActions' | 'getResponsiblePeople'>,
  onSnapshot: (snapshot: ActionPlanSnapshot) => void,
  onError: (error: unknown) => void = () => undefined,
): ActionPlanLoadCoordinator {
  let sequence = 0

  return {
    async load(storeId) {
      const requestId = ++sequence
      if (!storeId) {
        onSnapshot({ storeId: null, actions: [], responsiblePeople: [] })
        return
      }

      try {
        const [actions, responsiblePeople] = await Promise.all([
          repository.getActions({ storeId }),
          repository.getResponsiblePeople({ storeId }),
        ])
        if (requestId !== sequence) return
        onSnapshot({ storeId, actions, responsiblePeople })
      } catch (error) {
        if (requestId === sequence) onError(error)
      }
    },
    invalidate() {
      sequence += 1
    },
  }
}

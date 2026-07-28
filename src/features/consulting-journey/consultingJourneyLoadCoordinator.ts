import type { ConsultingJourneyRepository, ConsultingJourneySnapshot } from './consultingJourney.types'

export function createConsultingJourneyLoadCoordinator(
  repository: Pick<ConsultingJourneyRepository, 'load'>,
  onSnapshot: (snapshot: ConsultingJourneySnapshot | null) => void,
  onError: (cause: unknown) => void,
) {
  let sequence = 0
  return {
    async load(storeId: string | null): Promise<void> {
      const requestId = ++sequence
      if (!storeId) {
        onSnapshot(null)
        return
      }
      try {
        const snapshot = await repository.load(storeId)
        if (requestId === sequence) onSnapshot(snapshot)
      } catch (cause) {
        if (requestId === sequence) onError(cause)
      }
    },
    invalidate(): void {
      sequence += 1
    },
  }
}

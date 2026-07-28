import type { ActionPlanValidationResult } from './actionPlan.types'

export async function executeActionPlanMutation<T>({
  operation,
  reload,
  setPending,
}: {
  operation: () => Promise<T>
  reload: () => Promise<void>
  setPending: (pending: boolean) => void
}): Promise<T> {
  setPending(true)
  try {
    const result = await operation()
    await reload()
    return result
  } finally {
    setPending(false)
  }
}

export function validationResultOrThrow(result: ActionPlanValidationResult): ActionPlanValidationResult {
  if (!result.error) return result
  const message = result.errors?.length
    ? result.errors.join('; ')
    : result.message || 'Revise os requisitos da ação e tente novamente.'
  throw new Error(message)
}

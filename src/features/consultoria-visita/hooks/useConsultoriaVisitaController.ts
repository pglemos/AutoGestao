import { useCallback, useRef, useState } from 'react'

export type VisitSubmitState = 'idle' | 'saving' | 'completing'
export type VisitStepResult = { persisted: boolean; nextStep: number }

export function useConsultoriaVisitaController(input: {
  currentStep: number
  persistDraft: () => Promise<void>
  completeVisit: () => Promise<void>
}) {
  const submitLock = useRef(false)
  const [submitState, setSubmitState] = useState<VisitSubmitState>('idle')
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (
    mode: Exclude<VisitSubmitState, 'idle'>,
    operation: () => Promise<void>,
    nextStep: number,
  ): Promise<VisitStepResult> => {
    if (submitLock.current) return { persisted: false, nextStep: input.currentStep }
    submitLock.current = true
    setSubmitState(mode)
    setError(null)
    try {
      await operation()
      return { persisted: true, nextStep }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível persistir a visita.')
      return { persisted: false, nextStep: input.currentStep }
    } finally {
      submitLock.current = false
      setSubmitState('idle')
    }
  }, [input.currentStep])

  return {
    submitState,
    error,
    clearError: () => setError(null),
    save: (nextStep = input.currentStep) => execute('saving', input.persistDraft, nextStep),
    complete: () => execute('completing', input.completeVisit, input.currentStep),
  }
}

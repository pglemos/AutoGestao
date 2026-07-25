export type ReprocessingRunState = 'idle' | 'validating' | 'confirming' | 'running' | 'success' | 'partial' | 'error'

export type ReprocessingState = {
  runState: ReprocessingRunState
  operation: string
  params: Record<string, unknown>
  inFlightFingerprint: string | null
  error: string | null
}

export type ReprocessingAction =
  | { type: 'set-input'; operation: string; params: Record<string, unknown> }
  | { type: 'start-validation' }
  | { type: 'confirm' }
  | { type: 'start-run'; fingerprint: string }
  | { type: 'finish'; outcome: 'success' | 'partial' }
  | { type: 'fail'; error: string }
  | { type: 'reset-result' }

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]))
  }
  return value
}

export function buildReprocessingFingerprint(operation: string, params: Record<string, unknown>): string {
  return `${operation.trim()}:${JSON.stringify(stableValue(params))}`
}

export const INITIAL_REPROCESSING_STATE: ReprocessingState = {
  runState: 'idle',
  operation: '',
  params: {},
  inFlightFingerprint: null,
  error: null,
}

export function reprocessingReducer(state: ReprocessingState, action: ReprocessingAction): ReprocessingState {
  switch (action.type) {
    case 'set-input':
      return { ...state, operation: action.operation, params: action.params, error: null, runState: state.runState === 'running' ? state.runState : 'idle' }
    case 'start-validation':
      return { ...state, runState: 'validating', error: null }
    case 'confirm':
      return { ...state, runState: 'confirming', error: null }
    case 'start-run':
      if (state.inFlightFingerprint === action.fingerprint) return state
      return { ...state, runState: 'running', inFlightFingerprint: action.fingerprint, error: null }
    case 'finish':
      return { ...state, runState: action.outcome, inFlightFingerprint: null, error: null }
    case 'fail':
      return { ...state, runState: 'error', inFlightFingerprint: null, error: action.error }
    case 'reset-result':
      return { ...state, runState: 'idle', inFlightFingerprint: null, error: null }
  }
}

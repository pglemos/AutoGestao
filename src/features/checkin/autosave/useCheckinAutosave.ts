import { useCallback, useEffect, useRef, useState } from 'react'
import type { AutosaveSaveResult, AutosaveState } from './checkin-autosave.types'
import {
  createCheckinAutosaveCoordinator,
  type CheckinAutosaveCoordinator,
} from './checkin-autosave-coordinator'
import { emitAutosaveTelemetry, type AutosaveTelemetryContext } from './autosave-telemetry'

const INITIAL_STATE: AutosaveState = {
  status: 'idle',
  lastSavedAt: null,
  revision: 0,
  error: null,
  serverRevision: null,
  pending: false,
}

export interface UseCheckinAutosaveArgs<TSnapshot> {
  /** Grava o rascunho no servidor. Deve ser estável ou memoizada. */
  save: (snapshot: TSnapshot, expectedRevision: number) => Promise<AutosaveSaveResult>
  /**
   * Desliga o autosave sem desmontar o hook: fechamento já finalizado,
   * ajuste técnico, escopo histórico ou tela ainda hidratando.
   */
  enabled?: boolean
  /** Contexto dos sinais de observabilidade (sem PII). */
  telemetry?: AutosaveTelemetryContext
}

export interface UseCheckinAutosaveResult<TSnapshot> {
  state: AutosaveState
  /**
   * Estado atual sem passar pelo render. `state` é uma cópia da última
   * renderização e fica velho dentro de closures assíncronas.
   */
  getStateSnapshot: () => AutosaveState
  markDirty: (snapshot: TSnapshot) => void
  saveNow: (snapshot?: TSnapshot) => Promise<void>
  flush: () => Promise<AutosaveState>
  hydrate: (args: { revision: number; lastSavedAt?: string | null }) => void
  retry: () => Promise<void>
}

/**
 * Liga o coordenador serial de autosave ao ciclo de vida do React.
 *
 * O coordenador é criado uma única vez: recriá-lo a cada render perderia a
 * revisão conhecida e a gravação em voo. A função de save mais recente é lida
 * por ref, então mudanças de dependência não reiniciam o estado do autosave.
 */
export function useCheckinAutosave<TSnapshot>({
  save,
  enabled = true,
  telemetry,
}: UseCheckinAutosaveArgs<TSnapshot>): UseCheckinAutosaveResult<TSnapshot> {
  const [state, setState] = useState<AutosaveState>(INITIAL_STATE)
  const saveRef = useRef(save)
  saveRef.current = save
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const telemetryRef = useRef(telemetry)
  telemetryRef.current = telemetry
  const previousStateRef = useRef<AutosaveState | null>(null)

  const coordinatorRef = useRef<CheckinAutosaveCoordinator<TSnapshot> | null>(null)
  if (coordinatorRef.current === null) {
    coordinatorRef.current = createCheckinAutosaveCoordinator<TSnapshot>({
      save: (snapshot, expectedRevision) => saveRef.current(snapshot, expectedRevision),
      onStateChange: next => {
        const context = telemetryRef.current
        if (context) emitAutosaveTelemetry(previousStateRef.current, next, context)
        previousStateRef.current = next
        setState(next)
      },
    })
  }
  const coordinator = coordinatorRef.current

  useEffect(() => () => coordinator.dispose(), [coordinator])

  useEffect(() => {
    // Voltar a ter rede, ou voltar para a aba, são os dois momentos em que o
    // usuário espera que "o que eu digitei" tenha ido embora de fato.
    const flushIfNeeded = () => {
      if (!enabledRef.current) return
      if (coordinator.getState().pending) void coordinator.saveNow()
    }
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') flushIfNeeded()
    }
    window.addEventListener('online', flushIfNeeded)
    window.addEventListener('offline', flushIfNeeded)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('online', flushIfNeeded)
      window.removeEventListener('offline', flushIfNeeded)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [coordinator])

  const markDirty = useCallback((snapshot: TSnapshot) => {
    if (!enabledRef.current) return
    coordinator.markDirty(snapshot)
  }, [coordinator])

  const saveNow = useCallback(async (snapshot?: TSnapshot) => {
    if (!enabledRef.current) return
    await coordinator.saveNow(snapshot)
  }, [coordinator])

  const flush = useCallback(() => coordinator.flush(), [coordinator])

  const hydrate = useCallback(
    (args: { revision: number; lastSavedAt?: string | null }) => coordinator.hydrate(args),
    [coordinator],
  )

  const retry = useCallback(() => coordinator.retry(), [coordinator])

  const getStateSnapshot = useCallback(() => coordinator.getState(), [coordinator])

  return { state, getStateSnapshot, markDirty, saveNow, flush, hydrate, retry }
}

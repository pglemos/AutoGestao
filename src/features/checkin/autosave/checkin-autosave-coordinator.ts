import type {
  AutosaveSaveResult,
  AutosaveState,
  AutosaveStatus,
  AutosaveTimers,
} from './checkin-autosave.types'

export const AUTOSAVE_DEBOUNCE_MS = 750
export const AUTOSAVE_RETRY_DELAYS_MS = [1000, 2000, 4000] as const

export interface CheckinAutosaveCoordinatorOptions<TSnapshot> {
  /**
   * Grava o rascunho. Recebe a revisão conhecida para o servidor decidir se
   * ainda é a corrente — o coordenador nunca inventa revisão.
   */
  save: (snapshot: TSnapshot, expectedRevision: number) => Promise<AutosaveSaveResult>
  onStateChange?: (state: AutosaveState) => void
  debounceMs?: number
  retryDelaysMs?: readonly number[]
  timers?: AutosaveTimers
  isOnline?: () => boolean
}

export interface CheckinAutosaveCoordinator<TSnapshot> {
  getState: () => AutosaveState
  /** Marca alteração do formulário e agenda a gravação com debounce. */
  markDirty: (snapshot: TSnapshot) => void
  /** Grava agora (confirmação de etapa, botão "Salvar agora"). */
  saveNow: (snapshot?: TSnapshot) => Promise<void>
  /** Espera não haver nada pendente nem em voo. Usado antes de finalizar. */
  flush: () => Promise<AutosaveState>
  /** Sincroniza a revisão conhecida com a do banco (hidratação/refetch). */
  hydrate: (args: { revision: number; lastSavedAt?: string | null }) => void
  /** Reprocessa manualmente depois de erro ou conflito resolvido. */
  retry: () => Promise<void>
  /** Interrompe timers pendentes (unmount). */
  dispose: () => void
}

const defaultTimers: AutosaveTimers = {
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

function defaultIsOnline() {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

/**
 * Coordenador serial de autosave.
 *
 * Três garantias que motivam a existência deste módulo:
 *
 * 1. **Serial** — nunca há duas gravações em voo. Com upserts concorrentes, a
 *    resposta mais lenta poderia sobrescrever a mais nova.
 * 2. **Latest-wins** — enquanto uma gravação está em voo, alterações novas
 *    substituem a pendente em vez de formar fila. O usuário digitando rápido
 *    gera uma gravação por rodada, não uma por tecla.
 * 3. **Retry seletivo** — só erro transitório é repetido. Conflito de versão,
 *    sessão expirada e validação são estados que exigem decisão, não insistência.
 */
export function createCheckinAutosaveCoordinator<TSnapshot>(
  options: CheckinAutosaveCoordinatorOptions<TSnapshot>,
): CheckinAutosaveCoordinator<TSnapshot> {
  const {
    save,
    onStateChange,
    debounceMs = AUTOSAVE_DEBOUNCE_MS,
    retryDelaysMs = AUTOSAVE_RETRY_DELAYS_MS,
    timers = defaultTimers,
    isOnline = defaultIsOnline,
  } = options

  let state: AutosaveState = {
    status: 'idle',
    lastSavedAt: null,
    revision: 0,
    error: null,
    serverRevision: null,
    pending: false,
  }

  let pendingSnapshot: TSnapshot | null = null
  let hasPending = false
  let inFlight: Promise<void> | null = null
  let debounceHandle: unknown = null
  let retryHandle: unknown = null
  let retryCount = 0
  let disposed = false
  const waiters: Array<() => void> = []

  function emit(patch: Partial<AutosaveState>) {
    state = { ...state, ...patch, pending: hasPending }
    onStateChange?.(state)
  }

  function setStatus(status: AutosaveStatus, patch: Partial<AutosaveState> = {}) {
    emit({ status, ...patch })
  }

  function clearDebounce() {
    if (debounceHandle !== null) {
      timers.clearTimeout(debounceHandle)
      debounceHandle = null
    }
  }

  function clearRetry() {
    if (retryHandle !== null) {
      timers.clearTimeout(retryHandle)
      retryHandle = null
    }
  }

  function settleWaiters() {
    if (hasPending || inFlight) return
    while (waiters.length > 0) waiters.shift()?.()
  }

  async function run(): Promise<void> {
    if (disposed || inFlight || !hasPending) return

    if (!isOnline()) {
      // Sem rede não adianta tentar: o snapshot pendente fica guardado e o
      // reconnect reprocessa apenas a versão mais recente.
      setStatus('offline', { error: null })
      return
    }

    const snapshot = pendingSnapshot as TSnapshot
    // A pendência é consumida agora: alterações que chegarem durante o voo
    // marcam uma nova pendência e disparam outra rodada ao final.
    hasPending = false
    setStatus('saving', { error: null })

    const execution = (async () => {
      let result: AutosaveSaveResult
      try {
        result = await save(snapshot, state.revision)
      } catch (err) {
        result = {
          ok: false,
          kind: 'transient',
          message: err instanceof Error ? err.message : 'Falha de conexão ao salvar o rascunho.',
        }
      }

      if (disposed) return

      if (result.ok) {
        retryCount = 0
        setStatus('saved', {
          revision: result.revision,
          lastSavedAt: result.savedAt,
          error: null,
          serverRevision: null,
        })
        return
      }

      if (result.kind === 'conflict') {
        // O snapshot local não pode simplesmente ser reenviado: outra sessão
        // avançou. Quem decide o que fazer é o usuário.
        hasPending = false
        pendingSnapshot = null
        setStatus('conflict', {
          error: result.message,
          serverRevision: result.serverRevision ?? null,
        })
        return
      }

      if (result.kind === 'transient' && retryCount < retryDelaysMs.length) {
        const delay = retryDelaysMs[retryCount]
        retryCount += 1
        pendingSnapshot = snapshot
        hasPending = true
        setStatus(isOnline() ? 'saving' : 'offline', { error: result.message })
        retryHandle = timers.setTimeout(() => {
          retryHandle = null
          void run()
        }, delay)
        return
      }

      // Auth, validação, fatal ou retries esgotados: mantém o snapshot para o
      // usuário poder tentar de novo manualmente, mas para de insistir sozinho.
      pendingSnapshot = snapshot
      hasPending = true
      setStatus('error', { error: result.message })
    })()

    inFlight = execution
    try {
      await execution
    } finally {
      inFlight = null
      if (hasPending && retryHandle === null && !disposed && state.status !== 'error') {
        await run()
      }
      settleWaiters()
    }
  }

  return {
    getState: () => state,

    markDirty(snapshot) {
      if (disposed) return
      pendingSnapshot = snapshot
      hasPending = true
      clearRetry()
      retryCount = 0
      setStatus('dirty', { error: null })
      clearDebounce()
      debounceHandle = timers.setTimeout(() => {
        debounceHandle = null
        void run()
      }, debounceMs)
    },

    async saveNow(snapshot) {
      if (disposed) return
      if (snapshot !== undefined) {
        pendingSnapshot = snapshot
        hasPending = true
      }
      clearDebounce()
      clearRetry()
      retryCount = 0
      if (!hasPending) return
      await run()
    },

    async flush() {
      if (disposed) return state
      clearDebounce()
      clearRetry()
      if (hasPending && !inFlight) {
        retryCount = 0
        await run()
      } else if (inFlight) {
        await new Promise<void>(resolve => {
          waiters.push(resolve)
          settleWaiters()
        })
      }
      return state
    },

    hydrate({ revision, lastSavedAt }) {
      emit({
        revision,
        lastSavedAt: lastSavedAt ?? state.lastSavedAt,
        serverRevision: null,
        error: state.status === 'conflict' ? null : state.error,
        status: state.status === 'conflict' ? 'idle' : state.status,
      })
    },

    async retry() {
      if (disposed || !hasPending) return
      clearRetry()
      retryCount = 0
      await run()
    },

    dispose() {
      disposed = true
      clearDebounce()
      clearRetry()
      while (waiters.length > 0) waiters.shift()?.()
    },
  }
}

export type PlanningReloadScheduler = {
  schedule: () => void
  flush: () => void
  dispose: () => void
}

export function createPlanningReloadScheduler(
  reload: () => Promise<void> | void,
  options: { debounceMs?: number; maxWaitMs?: number } = {},
): PlanningReloadScheduler {
  const debounceMs = options.debounceMs ?? 450
  const maxWaitMs = options.maxWaitMs ?? 2_000
  let timer: ReturnType<typeof setTimeout> | null = null
  let burstStartedAt: number | null = null
  let inFlight: Promise<void> | null = null
  let reloadQueued = false
  let disposed = false

  const execute = () => {
    if (disposed) return
    if (inFlight) {
      reloadQueued = true
      return
    }

    const operation = Promise.resolve().then(reload)
    inFlight = operation
    void operation
      .catch(() => undefined)
      .finally(() => {
        inFlight = null
        if (disposed) return
        if (reloadQueued) {
          reloadQueued = false
          execute()
        }
      })
  }

  const clearTimer = () => {
    if (!timer) return
    clearTimeout(timer)
    timer = null
  }

  return {
    schedule() {
      if (disposed) return
      const now = Date.now()
      if (burstStartedAt === null) burstStartedAt = now
      clearTimer()
      const elapsed = now - burstStartedAt
      const delay = Math.max(0, Math.min(debounceMs, maxWaitMs - elapsed))
      timer = setTimeout(() => {
        timer = null
        burstStartedAt = null
        execute()
      }, delay)
    },
    flush() {
      if (disposed) return
      clearTimer()
      burstStartedAt = null
      execute()
    },
    dispose() {
      disposed = true
      clearTimer()
      burstStartedAt = null
      reloadQueued = false
    },
  }
}

import { describe, expect, test } from 'bun:test'
import type { AutosaveSaveResult, AutosaveTimers } from './checkin-autosave.types'
import { createCheckinAutosaveCoordinator } from './checkin-autosave-coordinator'

/** Relógio manual: nenhum teste depende de espera real. */
function createFakeTimers() {
  let seq = 0
  const scheduled = new Map<number, { at: number; handler: () => void }>()
  let now = 0
  const timers: AutosaveTimers = {
    setTimeout(handler, ms) {
      const id = ++seq
      scheduled.set(id, { at: now + ms, handler })
      return id
    },
    clearTimeout(handle) {
      scheduled.delete(handle as number)
    },
  }
  async function advance(ms: number) {
    now += ms
    const due = [...scheduled.entries()]
      .filter(([, item]) => item.at <= now)
      .sort((a, b) => a[1].at - b[1].at)
    for (const [id, item] of due) {
      scheduled.delete(id)
      item.handler()
      await Promise.resolve()
      await Promise.resolve()
    }
    await Promise.resolve()
  }
  return { timers, advance, pendingCount: () => scheduled.size }
}

/** Drena a fila de microtasks: o encadeamento save → finally → nova rodada. */
async function drain(times = 12) {
  for (let i = 0; i < times; i += 1) await Promise.resolve()
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

const ok = (revision: number): AutosaveSaveResult => ({
  ok: true,
  revision,
  savedAt: `2026-08-05T16:4${revision}:00.000Z`,
})

describe('createCheckinAutosaveCoordinator', () => {
  test('não salva no mount: sem markDirty não há gravação', async () => {
    const { timers, advance } = createFakeTimers()
    let calls = 0
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async () => { calls += 1; return ok(1) },
      timers,
    })
    await advance(5000)
    expect(calls).toBe(0)
    expect(coordinator.getState().status).toBe('idle')
  })

  test('markDirty marca dirty e só grava após o debounce', async () => {
    const { timers, advance } = createFakeTimers()
    let calls = 0
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async () => { calls += 1; return ok(1) },
      timers,
    })

    coordinator.markDirty('v1')
    expect(coordinator.getState().status).toBe('dirty')
    expect(coordinator.getState().pending).toBe(true)

    await advance(700)
    expect(calls).toBe(0)

    await advance(100)
    expect(calls).toBe(1)
    expect(coordinator.getState().status).toBe('saved')
    expect(coordinator.getState().revision).toBe(1)
    expect(coordinator.getState().pending).toBe(false)
  })

  test('digitação rápida coalesce numa gravação com o último valor', async () => {
    const { timers, advance } = createFakeTimers()
    const seen: string[] = []
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async snapshot => { seen.push(snapshot); return ok(1) },
      timers,
    })

    coordinator.markDirty('v1')
    await advance(200)
    coordinator.markDirty('v2')
    await advance(200)
    coordinator.markDirty('v3')
    await advance(800)

    expect(seen).toEqual(['v3'])
  })

  test('serializa: alteração durante o voo vira uma segunda rodada, não concorrência', async () => {
    const { timers, advance } = createFakeTimers()
    const first = deferred<AutosaveSaveResult>()
    const seen: string[] = []
    let inFlight = 0
    let maxInFlight = 0

    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async snapshot => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        seen.push(snapshot)
        const result = seen.length === 1 ? await first.promise : ok(2)
        inFlight -= 1
        return result
      },
      timers,
    })

    coordinator.markDirty('v1')
    await advance(800)
    expect(seen).toEqual(['v1'])

    coordinator.markDirty('v2')
    coordinator.markDirty('v3')
    await advance(800)
    // Ainda em voo: nada de segunda chamada concorrente.
    expect(seen).toEqual(['v1'])

    first.resolve(ok(1))
    await drain()

    expect(seen).toEqual(['v1', 'v3'])
    expect(maxInFlight).toBe(1)
  })

  test('envia a revisão conhecida e adota a devolvida pelo servidor', async () => {
    const { timers, advance } = createFakeTimers()
    const revisions: number[] = []
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async (_snapshot, expected) => { revisions.push(expected); return ok(revisions.length) },
      timers,
    })

    coordinator.markDirty('v1')
    await advance(800)
    coordinator.markDirty('v2')
    await advance(800)

    expect(revisions).toEqual([0, 1])
    expect(coordinator.getState().revision).toBe(2)
  })

  test('conflito não é reenviado e expõe a revisão do servidor', async () => {
    const { timers, advance } = createFakeTimers()
    let calls = 0
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async () => {
        calls += 1
        return { ok: false, kind: 'conflict', message: 'Atualizado em outra sessão.', serverRevision: 5 }
      },
      timers,
    })

    coordinator.markDirty('v1')
    await advance(800)
    await advance(10000)

    expect(calls).toBe(1)
    expect(coordinator.getState().status).toBe('conflict')
    expect(coordinator.getState().serverRevision).toBe(5)
    expect(coordinator.getState().pending).toBe(false)
  })

  test('erro transitório faz retry com backoff 1s/2s/4s e depois para', async () => {
    const { timers, advance } = createFakeTimers()
    let calls = 0
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async () => {
        calls += 1
        return { ok: false, kind: 'transient', message: 'timeout' }
      },
      timers,
    })

    coordinator.markDirty('v1')
    await advance(800)
    expect(calls).toBe(1)

    await advance(1000)
    expect(calls).toBe(2)

    await advance(2000)
    expect(calls).toBe(3)

    await advance(4000)
    expect(calls).toBe(4)

    await advance(60000)
    expect(calls).toBe(4)
    expect(coordinator.getState().status).toBe('error')
    expect(coordinator.getState().pending).toBe(true)
  })

  test('erro de autenticação não gera retry automático', async () => {
    const { timers, advance } = createFakeTimers()
    let calls = 0
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async () => {
        calls += 1
        return { ok: false, kind: 'auth', message: 'Sessão expirada.' }
      },
      timers,
    })

    coordinator.markDirty('v1')
    await advance(800)
    await advance(30000)

    expect(calls).toBe(1)
    expect(coordinator.getState().status).toBe('error')
  })

  test('offline não tenta gravar e o reconnect envia só o snapshot mais novo', async () => {
    const { timers, advance } = createFakeTimers()
    let online = false
    const seen: string[] = []
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async snapshot => { seen.push(snapshot); return ok(1) },
      timers,
      isOnline: () => online,
    })

    coordinator.markDirty('v1')
    await advance(800)
    expect(seen).toEqual([])
    expect(coordinator.getState().status).toBe('offline')

    coordinator.markDirty('v2')
    await advance(800)
    expect(seen).toEqual([])

    online = true
    await coordinator.retry()
    expect(seen).toEqual(['v2'])
    expect(coordinator.getState().status).toBe('saved')
  })

  test('saveNow ignora o debounce (confirmação de etapa)', async () => {
    const { timers, advance } = createFakeTimers()
    const seen: string[] = []
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async snapshot => { seen.push(snapshot); return ok(1) },
      timers,
    })

    coordinator.markDirty('v1')
    await coordinator.saveNow()
    expect(seen).toEqual(['v1'])
    await advance(5000)
    // O debounce agendado não pode gerar uma segunda gravação do mesmo estado.
    expect(seen).toEqual(['v1'])
  })

  test('flush aguarda a gravação em voo antes de liberar a finalização', async () => {
    const { timers, advance } = createFakeTimers()
    const pending = deferred<AutosaveSaveResult>()
    let finished = false
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async () => pending.promise,
      timers,
    })

    coordinator.markDirty('v1')
    await advance(800)

    const flushed = coordinator.flush().then(() => { finished = true })
    await advance(0)
    expect(finished).toBe(false)

    pending.resolve(ok(1))
    await flushed
    expect(finished).toBe(true)
    expect(coordinator.getState().pending).toBe(false)
  })

  test('flush grava a alteração ainda em debounce (nada de snapshot antigo)', async () => {
    const { timers } = createFakeTimers()
    const seen: string[] = []
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async snapshot => { seen.push(snapshot); return ok(1) },
      timers,
    })

    coordinator.markDirty('v1')
    const state = await coordinator.flush()
    expect(seen).toEqual(['v1'])
    expect(state.status).toBe('saved')
  })

  test('hydrate alinha a revisão vinda do banco e limpa conflito', async () => {
    const { timers, advance } = createFakeTimers()
    const revisions: number[] = []
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async (_s, expected) => {
        revisions.push(expected)
        return { ok: false, kind: 'conflict', message: 'conflito', serverRevision: 7 }
      },
      timers,
    })

    coordinator.markDirty('v1')
    await advance(800)
    expect(coordinator.getState().status).toBe('conflict')

    coordinator.hydrate({ revision: 7, lastSavedAt: '2026-08-05T16:00:00.000Z' })
    expect(coordinator.getState().status).toBe('idle')
    expect(coordinator.getState().revision).toBe(7)
    expect(coordinator.getState().lastSavedAt).toBe('2026-08-05T16:00:00.000Z')
  })

  test('dispose cancela timers pendentes (unmount não grava depois)', async () => {
    const { timers, advance, pendingCount } = createFakeTimers()
    let calls = 0
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async () => { calls += 1; return ok(1) },
      timers,
    })

    coordinator.markDirty('v1')
    coordinator.dispose()
    expect(pendingCount()).toBe(0)
    await advance(5000)
    expect(calls).toBe(0)
  })

  // O React roda o efeito de limpeza no duplo mount do StrictMode e em toda
  // remontagem da tela. Sem `resume`, o coordenador ficava descartado para
  // sempre e o autosave morria em silêncio — foi assim que ele chegou a
  // produção sem gravar nada automaticamente.
  test('resume revive o coordenador depois de um dispose', async () => {
    const { timers, advance } = createFakeTimers()
    let calls = 0
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async () => { calls += 1; return ok(1) },
      timers,
    })

    coordinator.dispose()
    expect(coordinator.isDisposed()).toBe(true)

    coordinator.markDirty('v1')
    await advance(5000)
    expect(calls).toBe(0)

    coordinator.resume()
    expect(coordinator.isDisposed()).toBe(false)

    coordinator.markDirty('v2')
    await advance(800)
    expect(calls).toBe(1)
    expect(coordinator.getState().status).toBe('saved')
  })

  test('exceção da camada de rede é tratada como transitória', async () => {
    const { timers, advance } = createFakeTimers()
    let calls = 0
    const coordinator = createCheckinAutosaveCoordinator<string>({
      save: async () => {
        calls += 1
        if (calls === 1) throw new Error('Failed to fetch')
        return ok(1)
      },
      timers,
    })

    coordinator.markDirty('v1')
    await advance(800)
    expect(calls).toBe(1)
    await advance(1000)
    expect(calls).toBe(2)
    expect(coordinator.getState().status).toBe('saved')
  })
})

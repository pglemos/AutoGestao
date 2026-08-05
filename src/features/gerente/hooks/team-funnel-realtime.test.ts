import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  isRealtimeFallbackStatus,
  subscribeToTeamFunnelRealtime,
  type TeamFunnelRealtimeStatus,
} from './team-funnel-realtime'

const hookSource = readFileSync(new URL('./useTeamFunnel.ts', import.meta.url), 'utf8')

function createFakeTimers() {
  let seq = 0
  let now = 0
  const scheduled = new Map<number, { at: number; handler: () => void }>()
  const timers = {
    setTimeout(handler: () => void, ms: number) {
      const id = ++seq
      scheduled.set(id, { at: now + ms, handler })
      return id
    },
    clearTimeout(handle: unknown) {
      scheduled.delete(handle as number)
    },
  }
  function advance(ms: number) {
    now += ms
    for (const [id, item] of [...scheduled.entries()].sort((a, b) => a[1].at - b[1].at)) {
      if (item.at <= now) {
        scheduled.delete(id)
        item.handler()
      }
    }
  }
  return { timers, advance, pending: () => scheduled.size }
}

function createFakeClient() {
  const subscriptions: Array<{ table: string; filter?: string }> = []
  const removed: string[] = []
  let emit: () => void = () => {}
  let statusCallback: (status: TeamFunnelRealtimeStatus) => void = () => {}
  const client = {
    channel(name: string) {
      const channel = {
        name,
        on(_event: 'postgres_changes', filter: { table: string; filter?: string }, callback: () => void) {
          subscriptions.push({ table: filter.table, filter: filter.filter })
          emit = callback
          return channel
        },
        subscribe(callback: (status: TeamFunnelRealtimeStatus) => void) {
          statusCallback = callback
          return channel
        },
      }
      return channel
    },
    removeChannel(channel: { name: string }) {
      removed.push(channel.name)
      return true
    },
  }
  return {
    client,
    subscriptions,
    removed,
    emit: () => emit(),
    setStatus: (status: TeamFunnelRealtimeStatus) => statusCallback(status),
  }
}

describe('subscribeToTeamFunnelRealtime', () => {
  test('assina eventos_comerciais filtrando pela loja ativa', () => {
    const fake = createFakeClient()
    subscribeToTeamFunnelRealtime({
      client: fake.client,
      storeId: 'loja-1',
      onChange: () => {},
    })
    expect(fake.subscriptions).toEqual([{ table: 'eventos_comerciais', filter: 'loja_id=eq.loja-1' }])
  })

  test('sem loja ativa deixa o recorte para a RLS, sem filtro cru', () => {
    const fake = createFakeClient()
    subscribeToTeamFunnelRealtime({
      client: fake.client,
      storeId: null,
      onChange: () => {},
    })
    expect(fake.subscriptions).toEqual([{ table: 'eventos_comerciais', filter: undefined }])
  })

  test('assina também agendamentos quando pedido', () => {
    const fake = createFakeClient()
    subscribeToTeamFunnelRealtime({
      client: fake.client,
      storeId: 'loja-1',
      tables: ['eventos_comerciais', 'agendamentos'],
      onChange: () => {},
    })
    expect(fake.subscriptions.map(s => s.table)).toEqual(['eventos_comerciais', 'agendamentos'])
  })

  test('agrupa eventos em rajada num único refetch', () => {
    const fake = createFakeClient()
    const { timers, advance } = createFakeTimers()
    let refetches = 0
    subscribeToTeamFunnelRealtime({
      client: fake.client,
      storeId: 'loja-1',
      onChange: () => { refetches += 1 },
      timers,
    })

    fake.emit()
    fake.emit()
    fake.emit()
    expect(refetches).toBe(0)

    advance(400)
    expect(refetches).toBe(1)
  })

  test('cleanup remove o canal e cancela o refetch agendado', () => {
    const fake = createFakeClient()
    const { timers, advance, pending } = createFakeTimers()
    let refetches = 0
    const unsubscribe = subscribeToTeamFunnelRealtime({
      client: fake.client,
      storeId: 'loja-1',
      onChange: () => { refetches += 1 },
      timers,
    })

    fake.emit()
    unsubscribe()

    expect(fake.removed).toEqual(['team-funnel-sync-loja-1'])
    expect(pending()).toBe(0)
    advance(1000)
    expect(refetches).toBe(0)
  })

  test('troca de loja cria canal próprio (assinatura anterior é removida pelo cleanup)', () => {
    const fake = createFakeClient()
    const unsubscribe = subscribeToTeamFunnelRealtime({
      client: fake.client,
      storeId: 'loja-1',
      onChange: () => {},
    })
    unsubscribe()
    subscribeToTeamFunnelRealtime({
      client: fake.client,
      storeId: 'loja-2',
      onChange: () => {},
    })
    expect(fake.removed).toEqual(['team-funnel-sync-loja-1'])
    expect(fake.subscriptions[1].filter).toBe('loja_id=eq.loja-2')
  })

  test('status classifica corretamente quando cair para polling', () => {
    expect(isRealtimeFallbackStatus('SUBSCRIBED')).toBe(false)
    expect(isRealtimeFallbackStatus('TIMED_OUT')).toBe(true)
    expect(isRealtimeFallbackStatus('CHANNEL_ERROR')).toBe(true)
    expect(isRealtimeFallbackStatus('CLOSED')).toBe(true)
  })
})

describe('useTeamFunnel', () => {
  test('assina realtime e expõe estado de sincronização', () => {
    expect(hookSource).toContain('subscribeToTeamFunnelRealtime')
    expect(hookSource).toContain("tables: ['eventos_comerciais', 'agendamentos']")
    expect(hookSource).toContain('realtimeStatus')
    expect(hookSource).toContain('lastSyncedAt')
  })

  test('polling só existe como fallback e pausa em aba oculta', () => {
    expect(hookSource).toContain('if (!realtimeDegraded || !initialized) return')
    expect(hookSource).toContain("document.visibilityState === 'hidden'")
    expect(hookSource).toContain('REALTIME_FALLBACK_POLL_MS')
  })
})

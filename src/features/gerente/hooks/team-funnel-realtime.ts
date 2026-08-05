export type TeamFunnelRealtimeStatus =
  | 'SUBSCRIBED'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'CHANNEL_ERROR'
  | string

export type TeamFunnelRealtimeTable = 'eventos_comerciais' | 'agendamentos'

type TeamFunnelRealtimeChannel = {
  on: (
    event: 'postgres_changes',
    filter: {
      event: '*'
      schema: 'public'
      table: TeamFunnelRealtimeTable
      filter?: string
    },
    callback: () => void,
  ) => TeamFunnelRealtimeChannel
  subscribe: (callback: (status: TeamFunnelRealtimeStatus) => void) => TeamFunnelRealtimeChannel
}

type TeamFunnelRealtimeClient = {
  channel: (name: string) => TeamFunnelRealtimeChannel
  removeChannel: (channel: TeamFunnelRealtimeChannel) => unknown
}

/** Realtime falhou de vez: a tela precisa cair para polling. */
export function isRealtimeFallbackStatus(status: TeamFunnelRealtimeStatus): boolean {
  return status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED'
}

export interface SubscribeToTeamFunnelArgs {
  client: TeamFunnelRealtimeClient
  /** Loja ativa. Sem ela a assinatura acompanha o escopo liberado pela RLS. */
  storeId: string | null
  tables?: TeamFunnelRealtimeTable[]
  onChange: () => void
  onStatus?: (status: TeamFunnelRealtimeStatus) => void
  /** Janela de agrupamento: uma venda gera vários eventos em sequência. */
  debounceMs?: number
  timers?: {
    setTimeout: (handler: () => void, ms: number) => unknown
    clearTimeout: (handle: unknown) => void
  }
}

const defaultTimers = {
  setTimeout: (handler: () => void, ms: number) => setTimeout(handler, ms),
  clearTimeout: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export const TEAM_FUNNEL_REALTIME_DEBOUNCE_MS = 400

/**
 * Assina as tabelas que alimentam o funil gerencial.
 *
 * O funil lia `eventos_comerciais` uma vez e ficava parado: a venda que o
 * vendedor acabou de registrar só aparecia depois de F5 ou troca de filtro.
 * O debounce existe porque uma única venda dispara oportunidade, evento e
 * agendamento quase ao mesmo tempo — sem ele seriam três refetches.
 */
export function subscribeToTeamFunnelRealtime({
  client,
  storeId,
  tables = ['eventos_comerciais'],
  onChange,
  onStatus,
  debounceMs = TEAM_FUNNEL_REALTIME_DEBOUNCE_MS,
  timers = defaultTimers,
}: SubscribeToTeamFunnelArgs) {
  let handle: unknown = null
  let disposed = false

  const scheduleChange = () => {
    if (disposed) return
    if (handle !== null) timers.clearTimeout(handle)
    handle = timers.setTimeout(() => {
      handle = null
      if (!disposed) onChange()
    }, debounceMs)
  }

  const scope = storeId ?? 'rls-scope'
  let channel = client.channel(`team-funnel-sync-${scope}`)
  for (const table of tables) {
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        // Sem loja ativa, o recorte fica por conta da RLS da tabela — o dono
        // enxerga a rede, o gerente enxerga a própria loja.
        ...(storeId ? { filter: `loja_id=eq.${storeId}` } : {}),
      },
      scheduleChange,
    )
  }
  channel = channel.subscribe(status => onStatus?.(status))

  return () => {
    disposed = true
    if (handle !== null) {
      timers.clearTimeout(handle)
      handle = null
    }
    void client.removeChannel(channel)
  }
}

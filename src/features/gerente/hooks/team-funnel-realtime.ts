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
  /**
   * Piso entre dois refetches. Cada refetch do funil relê a janela de 6 meses
   * de `eventos_comerciais`; numa loja movimentada, reagir a cada evento
   * multiplicaria esse payload e consumiria a cota de egress do projeto.
   */
  minIntervalMs?: number
  timers?: {
    setTimeout: (handler: () => void, ms: number) => unknown
    clearTimeout: (handle: unknown) => void
  }
  now?: () => number
}

const defaultTimers = {
  setTimeout: (handler: () => void, ms: number) => setTimeout(handler, ms),
  clearTimeout: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export const TEAM_FUNNEL_REALTIME_DEBOUNCE_MS = 400
/** No máximo um refetch a cada 15s por canal. */
export const TEAM_FUNNEL_REALTIME_MIN_INTERVAL_MS = 15_000

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
  minIntervalMs = TEAM_FUNNEL_REALTIME_MIN_INTERVAL_MS,
  timers = defaultTimers,
  now = () => Date.now(),
}: SubscribeToTeamFunnelArgs) {
  let handle: unknown = null
  let disposed = false
  let lastRunAt = 0

  const run = () => {
    handle = null
    if (disposed) return
    lastRunAt = now()
    onChange()
  }

  const scheduleChange = () => {
    if (disposed) return
    if (handle !== null) timers.clearTimeout(handle)
    // Espera o maior entre o debounce e o que falta para o piso: numa rajada
    // longa, o refetch acontece uma vez por janela, não uma vez por evento.
    const desdeUltimo = now() - lastRunAt
    const espera = lastRunAt === 0
      ? debounceMs
      : Math.max(debounceMs, minIntervalMs - desdeUltimo)
    handle = timers.setTimeout(run, espera)
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

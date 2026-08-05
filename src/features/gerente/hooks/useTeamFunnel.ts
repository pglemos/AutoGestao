import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  buildCurrentMonthRange,
  buildLastMonthRange,
  buildLastThreeMonthsRange,
  type FunnelRow,
  type PeriodRange,
} from '@/features/crm/lib/funil-vendas-diagnostico'
import { buildTeamFunnel, buildTeamRanking, collectSellerIds } from '@/features/gerente/lib/team-funnel'
import {
  isRealtimeFallbackStatus,
  subscribeToTeamFunnelRealtime,
  type TeamFunnelRealtimeStatus,
} from './team-funnel-realtime'

/** Sem Realtime, o funil recarrega a cada 30s enquanto a aba está visível. */
const REALTIME_FALLBACK_POLL_MS = 30_000

export type TeamPeriodKey = 'current_month' | 'last_month' | 'last_3_months'

export const TEAM_PERIOD_LABELS: Record<TeamPeriodKey, string> = {
  current_month: 'Este mês',
  last_month: 'Mês passado',
  last_3_months: 'Últimos 3 meses',
}

const EVENT_COLUMNS = 'id, tipo_evento, canal, modalidade, data_evento, loja_id, seller_user_id, cliente_id, oportunidade_id'
const EVENT_LIMIT = 5000

function resolvePeriod(key: TeamPeriodKey): PeriodRange {
  if (key === 'last_month') return buildLastMonthRange()
  if (key === 'last_3_months') return buildLastThreeMonthsRange()
  return buildCurrentMonthRange()
}

/** Janela mínima carregada: 6 meses, porque a evolução do funil é mensal. */
function loadWindowStart(period: PeriodRange) {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
  return period.start.getTime() < sixMonthsAgo.getTime() ? period.start : sixMonthsAgo
}

/**
 * Funil comercial da equipe. O escopo de loja vem da RLS de
 * `eventos_comerciais` (`is_manager_of` / `is_owner_of`): o gerente enxerga a
 * loja dele, o dono enxerga a rede. Quando há loja ativa selecionada, o filtro
 * explícito por `loja_id` recorta ainda mais.
 */
export function useTeamFunnel(periodKey: TeamPeriodKey) {
  const { profile, storeId, activeStoreId, initialized } = useAuth()
  const effectiveStoreId = activeStoreId || storeId || profile?.store_id || null

  const [events, setEvents] = useState<FunnelRow[]>([])
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [storeConfig, setStoreConfig] = useState<FunnelRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const period = useMemo(() => resolvePeriod(periodKey), [periodKey])
  const windowStart = useMemo(() => loadWindowStart(period).toISOString(), [period])

  const load = useCallback(async () => {
    if (!initialized) return
    setLoading(true)
    setError(null)

    let query = supabase
      .from('eventos_comerciais')
      .select(EVENT_COLUMNS)
      .gte('data_evento', windowStart)
      .order('data_evento', { ascending: false })
      .limit(EVENT_LIMIT)

    if (effectiveStoreId) query = query.eq('loja_id', effectiveStoreId)

    const { data, error: eventsError } = await query
    if (eventsError) {
      setEvents([])
      setNames(new Map())
      setError(eventsError.message)
      setLoading(false)
      return
    }

    const rows = (Array.isArray(data) ? data : []) as FunnelRow[]
    setEvents(rows)

    const sellerIds = collectSellerIds(rows)
    if (sellerIds.length > 0) {
      const { data: users } = await supabase.from('usuarios').select('id, name').in('id', sellerIds)
      const map = new Map<string, string>()
      for (const user of (users ?? []) as Array<{ id: string; name: string | null }>) {
        if (user?.id) map.set(user.id, user.name || 'Vendedor sem cadastro')
      }
      setNames(map)
    } else {
      setNames(new Map())
    }

    if (effectiveStoreId) {
      const { data: config } = await supabase
        .from('regras_metas_loja')
        .select('*')
        .eq('store_id', effectiveStoreId)
        .maybeSingle()
      setStoreConfig((config as FunnelRow) ?? null)
    } else {
      setStoreConfig(null)
    }

    setLoading(false)
  }, [effectiveStoreId, initialized, windowStart])

  useEffect(() => {
    void load()
  }, [load])

  // Realtime: o funil ficava congelado até um F5. A venda que o vendedor
  // acabou de registrar precisa aparecer para a gestão sem recarregar a tela.
  const [realtimeStatus, setRealtimeStatus] = useState<TeamFunnelRealtimeStatus>('CLOSED')
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const reload = useCallback(async () => {
    await load()
    setLastSyncedAt(new Date())
  }, [load])

  useEffect(() => {
    if (!initialized) return
    return subscribeToTeamFunnelRealtime({
      client: supabase as unknown as Parameters<typeof subscribeToTeamFunnelRealtime>[0]['client'],
      storeId: effectiveStoreId,
      tables: ['eventos_comerciais', 'agendamentos'],
      onChange: () => { void reload() },
      onStatus: setRealtimeStatus,
    })
  }, [effectiveStoreId, initialized, reload])

  // Fallback: só entra quando o canal falha de verdade. Polling permanente
  // custaria uma consulta a cada 30s para toda a gestão sem necessidade.
  const realtimeDegraded = isRealtimeFallbackStatus(realtimeStatus)
  useEffect(() => {
    if (!realtimeDegraded || !initialized) return
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
      void reload()
    }, REALTIME_FALLBACK_POLL_MS)
    return () => clearInterval(interval)
  }, [realtimeDegraded, initialized, reload])

  // Meta da equipe = meta mensal da loja (regras_metas_loja.monthly_goal). Sem
  // regra configurada a meta fica nula e a tela mostra "não configurada" em vez
  // de arbitrar um número.
  const meta = useMemo(() => {
    const raw = storeConfig?.monthly_goal
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }, [storeConfig])

  const dashboard = useMemo(
    () => buildTeamFunnel({ events, period, storeId: effectiveStoreId, meta, storeConfig }),
    [effectiveStoreId, events, meta, period, storeConfig],
  )

  const ranking = useMemo(() => buildTeamRanking(events, period, names), [events, names, period])

  return {
    dashboard,
    ranking,
    period,
    loading,
    error,
    refetch: reload,
    hasEvents: events.length > 0,
    realtimeStatus,
    realtimeDegraded,
    lastSyncedAt,
  }
}

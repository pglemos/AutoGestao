import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { endOfMonth, format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { getSafeUserFacingDataError } from '@/lib/errors/user-facing-error'
import { networkCockpitRepository, ownerNetworkCockpitRepository, type NetworkCockpitScope } from '../data/networkCockpitRepository'
import { resolveNetworkDateRange, validateNetworkDateRange } from '../lib/networkDashboardCalculations'
import { filterAndSortStoreDiagnostics } from '../lib/networkDashboardFilters'
import type { NetworkCockpitStore, NetworkDateRange, NetworkReportType, NetworkSort, NetworkStatusFilter, NetworkTimeframe } from '../types'

const reportLabels: Record<NetworkReportType, string> = {
  matinal: 'Relatório matinal', semanal: 'Relatório semanal', mensal: 'Relatório mensal',
}

export const REALTIME_DEBOUNCE_MS = 450
export const REALTIME_MAX_WAIT_MS = 2_000
export type RealtimeStatus = 'connecting' | 'connected' | 'degraded'

export const NETWORK_COCKPIT_REALTIME_TABLES = [
  'lancamentos_diarios', 'eventos_comerciais', 'clientes', 'agendamentos', 'atendimentos', 'oportunidades',
  'vendedores_loja', 'vinculos_loja', 'lojas', 'regras_metas_loja', 'seller_routine_snapshots',
  'manager_routine_snapshots', 'planos_acao', 'historico_planos_acao', 'evidencias_planos_acao',
  'itens_plano_acao', 'valores_indicadores_planejamento', 'clientes_consultoria', 'visitas_consultoria',
  'evidencias_visita', 'consultoria_progresso_aula', 'consultoria_itens_entrega',
  'consultoria_participantes_encontro', 'consultoria_solicitacoes_antecipacao',
] as const

export function useNetworkDashboardController(scope: NetworkCockpitScope = 'internal') {
  const repository = scope === 'owner' ? ownerNetworkCockpitRepository : networkCockpitRepository
  const requestSequence = useRef(0)
  const realtimeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const realtimeBurstStartedAt = useRef<number | null>(null)
  const snapshotInFlight = useRef<Promise<void> | null>(null)
  const reloadQueued = useRef(false)
  const initialRange = useMemo<NetworkDateRange>(() => ({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  }), [])

  const [rows, setRows] = useState<NetworkCockpitStore[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')
  const realtimeStatusRef = useRef<RealtimeStatus>('connecting')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<NetworkStatusFilter>('all')
  const [timeframe, setTimeframe] = useState<NetworkTimeframe>('mensal')
  const [customRange, setCustomRange] = useState(initialRange)
  const [sort, setSort] = useState<NetworkSort>({ key: 'sales', direction: 'desc' })
  const [reportLoading, setReportLoading] = useState<NetworkReportType | null>(null)

  const fetchSnapshot = useCallback((manual = false): Promise<void> => {
    if (snapshotInFlight.current) {
      reloadQueued.current = true
      if (manual) setRefreshing(true)
      return snapshotInFlight.current
    }

    const operation = (async () => {
      const requestId = ++requestSequence.current
      if (manual) setRefreshing(true)
      else setLoading(true)
      const range = resolveNetworkDateRange(timeframe, customRange)
      const validation = validateNetworkDateRange(range)
      if (validation) {
        setError(validation); setLoading(false); setRefreshing(false); return
      }
      try {
        const nextRows = await repository.load(range)
        if (requestId !== requestSequence.current) return
        setRows(nextRows)
        setError(null)
        setLastUpdatedAt(new Date())
      } catch (cause) {
        if (requestId === requestSequence.current) {
          setError(getSafeUserFacingDataError(cause, 'Não foi possível atualizar o cockpit operacional.'))
        }
      } finally {
        if (requestId === requestSequence.current) { setLoading(false); setRefreshing(false) }
      }
    })()

    snapshotInFlight.current = operation
    void operation.finally(() => {
      snapshotInFlight.current = null
      if (reloadQueued.current) { reloadQueued.current = false; void fetchSnapshot(false) }
    })
    return operation
  }, [customRange, repository, timeframe])

  useEffect(() => { void fetchSnapshot(false) }, [fetchSnapshot])

  useEffect(() => {
    const scheduleReload = () => {
      const now = Date.now()
      if (realtimeBurstStartedAt.current === null) realtimeBurstStartedAt.current = now
      if (realtimeTimer.current) clearTimeout(realtimeTimer.current)
      const elapsed = now - realtimeBurstStartedAt.current
      const delay = Math.max(0, Math.min(REALTIME_DEBOUNCE_MS, REALTIME_MAX_WAIT_MS - elapsed))
      realtimeTimer.current = setTimeout(() => {
        realtimeBurstStartedAt.current = null
        if (snapshotInFlight.current) reloadQueued.current = true
        else void fetchSnapshot(false)
      }, delay)
    }

    const channel = supabase.channel('internal-network-dashboard-live')
    for (const table of NETWORK_COCKPIT_REALTIME_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload)
    }
    channel.subscribe((nextStatus: string) => {
      if (nextStatus === 'SUBSCRIBED') {
        const wasDegraded = realtimeStatusRef.current === 'degraded'
        realtimeStatusRef.current = 'connected'
        setRealtimeStatus('connected')
        if (wasDegraded) scheduleReload()
      }
      if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT' || nextStatus === 'CLOSED') {
        realtimeStatusRef.current = 'degraded'
        setRealtimeStatus('degraded')
      }
    })
    return () => {
      if (realtimeTimer.current) clearTimeout(realtimeTimer.current)
      realtimeBurstStartedAt.current = null
      reloadQueued.current = false
      void supabase.removeChannel(channel)
    }
  }, [fetchSnapshot])

  const triggerReport = useCallback(async (type: NetworkReportType) => {
    if (reportLoading) return
    setReportLoading(type)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(`relatorio-${type}`)
      if (invokeError) throw new Error(String((data as { error?: string } | null)?.error || invokeError.message))
      toast.success(`${reportLabels[type]} disparado com sucesso.`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao disparar relatório.')
    } finally { setReportLoading(null) }
  }, [reportLoading])

  const visibleRows = useMemo(() => filterAndSortStoreDiagnostics({ rows, search, status, sort }), [rows, search, status, sort])
  const metrics = useMemo(() => rows.reduce((acc, row) => ({
    stores: acc.stores + 1,
    sales: acc.sales + row.sales,
    goal: acc.goal + row.goal,
    critical: acc.critical + (row.riskReasons.length > 0 && (row.ritmo < 50 || row.disciplinePct < 50) ? 1 : 0),
  }), { stores: 0, sales: 0, goal: 0, critical: 0 }), [rows])

  return {
    rows: visibleRows, allRows: rows, metrics, loading, refreshing, error, lastUpdatedAt, realtimeStatus,
    search, setSearch, status, setStatus, timeframe, setTimeframe, customRange, setCustomRange,
    sort, setSort, reportLoading, refresh: () => fetchSnapshot(true), triggerReport,
  }
}

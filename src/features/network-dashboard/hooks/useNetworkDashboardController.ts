import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { endOfMonth, format, getDate } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { useAllStoreGoals } from '@/hooks/useGoals'
import { toast } from '@/lib/toast'
import { buildStoreDiagnostic, resolveNetworkDateRange, validateNetworkDateRange } from '../lib/networkDashboardCalculations'
import { filterAndSortStoreDiagnostics } from '../lib/networkDashboardFilters'
import type {
  NetworkDateRange,
  NetworkReportType,
  NetworkSort,
  NetworkStatusFilter,
  NetworkTimeframe,
  StoreDiagnostic,
} from '../types'

const reportLabels: Record<NetworkReportType, string> = {
  matinal: 'Relatório matinal',
  semanal: 'Relatório semanal',
  mensal: 'Relatório mensal',
}

export function useNetworkDashboardController() {
  const requestSequence = useRef(0)
  const { metas, loading: goalsLoading } = useAllStoreGoals()
  const initialRange = useMemo<NetworkDateRange>(() => ({
    start: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  }), [])

  const [rows, setRows] = useState<StoreDiagnostic[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<NetworkStatusFilter>('all')
  const [timeframe, setTimeframe] = useState<NetworkTimeframe>('mensal')
  const [customRange, setCustomRange] = useState(initialRange)
  const [sort, setSort] = useState<NetworkSort>({ key: 'sales', direction: 'desc' })
  const [reportLoading, setReportLoading] = useState<NetworkReportType | null>(null)

  const fetchSnapshot = useCallback(async (manual = false) => {
    const requestId = ++requestSequence.current
    manual ? setRefreshing(true) : setLoading(true)
    const range = resolveNetworkDateRange(timeframe, customRange)
    const validation = validateNetworkDateRange(range)
    if (validation) {
      setError(validation)
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      const [summary, stores, sellers, checkins] = await Promise.all([
        supabase.rpc('get_resumo_rede_periodo', { p_start_date: range.start, p_end_date: range.end, p_scope: 'daily' }),
        supabase.from('lojas').select('id,name').eq('active', true),
        supabase.from('vendedores_loja').select('store_id').eq('is_active', true),
        supabase.rpc('get_lancamentos_referencia_dia', { p_reference_date: format(new Date(), 'yyyy-MM-dd'), p_scope: 'daily' }),
      ])
      const firstError = summary.error || stores.error || sellers.error || checkins.error
      if (firstError) throw firstError
      if (requestId !== requestSequence.current) return

      const aggregate = new Map<string, { sales: number; leads: number; agd: number; vis: number }>()
      for (const item of (summary.data || []) as Array<Record<string, unknown>>) {
        aggregate.set(String(item.store_id), {
          sales: Number(item.sales || 0),
          leads: Number(item.leads || 0),
          agd: Number(item.agd || 0),
          vis: Number(item.vis || 0),
        })
      }
      const sellerCounts = new Map<string, number>()
      for (const item of (sellers.data || []) as Array<{ store_id: string }>) {
        sellerCounts.set(item.store_id, (sellerCounts.get(item.store_id) || 0) + 1)
      }
      const checkinCounts = new Map<string, number>()
      for (const item of (checkins.data || []) as Array<{ store_id: string; seller_user_id: string }>) {
        checkinCounts.set(item.store_id, (checkinCounts.get(item.store_id) || 0) + 1)
      }
      const goalMap = new Map<string, number>()
      for (const goal of (metas || []) as Array<Record<string, unknown>>) {
        goalMap.set(String(goal.store_id || goal.loja_id || ''), Number(goal.monthly_goal || goal.meta_mensal || goal.goal || 0))
      }
      const now = new Date()
      const totalDays = endOfMonth(now).getDate()
      const nextRows = ((stores.data || []) as Array<{ id: string; name: string }>).map(store => {
        const data = aggregate.get(store.id) || { sales: 0, leads: 0, agd: 0, vis: 0 }
        return buildStoreDiagnostic({
          id: store.id,
          name: store.name,
          ...data,
          goal: goalMap.get(store.id) || 0,
          sellers: sellerCounts.get(store.id) || 0,
          checkedInToday: checkinCounts.get(store.id) || 0,
          elapsedDays: getDate(now),
          totalDays,
        })
      })
      setRows(nextRows)
      setError(null)
      setLastUpdatedAt(new Date())
    } catch (cause) {
      if (requestId === requestSequence.current) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a rede.')
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [customRange, metas, timeframe])

  useEffect(() => {
    if (!goalsLoading) void fetchSnapshot(false)
  }, [fetchSnapshot, goalsLoading])

  const triggerReport = useCallback(async (type: NetworkReportType) => {
    if (reportLoading) return
    setReportLoading(type)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(`relatorio-${type}`)
      if (invokeError) throw new Error(String((data as { error?: string } | null)?.error || invokeError.message))
      toast.success(`${reportLabels[type]} disparado com sucesso.`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao disparar relatório.')
    } finally {
      setReportLoading(null)
    }
  }, [reportLoading])

  const visibleRows = useMemo(() => filterAndSortStoreDiagnostics({ rows, search, status, sort }), [rows, search, status, sort])
  const metrics = useMemo(() => rows.reduce((acc, row) => ({
    stores: acc.stores + 1,
    sales: acc.sales + row.sales,
    goal: acc.goal + row.goal,
    critical: acc.critical + (row.ritmo < 50 || row.disciplinePct < 50 ? 1 : 0),
  }), { stores: 0, sales: 0, goal: 0, critical: 0 }), [rows])

  return {
    rows: visibleRows,
    allRows: rows,
    metrics,
    loading: loading || goalsLoading,
    refreshing,
    error,
    lastUpdatedAt,
    search,
    setSearch,
    status,
    setStatus,
    timeframe,
    setTimeframe,
    customRange,
    setCustomRange,
    sort,
    setSort,
    reportLoading,
    refresh: () => fetchSnapshot(true),
    triggerReport,
  }
}

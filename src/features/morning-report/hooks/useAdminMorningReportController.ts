import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, subDays } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { buildMorningReportSummary, filterMorningReportRows, type MorningReportStoreRow } from '../lib/morningReportViewModel'

export function useAdminMorningReportController() {
  const requestId = useRef(0)
  const [rows, setRows] = useState<MorningReportStoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const fetchReport = useCallback(async (manual = false) => {
    const currentRequest = ++requestId.current
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      const referenceDate = format(subDays(new Date(), 1), 'yyyy-MM-dd')
      const [storesResult, goalsResult, sellersResult, checkinsResult] = await Promise.all([
        supabase.from('lojas').select('id,name').eq('active', true).order('name'),
        supabase.from('regras_metas_loja').select('store_id,monthly_goal'),
        supabase.from('vendedores_loja').select('store_id').eq('is_active', true),
        supabase.rpc('get_lancamentos_referencia_dia', { p_reference_date: referenceDate, p_scope: 'daily' }),
      ])
      const firstError = storesResult.error || goalsResult.error || sellersResult.error || checkinsResult.error
      if (firstError) throw firstError
      if (currentRequest !== requestId.current) return

      const goals = new Map<string, number>()
      for (const item of (goalsResult.data || []) as Array<{ store_id: string; monthly_goal: number | null }>) {
        goals.set(item.store_id, Number(item.monthly_goal || 0))
      }
      const sellers = new Map<string, number>()
      for (const item of (sellersResult.data || []) as Array<{ store_id: string }>) {
        sellers.set(item.store_id, (sellers.get(item.store_id) || 0) + 1)
      }
      const daily = new Map<string, { sales: number; leads: number; visits: number; checkedIn: number }>()
      for (const item of (checkinsResult.data || []) as Array<Record<string, unknown>>) {
        const storeId = String(item.store_id || '')
        const current = daily.get(storeId) || { sales: 0, leads: 0, visits: 0, checkedIn: 0 }
        current.sales += Number(item.vnd_total || item.sales || 0)
        current.leads += Number(item.leads_prev_day || item.leads || 0)
        current.visits += Number(item.visit_prev_day || item.vis || 0)
        current.checkedIn += 1
        daily.set(storeId, current)
      }
      const nextRows = ((storesResult.data || []) as Array<{ id: string; name: string }>).map(store => {
        const values = daily.get(store.id) || { sales: 0, leads: 0, visits: 0, checkedIn: 0 }
        return {
          storeId: store.id,
          storeName: store.name,
          sales: values.sales,
          goal: goals.get(store.id) || 0,
          sellers: sellers.get(store.id) || 0,
          checkedIn: values.checkedIn,
          leads: values.leads,
          visits: values.visits,
        }
      })
      setRows(nextRows)
      setError(null)
      setLastUpdatedAt(new Date())
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o relatório matinal.')
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => { void fetchReport(false) }, [fetchReport])

  const visibleRows = useMemo(() => filterMorningReportRows(rows, search), [rows, search])
  const summary = useMemo(() => buildMorningReportSummary(rows), [rows])

  const exportCsv = useCallback(() => {
    const header = 'Loja,Vendas,Meta,Vendedores,Fechamentos,Leads,Visitas'
    const body = rows.map(row => [row.storeName, row.sales, row.goal, row.sellers, row.checkedIn, row.leads, row.visits]
      .map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `relatorio-matinal-${format(new Date(), 'yyyy-MM-dd')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
    toast.success('Relatório exportado.')
  }, [rows])

  return { rows: visibleRows, allRows: rows, summary, loading, refreshing, error, search, setSearch, lastUpdatedAt, refresh: () => fetchReport(true), exportCsv }
}

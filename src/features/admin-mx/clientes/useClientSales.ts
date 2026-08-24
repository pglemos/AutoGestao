import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Store } from '@/types/database'
import {
  aggregateOfficialStoreSales,
  calculateClientSalesAttainment,
  getClientSalesNextMidnightDelay,
  resolveClientSalesPeriod,
  type ClientSalesPeriod,
} from './clientSales'

export type ClientStoreSales = {
  storeId: string
  storeName: string
  parentStoreName: string | null
  active: boolean
  sales: number
  revenue: number
  monthlyGoal: number
  attainment: number | null
  gap: number | null
  lastSaleDate: string | null
}

type UseClientSalesProps = {
  stores: Store[]
  period: ClientSalesPeriod
  customStartDate: string
  customEndDate: string
}

export function useClientSales({ stores, period, customStartDate, customEndDate }: UseClientSalesProps) {
  const [todayKey, setTodayKey] = useState(() => new Date())
  const [rows, setRows] = useState<ClientStoreSales[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const scheduleNextDay = () => {
      timer = setTimeout(() => {
        setTodayKey(new Date())
        scheduleNextDay()
      }, getClientSalesNextMidnightDelay())
    }
    scheduleNextDay()
    return () => clearTimeout(timer)
  }, [])

  const resolution = useMemo(() => resolveClientSalesPeriod(period, customStartDate, customEndDate, todayKey), [customEndDate, customStartDate, period, todayKey])
  const storeSnapshot = useMemo(() => stores.map(store => ({ id: store.id, name: store.name, parent_loja_id: store.parent_loja_id, active: store.active })), [stores])
  const storeIds = useMemo(() => storeSnapshot.map(store => store.id), [storeSnapshot])
  const storeIdsKey = storeIds.join(',')

  const refetch = useCallback(async () => {
    const requestId = ++requestIdRef.current
    const isLatestRequest = () => requestId === requestIdRef.current
    if (!resolution.range || !storeSnapshot.length) {
      if (isLatestRequest()) {
        setRows([])
        setError(null)
        setLoading(false)
      }
      return
    }
    if (isLatestRequest()) {
      setLoading(true)
      setError(null)
    }
    try {
      const [salesResult, goalsResult] = await Promise.all([
        supabase.rpc('get_vendas_oficiais_periodo', {
          p_start_date: resolution.range.startDate,
          p_end_date: resolution.range.endDate,
          p_store_id: null,
          p_seller_id: null,
        }),
        supabase.from('regras_metas_loja').select('store_id, monthly_goal').in('store_id', storeIds),
      ])
      if (salesResult.error) throw new Error(salesResult.error.message)
      if (goalsResult.error) throw new Error(goalsResult.error.message)
      const goals = new Map((goalsResult.data ?? []).map(goal => [goal.store_id, Number(goal.monthly_goal ?? 0)]))
      const salesByStore = aggregateOfficialStoreSales(salesResult.data ?? [])
      const storeNames = new Map(storeSnapshot.map(store => [store.id, store.name]))
      if (isLatestRequest()) {
        setRows(storeSnapshot.map(store => {
          const sales = salesByStore.get(store.id) ?? { sales: 0, revenue: 0, lastSaleDate: null }
          const monthlyGoal = goals.get(store.id) ?? 0
          const attainment = calculateClientSalesAttainment(sales.sales, monthlyGoal)
          return {
            storeId: store.id,
            storeName: store.name,
            parentStoreName: store.parent_loja_id ? storeNames.get(store.parent_loja_id) ?? null : null,
            active: store.active,
            sales: sales.sales,
            revenue: sales.revenue,
            monthlyGoal,
            attainment,
            gap: monthlyGoal > 0 ? Math.max(monthlyGoal - sales.sales, 0) : null,
            lastSaleDate: sales.lastSaleDate,
          }
        }))
      }
    } catch (cause) {
      if (isLatestRequest()) {
        setRows([])
        setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as vendas por loja.')
      }
    } finally {
      if (isLatestRequest()) setLoading(false)
    }
  }, [resolution.range, storeIds, storeIdsKey, storeSnapshot])

  useEffect(() => { void refetch() }, [refetch])
  const totals = useMemo(() => {
    const totalSales = rows.reduce((sum, row) => sum + row.sales, 0)
    const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0)
    const totalMonthlyGoal = rows.reduce((sum, row) => sum + row.monthlyGoal, 0)
    return {
      totalSales,
      totalRevenue,
      totalMonthlyGoal,
      totalAttainment: calculateClientSalesAttainment(totalSales, totalMonthlyGoal),
      storesWithSales: rows.filter(row => row.sales > 0).length,
      configuredGoalStores: rows.filter(row => row.monthlyGoal > 0).length,
    }
  }, [rows])

  return { range: resolution.range, rangeError: resolution.error, rows, totals, loading, error, refetch }
}

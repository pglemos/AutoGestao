import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGlobalRanking } from '@/hooks/useRanking'
import { supabase } from '@/lib/supabase'
import {
  buildSellerPerformanceViewModel,
  calculatePeriodDates,
  filterSellerRanking,
  sortSellerRanking,
  type PeriodPreset,
  type SellerSortOption,
} from '../lib/sellerPerformanceViewModel'

const REALTIME_REFRESH_DEBOUNCE_MS = 300
const SELLER_PERFORMANCE_REALTIME_TABLES = [
  'lancamentos_diarios',
  'vendedores_loja',
  'regras_metas_loja',
  'usuarios',
] as const

export function useSellerPerformanceController() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [period, setPeriod] = useState<PeriodPreset>('mes_atual')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [sortBy, setSortBy] = useState<SellerSortOption>('sales_desc')
  const [isRealtimeActive, setIsRealtimeActive] = useState(false)

  const sellerId = searchParams.get('id') || ''
  const storeId = searchParams.get('store') || ''

  const dateRange = useMemo(
    () => calculatePeriodDates(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate]
  )

  const { ranking, loading, refetch } = useGlobalRanking({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  })

  const selectedEntry = useMemo(
    () => ranking.find(entry => entry.user_id === sellerId) || null,
    [ranking, sellerId]
  )
  const selected = useMemo(
    () => (selectedEntry ? buildSellerPerformanceViewModel(selectedEntry) : null),
    [selectedEntry]
  )

  const filteredRows = useMemo(
    () => filterSellerRanking(ranking, search),
    [ranking, search]
  )
  const rows = useMemo(
    () => sortSellerRanking(filteredRows, sortBy),
    [filteredRows, sortBy]
  )

  const selectSeller = (id: string, nextStoreId?: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('id', id)
    if (nextStoreId) params.set('store', nextStoreId)
    setSearchParams(params, { replace: true })
  }

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a performance.')
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  // Realtime subscription setup
  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    let active = true

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        if (!active) return
        void refresh().catch(cause => {
          console.error('Audit Error [SellerPerformanceRealtime]: refresh fail ->', cause)
        })
      }, REALTIME_REFRESH_DEBOUNCE_MS)
    }

    let channel = supabase.channel(`seller-performance-live:${sellerId || 'global'}`)
    for (const table of SELLER_PERFORMANCE_REALTIME_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh
      )
    }

    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        setIsRealtimeActive(true)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setIsRealtimeActive(false)
      }
    })

    return () => {
      active = false
      if (refreshTimer) clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [refresh, sellerId])

  const outOfScope = Boolean(selected && storeId && selected.storeId && selected.storeId !== storeId)

  return {
    ranking,
    rows,
    selected,
    sellerId,
    storeId,
    search,
    setSearch,
    period,
    setPeriod,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateRange,
    sortBy,
    setSortBy,
    selectSeller,
    loading,
    refreshing,
    error,
    refresh,
    outOfScope,
    isRealtimeActive,
  }
}

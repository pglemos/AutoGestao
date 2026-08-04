import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGlobalRanking } from '@/hooks/useRanking'
import { useAuth } from '@/hooks/useAuth'
import { useNetworkPerformance } from '@/hooks/useNetworkPerformance'
import { supabase } from '@/lib/supabase'

const STORE_PRIVACY_STORAGE_KEY = 'mx-ranking-hide-store-names'
const REALTIME_REFRESH_DEBOUNCE_MS = 250
const RANKING_REALTIME_TABLES = [
  'lancamentos_diarios',
  'vendedores_loja',
  'vinculos_loja',
  'regras_metas_loja',
  'lojas',
  'usuarios',
] as const

/**
 * Aggregator hook do GlobalRanking — concentra:
 * - fetch (useGlobalRanking + useNetworkPerformance)
 * - estado de filtros (search, store, privacy)
 * - estado de modos (leaderboard | battle | store-arena)
 * - oponentes selecionados (vendedores e lojas)
 * - métricas derivadas (totais, podium, lojas únicas)
 * - sincronização Realtime das fontes que alteram o ranking da rede
 *
 * Mantém comportamento idêntico ao GlobalRanking original
 * (Ranking.tsx, Story 2.3 — ADR-0050).
 */
export function useGlobalRankingPageData() {
  const { ranking, loading, error, refetch } = useGlobalRanking()
  const { profile } = useAuth()
  const {
    metrics: networkMetrics,
    loading: networkLoading,
    error: networkError,
    refetch: refetchNetwork,
  } = useNetworkPerformance()

  const [searchTerm, setSearchTerm] = useState('')
  const [isRefetching, setIsRefetching] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [filterStore, setFilterStore] = useState<string>('all')
  const [selectedSeller, setSelectedSeller] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'leaderboard' | 'battle' | 'store-arena'>('leaderboard')
  const [battleOpponents, setBattleOpponents] = useState<string[]>([])
  const [storeOpponents, setStoreOpponents] = useState<string[]>([])

  const privacyStorageKey = `${STORE_PRIVACY_STORAGE_KEY}:${profile?.id || 'anonymous'}`
  const [hideStoreNames, setHideStoreNames] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORE_PRIVACY_STORAGE_KEY) === 'true'
  })

  const refreshAll = useCallback(async () => {
    await Promise.all([refetch(), refetchNetwork()])
    setLastUpdatedAt(new Date())
  }, [refetch, refetchNetwork])

  const toggleStoreOpponent = useCallback((id: string) => {
    setStoreOpponents(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id)
      if (prev.length < 2) return [...prev, id]
      return [prev[0], id]
    })
  }, [])

  const toggleOpponent = useCallback((id: string) => {
    setBattleOpponents(prev => {
      if (prev.includes(id)) return prev.filter(oid => oid !== id)
      if (prev.length < 2) return [...prev, id]
      return [prev[0], id]
    })
  }, [])

  const lojas = useMemo(() => {
    const set = new Set<string>()
    for (const store of networkMetrics.byStore) {
      if (store.storeName) set.add(store.storeName)
    }
    for (const entry of ranking) {
      if (entry.store_name) set.add(entry.store_name)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [networkMetrics.byStore, ranking])

  const getHiddenStoreName = useCallback((storeName?: string) => {
    if (!storeName) return 'Loja oculta'
    const index = lojas.indexOf(storeName)
    return `LOJA #${index >= 0 ? index + 1 : '?'}`
  }, [lojas])

  const filtered = useMemo(() => {
    let list = ranking
    if (filterStore !== 'all') list = list.filter(r => r.store_name === filterStore)
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLocaleLowerCase('pt-BR')
      list = list.filter(r =>
        r.user_name.toLocaleLowerCase('pt-BR').includes(term) ||
        (!hideStoreNames && (r.store_name || '').toLocaleLowerCase('pt-BR').includes(term))
      )
    }
    // `is_venda_loja` não exclui ninguém do ranking — ver useRanking.
    return list
  }, [ranking, searchTerm, filterStore, hideStoreNames])

  const displayRanking = useMemo(() => {
    if (!hideStoreNames) return filtered
    return filtered.map((entry) => ({
      ...entry,
      store_name: getHiddenStoreName(entry.store_name),
    }))
  }, [filtered, hideStoreNames, getHiddenStoreName])

  const displayNetworkMetrics = useMemo(() => {
    if (!hideStoreNames) return networkMetrics
    return {
      ...networkMetrics,
      byStore: networkMetrics.byStore.map((store, index) => ({
        ...store,
        storeName: `LOJA #${index + 1}`,
      })),
    }
  }, [hideStoreNames, networkMetrics])

  useEffect(() => {
    window.sessionStorage.setItem(privacyStorageKey, String(hideStoreNames))
  }, [hideStoreNames, privacyStorageKey])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.sessionStorage.getItem(privacyStorageKey) ?? window.localStorage.getItem(STORE_PRIVACY_STORAGE_KEY)
    setHideStoreNames(stored === 'true')
  }, [privacyStorageKey])

  useEffect(() => {
    if (loading || networkLoading) return
    setHasLoadedOnce(true)
    setLastUpdatedAt(current => current ?? new Date())
  }, [loading, networkLoading])

  useEffect(() => {
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    let active = true

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        if (!active) return
        void refreshAll().catch((caughtError) => {
          console.error('Audit Error [GlobalRankingRealtime]: refresh fail ->', caughtError)
        })
      }, REALTIME_REFRESH_DEBOUNCE_MS)
    }

    let channel = supabase.channel(`ranking-global-live:${profile?.id || 'anonymous'}`)
    for (const table of RANKING_REALTIME_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh,
      )
    }

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`Audit Error [GlobalRankingRealtime]: ${status}`)
      }
    })

    return () => {
      active = false
      if (refreshTimer) clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [profile?.id, refreshAll])

  const top3 = useMemo(() => [...filtered].sort((a, b) => a.position - b.position).slice(0, 3), [filtered])
  const podiumOrder = useMemo(() => [top3[1], top3[0], top3[2]].filter(Boolean), [top3])

  const totalVendedores = useMemo(() => filtered.length, [filtered])
  const totalVendas = useMemo(() => filtered.reduce((acc, r) => acc + r.vnd_total, 0), [filtered])
  const totalLeads = useMemo(() => filtered.reduce((acc, r) => acc + r.leads, 0), [filtered])
  const totalAgd = useMemo(() => filtered.reduce((acc, r) => acc + r.agd_total, 0), [filtered])
  const totalVis = useMemo(() => filtered.reduce((acc, r) => acc + r.visitas, 0), [filtered])
  const checkinRate = useMemo(() => {
    if (filtered.length === 0) return 0
    return Math.round((filtered.filter(r => r.checked_in).length / filtered.length) * 100)
  }, [filtered])

  const handleRefresh = useCallback(async () => {
    setIsRefetching(true)
    try {
      await refreshAll()
    } finally {
      setIsRefetching(false)
    }
  }, [refreshAll])

  const selectedSellerEntry = selectedSeller ? displayRanking.find(s => s.user_id === selectedSeller) : null

  return {
    // raw
    profile,
    loading: (loading || networkLoading) && !hasLoadedOnce,
    error: error || networkError,
    networkLoading,
    // filters
    searchTerm,
    setSearchTerm,
    filterStore,
    setFilterStore,
    hideStoreNames,
    setHideStoreNames,
    getHiddenStoreName,
    // view mode + opponents
    viewMode,
    setViewMode,
    battleOpponents,
    setBattleOpponents,
    storeOpponents,
    setStoreOpponents,
    toggleOpponent,
    toggleStoreOpponent,
    // data
    lojas,
    filtered,
    displayRanking,
    displayNetworkMetrics,
    podiumOrder,
    // stats
    totalVendedores,
    totalVendas,
    totalLeads,
    totalAgd,
    totalVis,
    checkinRate,
    // refresh
    isRefetching,
    lastUpdatedAt,
    handleRefresh,
    // modal
    selectedSeller,
    setSelectedSeller,
    selectedSellerEntry,
  }
}

export type GlobalRankingPageData = ReturnType<typeof useGlobalRankingPageData>

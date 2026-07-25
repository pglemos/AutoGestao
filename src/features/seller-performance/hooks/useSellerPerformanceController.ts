import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGlobalRanking } from '@/hooks/useRanking'
import { buildSellerPerformanceViewModel, filterSellerRanking } from '../lib/sellerPerformanceViewModel'

export function useSellerPerformanceController() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { ranking, loading, refetch } = useGlobalRanking()
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sellerId = searchParams.get('id') || ''
  const storeId = searchParams.get('store') || ''

  const selectedEntry = useMemo(() => ranking.find(entry => entry.user_id === sellerId) || null, [ranking, sellerId])
  const selected = useMemo(() => selectedEntry ? buildSellerPerformanceViewModel(selectedEntry) : null, [selectedEntry])
  const rows = useMemo(() => filterSellerRanking(ranking, search), [ranking, search])

  const selectSeller = (id: string, nextStoreId?: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('id', id)
    if (nextStoreId) params.set('store', nextStoreId)
    setSearchParams(params, { replace: true })
  }

  const refresh = async () => {
    setRefreshing(true)
    try {
      await refetch()
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a performance.')
    } finally {
      setRefreshing(false)
    }
  }

  const outOfScope = Boolean(selected && storeId && selected.storeId && selected.storeId !== storeId)
  return { ranking, rows, selected, sellerId, storeId, search, setSearch, selectSeller, loading, refreshing, error, refresh, outOfScope }
}

import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { toast } from '@/lib/toast'
import { slugify } from '@/lib/utils'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import type { Store } from '@/types/database'

type UseStoreResolutionInput = {
  activeStores: Store[]
  storesLoading: boolean
}

/**
 * Resolve `selectedStoreId` a partir de slug da URL, query `?id=` ou auth context.
 * Calcula vínculos, lista selecionável e estado de erro de resolução.
 * Extraído do container do DashboardLoja (Story 2.5).
 */
export function useStoreResolution({ activeStores, storesLoading }: UseStoreResolutionInput) {
  const { role, storeId: authStoreId, vinculos_loja } = useAuth()
  const { storeSlug } = useParams()
  const location = useLocation()
  const isOwner = role === 'dono'

  const [resolvedStoreId, setResolvedStoreId] = useState<string | null>(null)
  const [resolving, setResolving] = useState(!!storeSlug)
  const [storeResolutionIssue, setStoreResolutionIssue] = useState<string | null>(null)

  const selectableStores = useMemo(() => {
    if (isPerfilInternoMx(role)) return activeStores
    return activeStores.filter(store => vinculos_loja.some(m => m.store_id === store.id))
  }, [activeStores, role, vinculos_loja])

  const queryStoreId = useMemo(() => new URLSearchParams(location.search).get('id'), [location.search])

  useEffect(() => {
    if (!storeSlug) {
      setResolvedStoreId(null)
      setStoreResolutionIssue(null)
      setResolving(false)
      return
    }
    if (storesLoading && selectableStores.length === 0) {
      setResolving(true)
      return
    }
    setResolving(true)
    const foundByQuery = queryStoreId ? selectableStores.find(store => store.id === queryStoreId) : null
    const found = foundByQuery || selectableStores.find(store => slugify(store.name) === storeSlug)
    if (found) {
      setResolvedStoreId(found.id)
      setStoreResolutionIssue(null)
      setResolving(false)
      return
    }
    setResolvedStoreId(null)
    if (!storesLoading) {
      setStoreResolutionIssue('A unidade solicitada não foi encontrada ou não está vinculada ao seu perfil.')
    }
    setResolving(false)
  }, [queryStoreId, storeSlug, selectableStores, storesLoading])

  const urlStoreId = queryStoreId || (storeSlug ? resolvedStoreId : null)
  // Perfis internos sem slug/query usam a página de seleção de lojas; dono e
  // gerente resolvem para o vínculo do auth context (/gerente/minha-equipe).
  const shouldUseStoreList = !storeSlug && !queryStoreId && isPerfilInternoMx(role)
  const requestedStoreId = useMemo(() => {
    return urlStoreId || (!storeSlug && !shouldUseStoreList ? authStoreId || (isPerfilInternoMx(role) ? activeStores[0]?.id : null) : null) || null
  }, [activeStores, authStoreId, role, shouldUseStoreList, storeSlug, urlStoreId])

  const requestedStoreForbidden = useMemo(() => {
    if (!(role === 'gerente' || role === 'dono') || !requestedStoreId) return false
    return !vinculos_loja.some(m => m.store_id === requestedStoreId)
  }, [requestedStoreId, role, vinculos_loja])

  const selectedStoreId = useMemo(() => {
    if (requestedStoreForbidden) return null
    return requestedStoreId
  }, [requestedStoreForbidden, requestedStoreId])

  useEffect(() => {
    if (requestedStoreForbidden && !isOwner) toast.error('Você não possui vínculo ativo com esta unidade.')
  }, [isOwner, requestedStoreForbidden])

  const selectedStore = useMemo(() => {
    return activeStores.find(store => store.id === selectedStoreId)
      || vinculos_loja.find(m => m.store_id === selectedStoreId)?.store
      || null
  }, [activeStores, selectedStoreId, vinculos_loja])

  return {
    role,
    isOwner,
    storeSlug,
    selectableStores,
    selectedStoreId,
    selectedStore,
    requestedStoreForbidden,
    storeResolutionIssue,
    resolving,
  }
}

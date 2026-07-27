import { useStores, useStoresStats } from '@/hooks/useTeam'
import { useAuth } from '@/hooks/useAuth'
import { canManageStore } from '@/lib/auth/capabilities'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { getPreRegistrationLink } from '@/lib/utils'
import type { Store } from '@/types/database'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import { DESTRUCTIVE_ACTION_LABELS } from '@/lib/ui/actionLabels'

/**
 * Hook orquestrador da page Lojas.
 *
 * Decomposição de `src/pages/Lojas.tsx` (Story 3.5 reconciliada, ADR-0050).
 * Centraliza estado, derivações e handlers da tela de gestão de lojas.
 */
export function useLojasPage() {
  const { lojas, loading: storesLoading, refetch: refetchStores, createStore, toggleStoreStatus } = useStores()
  const { stats, loading: statsLoading, refetch: refetchStats } = useStoresStats()
  const { role } = useAuth()
  const isOwner = role === 'dono'
  const canManageNetwork = canManageStore(role)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newStore, setNewStore] = useState({ name: '', manager_email: '' })
  const [creating, setCreating] = useState(false)
  const [hardDeleteStore, setHardDeleteStore] = useState<Store | null>(null)
  const [hardDeleteConfirmation, setHardDeleteConfirmation] = useState('')
  const [hardDeleting, setHardDeleting] = useState(false)
  const createModalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(createModalRef, isCreateModalOpen)

  useEffect(() => {
    if (!isCreateModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCreateModalOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isCreateModalOpen])

  const loading = storesLoading || statsLoading

  const storeStatusCounts = useMemo(
    () => ({
      active: (lojas || []).filter(store => store.active).length,
      archived: (lojas || []).filter(store => !store.active).length,
    }),
    [lojas],
  )

  const filteredStores = useMemo(() => {
    return (lojas || [])
      .filter(store => (isOwner ? store.active : store.active === filterActive))
      .filter(store => store.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [lojas, searchTerm, filterActive, isOwner])

  const ownerActiveStores = useMemo(
    () => (lojas || []).filter(store => store.active),
    [lojas],
  )

  const ownerAttentionStores = useMemo(() => {
    return ownerActiveStores
      .map(store => ({
        store,
        stat: stats[store.id] || { sellers: 0, teamMembers: 0, checkedIn: 0, disciplinePct: 0 },
      }))
      .filter(({ stat }) => stat.teamMembers === 0 || stat.sellers === 0 || stat.disciplinePct < 80)
      .sort((a, b) => a.stat.disciplinePct - b.stat.disciplinePct)
  }, [ownerActiveStores, stats])

  const corporateMetrics = useMemo(() => {
    if (!lojas || !stats) {
      return { totalSellers: 0, totalStores: 0, activeStores: 0, avgDiscipline: 0 }
    }

    let totalSellers = 0
    let totalDiscipline = 0
    let activeStoresCount = 0

    lojas.filter(store => store.active).forEach(store => {
      const storeStat = stats[store.id]
      if (storeStat) {
        totalSellers += storeStat.sellers
        if (storeStat.sellers > 0) {
          totalDiscipline += storeStat.disciplinePct
          activeStoresCount += 1
        }
      }
    })

    return {
      totalSellers,
      totalStores: lojas.filter(store => store.active).length,
      activeStores: activeStoresCount,
      avgDiscipline: activeStoresCount > 0 ? Math.round(totalDiscipline / activeStoresCount) : 0,
    }
  }, [lojas, stats])

  const handleRefresh = useCallback(async () => {
    setIsRefetching(true)
    try {
      await Promise.all([refetchStores(), refetchStats()])
      setLastUpdatedAt(new Date())
      toast.success('Rede sincronizada!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao sincronizar rede.')
    } finally {
      setIsRefetching(false)
    }
  }, [refetchStores, refetchStats])

  const handleCreateStore = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      if (!newStore.name) {
        toast.error('Nome da unidade é obrigatório')
        return
      }
      setCreating(true)
      const { error } = await createStore(newStore.name, newStore.manager_email)
      setCreating(false)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Unidade operacional criada com sucesso!')
        setIsCreateModalOpen(false)
        setNewStore({ name: '', manager_email: '' })
        await handleRefresh()
      }
    },
    [createStore, handleRefresh, newStore.manager_email, newStore.name],
  )

  const getRegistrationLink = useCallback((storeName: string) => getPreRegistrationLink(storeName), [])

  const copyRegistrationLink = useCallback(
    async (storeName: string) => {
      const link = getRegistrationLink(storeName)
      if (!navigator.clipboard?.writeText) {
        const message = 'Clipboard indisponível neste navegador. Selecione e copie o preview do link na tabela.'
        setCopyError(message)
        toast.error(message)
        return
      }
      try {
        await navigator.clipboard.writeText(link)
        setCopyError(null)
        toast.success('Link de pré-cadastro copiado.')
      } catch {
        const message = 'Não foi possível copiar o link. Selecione e copie o preview do link na tabela.'
        setCopyError(message)
        toast.error(message)
      }
    },
    [getRegistrationLink],
  )

  const handleArchiveStore = useCallback(
    (store: Store) => {
      requestToastConfirmation({
        key: `archive-store:${store.id}`,
        title: `${DESTRUCTIVE_ACTION_LABELS.deactivate} ${store.name}?`,
        description: 'A unidade ficará inativa, mas o histórico será preservado.',
        label: DESTRUCTIVE_ACTION_LABELS.deactivate,
        onConfirm: async () => {
          const { error } = await toggleStoreStatus(store.id, false)
          if (error) toast.error(error)
          else toast.success('Unidade desativada.')
        },
      })
    },
    [toggleStoreStatus],
  )

  const handleHardDeleteStore = useCallback((store: Store) => {
    setHardDeleteStore(store)
    setHardDeleteConfirmation('')
  }, [])

  const closeHardDeleteStore = useCallback(() => {
    if (hardDeleting) return
    setHardDeleteStore(null)
    setHardDeleteConfirmation('')
  }, [hardDeleting])

  const confirmHardDeleteStore = useCallback(async () => {
    if (!hardDeleteStore) return
    if (hardDeleteConfirmation !== hardDeleteStore.name) {
      toast.error('O nome informado não corresponde exatamente à loja.')
      return
    }

    setHardDeleting(true)
    setIsRefetching(true)
    try {
      const { error } = await supabase.rpc('admin_hard_delete_store', {
        p_store_id: hardDeleteStore.id,
        p_confirmation: hardDeleteConfirmation,
      })
      if (error) throw error
      toast.success('Loja e dependências excluídas definitivamente.')
      setHardDeleteStore(null)
      setHardDeleteConfirmation('')
      await Promise.all([refetchStores(), refetchStats()])
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível excluir a loja definitivamente.')
    } finally {
      setHardDeleting(false)
      setIsRefetching(false)
    }
  }, [hardDeleteConfirmation, hardDeleteStore, refetchStats, refetchStores])

  return {
    role,
    isOwner,
    canManageNetwork,
    lojas,
    stats,
    loading,
    isRefetching,
    lastUpdatedAt,
    searchTerm,
    setSearchTerm,
    filterActive,
    setFilterActive,
    storeStatusCounts,
    filteredStores,
    ownerActiveStores,
    ownerAttentionStores,
    corporateMetrics,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newStore,
    setNewStore,
    creating,
    createModalRef,
    handleCreateStore,
    hardDeleteStore,
    hardDeleteConfirmation,
    setHardDeleteConfirmation,
    hardDeleting,
    closeHardDeleteStore,
    confirmHardDeleteStore,
    handleRefresh,
    getRegistrationLink,
    copyRegistrationLink,
    copyError,
    handleArchiveStore,
    handleHardDeleteStore,
    toggleStoreStatus,
  }
}

export type UseLojasPageReturn = ReturnType<typeof useLojasPage>

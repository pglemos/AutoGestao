import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useStores, type StoreWriteFields } from '@/hooks/useStores'
import { isAdministradorMx, useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { describeAdminRpcError } from '@/features/admin-mx/equipe/adminRpcErrors'
import { slugify } from '@/lib/utils'
import { selectBranches, selectLinkableStores } from './storeBranchesScope'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import type { Store } from '@/types/database'

/**
 * Estado da tela "Filiais da matriz".
 *
 * A hierarquia é de um nível: matriz é a loja com `parent_loja_id` nulo e
 * filial aponta para ela. O banco recusa filial de filial (trigger
 * `lojas_valida_hierarquia`), então a tela só precisa oferecer as operações
 * válidas — vincular loja existente, criar filial nova, editar, desvincular e
 * excluir definitivamente.
 */
export function useStoreBranches() {
  const { storeSlug } = useParams()
  const { role } = useAuth()
  const canManage = isAdministradorMx(role)
  const { lojas, loading, error, createStore, updateStore, refetch } = useStores()

  const [creating, setCreating] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newStore, setNewStore] = useState({ name: '', manager_email: '' })
  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [savingStore, setSavingStore] = useState(false)
  const [linkingStoreId, setLinkingStoreId] = useState('')
  const [linking, setLinking] = useState(false)
  const [hardDeleteStore, setHardDeleteStore] = useState<Store | null>(null)
  const [hardDeleteConfirmation, setHardDeleteConfirmation] = useState('')
  const [hardDeleting, setHardDeleting] = useState(false)

  const matriz = useMemo(
    () => lojas.find((store) => slugify(store.name) === storeSlug) || null,
    [lojas, storeSlug],
  )

  const branches = useMemo(() => selectBranches(lojas, matriz), [lojas, matriz])

  const linkableStores = useMemo(() => selectLinkableStores(lojas, matriz), [lojas, matriz])

  const handleCreateBranch = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!matriz) return
      setCreating(true)
      try {
        const { error: createError } = await createStore(
          newStore.name,
          newStore.manager_email,
          { parent_loja_id: matriz.id },
        )
        if (createError) {
          toast.error(createError)
          return
        }
        toast.success('Filial criada e vinculada à matriz.')
        setNewStore({ name: '', manager_email: '' })
        setIsCreateModalOpen(false)
      } finally {
        setCreating(false)
      }
    },
    [createStore, matriz, newStore.manager_email, newStore.name],
  )

  const handleLinkExistingStore = useCallback(async () => {
    if (!matriz || !linkingStoreId) return
    setLinking(true)
    try {
      const { error: linkError } = await updateStore(linkingStoreId, {
        parent_loja_id: matriz.id,
      })
      if (!linkError) setLinkingStoreId('')
    } finally {
      setLinking(false)
    }
  }, [linkingStoreId, matriz, updateStore])

  const handleUnlinkBranch = useCallback(
    (store: Store) => {
      requestToastConfirmation({
        key: `unlink-branch:${store.id}`,
        title: `Desvincular ${store.name} da matriz?`,
        description: 'A unidade volta a ser matriz independente. Nenhum dado operacional é apagado.',
        label: 'Desvincular',
        onConfirm: async () => {
          await updateStore(store.id, { parent_loja_id: null })
        },
      })
    },
    [updateStore],
  )

  const handleStoreUpdate = useCallback(
    async (id: string, updates: Partial<StoreWriteFields>) => {
      setSavingStore(true)
      try {
        const { error: updateError } = await updateStore(id, updates)
        if (!updateError) setEditingStore(null)
      } finally {
        setSavingStore(false)
      }
    },
    [updateStore],
  )

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
    try {
      const { error: deleteError } = await supabase.rpc('admin_hard_delete_store', {
        p_store_id: hardDeleteStore.id,
        p_confirmation: hardDeleteConfirmation,
      })
      if (deleteError) throw new Error(describeAdminRpcError(deleteError, 'Não foi possível excluir a filial definitivamente.'))
      toast.success('Filial e dependências excluídas definitivamente.')
      setHardDeleteStore(null)
      setHardDeleteConfirmation('')
      await refetch()
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Não foi possível excluir a filial definitivamente.',
      )
    } finally {
      setHardDeleting(false)
    }
  }, [hardDeleteConfirmation, hardDeleteStore, refetch])

  return {
    storeSlug,
    canManage,
    loading,
    error,
    matriz,
    branches,
    linkableStores,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newStore,
    setNewStore,
    creating,
    handleCreateBranch,
    linkingStoreId,
    setLinkingStoreId,
    linking,
    handleLinkExistingStore,
    handleUnlinkBranch,
    editingStore,
    setEditingStore,
    savingStore,
    handleStoreUpdate,
    hardDeleteStore,
    setHardDeleteStore,
    hardDeleteConfirmation,
    setHardDeleteConfirmation,
    hardDeleting,
    closeHardDeleteStore,
    confirmHardDeleteStore,
    refetch,
  }
}

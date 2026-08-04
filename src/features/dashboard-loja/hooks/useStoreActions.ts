import { useCallback, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/lib/toast'
import { isPerfilInternoMx } from '@/hooks/useAuth'
import { useStores } from '@/hooks/useStores'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import { slugify } from '@/lib/utils'
import { normalizeStoreManagementForm, type StoreManagementFormMode } from '@/lib/store-management-form'
import type { Store, UserRole } from '@/types/database'

type UseStoreActionsInput = {
  selectedStoreId: string | null
  selectedStore: Store | null
  storeSlug: string | undefined
  role: UserRole | null
  updateStore: ReturnType<typeof useStores>['updateStore']
  createStore: ReturnType<typeof useStores>['createStore']
  deleteStore: ReturnType<typeof useStores>['deleteStore']
  refetchStores: ReturnType<typeof useStores>['refetch']
  refetchSettings: () => Promise<void>
}

/**
 * Encapsula CRUD da loja + estado de modais de criação/edição/exclusão.
 * Extraído do container do DashboardLoja (Story 2.5).
 */
export function useStoreActions({
  selectedStoreId,
  selectedStore,
  storeSlug,
  role,
  updateStore,
  createStore,
  deleteStore,
  refetchStores,
  refetchSettings,
}: UseStoreActionsInput) {
  const navigate = useNavigate()
  const [storeEditOpen, setStoreEditOpen] = useState(false)
  const [createStoreOpen, setCreateStoreOpen] = useState(false)
  const [savingStore, setSavingStore] = useState(false)
  const [creatingStore, setCreatingStore] = useState(false)
  const [deletingStore, setDeletingStore] = useState(false)
  const [newStore, setNewStore] = useState<{ name: string; manager_email: string; management_mode: StoreManagementFormMode }>({ name: '', manager_email: '', management_mode: 'owner_managed' })

  const handleStoreUpdate = async (id: string, updates: Parameters<typeof updateStore>[1]) => {
    setSavingStore(true)
    try {
      const { error } = await updateStore(id, updates)
      if (error) { toast.error(error); return }
      setStoreEditOpen(false)
      await refetchSettings()
      const nextName = updates.name || selectedStore?.name
      if (nextName && slugify(nextName) !== storeSlug) {
        navigate(`/lojas/${slugify(nextName)}?id=${id}`, { replace: true })
      }
    } finally {
      setSavingStore(false)
    }
  }

  const handleCreateStore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newStore.name.trim()) { toast.error('Informe o nome da loja.'); return }
    const management = normalizeStoreManagementForm({
      mode: newStore.management_mode,
      managerEmail: newStore.manager_email,
    })
    if (!management.ok) { toast.error(management.error); return }
    setCreatingStore(true)
    try {
      const { error } = await createStore(newStore.name, management.managerEmail || undefined)
      if (error) { toast.error(error); return }
      const createdName = newStore.name
      setNewStore({ name: '', manager_email: '', management_mode: 'owner_managed' })
      setCreateStoreOpen(false)
      await refetchStores()
      toast.success('Loja criada com sucesso.')
      navigate(`/lojas/${slugify(createdName)}`)
    } finally {
      setCreatingStore(false)
    }
  }

  const handleDeleteStore = useCallback(() => {
    if (!selectedStoreId || !selectedStore) return
    requestToastConfirmation({
      key: `delete-store-dashboard:${selectedStoreId}`,
      title: `Arquivar ${selectedStore.name}?`,
      description: 'A unidade ficará inativa, vínculos operacionais ativos serão encerrados e o histórico será preservado.',
      label: 'Arquivar',
      onConfirm: async () => {
        setDeletingStore(true)
        try {
          const { error } = await deleteStore(selectedStoreId)
          if (error) { toast.error(error); return }
          toast.success('Loja arquivada.')
          navigate(isPerfilInternoMx(role) ? '/lojas' : role === 'dono' ? '/dono' : '/classificacao', { replace: true })
        } finally {
          setDeletingStore(false)
        }
      },
    })
  }, [deleteStore, navigate, role, selectedStore, selectedStoreId])

  return {
    storeEditOpen,
    setStoreEditOpen,
    createStoreOpen,
    setCreateStoreOpen,
    savingStore,
    creatingStore,
    deletingStore,
    newStore,
    setNewStore,
    handleStoreUpdate,
    handleCreateStore,
    handleDeleteStore,
  }
}

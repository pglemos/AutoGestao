import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useConsultingClients, useConsultingClientMetrics } from '@/hooks/useConsultingClients'
import { DEFAULT_CONSULTING_MODULES } from '@/hooks/useConsultingModules'
import { toast } from '@/lib/toast'
import { filterConsultingClients } from '../lib/consultingClientFilters'
import { canCreateConsultingClient } from '../lib/consultingClientPolicy'
import type { ConsultingClient } from '@/lib/schemas/consulting-client.schema'
import type { ConsultingClientDraft } from '../types'

function initialDraft(): ConsultingClientDraft {
  return {
    name: '',
    legal_name: '',
    cnpj: '',
    product_name: '',
    notes: '',
    enabled_modules: DEFAULT_CONSULTING_MODULES.filter(module => module.enabled).map(module => module.module_key),
  }
}

export function useConsultingClientsController() {
  const { role } = useAuth()
  const source = useConsultingClients()
  const { metrics } = useConsultingClientMetrics()
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<ConsultingClientDraft>(initialDraft)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const rows = useMemo(() => filterConsultingClients(source.clients, search), [source.clients, search])
  const canCreate = canCreateConsultingClient(role)

  const submit = async () => {
    if (submitting) return
    if (!canCreate) {
      toast.error('Seu perfil não pode criar clientes da consultoria.')
      return
    }
    if (!draft.name.trim()) {
      toast.error('Nome do cliente é obrigatório.')
      return
    }
    setSubmitting(true)
    try {
      const { error } = editingClientId
        ? await source.updateClient({ ...draft, id: editingClientId })
        : await source.createClient(draft)
      if (error) {
        toast.error(error)
        return
      }
      toast.success(editingClientId ? 'Cliente da consultoria atualizado.' : 'Cliente da consultoria criado.')
      setDraft(initialDraft())
      setEditingClientId(null)
      setOpen(false)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao criar cliente.')
    } finally {
      setSubmitting(false)
    }
  }

  const editClient = (client: ConsultingClient) => {
    setEditingClientId(client.id)
    setDraft({
      name: client.name || '',
      legal_name: client.legal_name || '',
      cnpj: client.cnpj || '',
      product_name: client.product_name || '',
      notes: client.notes || '',
      enabled_modules: [],
    })
    setOpen(true)
  }

  const closeForm = () => {
    if (submitting) return
    setOpen(false)
    setEditingClientId(null)
    setDraft(initialDraft())
  }

  return {
    ...source,
    metrics,
    rows,
    search,
    setSearch,
    draft,
    setDraft,
    open,
    setOpen,
    submitting,
    submit,
    editClient,
    editingClientId,
    closeForm,
    canCreate,
    modules: DEFAULT_CONSULTING_MODULES,
  }
}

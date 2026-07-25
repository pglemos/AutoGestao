import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useConsultingClients, useConsultingClientMetrics } from '@/hooks/useConsultingClients'
import { DEFAULT_CONSULTING_MODULES } from '@/hooks/useConsultingModules'
import { toast } from '@/lib/toast'
import { filterConsultingClients } from '../lib/consultingClientFilters'
import { canCreateConsultingClient } from '../lib/consultingClientPolicy'
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
      const { error } = await source.createClient(draft)
      if (error) {
        toast.error(error)
        return
      }
      toast.success('Cliente da consultoria criado.')
      setDraft(initialDraft())
      setOpen(false)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao criar cliente.')
    } finally {
      setSubmitting(false)
    }
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
    canCreate,
    modules: DEFAULT_CONSULTING_MODULES,
  }
}

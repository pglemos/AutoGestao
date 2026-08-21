import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import {
  archiveTemplate,
  createNewTemplateVersion,
  emptyTemplateDraft,
  fetchActionPlanTemplates,
  fetchTemplateItems,
  publishTemplateVersion,
  saveTemplateDraft,
  setTemplateActive,
  type ActionPlanTemplate,
  type TemplateDraft,
} from './actionPlanTemplates'
import {
  applyTemplateToStoresIdempotent,
  resolveApplicationTargets,
  buildTemplateApplicationStorageKey,
  createTemplateApplicationRequestId,
} from './templateApplicationIdempotency'

export function useActionPlanTemplatesController() {
  const { supabaseUser } = useAuth()
  const [rows, setRows] = useState<ActionPlanTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<TemplateDraft>(emptyTemplateDraft)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [applying, setApplying] = useState<ActionPlanTemplate | null>(null)
  const [applyStoreId, setApplyStoreId] = useState('')
  const applicationRequestIds = useRef(new Map<string, string>())

  const refetch = useCallback(async () => {
    setLoading(true)
    const result = await fetchActionPlanTemplates()
    setRows(result.rows)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const openNew = () => {
    setDraft(emptyTemplateDraft())
    setEditing(false)
    setFormOpen(true)
  }

  const openEdit = async (template: ActionPlanTemplate) => {
    // Edita sempre em cima do rascunho aberto; sem rascunho, parte da última versão.
    const source = template.versions.find(version => version.status === 'rascunho') ?? template.versions[0] ?? null
    const items = source ? await fetchTemplateItems(source.id) : []
    setDraft({
      id: template.id,
      template_key: template.template_key,
      nome: template.nome,
      departamento: template.departamento,
      indicador: template.indicador ?? '',
      descricao: template.descricao ?? '',
      program_key: template.program_key ?? '',
      active: template.active,
      items: items.length ? items : emptyTemplateDraft().items,
    })
    setEditing(true)
    setFormOpen(true)
  }

  const submit = async () => {
    if (submitting || !supabaseUser) return
    setSubmitting(true)
    try {
      const result = await saveTemplateDraft(draft, supabaseUser.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Rascunho do template salvo.')
      setFormOpen(false)
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const publish = async (template: ActionPlanTemplate) => {
    if (!supabaseUser) return
    const version = template.versions.find(item => item.status === 'rascunho')
    if (!version) {
      toast.error('Não há rascunho para publicar neste template.')
      return
    }
    const result = await publishTemplateVersion(template.id, version.id, supabaseUser.id)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`Versão ${version.versao} publicada.`)
    await refetch()
  }

  const createVersion = async (template: ActionPlanTemplate) => {
    if (!supabaseUser || submitting) return
    setSubmitting(true)
    try {
      const result = await createNewTemplateVersion({ templateId: template.id, userId: supabaseUser.id })
      if (result.error) return toast.error(result.error)
      toast.success(result.created ? 'Nova versão criada como rascunho.' : 'O template já possui um rascunho aberto.')
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (template: ActionPlanTemplate) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await setTemplateActive(template.id, !template.active)
      if (result.error) return toast.error(result.error)
      toast.success(template.active ? 'Template desativado.' : 'Template reativado.')
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const archive = async (template: ActionPlanTemplate) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await archiveTemplate(template.id)
      if (result.error) return toast.error(result.error)
      toast.success('Template arquivado. As aplicações existentes foram preservadas.')
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const getApplicationRequestId = (versionId: string, storeId: string) => {
    const storageKey = buildTemplateApplicationStorageKey(versionId, storeId)
    const inMemory = applicationRequestIds.current.get(storageKey)
    if (inMemory) return { requestId: inMemory, storageKey }

    let persisted: string | null = null
    try {
      persisted = window.sessionStorage.getItem(storageKey)
    } catch {
      // O Map em memória continua garantindo idempotência durante esta sessão React.
    }

    const requestId = persisted || createTemplateApplicationRequestId()
    applicationRequestIds.current.set(storageKey, requestId)
    if (!persisted) {
      try {
        window.sessionStorage.setItem(storageKey, requestId)
      } catch {
        // Storage indisponível não impede a aplicação; o Map mantém retries locais estáveis.
      }
    }

    return { requestId, storageKey }
  }

  const clearApplicationRequestId = (storageKey: string) => {
    applicationRequestIds.current.delete(storageKey)
    try {
      window.sessionStorage.removeItem(storageKey)
    } catch {
      // Nenhuma ação: o banco já confirmou a aplicação e a chave pode expirar com a sessão.
    }
  }

  const apply = async () => {
    if (submitting || !supabaseUser || !applying) return
    const version = applying.versions.find(item => item.status === 'publicada')
    if (!version) {
      toast.error('Publique uma versão antes de aplicar.')
      return
    }
    if (!applyStoreId) {
      toast.error('Selecione a loja de destino.')
      return
    }

    const { requestId, storageKey } = getApplicationRequestId(version.id, applyStoreId)
    setSubmitting(true)
    try {
      // Um plano padrão é decisão do cliente: aplica em todas as unidades ativas
      // dele, não só na loja escolhida no seletor.
      const targets = await resolveApplicationTargets(applyStoreId)
      const result = await applyTemplateToStoresIdempotent({
        versionId: version.id,
        storeIds: targets.storeIds,
        userId: supabaseUser.id,
        requestId,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }

      clearApplicationRequestId(storageKey)
      const destino = targets.storeIds.length > 1
        ? `${targets.storeIds.length} unidades do cliente`
        : 'loja'
      toast.success(
        result.replayed
          ? 'Aplicação já confirmada. Nenhuma ação foi duplicada.'
          : `${result.created} ação(ões) criada(s) em ${destino}.`,
      )
      setApplying(null)
      setApplyStoreId('')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    rows,
    loading,
    error,
    refetch,
    draft,
    setDraft,
    formOpen,
    setFormOpen,
    editing,
    submitting,
    openNew,
    openEdit,
    submit,
    publish,
    createVersion,
    toggleActive,
    archive,
    applying,
    setApplying,
    applyStoreId,
    setApplyStoreId,
    apply,
  }
}

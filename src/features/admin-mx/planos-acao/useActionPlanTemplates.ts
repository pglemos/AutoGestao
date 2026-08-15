import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import {
  applyTemplateToStore,
  emptyTemplateDraft,
  fetchActionPlanTemplates,
  fetchTemplateItems,
  publishTemplateVersion,
  saveTemplateDraft,
  type ActionPlanTemplate,
  type TemplateDraft,
} from './actionPlanTemplates'

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
    setSubmitting(true)
    try {
      const result = await applyTemplateToStore({ versionId: version.id, storeId: applyStoreId, userId: supabaseUser.id })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${result.created} ação(ões) criada(s) na loja.`)
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
    applying,
    setApplying,
    applyStoreId,
    setApplyStoreId,
    apply,
  }
}

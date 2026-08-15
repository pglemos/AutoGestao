import { supabase } from '@/lib/supabase'

export type TemplateItemPriority = 'baixa' | 'media' | 'alta' | 'critica'

export type ActionPlanTemplateItem = {
  id?: string
  ordem: number
  problema: string
  acao: string
  como: string
  departamento: string
  indicador: string
  prioridade: TemplateItemPriority
  prazo_dias: number | null
  evidencia_requerida: boolean
}

export type ActionPlanTemplateVersion = {
  id: string
  template_id: string
  versao: number
  status: 'rascunho' | 'publicada' | 'arquivada'
  notas: string | null
  published_at: string | null
  /** Itens da versão, quando carregados (usado pelos filtros avançados). */
  itens?: ActionPlanTemplateItem[]
}

export type ActionPlanTemplate = {
  id: string
  template_key: string
  nome: string
  departamento: string
  indicador: string | null
  descricao: string | null
  program_key: string | null
  active: boolean
  versions: ActionPlanTemplateVersion[]
}

export type TemplateDraft = {
  id?: string
  template_key: string
  nome: string
  departamento: string
  indicador: string
  descricao: string
  program_key: string
  active: boolean
  items: ActionPlanTemplateItem[]
}

export function emptyTemplateDraft(): TemplateDraft {
  return {
    template_key: '',
    nome: '',
    departamento: '',
    indicador: '',
    descricao: '',
    program_key: '',
    active: true,
    items: [emptyTemplateItem(1)],
  }
}

export function emptyTemplateItem(ordem: number): ActionPlanTemplateItem {
  return { ordem, problema: '', acao: '', como: '', departamento: '', indicador: '', prioridade: 'media', prazo_dias: 30, evidencia_requerida: false }
}

/** Erros bloqueantes do template. Lista vazia = pronto para salvar. */
export function validateTemplateDraft(draft: TemplateDraft): string[] {
  const errors: string[] = []
  if (!draft.template_key.trim()) errors.push('Informe a chave do template.')
  else if (!/^[a-z0-9_]+$/.test(draft.template_key.trim())) errors.push('A chave aceita apenas minúsculas, números e underline.')
  if (!draft.nome.trim()) errors.push('Informe o nome do template.')
  if (!draft.departamento.trim()) errors.push('Informe o departamento.')
  const items = draft.items.filter(item => item.problema.trim() || item.acao.trim())
  if (!items.length) errors.push('Cadastre ao menos um item.')
  for (const [index, item] of items.entries()) {
    if (!item.problema.trim()) errors.push(`Item ${index + 1}: informe o problema.`)
    if (!item.acao.trim()) errors.push(`Item ${index + 1}: informe a ação.`)
    if (item.prazo_dias !== null && item.prazo_dias < 0) errors.push(`Item ${index + 1}: prazo em dias não pode ser negativo.`)
  }
  return errors
}

/** Data de vencimento de um item aplicado, a partir da data de aplicação. */
export function resolveItemDueDate(appliedAt: Date, prazoDias: number | null): string | null {
  if (prazoDias === null) return null
  const due = new Date(appliedAt)
  due.setDate(due.getDate() + prazoDias)
  return due.toISOString().slice(0, 10)
}

export async function fetchActionPlanTemplates(): Promise<{ rows: ActionPlanTemplate[]; error: string | null }> {
  const { data: templates, error } = await supabase
    .from('planos_acao_templates')
    .select('id, template_key, nome, departamento, indicador, descricao, program_key, active')
    .order('nome', { ascending: true })
  if (error) return { rows: [], error: error.message }

  const ids = (templates ?? []).map(template => template.id)
  const { data: versions } = ids.length
    ? await supabase
        .from('planos_acao_template_versoes')
        .select('id, template_id, versao, status, notas, published_at, planos_acao_template_itens(id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida)')
        .in('template_id', ids)
        .order('versao', { ascending: false })
    : { data: [] as Array<ActionPlanTemplateVersion & { planos_acao_template_itens?: ActionPlanTemplateItem[] }> }

  const byTemplate = new Map<string, ActionPlanTemplateVersion[]>()
  for (const version of (versions ?? []) as Array<ActionPlanTemplateVersion & { planos_acao_template_itens?: ActionPlanTemplateItem[] }>) {
    const { planos_acao_template_itens: itens, ...rest } = version
    byTemplate.set(rest.template_id, [...(byTemplate.get(rest.template_id) ?? []), { ...rest, itens: (itens ?? []).map(item => ({
      ...item,
      como: item.como ?? '',
      departamento: item.departamento ?? '',
      indicador: item.indicador ?? '',
    })) }])
  }

  return {
    rows: (templates ?? []).map(template => ({ ...template, versions: byTemplate.get(template.id) ?? [] })) as ActionPlanTemplate[],
    error: null,
  }
}

export async function fetchTemplateItems(versionId: string): Promise<ActionPlanTemplateItem[]> {
  const { data } = await supabase
    .from('planos_acao_template_itens')
    .select('id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida')
    .eq('version_id', versionId)
    .order('ordem', { ascending: true })
  return (data ?? []).map(item => ({
    ...item,
    como: item.como ?? '',
    departamento: item.departamento ?? '',
    indicador: item.indicador ?? '',
  })) as ActionPlanTemplateItem[]
}

/**
 * Salva o template e grava seus itens numa versão em rascunho. Um template
 * sem rascunho aberto ganha uma versão nova (última + 1); com rascunho aberto,
 * os itens do rascunho são substituídos.
 */
export async function saveTemplateDraft(draft: TemplateDraft, userId: string): Promise<{ error: string | null; templateId: string | null }> {
  const errors = validateTemplateDraft(draft)
  if (errors.length) return { error: errors[0], templateId: null }

  const payload = {
    template_key: draft.template_key.trim(),
    nome: draft.nome.trim(),
    departamento: draft.departamento.trim(),
    indicador: draft.indicador.trim() || null,
    descricao: draft.descricao.trim() || null,
    program_key: draft.program_key.trim() || null,
    active: draft.active,
    updated_at: new Date().toISOString(),
  }

  const { data: template, error: templateError } = draft.id
    ? await supabase.from('planos_acao_templates').update(payload).eq('id', draft.id).select('id').single()
    : await supabase.from('planos_acao_templates').insert({ ...payload, created_by: userId }).select('id').single()

  if (templateError || !template) return { error: templateError?.message ?? 'Falha ao salvar o template.', templateId: null }

  const { data: existing } = await supabase
    .from('planos_acao_template_versoes')
    .select('id, versao, status')
    .eq('template_id', template.id)
    .order('versao', { ascending: false })

  const draftVersion = (existing ?? []).find(version => version.status === 'rascunho')
  let versionId = draftVersion?.id ?? null

  if (!versionId) {
    const nextNumber = ((existing ?? [])[0]?.versao ?? 0) + 1
    const { data: created, error: versionError } = await supabase
      .from('planos_acao_template_versoes')
      .insert({ template_id: template.id, versao: nextNumber, status: 'rascunho', created_by: userId })
      .select('id')
      .single()
    if (versionError || !created) return { error: versionError?.message ?? 'Falha ao criar a versão.', templateId: template.id }
    versionId = created.id
  } else {
    await supabase.from('planos_acao_template_itens').delete().eq('version_id', versionId)
  }

  const items = draft.items.filter(item => item.problema.trim() && item.acao.trim())
  const { error: itemsError } = await supabase.from('planos_acao_template_itens').insert(
    items.map((item, index) => ({
      version_id: versionId,
      ordem: index + 1,
      problema: item.problema.trim(),
      acao: item.acao.trim(),
      como: item.como.trim() || null,
      departamento: item.departamento.trim() || draft.departamento.trim(),
      indicador: item.indicador.trim() || draft.indicador.trim() || null,
      prioridade: item.prioridade,
      prazo_dias: item.prazo_dias,
      evidencia_requerida: item.evidencia_requerida,
    })),
  )
  if (itemsError) return { error: itemsError.message, templateId: template.id }

  return { error: null, templateId: template.id }
}

/** Publica um rascunho e arquiva a versão publicada anterior. */
export async function publishTemplateVersion(templateId: string, versionId: string, userId: string): Promise<{ error: string | null }> {
  const { data: items } = await supabase.from('planos_acao_template_itens').select('id').eq('version_id', versionId).limit(1)
  if (!items?.length) return { error: 'Publique apenas versões com pelo menos um item.' }

  const { error: archiveError } = await supabase
    .from('planos_acao_template_versoes')
    .update({ status: 'arquivada', updated_at: new Date().toISOString() })
    .eq('template_id', templateId)
    .eq('status', 'publicada')
  if (archiveError) return { error: archiveError.message }

  const { error } = await supabase
    .from('planos_acao_template_versoes')
    .update({ status: 'publicada', published_at: new Date().toISOString(), published_by: userId, updated_at: new Date().toISOString() })
    .eq('id', versionId)
  return { error: error?.message ?? null }
}

/**
 * Materializa os itens de uma versão publicada como planos de ação de uma loja.
 */
export async function applyTemplateToStore(input: {
  versionId: string
  storeId: string
  userId: string
  appliedAt?: Date
}): Promise<{ error: string | null; created: number }> {
  const items = await fetchTemplateItems(input.versionId)
  if (!items.length) return { error: 'A versão selecionada não tem itens.', created: 0 }

  const appliedAt = input.appliedAt ?? new Date()
  const { error } = await supabase.from('planos_acao').insert(
    items.map(item => ({
      scope_type: 'store' as const,
      scope_id: input.storeId,
      departamento: item.departamento || 'Geral',
      indicador: item.indicador || 'Não definido',
      problema: item.problema,
      acao: item.acao,
      como: item.como || null,
      prazo: resolveItemDueDate(appliedAt, item.prazo_dias),
      prioridade: item.prioridade,
      origem: 'consultor' as const,
      origem_ref_id: input.versionId,
      origem_ref_table: 'planos_acao_template_versoes',
      evidence_required: item.evidencia_requerida,
      created_by: input.userId,
    })),
  )
  if (error) return { error: error.message, created: 0 }
  return { error: null, created: items.length }
}

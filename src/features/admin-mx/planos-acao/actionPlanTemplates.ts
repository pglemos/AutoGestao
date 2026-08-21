import { supabase } from '@/lib/supabase'

export type TemplateItemPriority = 'baixa' | 'media' | 'alta' | 'critica'
export type ImprovementDirection = 'aumentar' | 'reduzir'
export type SupportMaterialType = 'nenhum' | 'arquivo' | 'aula'

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
  support_material_type: SupportMaterialType
  file_asset_path: string | null
  file_asset_name: string | null
  treinamento_id: string | null
  treinamento_titulo: string | null
  /** Peso em basis points (soma 10000 entre os itens da versão). Calculado, não editável. */
  peso_bp: number | null
}

export type ActionPlanTemplateVersion = {
  id: string
  template_id: string
  versao: number
  status: 'rascunho' | 'publicada' | 'arquivada'
  notas: string | null
  published_at: string | null
  problem: string | null
  objective: string | null
  when_to_apply: string | null
  owner_suggestion_title: string | null
  owner_suggestion_problem: string | null
  owner_suggestion_recommendation: string | null
  effectiveness_indicator_code: string | null
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
  primary_indicator_code: string | null
  improvement_direction: ImprovementDirection | null
  manual_application_enabled: boolean
  owner_suggestion_enabled: boolean
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
  primary_indicator_code: string
  improvement_direction: ImprovementDirection
  manual_application_enabled: boolean
  owner_suggestion_enabled: boolean
  problem: string
  objective: string
  when_to_apply: string
  effectiveness_indicator_code: string
  owner_suggestion_title: string
  owner_suggestion_problem: string
  owner_suggestion_recommendation: string
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
    primary_indicator_code: '',
    improvement_direction: 'aumentar',
    manual_application_enabled: true,
    owner_suggestion_enabled: false,
    problem: '',
    objective: '',
    when_to_apply: '',
    effectiveness_indicator_code: '',
    owner_suggestion_title: '',
    owner_suggestion_problem: '',
    owner_suggestion_recommendation: '',
    items: [emptyTemplateItem(1)],
  }
}

export function emptyTemplateItem(ordem: number): ActionPlanTemplateItem {
  return {
    ordem, problema: '', acao: '', como: '', departamento: '', indicador: '',
    prioridade: 'media', prazo_dias: 30, evidencia_requerida: false,
    support_material_type: 'nenhum', file_asset_path: null, file_asset_name: null,
    treinamento_id: null, treinamento_titulo: null, peso_bp: null,
  }
}

/**
 * Divide 100% entre `count` itens em basis points (soma exata 10000). O resto
 * da divisão inteira vai pro último item, pra nunca sobrar/faltar por causa de
 * arredondamento — mesma regra do `calculateWeights` do base44.
 */
export function calculateItemWeights(count: number): Array<{ weight_bp: number; weight_percentage_display: string }> {
  if (count <= 0) return []
  const base = Math.floor(10000 / count)
  const remainder = 10000 - base * count
  return Array.from({ length: count }, (_, index) => {
    const weight_bp = base + (index === count - 1 ? remainder : 0)
    return { weight_bp, weight_percentage_display: `${(weight_bp / 100).toFixed(2)}%` }
  })
}

export type IndicatorCatalogEntry = { code: string; label: string; category: string; unit: string }

/** Catálogo real de indicadores do MX (mesmo usado no Planejamento Estratégico) — reaproveitado como fonte de indicador/departamento do wizard. */
export async function fetchIndicatorCatalog(): Promise<{ rows: IndicatorCatalogEntry[]; error: string | null }> {
  const { data, error } = await supabase
    .from('catalogo_indicadores_planejamento')
    .select('code, label, category, unit')
    .eq('active', true)
    .order('sort_order', { ascending: true })
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as IndicatorCatalogEntry[], error: null }
}

export type PublishedTraining = { id: string; title: string; type: string; duration_minutes: number | null; target_audience: string | null }

/** Aulas publicadas da Universidade MX, pra vincular como material de apoio de uma ação. */
export async function fetchPublishedTrainings(): Promise<{ rows: PublishedTraining[]; error: string | null }> {
  const { data, error } = await supabase
    .from('treinamentos')
    .select('id, title, type, duration_minutes, target_audience')
    .eq('active', true)
    .eq('editorial_status', 'active')
    .order('title', { ascending: true })
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []) as PublishedTraining[], error: null }
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

/** Próximo número monotônico, sem depender da ordem retornada pelo banco. */
export function nextTemplateVersionNumber(versions: Array<Pick<ActionPlanTemplateVersion, 'versao'>>): number {
  return versions.reduce((highest, version) => Math.max(highest, version.versao), 0) + 1
}

const TEMPLATE_ITEM_COLUMNS = 'id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, support_material_type, file_asset_path, file_asset_name, treinamento_id, treinamento_titulo, peso_bp'
const TEMPLATE_VERSION_COLUMNS = 'id, template_id, versao, status, notas, published_at, problem, objective, when_to_apply, owner_suggestion_title, owner_suggestion_problem, owner_suggestion_recommendation, effectiveness_indicator_code'

function normalizeItem(item: Partial<ActionPlanTemplateItem> & { id: string; ordem: number; problema: string; acao: string }): ActionPlanTemplateItem {
  return {
    ...item,
    como: item.como ?? '',
    departamento: item.departamento ?? '',
    indicador: item.indicador ?? '',
    support_material_type: (item.support_material_type ?? 'nenhum') as SupportMaterialType,
    file_asset_path: item.file_asset_path ?? null,
    file_asset_name: item.file_asset_name ?? null,
    treinamento_id: item.treinamento_id ?? null,
    treinamento_titulo: item.treinamento_titulo ?? null,
    peso_bp: item.peso_bp ?? null,
  } as ActionPlanTemplateItem
}

export async function fetchActionPlanTemplates(): Promise<{ rows: ActionPlanTemplate[]; error: string | null }> {
  const { data: templates, error } = await supabase
    .from('planos_acao_templates')
    .select('id, template_key, nome, departamento, indicador, descricao, program_key, active, primary_indicator_code, improvement_direction, manual_application_enabled, owner_suggestion_enabled')
    .order('nome', { ascending: true })
  if (error) return { rows: [], error: error.message }

  const ids = (templates ?? []).map(template => template.id)
  const { data: versions } = ids.length
    ? await supabase
        .from('planos_acao_template_versoes')
        .select(`${TEMPLATE_VERSION_COLUMNS}, planos_acao_template_itens(${TEMPLATE_ITEM_COLUMNS})`)
        .in('template_id', ids)
        .order('versao', { ascending: false })
    : { data: [] as Array<ActionPlanTemplateVersion & { planos_acao_template_itens?: ActionPlanTemplateItem[] }> }

  const byTemplate = new Map<string, ActionPlanTemplateVersion[]>()
  for (const version of (versions ?? []) as Array<ActionPlanTemplateVersion & { planos_acao_template_itens?: ActionPlanTemplateItem[] }>) {
    const { planos_acao_template_itens: itens, ...rest } = version
    byTemplate.set(rest.template_id, [...(byTemplate.get(rest.template_id) ?? []), { ...rest, itens: (itens ?? []).map(item => normalizeItem(item as never)) }])
  }

  return {
    rows: (templates ?? []).map(template => ({ ...template, versions: byTemplate.get(template.id) ?? [] })) as ActionPlanTemplate[],
    error: null,
  }
}

export async function fetchTemplateItems(versionId: string): Promise<ActionPlanTemplateItem[]> {
  const { data } = await supabase
    .from('planos_acao_template_itens')
    .select(TEMPLATE_ITEM_COLUMNS)
    .eq('version_id', versionId)
    .order('ordem', { ascending: true })
  return (data ?? []).map(item => normalizeItem(item as never))
}

/**
 * Salva o template e grava seus itens numa versão em rascunho. Um template
 * sem rascunho aberto ganha uma versão nova (última + 1); com rascunho aberto,
 * os itens do rascunho são substituídos.
 */
export async function saveTemplateDraft(draft: TemplateDraft, userId: string): Promise<{ error: string | null; templateId: string | null }> {
  const errors = validateTemplateDraft(draft)
  if (errors.length) return { error: errors[0], templateId: null }

  const templatePayload = {
    template_key: draft.template_key.trim(),
    nome: draft.nome.trim(),
    departamento: draft.departamento.trim(),
    indicador: draft.indicador.trim() || null,
    descricao: draft.descricao.trim() || null,
    program_key: draft.program_key.trim() || null,
    active: draft.active,
    primary_indicator_code: draft.primary_indicator_code.trim() || null,
    improvement_direction: draft.improvement_direction || null,
    manual_application_enabled: draft.manual_application_enabled,
    owner_suggestion_enabled: draft.owner_suggestion_enabled,
    updated_at: new Date().toISOString(),
  }

  const { data: template, error: templateError } = draft.id
    ? await supabase.from('planos_acao_templates').update(templatePayload).eq('id', draft.id).select('id').single()
    : await supabase.from('planos_acao_templates').insert({ ...templatePayload, created_by: userId }).select('id').single()

  if (templateError || !template) return { error: templateError?.message ?? 'Falha ao salvar o template.', templateId: null }

  const { data: existing } = await supabase
    .from('planos_acao_template_versoes')
    .select('id, versao, status')
    .eq('template_id', template.id)
    .order('versao', { ascending: false })

  const draftVersion = (existing ?? []).find(version => version.status === 'rascunho')
  let versionId = draftVersion?.id ?? null

  const versionPayload = {
    problem: draft.problem.trim() || null,
    objective: draft.objective.trim() || null,
    when_to_apply: draft.when_to_apply.trim() || null,
    owner_suggestion_title: draft.owner_suggestion_title.trim() || null,
    owner_suggestion_problem: draft.owner_suggestion_problem.trim() || null,
    owner_suggestion_recommendation: draft.owner_suggestion_recommendation.trim() || null,
    effectiveness_indicator_code: draft.effectiveness_indicator_code.trim() || null,
    updated_at: new Date().toISOString(),
  }

  if (!versionId) {
    const nextNumber = ((existing ?? [])[0]?.versao ?? 0) + 1
    const { data: created, error: versionError } = await supabase
      .from('planos_acao_template_versoes')
      .insert({ template_id: template.id, versao: nextNumber, status: 'rascunho', created_by: userId, ...versionPayload })
      .select('id')
      .single()
    if (versionError || !created) return { error: versionError?.message ?? 'Falha ao criar a versão.', templateId: template.id }
    versionId = created.id
  } else {
    await supabase.from('planos_acao_template_itens').delete().eq('version_id', versionId)
    const { error: versionUpdateError } = await supabase.from('planos_acao_template_versoes').update(versionPayload).eq('id', versionId)
    if (versionUpdateError) return { error: versionUpdateError.message, templateId: template.id }
  }

  const items = draft.items.filter(item => item.problema.trim() && item.acao.trim())
  const weights = calculateItemWeights(items.length)
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
      support_material_type: item.support_material_type,
      file_asset_path: item.support_material_type === 'arquivo' ? item.file_asset_path : null,
      file_asset_name: item.support_material_type === 'arquivo' ? item.file_asset_name : null,
      treinamento_id: item.support_material_type === 'aula' ? item.treinamento_id : null,
      treinamento_titulo: item.support_material_type === 'aula' ? item.treinamento_titulo : null,
      peso_bp: weights[index]?.weight_bp ?? null,
    })),
  )
  if (itemsError) return { error: itemsError.message, templateId: template.id }

  return { error: null, templateId: template.id }
}

/** Id do rascunho aberto de um template, se houver — usado para publicar logo após salvar. */
export async function fetchDraftVersionId(templateId: string): Promise<string | null> {
  const { data } = await supabase
    .from('planos_acao_template_versoes')
    .select('id')
    .eq('template_id', templateId)
    .eq('status', 'rascunho')
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
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

  const { data, error } = await supabase
    .from('planos_acao_template_versoes')
    .update({ status: 'publicada', published_at: new Date().toISOString(), published_by: userId, updated_at: new Date().toISOString() })
    .eq('id', versionId)
  return { error: error?.message ?? null }
}

/** Abre uma revisão copiando a versão publicada; reutiliza rascunho existente. */
export async function createNewTemplateVersion(input: {
  templateId: string
  userId: string
  notes?: string | null
}): Promise<{ versionId: string | null; created: boolean; error: string | null }> {
  const { data: versions, error: versionsError } = await supabase
    .from('planos_acao_template_versoes')
    .select('id, status')
    .eq('template_id', input.templateId)
    .order('versao', { ascending: false })
  if (versionsError) return { versionId: null, created: false, error: versionsError.message }

  const existingDraft = (versions ?? []).find(version => version.status === 'rascunho')
  if (existingDraft) return { versionId: existingDraft.id, created: false, error: null }
  const { data, error } = await supabase.rpc('open_action_plan_template_revision', {
    p_template_id: input.templateId,
    p_notes: input.notes?.trim() || null,
  })
  if (error) return { versionId: null, created: false, error: error.message }
  if (typeof data !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data)) {
    return { versionId: null, created: false, error: 'A revisão foi criada com uma resposta inválida.' }
  }
  return { versionId: data, created: true, error: null }
}

/** Desativa ou reativa um template sem apagar versões nem aplicações. */
export async function setTemplateActive(templateId: string, active: boolean): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('planos_acao_templates')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select('id')
  if (error) return { error: error.message }
  return { error: data?.length ? null : 'Não foi possível atualizar o template.' }
}

/** Arquiva versões abertas/publicadas e preserva aplicações já materializadas. */
export async function archiveTemplate(templateId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('archive_action_plan_template', { p_template_id: templateId })
  return { error: error?.message ?? null }
}


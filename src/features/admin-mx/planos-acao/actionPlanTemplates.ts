import { supabase } from '@/lib/supabase'
import { BASE44_STANDARD_INDICATORS, matchCanonicalIndicator, officialDefinitionDirection, officialDefinitionUnit } from '../indicadores/canonicalBase44Catalog'
import { departmentCategory } from './departmentTaxonomy'

export type TemplateItemPriority = 'baixa' | 'media' | 'alta' | 'critica'
export type ImprovementDirection = 'aumentar' | 'reduzir' | 'manter' | 'faixa' | 'corrigir_processo'
export type SupportMaterialType = 'nenhum' | 'arquivo' | 'aula'

export const RESPONSIBLE_ROLE_OPTIONS = [
  { value: 'DONO', label: 'Dono' },
  { value: 'DIRETOR', label: 'Diretor' },
  { value: 'GERENTE_GERAL', label: 'Gerente Geral' },
  { value: 'GERENTE_COMERCIAL', label: 'Gerente Comercial' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'PRODUTO_ESTOQUE', label: 'Produto e Estoque' },
  { value: 'PESSOAS_RH', label: 'Pessoas - RH' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'OPERACOES', label: 'Operações' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'CONSULTOR_MX', label: 'Consultor MX' },
] as const

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
  recommended_responsible_role: string | null
  /** Peso em basis points (soma 10000 entre os itens da versão). Calculado, não editável. */
  peso_bp: number | null
}

export type ActionPlanTemplateVersion = {
  id: string
  template_id: string
  versao: number
  status: 'rascunho' | 'publicada' | 'arquivada'
  improvement_direction: ImprovementDirection | null
  default_responsible_role: string | null
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
  default_responsible_role: string | null
  manual_application_enabled: boolean
  owner_suggestion_enabled: boolean
  /** Total de planos criados a partir de qualquer versão deste template. */
  application_count?: number
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
  default_responsible_role: string
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
    default_responsible_role: '',
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
    treinamento_id: null, treinamento_titulo: null, recommended_responsible_role: null, peso_bp: null,
  }
}

function codePart(value: string, max = 30): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, max)
}

/** Gera código Base44 `PA_{DEPT}_{INDICATOR}_{NNN}` (`generateTemplateCode`). */
export function suggestTemplateKey(draft: Pick<TemplateDraft, 'departamento' | 'primary_indicator_code' | 'nome'>): string {
  const dept = codePart(draft.departamento || 'GENERIC', 24) || 'GENERIC'
  const indicator = codePart(draft.primary_indicator_code || draft.nome || 'GENERIC', 30) || 'GENERIC'
  // ponytail: seq estável sem listar templates; colisão rara → usuário edita chave.
  const seq = String((Date.now() % 1000)).padStart(3, '0')
  return `PA_${dept}_${indicator}_${seq}`
}

/** Completa chave e problema ocultos para o save continuar 1:1 com o wizard Base44. */
export function prepareTemplateDraftForSave(draft: TemplateDraft): TemplateDraft {
  return {
    ...draft,
    template_key: draft.template_key.trim() || suggestTemplateKey(draft),
    items: draft.items.map(item => ({
      ...item,
      problema: item.problema.trim() || item.acao.trim(),
      acao: item.acao.trim() || item.problema.trim(),
    })),
  }
}

/**
 * Rehydrates a persisted template into the editor's canonical catalog values.
 * Older seeds store department labels/codes such as `PESSOAS_RH`, while the
 * indicator catalog and wizard use the MX category codes (`rh`, `produto`, ...).
 * The primary indicator also predates its dedicated column in some rows, so
 * the persisted indicator code is a safe backwards-compatible fallback.
 */
export function buildTemplateDraftFromTemplate(
  template: ActionPlanTemplate,
  source: ActionPlanTemplateVersion | null,
  items: ActionPlanTemplateItem[],
): TemplateDraft {
  const empty = emptyTemplateDraft()
  return {
    ...empty,
    id: template.id,
    template_key: template.template_key,
    nome: template.nome,
    departamento: departmentCategory(template.departamento) ?? template.departamento,
    indicador: template.indicador ?? '',
    descricao: template.descricao ?? '',
    program_key: template.program_key ?? '',
    active: template.active,
    primary_indicator_code: template.primary_indicator_code ?? template.indicador ?? '',
    improvement_direction: source?.improvement_direction ?? template.improvement_direction ?? empty.improvement_direction,
    default_responsible_role: source?.default_responsible_role ?? template.default_responsible_role ?? '',
    manual_application_enabled: template.manual_application_enabled,
    owner_suggestion_enabled: template.owner_suggestion_enabled,
    problem: source?.problem ?? '',
    objective: source?.objective ?? '',
    when_to_apply: source?.when_to_apply ?? '',
    effectiveness_indicator_code: source?.effectiveness_indicator_code ?? '',
    owner_suggestion_title: source?.owner_suggestion_title ?? '',
    owner_suggestion_problem: source?.owner_suggestion_problem ?? '',
    owner_suggestion_recommendation: source?.owner_suggestion_recommendation ?? '',
    items: items.length ? items : empty.items,
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

export type IndicatorCatalogEntry = { code: string; label: string; category: string; unit: string; direction: string }

/** Base44 TemplateWizard.jsx: `{i.name} — {i.unit} ({DIRECTION_LABELS[i.default_direction]})` */
const DEFINITION_DIRECTION_LABELS: Record<string, string> = {
  AUMENTAR: 'Aumentar',
  DIMINUIR: 'Reduzir',
  MANTER: 'Manter',
  FAIXA: 'Atingir faixa ideal',
  CORRIGIR_PROCESSO: 'Corrigir processo',
}

export function formatTemplateWizardPrimaryOption(indicator: Pick<IndicatorCatalogEntry, 'label' | 'unit'>) {
  // IndicadorDefinition publicado no Base44 grava default_direction=AUMENTAR nos 45 oficiais.
  return `${indicator.label} — ${indicator.unit || ''} (${DEFINITION_DIRECTION_LABELS.AUMENTAR})`
}

/** Base44 TemplateWizard.jsx eficácia: `{i.name} — {i.unit}` */
export function formatTemplateWizardEffectivenessOption(indicator: Pick<IndicatorCatalogEntry, 'label' | 'unit'>) {
  return `${indicator.label} — ${indicator.unit || ''}`
}

/** 45 indicadores oficiais do Base44, com departamento no código do wizard MX. */
export function officialActionPlanIndicatorCatalog(): IndicatorCatalogEntry[] {
  // TemplateWizard.jsx não ordena: o filter do Base44 devolve o inverso do display_order.
  return [...BASE44_STANDARD_INDICATORS].reverse().map(item => ({
    code: item.code,
    label: item.name,
    category: departmentCategory(item.department) ?? item.department.toLowerCase(),
    unit: officialDefinitionUnit(item.code),
    direction: officialDefinitionDirection(item.code),
  }))
}

/** Keeps a legacy Base44 indicator selectable while the MX catalog evolves. */
export function withPersistedIndicatorOption(
  indicators: IndicatorCatalogEntry[],
  department: string,
  primaryCode: string,
  persistedLabel: string,
): IndicatorCatalogEntry[] {
  const departmentKey = departmentCategory(department)
  const departmentIndicators = indicators.filter(indicator => departmentCategory(indicator.category) === departmentKey)
  if (!primaryCode) return departmentIndicators

  const persistedCanon = matchCanonicalIndicator(primaryCode)
  if (departmentIndicators.some(indicator =>
    indicator.code === primaryCode ||
    (persistedCanon != null && matchCanonicalIndicator(indicator.code)?.code === persistedCanon.code)
  )) {
    return departmentIndicators
  }

  if (persistedCanon && departmentCategory(persistedCanon.department) === departmentKey) {
    return [{
      code: persistedCanon.code,
      label: persistedCanon.name,
      category: departmentKey ?? department,
      unit: officialDefinitionUnit(persistedCanon.code),
      direction: officialDefinitionDirection(persistedCanon.code),
    }, ...departmentIndicators]
  }

  const persisted = indicators.find(indicator => indicator.code === primaryCode)
  return [persisted ?? { code: primaryCode, label: persistedLabel || primaryCode, category: department, unit: 'legado', direction: 'AUMENTAR' }, ...departmentIndicators]
}

/** Catálogo oficial Base44 do wizard Criar Plano Padrão — não usa o catálogo legado do planejamento. */
export async function fetchIndicatorCatalog(): Promise<{ rows: IndicatorCatalogEntry[]; error: string | null }> {
  return { rows: officialActionPlanIndicatorCatalog(), error: null }
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
  else if (!/^[A-Za-z0-9_]+$/.test(draft.template_key.trim())) errors.push('A chave aceita letras, números e underline.')
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

const TEMPLATE_ITEM_COLUMNS = 'id, ordem, problema, acao, como, departamento, indicador, prioridade, prazo_dias, evidencia_requerida, support_material_type, file_asset_path, file_asset_name, treinamento_id, treinamento_titulo, recommended_responsible_role, peso_bp'
const TEMPLATE_VERSION_COLUMNS = 'id, template_id, versao, status, improvement_direction, default_responsible_role, notas, published_at, problem, objective, when_to_apply, owner_suggestion_title, owner_suggestion_problem, owner_suggestion_recommendation, effectiveness_indicator_code'

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
    recommended_responsible_role: item.recommended_responsible_role ?? null,
    peso_bp: item.peso_bp ?? null,
  } as ActionPlanTemplateItem
}

export async function fetchActionPlanTemplates(): Promise<{ rows: ActionPlanTemplate[]; error: string | null }> {
  const { data: templates, error } = await supabase
    .from('planos_acao_templates')
    .select('id, template_key, nome, departamento, indicador, descricao, program_key, active, primary_indicator_code, improvement_direction, default_responsible_role, manual_application_enabled, owner_suggestion_enabled')
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

  const versionIds = (versions ?? []).map(version => version.id)
  const { data: applications } = versionIds.length
    ? await supabase
        .from('planos_acao')
        .select('origem_ref_id')
        .eq('origem_ref_table', 'planos_acao_template_versoes')
        .in('origem_ref_id', versionIds)
    : { data: [] as Array<{ origem_ref_id: string | null }> }
  const applicationCounts = new Map<string, number>()
  for (const application of applications ?? []) {
    if (!application.origem_ref_id) continue
    applicationCounts.set(application.origem_ref_id, (applicationCounts.get(application.origem_ref_id) ?? 0) + 1)
  }

  return {
    rows: (templates ?? []).map(template => {
      const templateVersions = byTemplate.get(template.id) ?? []
      return {
        ...template,
        application_count: templateVersions.reduce((total, version) => total + (applicationCounts.get(version.id) ?? 0), 0),
        versions: templateVersions,
      }
    }) as ActionPlanTemplate[],
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
  const prepared = prepareTemplateDraftForSave(draft)
  const errors = validateTemplateDraft(prepared)
  if (errors.length) return { error: errors[0], templateId: null }
  if (!userId.trim()) return { error: 'Usuário autenticado não identificado.', templateId: null }

  const templatePayload = {
    template_key: prepared.template_key.trim(),
    nome: prepared.nome.trim(),
    departamento: prepared.departamento.trim(),
    indicador: prepared.indicador.trim() || null,
    descricao: prepared.descricao.trim() || null,
    program_key: prepared.program_key.trim() || null,
    active: prepared.active,
    primary_indicator_code: prepared.primary_indicator_code.trim() || null,
    improvement_direction: prepared.improvement_direction || null,
    default_responsible_role: prepared.default_responsible_role.trim() || null,
    manual_application_enabled: prepared.manual_application_enabled,
    owner_suggestion_enabled: prepared.owner_suggestion_enabled,
    updated_at: new Date().toISOString(),
  }

  const versionPayload = {
    improvement_direction: prepared.improvement_direction || null,
    default_responsible_role: prepared.default_responsible_role.trim() || null,
    problem: prepared.problem.trim() || null,
    objective: prepared.objective.trim() || null,
    when_to_apply: prepared.when_to_apply.trim() || null,
    owner_suggestion_title: prepared.owner_suggestion_title.trim() || null,
    owner_suggestion_problem: prepared.owner_suggestion_problem.trim() || null,
    owner_suggestion_recommendation: prepared.owner_suggestion_recommendation.trim() || null,
    effectiveness_indicator_code: prepared.effectiveness_indicator_code.trim() || null,
    updated_at: new Date().toISOString(),
  }
  const items = prepared.items.filter(item => item.problema.trim() && item.acao.trim())
  const weights = calculateItemWeights(items.length)
  const { data: templateId, error } = await supabase.rpc('save_action_plan_template_draft', {
    p_payload: {
      template_id: prepared.id ?? null,
      template: templatePayload,
      version: versionPayload,
      items: items.map((item, index) => ({
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
        recommended_responsible_role: item.recommended_responsible_role?.trim() || null,
        peso_bp: weights[index]?.weight_bp ?? null,
      })),
    },
  })
  if (error) return { error: error.message, templateId: draft.id ?? null }
  if (typeof templateId !== 'string') return { error: 'O salvamento retornou uma identificação inválida.', templateId: null }

  return { error: null, templateId }
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

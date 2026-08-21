import { supabase } from '@/lib/supabase'
import { buildDefaultCapabilities, type CapabilityReleaseStage, type CapabilityTechnicalStatus, type CapabilityVisibility } from './capabilityCatalog'

export type ProductStatus = 'rascunho' | 'em_revisao' | 'publicado' | 'suspenso_novas_contratacoes' | 'arquivado'
export type CapabilityConfigurationOrigin = 'PADRAO_PRODUTO' | 'PERSONALIZADO_PRODUTO'

export type ConsultingProduct = {
  program_key: string
  name: string | null
  descricao: string | null
  modalidade: string | null
  status: ProductStatus
  versao: number
  total_visits: number | null
  min_presenciais: number | null
  max_presenciais: number | null
  usa_plano_estrategico: boolean
  indicator_package_version_id: string | null
  evolution_group: string
  modality_variant: string | null
  change_summary: string | null
  effective_from: string | null
  active: boolean | null
  published_at: string | null
  clients: number
}

export type ProductModule = {
  id?: string
  module_key: string
  label: string
  module_code: string | null
  module_label: string | null
  menu_code: string | null
  menu_label: string | null
  incluido: boolean
  obrigatorio: boolean
  etapa: string | null
  visibilidade: 'dono' | 'gerente' | 'interno'
  release_stage: CapabilityReleaseStage
  visibility: CapabilityVisibility
  technical_status: CapabilityTechnicalStatus
  display_order: number
  status: 'ATIVO' | 'INATIVO'
  configuration_origin: CapabilityConfigurationOrigin
}

export type EncounterTime = {
  visit_number: number
  horas_online: number | null
  horas_presencial: number | null
  origem: 'manual' | 'planilha' | 'padrao'
  observacao: string | null
}

export type ProductDraft = {
  program_key: string
  name: string
  descricao: string
  modalidade: string
  total_visits: number
  min_presenciais: number | null
  max_presenciais: number | null
  usa_plano_estrategico: boolean
  evolution_group: string
  modality_variant: string
}

export function emptyProductDraft(): ProductDraft {
  return {
    program_key: '', name: '', descricao: '', modalidade: '', total_visits: 7,
    min_presenciais: null, max_presenciais: null, usa_plano_estrategico: false,
    evolution_group: 'CONSULTORIA_EVOLUTIVA_PRINCIPAL', modality_variant: '',
  }
}

/** Erro bloqueante do produto, ou null. */
export function validateProductDraft(draft: ProductDraft): string | null {
  if (!draft.program_key.trim()) return 'Informe a chave do programa.'
  if (!/^[a-z0-9_]+$/.test(draft.program_key.trim())) return 'A chave aceita apenas minúsculas, números e underline.'
  if (!draft.name.trim()) return 'Informe o nome do produto.'
  if (!Number.isFinite(draft.total_visits) || draft.total_visits < 1) return 'A jornada precisa de ao menos 1 encontro.'
  if (draft.min_presenciais !== null && draft.min_presenciais < 0) return 'Mínimo de presenciais não pode ser negativo.'
  if (draft.min_presenciais !== null && draft.min_presenciais > draft.total_visits) return 'Mínimo de presenciais maior que o total de encontros.'
  if (draft.max_presenciais !== null && draft.max_presenciais > draft.total_visits) return 'Máximo de presenciais maior que o total de encontros.'
  if (draft.min_presenciais !== null && draft.max_presenciais !== null && draft.max_presenciais < draft.min_presenciais) {
    return 'Máximo de presenciais menor que o mínimo.'
  }
  return null
}

/** Transições de ciclo de vida permitidas — espelha as ações da tela. */
export function allowedProductTransitions(status: ProductStatus): ProductStatus[] {
  if (status === 'rascunho') return ['em_revisao', 'arquivado']
  if (status === 'em_revisao') return ['rascunho', 'publicado', 'arquivado']
  if (status === 'publicado') return ['suspenso_novas_contratacoes', 'arquivado']
  if (status === 'suspenso_novas_contratacoes') return ['publicado', 'arquivado']
  return ['rascunho']
}

export function canDeleteProduct(product: Pick<ConsultingProduct, 'status' | 'clients'>) {
  return product.status === 'rascunho' && product.clients === 0
}

export function productRequiresNewVersion(product: Pick<ConsultingProduct, 'status'>): boolean {
  return product.status === 'publicado' || product.status === 'suspenso_novas_contratacoes'
}

function matchesCapabilityReference(item: ProductModule, reference: ReturnType<typeof buildDefaultCapabilities>[number]) {
  return item.incluido === true
    && item.obrigatorio === reference.mandatory
    && item.etapa === null
    && item.visibilidade === 'dono'
    && item.release_stage === reference.releaseStage
    && item.visibility === reference.visibility
    && item.technical_status === reference.technicalStatus
    && item.status === 'ATIVO'
}

function referenceForCapability(item: Pick<ProductModule, 'module_code' | 'menu_code' | 'module_key'>) {
  const references = buildDefaultCapabilities()
  return references.find(reference => (
    reference.moduleCode === item.module_code && reference.code === item.menu_code
  )) ?? references.find(reference => reference.moduleKey === item.module_key)
}

/** Aplica uma alteração de matriz e registra automaticamente sua origem. */
export function patchProductModule(item: ProductModule, values: Partial<ProductModule>): ProductModule {
  const next = { ...item, ...values }
  const reference = referenceForCapability(next)
  return {
    ...next,
    configuration_origin: reference && matchesCapabilityReference(next, reference)
      ? 'PADRAO_PRODUTO'
      : 'PERSONALIZADO_PRODUTO',
  }
}

/** Restaura o catálogo oficial MX, inclusive itens obrigatórios e metadados técnicos. */
export function restoreProductCapabilityDefaults(modules: ProductModule[]): ProductModule[] {
  const references = buildDefaultCapabilities()
  const byKey = new Map(references.map(reference => [reference.moduleKey, reference]))
  const byMenu = new Map(references.map(reference => [`${reference.moduleCode}::${reference.code}`, reference]))

  return modules.map(item => {
    const reference = byMenu.get(`${item.module_code ?? ''}::${item.menu_code ?? ''}`) ?? byKey.get(item.module_key)
    if (!reference) {
      return {
        ...item,
        incluido: false,
        obrigatorio: false,
        etapa: null,
        visibilidade: 'dono',
        release_stage: 'NA_ATIVACAO',
        visibility: 'ATIVO',
        technical_status: 'DISPONIVEL',
        status: 'ATIVO',
        configuration_origin: 'PERSONALIZADO_PRODUTO',
      }
    }
    return {
      ...item,
      label: reference.label,
      module_code: reference.moduleCode,
      module_label: reference.moduleLabel,
      menu_code: reference.code,
      menu_label: reference.label,
      incluido: true,
      obrigatorio: reference.mandatory,
      etapa: null,
      visibilidade: 'dono',
      release_stage: reference.releaseStage,
      visibility: reference.visibility,
      technical_status: reference.technicalStatus,
      display_order: reference.displayOrder,
      status: 'ATIVO',
      configuration_origin: 'PADRAO_PRODUTO',
    }
  })
}

export function validateProductPublication(input: {
  target: Pick<ConsultingProduct, 'program_key' | 'evolution_group' | 'modalidade'>
  targetStatus: ProductStatus
  currentStatus?: ProductStatus
  candidates: Array<Pick<ConsultingProduct, 'program_key' | 'evolution_group' | 'modalidade' | 'status' | 'active'>>
}): string | null {
  if (input.targetStatus !== 'publicado' || input.currentStatus === 'publicado') return null
  const activeInGroup = input.candidates.find(candidate => (
    candidate.program_key !== input.target.program_key
    && candidate.evolution_group === input.target.evolution_group
    && candidate.status === 'publicado'
    && candidate.active !== false
  ))
  if (activeInGroup) return `O grupo ${input.target.evolution_group} já possui um produto publicado (${activeInGroup.program_key}). Arquive ou suspenda a versão anterior antes de publicar.`

  const modality = String(input.target.modalidade ?? '').toLowerCase()
  const isPmrVariant = input.target.program_key === 'pmr_online' || input.target.program_key === 'pmr_hibrido' || modality === 'online' || modality === 'hibrido'
  if (isPmrVariant) {
    const incompatible = input.candidates.find(candidate => (
      candidate.program_key !== input.target.program_key
      && candidate.status === 'publicado'
      && candidate.active !== false
      && ((candidate.program_key === 'pmr_online' && input.target.program_key === 'pmr_hibrido')
        || (candidate.program_key === 'pmr_hibrido' && input.target.program_key === 'pmr_online'))
    ))
    if (incompatible) return 'PMR Online e PMR Híbrido não podem ficar ativos simultaneamente.'
  }
  return null
}

/** Chave da próxima versão do produto: `pmr_7` → `pmr_7_v2`. */
export function nextVersionKey(programKey: string, versao: number) {
  const base = programKey.replace(/_v\d+$/, '')
  return `${base}_v${versao + 1}`
}

export async function fetchConsultingProducts(): Promise<{ rows: ConsultingProduct[]; error: string | null }> {
  const [{ data: products, error }, { data: clients }] = await Promise.all([
    supabase
      .from('programas_visita_consultoria')
      .select('program_key, name, descricao, modalidade, status, versao, total_visits, min_presenciais, max_presenciais, usa_plano_estrategico, indicator_package_version_id, evolution_group, modality_variant, change_summary, effective_from, active, published_at')
      .order('name', { ascending: true }),
    supabase.from('clientes_consultoria').select('program_template_key, status'),
  ])
  if (error) return { rows: [], error: error.message }

  const counters = new Map<string, number>()
  for (const client of clients ?? []) {
    const key = client.program_template_key
    if (!key || String(client.status ?? '').toLowerCase() === 'arquivado') continue
    counters.set(key, (counters.get(key) ?? 0) + 1)
  }
  return {
    rows: (products ?? []).map(product => ({ ...product, clients: counters.get(product.program_key) ?? 0 })) as ConsultingProduct[],
    error: null,
  }
}

export async function saveProduct(
  draft: ProductDraft,
  editing: boolean,
  source?: Pick<ConsultingProduct, 'status'>,
): Promise<{ error: string | null }> {
  const invalid = validateProductDraft(draft)
  if (invalid) return { error: invalid }
  if (editing && !source) return { error: 'Não foi possível identificar o produto original para edição.' }
  if (editing && source && productRequiresNewVersion(source)) {
    return { error: 'Produto publicado é imutável. Crie uma nova versão em rascunho para editar.' }
  }
  const payload = {
    program_key: draft.program_key.trim(),
    name: draft.name.trim(),
    descricao: draft.descricao.trim() || null,
    modalidade: draft.modalidade.trim() || null,
    total_visits: draft.total_visits,
    min_presenciais: draft.min_presenciais,
    max_presenciais: draft.max_presenciais,
    usa_plano_estrategico: draft.usa_plano_estrategico,
    evolution_group: draft.evolution_group.trim() || 'CONSULTORIA_EVOLUTIVA_PRINCIPAL',
    modality_variant: draft.modality_variant.trim() || null,
    updated_at: new Date().toISOString(),
  }
  const { error } = editing
    ? await supabase.from('programas_visita_consultoria').update(payload).eq('program_key', payload.program_key)
    : await supabase.from('programas_visita_consultoria').insert({ ...payload, status: 'rascunho', versao: 1, active: true })
  if (error) {
    return { error: error.code === '23505' ? 'Já existe um produto com essa chave.' : error.message }
  }
  return { error: null }
}

export async function changeProductStatus(programKey: string, status: ProductStatus, userId: string): Promise<{ error: string | null }> {
  const { data: current, error: currentError } = await supabase
    .from('programas_visita_consultoria')
    .select('program_key, modalidade, evolution_group, status, active, published_at, published_by')
    .eq('program_key', programKey)
    .maybeSingle()
  if (currentError) return { error: currentError.message }
  if (!current) return { error: 'Produto não encontrado.' }

  if (status === 'publicado') {
    const { data: candidates, error: candidatesError } = await supabase
      .from('programas_visita_consultoria')
      .select('program_key, modalidade, evolution_group, status, active')
      .neq('program_key', programKey)
    if (candidatesError) return { error: candidatesError.message }
    const constraintError = validateProductPublication({
      target: current,
      targetStatus: status,
      currentStatus: current.status as ProductStatus,
      candidates: (candidates ?? []) as Array<Pick<ConsultingProduct, 'program_key' | 'evolution_group' | 'modalidade' | 'status' | 'active'>>,
    })
    if (constraintError) return { error: constraintError }
  }

  const { error } = await supabase
    .from('programas_visita_consultoria')
    .update({
      status,
      active: status !== 'arquivado',
      published_at: status === 'publicado' ? new Date().toISOString() : current.published_at,
      published_by: status === 'publicado' ? userId : current.published_by,
      updated_at: new Date().toISOString(),
    })
    .eq('program_key', programKey)
  return { error: error?.message ?? null }
}

/** Duplica produto, módulos e tempos numa chave nova, sempre como rascunho. */
export async function duplicateProduct(source: ConsultingProduct, targetKey: string, targetName: string, versao: number): Promise<{ error: string | null }> {
  if (!/^[a-z0-9_]+$/.test(targetKey)) return { error: 'A chave aceita apenas minúsculas, números e underline.' }
  const { error } = await supabase.rpc('duplicate_consulting_product', {
    p_source_key: source.program_key,
    p_target_key: targetKey,
    p_target_name: targetName,
    p_version: versao,
  })
  return { error: error ? (error.code === '23505' ? 'Já existe um produto com essa chave.' : error.message) : null }
}

export async function deleteDraftProduct(product: ConsultingProduct): Promise<{ error: string | null }> {
  if (!canDeleteProduct(product)) return { error: 'Só é possível excluir rascunho sem cliente vinculado.' }
  const { error } = await supabase.from('programas_visita_consultoria').delete().eq('program_key', product.program_key)
  return { error: error?.message ?? null }
}

export async function fetchProductModules(programKey: string): Promise<ProductModule[]> {
  const [{ data: saved }, { data: catalog }] = await Promise.all([
    supabase.from('modulos_produto_consultoria').select('id, module_key, label, module_code, module_label, menu_code, menu_label, incluido, obrigatorio, etapa, visibilidade, release_stage, visibility, technical_status, display_order, status, configuration_origin').eq('program_key', programKey).order('display_order', { ascending: true }),
    supabase.from('modulos_sistema').select('codigo, nome, interno_mx').order('nome', { ascending: true }),
  ])
  const savedRows = saved ?? []
  const savedByMenu = new Map(
    savedRows
      .filter(item => item.menu_code)
      .map(item => [`${String(item.module_code ?? 'LEGADO').toLowerCase()}::${String(item.menu_code).toLowerCase()}`, item]),
  )
  const savedByKey = new Map(savedRows.map(item => [item.module_key, item]))
  const consumed = new Set<string>()
  const defaults = buildDefaultCapabilities().map(reference => {
    const current = savedByMenu.get(`${reference.moduleCode.toLowerCase()}::${reference.code.toLowerCase()}`) ?? savedByKey.get(reference.moduleKey)
    if (current?.id) consumed.add(current.id)
    return {
      id: current?.id,
      module_key: current?.module_key ?? reference.moduleKey,
      label: current?.label ?? reference.label,
      module_code: current?.module_code ?? reference.moduleCode,
      module_label: current?.module_label ?? reference.moduleLabel,
      menu_code: current?.menu_code ?? reference.code,
      menu_label: current?.menu_label ?? reference.label,
      incluido: current?.incluido ?? true,
      obrigatorio: current?.obrigatorio ?? reference.mandatory,
      etapa: current?.etapa ?? null,
      visibilidade: (current?.visibilidade ?? 'dono') as ProductModule['visibilidade'],
      release_stage: (current?.release_stage ?? reference.releaseStage) as ProductModule['release_stage'],
      visibility: (current?.visibility ?? reference.visibility) as ProductModule['visibility'],
      technical_status: (current?.technical_status ?? reference.technicalStatus) as ProductModule['technical_status'],
      display_order: current?.display_order ?? reference.displayOrder,
      status: (current?.status ?? 'ATIVO') as ProductModule['status'],
      configuration_origin: (current?.configuration_origin ?? 'PADRAO_PRODUTO') as CapabilityConfigurationOrigin,
    }
  })

  const legacy = savedRows
    .filter(item => !item.id || !consumed.has(item.id))
    .map(item => ({
      id: item.id,
      module_key: item.module_key,
      label: item.label,
      module_code: item.module_code ?? 'LEGADO',
      module_label: item.module_label ?? 'Módulos legados',
      menu_code: item.menu_code ?? item.module_key,
      menu_label: item.menu_label ?? item.label,
      incluido: item.incluido,
      obrigatorio: item.obrigatorio,
      etapa: item.etapa,
      visibilidade: item.visibilidade as ProductModule['visibilidade'],
      release_stage: item.release_stage as ProductModule['release_stage'],
      visibility: item.visibility as ProductModule['visibility'],
      technical_status: item.technical_status as ProductModule['technical_status'],
      display_order: item.display_order,
      status: item.status as ProductModule['status'],
      configuration_origin: 'PERSONALIZADO_PRODUTO' as CapabilityConfigurationOrigin,
    }))

  const catalogFallback = (catalog ?? []).filter(item => !item.interno_mx && !savedRows.some(savedItem => savedItem.module_key === item.codigo))
    .map(item => ({
      module_key: item.codigo,
      label: item.nome,
      module_code: 'LEGADO',
      module_label: 'Módulos legados',
      menu_code: item.codigo,
      menu_label: item.nome,
      incluido: false,
      obrigatorio: false,
      etapa: null,
      visibilidade: 'dono' as ProductModule['visibilidade'],
      release_stage: 'NA_ATIVACAO' as ProductModule['release_stage'],
      visibility: 'ATIVO' as ProductModule['visibility'],
      technical_status: 'DISPONIVEL' as ProductModule['technical_status'],
      display_order: 1000,
      status: 'ATIVO' as ProductModule['status'],
      configuration_origin: 'PERSONALIZADO_PRODUTO' as CapabilityConfigurationOrigin,
    }))

  return [...defaults, ...legacy, ...catalogFallback].sort((left, right) => left.display_order - right.display_order)
}

export function validateProductModules(modules: ProductModule[]): string | null {
  if (!modules.some(item => item.incluido)) return 'Pelo menos um módulo deve ser liberado.'
  const missingMandatory = modules.find(item => item.obrigatorio && !item.incluido)
  if (missingMandatory) return 'O módulo obrigatório ' + (missingMandatory.menu_label ?? missingMandatory.label) + ' precisa permanecer incluído.'
  return null
}

export async function saveProductModules(programKey: string, modules: ProductModule[]): Promise<{ error: string | null }> {
  const invalid = validateProductModules(modules)
  if (invalid) return { error: invalid }
  const { error } = await supabase.from('modulos_produto_consultoria').upsert(
    modules.map(item => ({
      program_key: programKey,
      module_key: item.module_key,
      label: item.label,
      module_code: item.module_code,
      module_label: item.module_label,
      menu_code: item.menu_code,
      menu_label: item.menu_label,
      incluido: item.incluido,
      obrigatorio: item.incluido && item.obrigatorio,
      etapa: item.etapa,
      visibilidade: item.visibilidade,
      release_stage: item.release_stage,
      visibility: item.visibility,
      technical_status: item.technical_status,
      display_order: item.display_order,
      status: item.status,
      configuration_origin: item.configuration_origin,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'program_key,module_key' },
  )
  return { error: error?.message ?? null }
}

export async function fetchEncounterTimes(programKey: string, totalVisits: number): Promise<EncounterTime[]> {
  const { data } = await supabase
    .from('tempos_encontro_produto')
    .select('visit_number, horas_online, horas_presencial, origem, observacao')
    .eq('program_key', programKey)
  const byVisit = new Map((data ?? []).map(item => [item.visit_number, item]))
  return Array.from({ length: Math.max(totalVisits, 0) }, (_, index) => {
    const visit = index + 1
    const current = byVisit.get(visit)
    return {
      visit_number: visit,
      horas_online: current?.horas_online ?? null,
      horas_presencial: current?.horas_presencial ?? null,
      origem: (current?.origem ?? 'manual') as EncounterTime['origem'],
      observacao: current?.observacao ?? null,
    }
  })
}

export async function saveEncounterTimes(programKey: string, times: EncounterTime[]): Promise<{ error: string | null }> {
  const { error } = await supabase.from('tempos_encontro_produto').upsert(
    times.map(item => ({
      program_key: programKey,
      visit_number: item.visit_number,
      horas_online: item.horas_online,
      horas_presencial: item.horas_presencial,
      origem: item.origem,
      observacao: item.observacao,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'program_key,visit_number' },
  )
  return { error: error?.message ?? null }
}

/** Situação do tempo de um encontro, igual ao Base44 (Completo/Só Online/Só Presencial/Pendente). */
export function encounterTimeStatus(time: EncounterTime): 'Completo' | 'Só Online' | 'Só Presencial' | 'Pendente' {
  const online = (time.horas_online ?? 0) > 0
  const presencial = (time.horas_presencial ?? 0) > 0
  if (online && presencial) return 'Completo'
  if (online) return 'Só Online'
  if (presencial) return 'Só Presencial'
  return 'Pendente'
}

export function summarizeTimes(times: EncounterTime[]) {
  return {
    totalOnline: times.reduce((sum, item) => sum + (item.horas_online ?? 0), 0),
    totalPresencial: times.reduce((sum, item) => sum + (item.horas_presencial ?? 0), 0),
    encontros: times.length,
    pendencias: times.filter(item => encounterTimeStatus(item) === 'Pendente').length,
  }
}

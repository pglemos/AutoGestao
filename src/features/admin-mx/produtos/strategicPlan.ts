import { supabase } from '@/lib/supabase'

// ─── Plano Estratégico do produto: pacote de indicadores versionado ──────────
// Paridade com o Base44 (ProductStrategicPlanTab + productPackageOps): o produto
// pode ter um pacote de indicadores padrão vinculado (StrategicIndicatorPackage
// + Version + Item). O cliente que contrata o produto recebe no Plano
// Estratégico exatamente os indicadores da versão publicada do pacote.
// No MX o catálogo é `catalogo_metricas_consultoria` e `formula_key` define se o
// indicador é calculável (fórmula) ou digitável (manual).

export type PackageStatus = 'rascunho' | 'publicado' | 'substituido' | 'arquivado'
export type PackageVersionStatus = 'rascunho' | 'publicada' | 'substituida' | 'arquivada'
export type InclusionReason = 'selecao_direta' | 'selecao_departamento' | 'dependencia_formula'

export type StrategicPackageVersion = {
  id: string
  pacote_id: string
  versao: number
  nome: string | null
  status: PackageVersionStatus
  total_indicadores: number
  indicadores_manuais: number
  indicadores_calculados: number
  departamentos_count: number
  published_at: string | null
}

export type StrategicPackage = {
  id: string
  pacote_key: string
  nome: string
  descricao: string | null
  status: PackageStatus
  current_published_version_id: string | null
  versions: StrategicPackageVersion[]
}

/** Linha do pacote: o que entra no plano do cliente, com snapshot do catálogo. */
export type PackageItem = {
  id?: string
  version_id: string
  metric_key: string
  label_snapshot: string
  area_snapshot: string
  ordem_snapshot: number | null
  input_mode_snapshot: 'manual' | 'calculado'
  formato_snapshot: string | null
  direction_snapshot: string | null
  inclusion_reason: InclusionReason
  is_required: boolean
  dependency_of: string | null
  unit_entry_mode_snapshot: string | null
  unit_rollup_method_snapshot: string | null
  weight_indicator_code_snapshot: string | null
}

/** Indicador do catálogo já com a informação de entrada derivada do `formula_key`. */
export type PackageIndicator = {
  metric_key: string
  label: string
  area: string
  sort_order: number
  value_type: string
  direction: string
  calculavel: boolean
  inclusion_reason: InclusionReason
  unit_entry_mode: string | null
  unit_rollup_method: string | null
  weight_indicator_code: string | null
}

export const PACKAGE_STATUS_LABEL: Record<PackageStatus, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  substituido: 'Substituído',
  arquivado: 'Arquivado',
}

export const PACKAGE_VERSION_STATUS_LABEL: Record<PackageVersionStatus, string> = {
  rascunho: 'Rascunho',
  publicada: 'Publicada',
  substituida: 'Substituída',
  arquivada: 'Arquivada',
}

/** Indicador é calculável quando o catálogo tem fórmula; senão é digitável. */
export function isCalculatedIndicator(formulaKey: string | null): boolean {
  return Boolean(formulaKey && formulaKey.trim().length > 0)
}

/** Converte uma linha do catálogo em indicador de pacote com o modo derivado. */
export function toPackageIndicator(
  row: {
    metric_key: string
    label: string
    area: string
    sort_order: number
    value_type: string
    direction: string
    formula_key: string | null
    unit_entry_mode?: string | null
    unit_rollup_method?: string | null
    weight_indicator_code?: string | null
  },
  inclusionReason: InclusionReason = 'selecao_direta',
): PackageIndicator {
  return {
    metric_key: row.metric_key,
    label: row.label,
    area: row.area,
    sort_order: row.sort_order,
    value_type: row.value_type,
    direction: row.direction,
    calculavel: isCalculatedIndicator(row.formula_key),
    inclusion_reason: inclusionReason,
    unit_entry_mode: row.unit_entry_mode ?? null,
    unit_rollup_method: row.unit_rollup_method ?? null,
    weight_indicator_code: row.weight_indicator_code ?? null,
  }
}

/** Resumo do pacote, igual ao ProductStrategicPlanTab do Base44. */
export function summarizePackageIndicators(indicators: PackageIndicator[]) {
  return {
    total: indicators.length,
    manuais: indicators.filter(item => !item.calculavel).length,
    calculados: indicators.filter(item => item.calculavel).length,
    departamentos: new Set(indicators.map(item => item.area)).size,
  }
}

/** Competências meta: cada indicador gera uma meta mensal por mês do ano. */
export function competenceMetaCount(totalIndicators: number): number {
  return totalIndicators * 12
}

/** Validação do pacote antes de criar uma versão (regra pura). */
export function validatePackageDraft(draft: { nome: string; metricKeys: string[] }): string | null {
  if (!draft.nome.trim()) return 'Informe o nome do pacote.'
  if (draft.metricKeys.length === 0) return 'O pacote precisa de ao menos um indicador.'
  return null
}

/** Constrói os itens de uma versão a partir dos indicadores escolhidos. */
export function buildPackageItems(indicators: PackageIndicator[], versionId: string): PackageItem[] {
  return indicators.map(ind => ({
    version_id: versionId,
    metric_key: ind.metric_key,
    label_snapshot: ind.label,
    area_snapshot: ind.area,
    ordem_snapshot: ind.sort_order,
    input_mode_snapshot: ind.calculavel ? 'calculado' : 'manual',
    formato_snapshot: ind.value_type,
    direction_snapshot: ind.direction,
    inclusion_reason: ind.inclusion_reason,
    is_required: true,
    dependency_of: null,
    unit_entry_mode_snapshot: ind.unit_entry_mode,
    unit_rollup_method_snapshot: ind.unit_rollup_method,
    weight_indicator_code_snapshot: ind.weight_indicator_code,
  }))
}

/** Filtro por busca e área, igual ao Base44 (nome/código + departamento). */
export function filterPackageIndicators(
  indicators: PackageIndicator[],
  search: string,
  area: string,
): PackageIndicator[] {
  const term = search.trim().toLowerCase()
  return indicators.filter(item => {
    if (area !== 'todas' && item.area !== area) return false
    if (!term) return true
    return item.label.toLowerCase().includes(term) || item.metric_key.toLowerCase().includes(term)
  })
}

/** Agrupa por área mantendo a ordem oficial dentro de cada grupo. */
export function groupIndicatorsByArea(indicators: PackageIndicator[]): Array<{ area: string; items: PackageIndicator[] }> {
  const map = new Map<string, PackageIndicator[]>()
  for (const item of indicators) {
    const list = map.get(item.area) ?? []
    list.push(item)
    map.set(item.area, list)
  }
  return [...map.entries()]
    .map(([area, items]) => ({ area, items: [...items].sort((a, b) => a.sort_order - b.sort_order) }))
    .sort((a, b) => a.area.localeCompare(b.area, 'pt-BR'))
}

/** Só versão publicada pode ser vinculada a um produto. */
export function canLinkPackageVersion(version: Pick<StrategicPackageVersion, 'status'>): boolean {
  return version.status === 'publicada'
}

/** Rótulo da origem do item no plano (Base44: Direto / Por dependência). */
export function inclusionReasonLabel(reason: InclusionReason): string {
  return reason === 'dependencia_formula' ? 'Por dependência' : 'Direto'
}

// ─── Acesso a dados ───────────────────────────────────────────────────────────

export async function fetchStrategicPackages(): Promise<{ rows: StrategicPackage[]; error: string | null }> {
  const [{ data: packages, error }, { data: versions }] = await Promise.all([
    supabase
      .from('pacotes_indicadores_estrategicos')
      .select('id, pacote_key, nome, descricao, status, current_published_version_id')
      .order('nome', { ascending: true }),
    supabase
      .from('pacotes_indicadores_versoes')
      .select('id, pacote_id, versao, nome, status, total_indicadores, indicadores_manuais, indicadores_calculados, departamentos_count, published_at')
      .order('versao', { ascending: false }),
  ])
  if (error) return { rows: [], error: error.message }
  const byPackage = new Map<string, StrategicPackageVersion[]>()
  for (const version of versions ?? []) {
    const list = byPackage.get(version.pacote_id) ?? []
    list.push(version as StrategicPackageVersion)
    byPackage.set(version.pacote_id, list)
  }
  return {
    rows: (packages ?? []).map(pkg => ({ ...pkg, versions: byPackage.get(pkg.id) ?? [] })) as StrategicPackage[],
    error: null,
  }
}

/** Versões publicadas disponíveis para vincular a um produto. */
export async function fetchLinkablePackageVersions(): Promise<{ rows: StrategicPackageVersion[]; error: string | null }> {
  const { data, error } = await supabase
    .from('pacotes_indicadores_versoes')
    .select('id, pacote_id, versao, nome, status, total_indicadores, indicadores_manuais, indicadores_calculados, departamentos_count, published_at')
    .eq('status', 'publicada')
    .order('published_at', { ascending: false })
  return { rows: (data ?? []) as StrategicPackageVersion[], error: error?.message ?? null }
}

/** Indicadores do catálogo publicados, com a informação de fórmula. */
export async function fetchPublishedIndicators(): Promise<{ rows: PackageIndicator[]; error: string | null }> {
  const { data, error } = await supabase
    .from('catalogo_metricas_consultoria')
    .select('metric_key, label, area, sort_order, value_type, direction, formula_key, status, unit_entry_mode, unit_rollup_method, weight_indicator_code')
    .eq('status', 'publicado')
    .order('sort_order', { ascending: true })
  if (error) return { rows: [], error: error.message }
  return { rows: (data ?? []).map(row => toPackageIndicator(row)), error: null }
}

/** Itens (indicadores congelados) de uma versão de pacote. */
export async function fetchPackageVersionItems(versionId: string): Promise<{ rows: PackageIndicator[]; error: string | null }> {
  const { data, error } = await supabase
    .from('pacotes_indicadores_itens')
    .select('metric_key, label_snapshot, area_snapshot, ordem_snapshot, input_mode_snapshot, formato_snapshot, direction_snapshot, inclusion_reason, unit_entry_mode_snapshot, unit_rollup_method_snapshot, weight_indicator_code_snapshot')
    .eq('version_id', versionId)
    .order('ordem_snapshot', { ascending: true, nullsFirst: true })
  if (error) return { rows: [], error: error.message }
  return {
    rows: (data ?? []).map(item => ({
      metric_key: item.metric_key,
      label: item.label_snapshot ?? item.metric_key,
      area: item.area_snapshot ?? '—',
      sort_order: item.ordem_snapshot ?? 0,
      value_type: item.formato_snapshot ?? '—',
      direction: item.direction_snapshot ?? '—',
      calculavel: item.input_mode_snapshot === 'calculado',
      inclusion_reason: (item.inclusion_reason ?? 'selecao_direta') as InclusionReason,
      unit_entry_mode: item.unit_entry_mode_snapshot,
      unit_rollup_method: item.unit_rollup_method_snapshot,
      weight_indicator_code: item.weight_indicator_code_snapshot,
    })),
    error: null,
  }
}

/** Cria pacote + versão rascunho + itens a partir de indicadores do catálogo. */
export async function createStrategicPackage(
  draft: { nome: string; descricao: string; metricKeys: string[] },
  createdBy: string,
): Promise<{ packageId: string; versionId: string; error: string | null }> {
  const invalid = validatePackageDraft({ nome: draft.nome, metricKeys: draft.metricKeys })
  if (invalid) return { packageId: '', versionId: '', error: invalid }

  const pacoteKey = draft.nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)

  const { data: existing } = await supabase
    .from('pacotes_indicadores_estrategicos')
    .select('id')
    .eq('pacote_key', pacoteKey)
    .maybeSingle()

  let packageId: string
  if (existing) {
    packageId = existing.id
  } else {
    const { data: created, error: createError } = await supabase
      .from('pacotes_indicadores_estrategicos')
      .insert({ pacote_key: pacoteKey, nome: draft.nome.trim(), descricao: draft.descricao.trim() || null, status: 'rascunho', created_by: createdBy })
      .select('id')
      .single()
    if (createError) return { packageId: '', versionId: '', error: createError.code === '23505' ? 'Já existe um pacote com esse nome.' : createError.message }
    packageId = created.id
  }

  const { data: indicators } = await supabase
    .from('catalogo_metricas_consultoria')
    .select('metric_key, label, area, sort_order, value_type, direction, formula_key, unit_entry_mode, unit_rollup_method, weight_indicator_code')
    .in('metric_key', draft.metricKeys)

  const { data: version, error: versionError } = await supabase
    .from('pacotes_indicadores_versoes')
    .insert({
      pacote_id: packageId,
      versao: 1,
      nome: draft.nome.trim(),
      status: 'rascunho',
      created_by: createdBy,
      ...summarizePackageIndicators((indicators ?? []).map(row => toPackageIndicator(row))),
    })
    .select('id')
    .single()
  if (versionError) return { packageId, versionId: '', error: versionError.message }

  const items = buildPackageItems((indicators ?? []).map(row => toPackageIndicator(row)), version.id)
  const { error: itemsError } = await supabase.from('pacotes_indicadores_itens').insert(items)
  if (itemsError) return { packageId, versionId: version.id, error: itemsError.message }

  return { packageId, versionId: version.id, error: null }
}

/** Publica uma versão: arquiva a publicada anterior e promove o rascunho. */
export async function publishPackageVersion(packageId: string, versionId: string, userId: string): Promise<{ error: string | null }> {
  const { data: items } = await supabase.from('pacotes_indicadores_itens').select('id').eq('version_id', versionId)
  if (!items?.length) return { error: 'A versão precisa de indicadores para ser publicada.' }

  const { error: archiveError } = await supabase
    .from('pacotes_indicadores_versoes')
    .update({ status: 'substituida', updated_at: new Date().toISOString() })
    .eq('pacote_id', packageId)
    .eq('status', 'publicada')
  if (archiveError) return { error: archiveError.message }

  const { error } = await supabase
    .from('pacotes_indicadores_versoes')
    .update({ status: 'publicada', published_at: new Date().toISOString(), published_by: userId, updated_at: new Date().toISOString() })
    .eq('id', versionId)
  if (error) return { error: error.message }

  await supabase
    .from('pacotes_indicadores_estrategicos')
    .update({ status: 'publicado', current_published_version_id: versionId, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', packageId)
  return { error: null }
}

/** Vincula a versão publicada de um pacote ao produto. */
export async function linkPackageToProduct(programKey: string, versionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('programas_visita_consultoria')
    .update({ indicator_package_version_id: versionId, updated_at: new Date().toISOString() })
    .eq('program_key', programKey)
  return { error: error?.message ?? null }
}

/** Liga/desliga o Plano Estratégico do produto (usa_plano_estrategico). */
export async function toggleProductUsesStrategicPlan(programKey: string, usesPlan: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('programas_visita_consultoria')
    .update({ usa_plano_estrategico: usesPlan, updated_at: new Date().toISOString() })
    .eq('program_key', programKey)
  return { error: error?.message ?? null }
}

export type VisitVolumeProduct = {
  program_key?: string | null
  name?: string | null
  modalidade?: string | null
  total_visits?: number | null
  min_presenciais?: number | null
  max_presenciais?: number | null
}

export type VisitVolumeRuleSource = 'catalogo' | 'regra-produto' | 'indefinida'

export type VisitVolumeRule = {
  programKey: string | null
  productName: string | null
  modality: string | null
  totalVisits: number | null
  minPresenciais: number | null
  maxPresenciais: number | null
  source: VisitVolumeRuleSource
  label: string
  detail: string
}

export type VisitVolumeState = {
  used: number
  available: number | null
  minimumRemaining: number | null
  meetsMinimum: boolean
  exceedsMaximum: boolean
}

type ProductDefaults = {
  modality: string | null
  minPresenciais: number | null
  maxPresenciais: number | null
}

const PRODUCT_DEFAULTS: Record<string, ProductDefaults> = {
  pmr_online: { modality: 'online', minPresenciais: 0, maxPresenciais: 0 },
  pmr_hibrido: { modality: 'hibrido', minPresenciais: 2, maxPresenciais: 9 },
  pmr_plus: { modality: 'presencial', minPresenciais: 2, maxPresenciais: 9 },
  ppa: { modality: 'presencial', minPresenciais: 2, maxPresenciais: 9 },
}

function normalize(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase()
}

function formatCount(value: number): string {
  return `${value} presencial${value === 1 ? '' : 'is'}`
}

function formatRange(min: number | null, max: number | null): string {
  if (min === 0 && max === 0) return '0 presenciais'
  if (min != null && max != null && min === max) return formatCount(min)
  if (min != null && max != null) return `de ${min} a ${max} presenciais`
  if (max != null) return `até ${max} presenciais`
  if (min != null) return `mínimo de ${min} presenciais`
  return 'faixa de presenciais não definida'
}

/**
 * Resolve a regra de presencial sem duplicar a regra do catálogo no formulário.
 * Quando o catálogo informa uma faixa, ele sempre vence a regra de fallback do
 * produto. Os defaults só cobrem os quatro produtos oficiais conhecidos.
 */
export function resolveVisitVolumeRule(
  product: VisitVolumeProduct | null | undefined,
  selectedModality?: string | null,
): VisitVolumeRule {
  const programKey = product?.program_key?.trim() || null
  const defaults = programKey ? PRODUCT_DEFAULTS[normalize(programKey)] : undefined
  const hasCatalogRange = product?.min_presenciais != null || product?.max_presenciais != null
  const minPresenciais = product?.min_presenciais ?? defaults?.minPresenciais ?? null
  const maxPresenciais = product?.max_presenciais ?? defaults?.maxPresenciais ?? null
  const modality = selectedModality?.trim() || product?.modalidade?.trim() || defaults?.modality || null
  const source: VisitVolumeRuleSource = hasCatalogRange
    ? 'catalogo'
    : defaults
      ? 'regra-produto'
      : 'indefinida'
  const rangeLabel = formatRange(minPresenciais, maxPresenciais)

  return {
    programKey,
    productName: product?.name?.trim() || null,
    modality,
    totalVisits: product?.total_visits ?? null,
    minPresenciais,
    maxPresenciais,
    source,
    label: rangeLabel,
    detail: source === 'catalogo'
      ? `Catálogo MX: ${rangeLabel}.`
      : source === 'regra-produto'
        ? `Regra padrão do produto: ${rangeLabel}. Confirme o catálogo antes de publicar.`
        : 'O produto ainda não define uma faixa de visitas presenciais.',
  }
}

export function visitVolumeState(rule: VisitVolumeRule, used: number | null | undefined): VisitVolumeState {
  const normalizedUsed = Math.max(0, Number.isFinite(used) ? Number(used) : 0)
  return {
    used: normalizedUsed,
    available: rule.maxPresenciais == null ? null : Math.max(rule.maxPresenciais - normalizedUsed, 0),
    minimumRemaining: rule.minPresenciais == null ? null : Math.max(rule.minPresenciais - normalizedUsed, 0),
    meetsMinimum: rule.minPresenciais == null || normalizedUsed >= rule.minPresenciais,
    exceedsMaximum: rule.maxPresenciais != null && normalizedUsed > rule.maxPresenciais,
  }
}

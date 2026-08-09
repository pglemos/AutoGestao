/**
 * Catálogo de modelos de veículos (PRODUCT DELTA 2026-08-07 §9).
 *
 * Fonte: tabela `public.vehicle_model_catalog` (migration
 * 20260808120000_mentor_plano_ataque_delta.sql). Seed curado manualmente em
 * 2026-08-08 — categoria conforme dado público das montadoras, nunca inventada.
 *
 * Determinístico e puro: sem IA, sem banco, sem relógio próprio. O catálogo é
 * injetado pelo chamador (adapter lê a tabela e passa as linhas para cá).
 */

export type VehicleCategory = 'hatch' | 'sedan' | 'suv' | 'picape' | 'minivan' | 'utilitario' | 'moto' | 'outro'

export interface VehicleCatalogEntry {
  id: string
  brand: string
  model: string
  /** Categoria oficial curada (delta §9.2) — nunca derivada por adivinhação. */
  category: VehicleCategory
  aliases?: string[] | null
  active?: boolean
  source?: string | null
  source_version?: string | null
}

/** Normalização determinística (delta §9.1): NFC→NFD, lowercase, hífen→espaço. */
export function normalizeVehicleText(input: string | null | undefined): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Tokens de busca do modelo: nome oficial + aliases normalizados. */
export function catalogSearchTokens(entry: VehicleCatalogEntry): string[] {
  return [entry.model, ...(entry.aliases || [])]
    .map(normalizeVehicleText)
    .filter(Boolean)
}

/** Marca da entrada já normalizada (evita re-normalizar a cada resolução). */
export function normalizeBrand(brand: string | null | undefined): string {
  return normalizeVehicleText(brand)
}

export type CatalogResolutionKind = 'resolved' | 'ambiguous' | 'not_found'

export interface CatalogResolution {
  kind: CatalogResolutionKind
  /** Entrada única resolvida; nula quando ambíguo ou inexistente (delta §9.3). */
  entry: VehicleCatalogEntry | null
  /** Modelo normalizado usado na busca (para telemetria). */
  queryModel: string
  /** Quantas entradas ativas casaram; 0 = não encontrado, >1 = ambíguo. */
  matches: number
}

/**
 * Resolve o modelo de um veículo (marca + modelo de texto livre) contra o
 * catálogo. Match por nome oficial OU alias, tudo normalizado.
 * Ambiguidade nunca escolhe modelo por adivinhação (delta §9.3).
 */
export function resolveCatalogModel(
  brand: string | null | undefined,
  model: string | null | undefined,
  catalog: VehicleCatalogEntry[],
): CatalogResolution {
  const queryBrand = normalizeBrand(brand)
  const queryModel = normalizeVehicleText(model)
  if (!queryBrand || !queryModel) {
    return { kind: 'not_found', entry: null, queryModel, matches: 0 }
  }

  const active = catalog.filter((entry) => entry.active !== false)
  const candidates = active.filter((entry) => {
    const brandMatch = normalizeBrand(entry.brand) === queryBrand
    if (!brandMatch) return false
    return catalogSearchTokens(entry).includes(queryModel)
  })

  if (candidates.length === 1) {
    return { kind: 'resolved', entry: candidates[0], queryModel, matches: 1 }
  }
  if (candidates.length > 1) {
    return { kind: 'ambiguous', entry: null, queryModel, matches: candidates.length }
  }
  return { kind: 'not_found', entry: null, queryModel, matches: 0 }
}

/**
 * Resolve o texto livre de `veiculo_interesse` (ex.: "Honda HR-V EXL") contra o
 * catálogo. Extrai o primeiro modelo do catálogo contido no texto normalizado.
 * Útil para sugerir `catalog_model_id` em oportunidades sem classificação.
 */
export function resolveInterestText(
  interestText: string | null | undefined,
  catalog: VehicleCatalogEntry[],
): CatalogResolution {
  const normalized = normalizeVehicleText(interestText)
  if (!normalized) {
    return { kind: 'not_found', entry: null, queryModel: '', matches: 0 }
  }

  const active = catalog.filter((entry) => entry.active !== false)
  const candidates = active.filter((entry) => {
    const brandToken = normalizeBrand(entry.brand)
    if (!brandToken || !normalized.includes(brandToken)) return false
    const tokens = catalogSearchTokens(entry)
    // Marca presente E (modelo oficial OU qualquer alias) presente no texto.
    return tokens.some((token) => token && normalized.includes(token))
  })

  if (candidates.length === 1) {
    return { kind: 'resolved', entry: candidates[0], queryModel: normalized, matches: 1 }
  }
  if (candidates.length > 1) {
    return { kind: 'ambiguous', entry: null, queryModel: normalized, matches: candidates.length }
  }
  return { kind: 'not_found', entry: null, queryModel: normalized, matches: 0 }
}

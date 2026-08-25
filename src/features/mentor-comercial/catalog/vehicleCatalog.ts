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

export const VEHICLE_CATEGORY_OPTIONS: Array<{ value: VehicleCategory; label: string }> = [
  { value: 'hatch', label: 'Hatch' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'suv', label: 'SUV' },
  { value: 'picape', label: 'Picape' },
  { value: 'minivan', label: 'Minivan' },
  { value: 'utilitario', label: 'Utilitário' },
  { value: 'moto', label: 'Moto' },
  { value: 'outro', label: 'Outro' },
]

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategory, string> = Object.fromEntries(
  VEHICLE_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
) as Record<VehicleCategory, string>

export function vehicleCategoryLabel(value: string | null | undefined): string {
  return VEHICLE_CATEGORY_LABELS[value as VehicleCategory] || value || 'Não classificado'
}

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

/**
 * Chave de comparação para entradas digitadas de formas equivalentes:
 * `T-Cross`, `T Cross` e `TCROSS` representam o mesmo modelo. A forma
 * legível acima continua sendo a canônica para exibição e telemetria.
 */
export function compactVehicleText(input: string | null | undefined): string {
  return normalizeVehicleText(input).replace(/[^a-z0-9]/g, '')
}

/** Compara textos de veículo preservando aliases de hífen/espaço. */
export function vehicleTextMatches(left: string | null | undefined, right: string | null | undefined): boolean {
  const normalizedLeft = normalizeVehicleText(left)
  const normalizedRight = normalizeVehicleText(right)
  if (!normalizedLeft || !normalizedRight) return false
  return normalizedLeft === normalizedRight || compactVehicleText(normalizedLeft) === compactVehicleText(normalizedRight)
}

/** Testa se o texto livre contém o modelo oficial ou um alias. */
export function vehicleTextContainsModel(
  text: string | null | undefined,
  model: string | null | undefined,
): boolean {
  const normalizedText = normalizeVehicleText(text)
  const normalizedModel = normalizeVehicleText(model)
  if (!normalizedText || !normalizedModel) return false
  return normalizedText.includes(normalizedModel)
    || compactVehicleText(normalizedText).includes(compactVehicleText(normalizedModel))
}

/** Tokens de busca do modelo: nome oficial + aliases normalizados. */
export function catalogSearchTokens(entry: VehicleCatalogEntry): string[] {
  return [entry.model, ...(entry.aliases || [])]
    .map(normalizeVehicleText)
    .filter(Boolean)
}

/** Marca da entrada já normalizada (evita re-normalizar a cada resolução). */
export function normalizeBrand(brand: string | null | undefined): string {
  const norm = normalizeVehicleText(brand)
  const synonyms: Record<string, string> = {
    vw: 'volkswagen',
    volks: 'volkswagen',
    chevy: 'chevrolet',
    gm: 'chevrolet',
    mercedes: 'mercedes benz',
    mb: 'mercedes benz',
    mbenz: 'mercedes benz',
    caoa: 'caoa chery',
    chery: 'caoa chery',
    lr: 'land rover',
    bimmer: 'bmw',
  }
  return synonyms[norm] || norm
}

/**
 * Variações de marca aceitas em texto livre. Isso cobre abreviações comuns
 * sem transformar uma marca digitada em dado novo no banco.
 */
export function brandSearchTokens(brand: string | null | undefined): string[] {
  const canonical = normalizeBrand(brand)
  const aliases: Record<string, string[]> = {
    volkswagen: ['vw', 'volks'],
    chevrolet: ['chevy', 'gm'],
    'mercedes benz': ['mercedes', 'mb', 'mbenz'],
    'caoa chery': ['chery', 'caoa'],
    'land rover': ['lr'],
    bmw: ['bimmer'],
  }
  return [canonical, ...(aliases[canonical] || [])]
    .map(normalizeVehicleText)
    .filter(Boolean)
}

/** Marca oficial ou abreviação presente no interesse digitado. */
export function brandAppearsInText(
  brand: string | null | undefined,
  text: string | null | undefined,
): boolean {
  const normalizedText = normalizeVehicleText(text)
  if (!normalizedText) return false
  return brandSearchTokens(brand).some((token) => vehicleTextContainsModel(normalizedText, token))
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
  const brandCandidates = active.filter((entry) => {
    const entryBrand = normalizeBrand(entry.brand)
    return entryBrand === queryBrand || entryBrand.includes(queryBrand) || queryBrand.includes(entryBrand)
  })

  if (brandCandidates.length === 0) {
    return { kind: 'not_found', entry: null, queryModel, matches: 0 }
  }

  // 1. Tenta correspondência exata por token (ex.: "onix plus" === "onix plus")
  const exactCandidates = brandCandidates.filter((entry) => {
    return catalogSearchTokens(entry).some((token) => vehicleTextMatches(token, queryModel))
  })

  if (exactCandidates.length === 1) {
    return { kind: 'resolved', entry: exactCandidates[0], queryModel, matches: 1 }
  }
  if (exactCandidates.length > 1) {
    return { kind: 'ambiguous', entry: null, queryModel, matches: exactCandidates.length }
  }

  // 2. Se não houver correspondência exata, tenta substring / token contido
  const partialCandidates = brandCandidates.filter((entry) => {
    const tokens = catalogSearchTokens(entry)
    return tokens.some((token) => {
      if (!token) return false
      return vehicleTextContainsModel(queryModel, token)
        || (compactVehicleText(token).length >= 3
          && compactVehicleText(queryModel).length >= 3
          && compactVehicleText(token).includes(compactVehicleText(queryModel)))
    })
  })

  if (partialCandidates.length === 1) {
    return { kind: 'resolved', entry: partialCandidates[0], queryModel, matches: 1 }
  }
  if (partialCandidates.length > 1) {
    return { kind: 'ambiguous', entry: null, queryModel, matches: partialCandidates.length }
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
  const brandsInText = active.filter((entry) => brandAppearsInText(entry.brand, normalized))
  // A marca é preferida quando foi digitada, mas não é obrigatória: no CRM é
  // comum o vendedor registrar apenas "RENEGADE T270" ou "TCROSS". Sem uma
  // marca explícita, o modelo só é resolvido quando a evidência é única no
  // catálogo; isso evita atribuir uma marca por adivinhação.
  const scopedEntries = brandsInText.length > 0
    ? brandsInText
    : active
  const candidates = scopedEntries.filter((entry) => {
    const tokens = catalogSearchTokens(entry)
    return tokens.some((token) => token && vehicleTextContainsModel(normalized, token))
  })

  if (candidates.length > 0) {
    // Um modelo curto pode ser substring de outro ("Onix" em "Onix Plus").
    // Mantém a entrada mais específica quando ela é única; empates continuam
    // ambíguos e exigem classificação manual.
    const specificity = (entry: VehicleCatalogEntry) => Math.max(
      ...catalogSearchTokens(entry)
        .filter((token) => vehicleTextContainsModel(normalized, token))
        .map((token) => compactVehicleText(token).length),
    )
    const longest = Math.max(...candidates.map(specificity))
    const specificCandidates = candidates.filter((entry) => specificity(entry) === longest)
    if (specificCandidates.length === 1) {
      return { kind: 'resolved', entry: specificCandidates[0], queryModel: normalized, matches: 1 }
    }
    return { kind: 'ambiguous', entry: null, queryModel: normalized, matches: specificCandidates.length }
  }

  return { kind: 'not_found', entry: null, queryModel: normalized, matches: 0 }
}

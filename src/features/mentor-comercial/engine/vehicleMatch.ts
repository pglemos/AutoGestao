/**
 * Motor de match veículo × oportunidades (PRODUCT DELTA 2026-08-07 §19).
 *
 * Regras (§19.1-§19.4): OR entre critérios explícitos, nunca inventar critério.
 *   - modelo exato (resolvido via `vehicle_model_catalog`, incluindo alias);
 *   - categoria igual (via `crm_categoria_veiculo`, exceto `outro`);
 *   - faixa de preço `[preco_interesse_min, preco_interesse_max]` (limite
 *     superior aberto quando sem max).
 * Múltiplas oportunidades compatíveis: todas retornadas, ordenadas por
 * prioridade — preço dentro da faixa com menor diferença primeiro (§19.3).
 * Retorno determinístico `{ matches, reasons, unresolved }` (§19.4).
 *
 * Determinístico e puro: sem IA, sem banco, sem relógio próprio.
 */

import {
  normalizeVehicleText,
  resolveInterestText,
  resolveCatalogModel,
  type VehicleCatalogEntry,
} from '../catalog/vehicleCatalog'

export interface VehicleMatchCriteria {
  brand: string | null
  model: string | null
  /** Preço do veículo em estoque. */
  price: number | null
  /** Categoria já classificada do veículo (veiculos_estoque.categoria). */
  category?: string | null
}

export interface OpportunityVehicleProfile {
  id: string
  /** Texto livre original de interesse (nunca sobrescrito — delta §17). */
  veiculoInteresse: string | null
  /** Oportunidade já classificada via catálogo (catalog_model_id). */
  catalogModelId?: string | null
  categoriaVeiculo?: string | null
  precoInteresseMin?: number | null
  precoInteresseMax?: number | null
}

export type VehicleMatchReasonKind = 'model' | 'category' | 'price'

export interface VehicleMatchReason {
  kind: VehicleMatchReasonKind
  detail: string
}

export interface VehicleMatchItem {
  opportunityId: string
  reasons: VehicleMatchReason[]
  /** |preço do veículo − ponto médio da faixa|; 0 quando dentro da faixa. */
  priceDistance: number | null
}

export interface VehicleMatchResult {
  matches: VehicleMatchItem[]
  /** Textos de interesse sem correspondência no catálogo (telemetria §34). */
  unresolved: Array<{ opportunityId: string; text: string }>
}

const NO_CATEGORY = 'outro'

function categorizeVehicle(
  criteria: VehicleMatchCriteria,
  catalog: VehicleCatalogEntry[],
): VehicleCatalogEntry | null {
  const resolution = resolveCatalogModel(criteria.brand, criteria.model, catalog)
  return resolution.entry
}

/**
 * Match de um veículo de estoque contra as oportunidades da carteira (§19.2).
 */
export function matchVehicleAgainstOpportunities(
  criteria: VehicleMatchCriteria,
  opportunities: OpportunityVehicleProfile[],
  catalog: VehicleCatalogEntry[],
): VehicleMatchResult {
  const vehicleEntry = categorizeVehicle(criteria, catalog)
  const vehicleCategory = criteria.category && criteria.category !== NO_CATEGORY ? criteria.category : null

  const matches: VehicleMatchItem[] = []
  const unresolved: Array<{ opportunityId: string; text: string }> = []

  for (const opportunity of opportunities) {
    const reasons: VehicleMatchReason[] = []
    const interestEntry = opportunity.catalogModelId
      ? catalog.find((entry) => entry.id === opportunity.catalogModelId) ?? null
      : null
    const interestResolution = interestEntry
      ? { kind: 'resolved' as const, entry: interestEntry, queryModel: '', matches: 1 }
      : resolveInterestText(opportunity.veiculoInteresse, catalog)

    if (interestResolution.kind === 'not_found' && opportunity.veiculoInteresse) {
      unresolved.push({ opportunityId: opportunity.id, text: opportunity.veiculoInteresse })
    }

    // Critério 1 — modelo exato via catálogo (inclui alias).
    if (vehicleEntry && interestResolution.kind === 'resolved' && interestResolution.entry) {
      if (interestResolution.entry.id === vehicleEntry.id) {
        reasons.push({ kind: 'model', detail: `${vehicleEntry.brand} ${vehicleEntry.model}` })
      }
    } else if (vehicleEntry && opportunity.veiculoInteresse && !opportunity.catalogModelId) {
      // Fallback determinístico: texto de interesse contém a marca e (modelo
      // oficial OU alias) do veículo (ex.: "Honda HR-V EXL" contém "HR-V").
      const normalizedInterest = normalizeVehicleText(opportunity.veiculoInteresse)
      const brandToken = normalizeVehicleText(vehicleEntry.brand)
      const tokens = [vehicleEntry.model, ...(vehicleEntry.aliases || [])].map(normalizeVehicleText)
      if (brandToken && normalizedInterest.includes(brandToken) && tokens.some((token) => token && normalizedInterest.includes(token))) {
        reasons.push({ kind: 'model', detail: `${vehicleEntry.brand} ${vehicleEntry.model}` })
      }
    }

    // Critério 2 — categoria igual (exclui 'outro' dos dois lados).
    if (vehicleCategory && opportunity.categoriaVeiculo && opportunity.categoriaVeiculo !== NO_CATEGORY) {
      if (opportunity.categoriaVeiculo === vehicleCategory) {
        reasons.push({ kind: 'category', detail: vehicleCategory })
      }
    }

    // Critério 3 — faixa de preço (limite superior aberto sem max).
    let priceDistance: number | null = null
    const min = opportunity.precoInteresseMin ?? null
    const max = opportunity.precoInteresseMax ?? null
    if (criteria.price !== null && criteria.price !== undefined && (min !== null || max !== null)) {
      const price = criteria.price
      const inside = (min === null || price >= min) && (max === null || price <= max)
      if (inside) {
        // §19.3 — menor diferença ao ponto médio da faixa ordena primeiro.
        const midpoint = (min ?? max!) + ((max ?? min!) - (min ?? max!)) / 2
        priceDistance = Math.abs(price - midpoint)
        reasons.push({
          kind: 'price',
          detail: min !== null && max !== null
            ? `R$ ${min.toLocaleString('pt-BR')}–R$ ${max.toLocaleString('pt-BR')}`
            : max === null
              ? `a partir de R$ ${min!.toLocaleString('pt-BR')}`
              : `até R$ ${max.toLocaleString('pt-BR')}`,
        })
      }
    }

    if (reasons.length > 0) {
      matches.push({ opportunityId: opportunity.id, reasons, priceDistance })
    }
  }

  // §19.3 — ordena por menor diferença de preço primeiro (null por último).
  matches.sort((a, b) => {
    if (a.priceDistance === null && b.priceDistance === null) return 0
    if (a.priceDistance === null) return 1
    if (b.priceDistance === null) return -1
    return a.priceDistance - b.priceDistance
  })

  return { matches, unresolved }
}

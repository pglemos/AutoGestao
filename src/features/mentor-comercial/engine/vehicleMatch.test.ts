import { describe, expect, it } from 'bun:test'

import {
  matchVehicleAgainstOpportunities,
  type OpportunityVehicleProfile,
  type VehicleMatchCriteria,
} from './vehicleMatch'
import type { VehicleCatalogEntry } from '../catalog/vehicleCatalog'

/**
 * Fonte: PRODUCT DELTA 2026-08-07 §19 (matching de veículos) — OR entre
 * critérios (modelo/categoria/faixa), ordenação por menor diferença de preço.
 */

const CATALOG: VehicleCatalogEntry[] = [
  { id: 'hrv', brand: 'Honda', model: 'HR-V', category: 'suv', aliases: ['hrv', 'hr v'] },
  { id: 'corolla', brand: 'Toyota', model: 'Corolla', category: 'sedan' },
  { id: 'hilux', brand: 'Toyota', model: 'Hilux', category: 'picape' },
]

const opportunity = (overrides: Partial<OpportunityVehicleProfile> & { id: string }): OpportunityVehicleProfile => ({
  veiculoInteresse: null,
  ...overrides,
})

const criteria = (overrides: Partial<VehicleMatchCriteria> = {}): VehicleMatchCriteria => ({
  brand: 'Honda',
  model: 'HR-V',
  price: 120000,
  category: 'suv',
  ...overrides,
})

describe('match por modelo via catálogo (§19.2)', () => {
  it('resolvido pelo catálogo (oportunidade com catalogModelId)', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria(),
      [opportunity({ id: 'o1', catalogModelId: 'hrv' })],
      CATALOG,
    )
    expect(r.matches).toHaveLength(1)
    expect(r.matches[0].reasons.some((x) => x.kind === 'model')).toBe(true)
  })

  it('resolvido por texto livre contendo o modelo (Honda HR-V EXL)', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria(),
      [opportunity({ id: 'o1', veiculoInteresse: 'Honda HR-V EXL 2024' })],
      CATALOG,
    )
    expect(r.matches).toHaveLength(1)
    expect(r.matches[0].reasons.some((x) => x.kind === 'model')).toBe(true)
  })

  it('sem match por modelo quando veículo não está no catálogo', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria({ brand: 'MarcaX', model: 'ModeloY' }),
      [opportunity({ id: 'o1', catalogModelId: 'hrv' })],
      CATALOG,
    )
    expect(r.matches).toHaveLength(0)
  })

  it('modelo não correspondido fica sem reason de modelo', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria(),
      [opportunity({ id: 'o1', catalogModelId: 'corolla' })],
      CATALOG,
    )
    expect(r.matches.some((m) => m.reasons.some((x) => x.kind === 'model'))).toBe(false)
  })

  it('casa VW TCROSS com veiculoInteresse tcross via fallback de texto e sinonimo de marca', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria({ brand: 'VW', model: 'TCROSS', price: 110000, category: null }),
      [opportunity({ id: 'o1', veiculoInteresse: 'tcross' })],
      CATALOG,
    )
    expect(r.matches).toHaveLength(1)
    expect(r.matches[0].reasons.some((x) => x.kind === 'model')).toBe(true)
  })
})

describe('match por categoria igual (§19.2)', () => {
  it('categoria igual casa; outro é excluído dos dois lados', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria(),
      [
        opportunity({ id: 'o1', categoriaVeiculo: 'suv' }),
        opportunity({ id: 'o2', categoriaVeiculo: 'sedan' }),
        opportunity({ id: 'o3', categoriaVeiculo: 'outro' }),
      ],
      CATALOG,
    )
    const matched = r.matches.map((m) => m.opportunityId)
    expect(matched).toContain('o1')
    expect(matched).not.toContain('o2')
    expect(matched).not.toContain('o3')
  })
})

describe('match por faixa de preço (§19.2-§19.3)', () => {
  it('preço dentro da faixa casa; limite superior aberto sem max', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria({ price: 110000 }),
      [
        opportunity({ id: 'o1', precoInteresseMin: 100000, precoInteresseMax: 120000 }),
        opportunity({ id: 'o2', precoInteresseMin: 130000, precoInteresseMax: 150000 }),
        opportunity({ id: 'o3', precoInteresseMin: 100000, precoInteresseMax: null }),
        opportunity({ id: 'o4', precoInteresseMin: null, precoInteresseMax: null }),
      ],
      CATALOG,
    )
    const matched = r.matches.map((m) => m.opportunityId)
    expect(matched).toContain('o1')
    expect(matched).not.toContain('o2')
    expect(matched).toContain('o3')
    expect(matched).not.toContain('o4')
  })

  it('sem preço no veículo não avalia faixa', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria({ price: null }),
      [opportunity({ id: 'o1', precoInteresseMin: 100000, precoInteresseMax: 120000 })],
      CATALOG,
    )
    expect(r.matches).toHaveLength(0)
  })

  it('ordenado por menor diferença ao ponto médio (§19.3)', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria({ price: 100000 }),
      [
        opportunity({ id: 'far', precoInteresseMin: 1, precoInteresseMax: 2, categoriaVeiculo: 'suv' }),
        opportunity({ id: 'near', precoInteresseMin: 95000, precoInteresseMax: 105000, categoriaVeiculo: 'suv' }),
      ],
      CATALOG,
    )
    expect(r.matches.map((m) => m.opportunityId)).toEqual(['near', 'far'])
  })
})

describe('retorno determinístico { matches, reasons, unresolved } (§19.4)', () => {
  it('acumula razões de múltiplos critérios no mesmo match', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria({ price: 115000 }),
      [opportunity({ id: 'o1', veiculoInteresse: 'Honda HR-V', categoriaVeiculo: 'suv', precoInteresseMin: 100000, precoInteresseMax: 120000 })],
      CATALOG,
    )
    expect(r.matches).toHaveLength(1)
    const kinds = r.matches[0].reasons.map((x) => x.kind).sort()
    expect(kinds).toEqual(['category', 'model', 'price'])
  })

  it('registra textos não resolvidos no catálogo (telemetria §34)', () => {
    const r = matchVehicleAgainstOpportunities(
      criteria(),
      [opportunity({ id: 'o1', veiculoInteresse: 'Carro velho do cliente' })],
      CATALOG,
    )
    expect(r.unresolved).toEqual([{ opportunityId: 'o1', text: 'Carro velho do cliente' }])
  })

  it('não registra unresolved quando texto vazio', () => {
    const r = matchVehicleAgainstOpportunities(criteria(), [opportunity({ id: 'o1' })], CATALOG)
    expect(r.unresolved).toHaveLength(0)
  })
})

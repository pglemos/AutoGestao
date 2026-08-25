import { describe, expect, it } from 'bun:test'

import {
  brandAppearsInText,
  compactVehicleText,
  normalizeVehicleText,
  resolveCatalogModel,
  resolveInterestText,
  type VehicleCatalogEntry,
} from './vehicleCatalog'

/**
 * Fonte: PRODUCT DELTA 2026-08-07 §9 (catálogo de modelos) — normalização
 * NFC→NFD, lowercase, hífen→espaço; match por nome exato ou alias; ambíguo
 * retorna null com motivo 'ambiguous'.
 */

const CATALOG: VehicleCatalogEntry[] = [
  { id: 'a1', brand: 'Honda', model: 'HR-V', category: 'suv', aliases: ['hrv', 'hr v'] },
  { id: 'a2', brand: 'Honda', model: 'Civic', category: 'sedan' },
  { id: 'a3', brand: 'Honda', model: 'CG 160', category: 'moto', aliases: ['cg160'] },
  { id: 'a4', brand: 'Chevrolet', model: 'Onix', category: 'hatch', aliases: ['onix'] },
  { id: 'a5', brand: 'Chevrolet', model: 'Onix Plus', category: 'sedan' },
  { id: 'a6', brand: 'Fiat', model: 'Argo', category: 'hatch', active: false },
  { id: 'a7', brand: 'Volkswagen', model: 'T-Cross', category: 'suv', aliases: ['tcross', 't cross'] },
  { id: 'a8', brand: 'Jeep', model: 'Renegade', category: 'suv' },
]

describe('normalizeVehicleText — §9.1', () => {
  it('aplica NFD, lowercase e hífen→espaço', () => {
    expect(normalizeVehicleText('HR-V')).toBe('hr v')
    expect(normalizeVehicleText('Honda HR-V EXL')).toBe('honda hr v exl')
    expect(normalizeVehicleText('Doblò')).toBe('doblo')
    expect(normalizeVehicleText('')).toBe('')
    expect(normalizeVehicleText(null)).toBe('')
    expect(normalizeVehicleText(undefined)).toBe('')
  })

  it('colapsa espaços múltiplos', () => {
    expect(normalizeVehicleText('  honda   hr-v  ')).toBe('honda hr v')
  })

  it('compara a forma compacta de hífen/espaço sem alterar o texto exibido', () => {
    expect(compactVehicleText('VW T-Cross HL')).toBe('vwtcrosshl')
  })
})

describe('resolveCatalogModel — §9.3', () => {
  it('responde resolvido para modelo oficial', () => {
    const r = resolveCatalogModel('Honda', 'Civic', CATALOG)
    expect(r.kind).toBe('resolved')
    expect(r.entry?.id).toBe('a2')
    expect(r.matches).toBe(1)
  })

  it('resolve via alias normalizado (hrv → HR-V)', () => {
    const r = resolveCatalogModel('Honda', 'HRV', CATALOG)
    expect(r.kind).toBe('resolved')
    expect(r.entry?.id).toBe('a1')
  })

  it('marca normalizada com acento (Citroën-style)', () => {
    expect(normalizeVehicleText('Citroën')).toBe('citroen')
  })

  it('não retorna ambíguo quando subconjunto do nome (Onix vs Onix Plus)', () => {
    const r = resolveCatalogModel('Chevrolet', 'Onix Plus', CATALOG)
    expect(r.kind).toBe('resolved')
    expect(r.entry?.id).toBe('a5')
  })

  it('ambíguo retorna null com motivo ambiguous', () => {
    const dup: VehicleCatalogEntry[] = [
      { id: 'x1', brand: 'Honda', model: 'CG 160', category: 'moto' },
      { id: 'x2', brand: 'Honda', model: 'CG 160 Fan', category: 'moto', aliases: ['cg 160'] },
    ]
    const r = resolveCatalogModel('Honda', 'CG 160', dup)
    expect(r.kind).toBe('ambiguous')
    expect(r.entry).toBeNull()
    expect(r.matches).toBeGreaterThan(1)
  })

  it('não encontrado retorna not_found', () => {
    const r = resolveCatalogModel('Honda', 'Fit', CATALOG)
    expect(r.kind).toBe('not_found')
    expect(r.entry).toBeNull()
  })

  it('ignora entradas inativas', () => {
    const r = resolveCatalogModel('Fiat', 'Argo', CATALOG)
    expect(r.kind).toBe('not_found')
  })

  it('sem marca ou modelo não busca', () => {
    expect(resolveCatalogModel(null, 'Civic', CATALOG).kind).toBe('not_found')
    expect(resolveCatalogModel('Honda', null, CATALOG).kind).toBe('not_found')
  })
})

describe('resolveInterestText — §9.3 (texto livre)', () => {
  it('resolve texto livre contendo marca e modelo', () => {
    const r = resolveInterestText('Honda HR-V EXL 2024', CATALOG)
    expect(r.kind).toBe('resolved')
    expect(r.entry?.id).toBe('a1')
  })

  it('não resolve quando só a marca aparece', () => {
    const r = resolveInterestText('Honda seminovo', CATALOG)
    expect(r.kind).toBe('not_found')
  })

  it('resolve texto com versão/ano anexados (CG 160 Fan)', () => {
    const r = resolveInterestText('Honda CG 160 Fan', CATALOG)
    expect(r.kind).toBe('resolved')
    expect(r.entry?.id).toBe('a3')
  })

  it('resolve marca abreviada e modelo sem hífen no texto livre', () => {
    const r = resolveInterestText('VW TCROSS HL 2020', CATALOG)
    expect(r.kind).toBe('resolved')
    expect(r.entry?.id).toBe('a7')
    expect(brandAppearsInText('Volkswagen', 'VW T-Cross')).toBe(true)
  })

  it('resolve modelo sem marca quando a evidência é única no catálogo', () => {
    const r = resolveInterestText('RENEGADE T270', CATALOG)
    expect(r.kind).toBe('resolved')
    expect(r.entry?.id).toBe('a8')
  })

  it('mantém ambiguidade quando modelo sem marca tem entradas igualmente específicas', () => {
    const r = resolveInterestText('Civic', [
      { id: 'x1', brand: 'Honda', model: 'Civic', category: 'sedan' },
      { id: 'x2', brand: 'GAC', model: 'Civic', category: 'sedan' },
    ])
    expect(r.kind).toBe('ambiguous')
    expect(r.entry).toBeNull()
  })
})

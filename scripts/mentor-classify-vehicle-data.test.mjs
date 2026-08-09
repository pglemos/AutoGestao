import { test, expect } from 'bun:test'
import { normalizeVehicleText, resolveCatalogModel, resolveInterestText, planVehicleCoverage } from './mentor-classify-vehicle-data.mjs'

const CATALOG = [
  { id: 'c1', brand: 'Honda', model: 'HR-V', normalized_brand: 'honda', normalized_model: 'hr-v', aliases: ['hrv', 'hr v'], category: 'suv', active: true },
  { id: 'c2', brand: 'Toyota', model: 'Corolla', normalized_brand: 'toyota', normalized_model: 'corolla', aliases: [], category: 'sedan', active: true },
  { id: 'c3', brand: 'Honda', model: 'Civic', normalized_brand: 'honda', normalized_model: 'civic', aliases: ['civic'], category: 'sedan', active: true },
]

test('normalizeVehicleText: NFD, lowercase, hífen -> espaço', () => {
  expect(normalizeVehicleText('HR-V')).toBe('hr v')
  expect(normalizeVehicleText('  Dóblò  ')).toBe('doblo')
  expect(normalizeVehicleText('')).toBe('')
})

test('resolveCatalogModel: único, ambíguo, não encontrado', () => {
  expect(resolveCatalogModel('Honda', 'HR-V', CATALOG)).toMatchObject({ kind: 'resolved', entry: { id: 'c1' } })
  expect(resolveCatalogModel('Honda', 'hrv', CATALOG).kind).toBe('resolved')
  expect(resolveCatalogModel('Honda', 'civic', CATALOG).kind).toBe('resolved')
  expect(resolveCatalogModel('Honda', 'Fit', CATALOG).kind).toBe('not_found')
  const ambiguo = resolveCatalogModel('Honda', 'HR-V', [{ ...CATALOG[0] }, { ...CATALOG[0], id: 'c4' }])
  expect(ambiguo.kind).toBe('ambiguous')
  expect(ambiguo.matches).toBe(2)
})

test('resolveInterestText: marca presente E modelo/alias presente', () => {
  expect(resolveInterestText('Busco um Honda HR-V turbo', CATALOG)).toMatchObject({ kind: 'resolved', entry: { id: 'c1' } })
  expect(resolveInterestText('HRV da Honda', CATALOG).kind).toBe('resolved')
  expect(resolveInterestText('Quero um Honda', CATALOG).kind).toBe('not_found')
  expect(resolveInterestText('Tem Corolla?', CATALOG).kind).toBe('not_found')
})

test('planVehicleCoverage: separa estoque e oportunidades, respeita já classificados', async () => {
  const oportunidades = [
    { id: 'o1', veiculo_interesse: 'Honda HR-V', catalog_model_id: 'c1', categoria_veiculo: 'suv' },
    { id: 'o2', veiculo_interesse: 'Toyota Corolla', catalog_model_id: null, categoria_veiculo: null },
    { id: 'o3', veiculo_interesse: 'Fiat Uno', catalog_model_id: null, categoria_veiculo: null },
  ]
  const veiculos = [
    { id: 'v1', marca: 'Honda', modelo: 'HR-V', catalog_model_id: null, categoria: null },
    { id: 'v2', marca: 'Yamaha', modelo: 'Fazer', catalog_model_id: null, categoria: null },
  ]
  const coverage = await planVehicleCoverage(CATALOG, oportunidades, veiculos)
  expect(coverage.oportunidades.jaClassificados).toBe(1)
  expect(coverage.oportunidades.resolvidos.map(r => r.item.id)).toEqual(['o2'])
  expect(coverage.oportunidades.naoEncontrados.map(r => r.item.id)).toEqual(['o3'])
  expect(coverage.estoque.resolvidos.map(r => r.item.id)).toEqual(['v1'])
  expect(coverage.estoque.naoEncontrados.map(r => r.item.id)).toEqual(['v2'])
})

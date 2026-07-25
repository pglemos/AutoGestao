import { describe, expect, test } from 'bun:test'
import { calculateDigitalProductMetrics, filterDigitalProducts } from './digitalProductFilters'
import { normalizeDigitalProduct } from './digitalProductPolicy'
import type { ProductRecord } from '../types'

const products = [
  normalizeDigitalProduct({ id: '1', name: 'PPA', description: 'Agenda consultoria', category: 'Consultoria', target_roles: ['consultor_mx'], status: 'ativo', sort_order: 1 } as ProductRecord),
  normalizeDigitalProduct({ id: '2', name: 'Treinamento', description: 'Material comercial', category: 'Treinamento', target_roles: ['vendedor'], status: 'rascunho', sort_order: 2 } as ProductRecord),
]

describe('digital product filters', () => {
  test('filters consumption and search', () => {
    const result = filterDigitalProducts({ products, role: 'consultor_mx', canManage: false, mode: 'consumo', filters: { searchTerm: 'agenda', audience: 'todos', status: 'ativo' } })
    expect(result.map((item) => item.id)).toEqual(['1'])
  })

  test('calculates visible metrics', () => {
    const metrics = calculateDigitalProductMetrics(products, 'administrador_mx', true)
    expect(metrics.total).toBe(2)
    expect(metrics.ativos).toBe(1)
    expect(metrics.audiencesCovered).toBe(2)
  })
})

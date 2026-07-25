import { describe, expect, test } from 'bun:test'
import { assertCanManageDigitalProducts, canManageDigitalProducts, isDigitalProductVisibleForRole, normalizeDigitalProduct } from './digitalProductPolicy'
import type { ProductRecord } from '../types'

const product = (overrides: Partial<ProductRecord> = {}) => normalizeDigitalProduct({ id: 'p1', name: 'Mentoria', description: 'Produto teste', link: '/produtos/mentoria', created_at: '2026-07-24', updated_at: '2026-07-24', status: 'ativo', target_roles: ['consultor_mx'], sort_order: 1, ...overrides } as ProductRecord)

describe('digital product policy', () => {
  test('only internal administrators manage products', () => {
    expect(canManageDigitalProducts('administrador_geral')).toBe(true)
    expect(canManageDigitalProducts('administrador_mx')).toBe(true)
    expect(canManageDigitalProducts('consultor_mx')).toBe(false)
    expect(() => assertCanManageDigitalProducts('consultor_mx')).toThrow('Permissão negada para gerenciar produtos digitais.')
  })

  test('consultant sees only active products assigned to consultant audience', () => {
    expect(isDigitalProductVisibleForRole(product(), 'consultor_mx', false)).toBe(true)
    expect(isDigitalProductVisibleForRole(product({ status: 'arquivado' }), 'consultor_mx', false)).toBe(false)
    expect(isDigitalProductVisibleForRole(product({ target_roles: ['gerente'] }), 'consultor_mx', false)).toBe(false)
  })
})

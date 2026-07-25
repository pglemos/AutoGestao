import type { UserRole } from '@/types/database'
import type { DigitalProductFilters, DigitalProductMetrics, ProductCatalogMode, ProductRecord } from '../types'
import { isDigitalProductVisibleForRole } from './digitalProductPolicy'

export function filterDigitalProducts({ products, role, canManage, mode, filters }: { products: ProductRecord[]; role: UserRole | null; canManage: boolean; mode: ProductCatalogMode; filters: DigitalProductFilters }): ProductRecord[] {
  const term = filters.searchTerm.trim().toLocaleLowerCase('pt-BR')
  return products
    .filter((product) => mode === 'consumo' ? isDigitalProductVisibleForRole(product, role, false) : isDigitalProductVisibleForRole(product, role, canManage))
    .filter((product) => filters.status === 'todos' || product.status === filters.status)
    .filter((product) => filters.audience === 'todos' || (product.target_roles || []).includes(filters.audience))
    .filter((product) => {
      if (!term) return true
      return [product.name, product.description, product.category, ...(product.target_roles || [])]
        .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(term))
    })
}

export function calculateDigitalProductMetrics(products: ProductRecord[], role: UserRole | null, canManage: boolean): DigitalProductMetrics {
  const visible = products.filter((product) => isDigitalProductVisibleForRole(product, role, canManage))
  return {
    total: visible.length,
    ativos: visible.filter((product) => product.status === 'ativo').length,
    vendedores: visible.filter((product) => product.target_roles?.includes('vendedor')).length,
    gerentes: visible.filter((product) => product.target_roles?.includes('gerente')).length,
    donos: visible.filter((product) => product.target_roles?.includes('dono')).length,
    audiencesCovered: new Set(visible.flatMap((product) => product.target_roles || [])).size,
    usageTelemetry: 'Sem telemetria',
  }
}

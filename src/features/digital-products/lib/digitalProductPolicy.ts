import type { UserRole } from '@/types/database'
import { DEFAULT_PRODUCT_AUDIENCES } from './digitalProductCatalog'
import type { ProductRecord } from '../types'

export function canManageDigitalProducts(role: UserRole | null): boolean {
  return role === 'administrador_geral' || role === 'administrador_mx'
}

export function assertCanManageDigitalProducts(role: UserRole | null): void {
  if (!canManageDigitalProducts(role)) throw new Error('Permissão negada para gerenciar produtos digitais.')
}

export function normalizeDigitalProduct(product: ProductRecord): ProductRecord {
  return {
    ...product,
    category: product.category || 'Operacional',
    target_roles: product.target_roles?.length ? product.target_roles : DEFAULT_PRODUCT_AUDIENCES,
    status: product.status || 'ativo',
    sort_order: product.sort_order ?? 0,
  }
}

export function isDigitalProductVisibleForRole(product: ProductRecord, role: UserRole | null, adminView: boolean): boolean {
  if (adminView) return true
  if (product.status !== 'ativo' || !role) return false
  return (product.target_roles || []).includes(role)
}

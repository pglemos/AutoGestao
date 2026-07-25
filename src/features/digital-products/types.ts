import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { DigitalProduct, UserRole } from '@/types/database'

export type ProductAudience = UserRole
export type ProductStatus = 'ativo' | 'rascunho' | 'arquivado'
export type ProductCatalogMode = 'administracao' | 'consumo'

export type ProductForm = {
  name: string
  description: string
  category: string
  target_roles: ProductAudience[]
  status: ProductStatus
  sort_order: string
}

export type ProductRecord = Omit<DigitalProduct, 'category' | 'target_roles' | 'status' | 'sort_order'> & {
  category?: string | null
  target_roles?: ProductAudience[] | null
  status?: ProductStatus | null
  sort_order?: number | null
}

export type DigitalProductFilters = {
  searchTerm: string
  audience: ProductAudience | 'todos'
  status: ProductStatus | 'todos'
}

export type DigitalProductMetrics = {
  total: number
  ativos: number
  vendedores: number
  gerentes: number
  donos: number
  audiencesCovered: number
  usageTelemetry: string
}

export interface DigitalProductsController {
  role: UserRole | null
  canManage: boolean
  products: ProductRecord[]
  filteredProducts: ProductRecord[]
  metrics: DigitalProductMetrics
  loading: boolean
  loadError: string | null
  saving: boolean
  creatingDefaults: boolean
  isRefetching: boolean
  showForm: boolean
  editingProduct: ProductRecord | null
  form: ProductForm
  searchTerm: string
  catalogMode: ProductCatalogMode
  audienceFilter: ProductAudience | 'todos'
  statusFilter: ProductStatus | 'todos'
  missingDefaultProducts: Array<Omit<ProductForm, 'sort_order'> & { sort_order: number }>
  setSearchTerm(value: string): void
  setCatalogMode(value: ProductCatalogMode): void
  setAudienceFilter(value: ProductAudience | 'todos'): void
  setStatusFilter(value: ProductStatus | 'todos'): void
  setForm: Dispatch<SetStateAction<ProductForm>>
  fetchProducts(): Promise<void>
  refresh(): Promise<void>
  openCreateForm(): void
  openEditForm(product: ProductRecord): void
  closeForm(): void
  toggleAudience(audience: ProductAudience): void
  submit(event: FormEvent<HTMLFormElement>): Promise<void>
  requestArchive(product: ProductRecord): void
  requestCreateDefaults(): void
}

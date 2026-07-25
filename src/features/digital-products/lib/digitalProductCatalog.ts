import type { ProductAudience, ProductForm, ProductRecord, ProductStatus } from '../types'

export const PRODUCT_AUDIENCES: Array<{ key: ProductAudience; label: string; description: string }> = [
  { key: 'administrador_geral', label: 'Admin Master', description: 'Aparece para administradores master' },
  { key: 'administrador_mx', label: 'Admin MX', description: 'Aparece para administradores MX' },
  { key: 'consultor_mx', label: 'Consultores', description: 'Aparece para consultores MX' },
  { key: 'dono', label: 'Donos', description: 'Aparece para proprietários' },
  { key: 'gerente', label: 'Gerentes', description: 'Aparece para gerentes' },
  { key: 'vendedor', label: 'Vendedores', description: 'Aparece para vendedores' },
]

export const DEFAULT_PRODUCT_AUDIENCES: ProductAudience[] = PRODUCT_AUDIENCES.map((item) => item.key)
export const PRODUCT_CATEGORIES = ['Operacional', 'Treinamento', 'Consultoria', 'Gestão', 'Comercial', 'Financeiro'] as const
export const PRODUCT_STATUSES: ProductStatus[] = ['ativo', 'rascunho', 'arquivado']

export const PRODUCT_DEFAULT_CATALOG: Array<Omit<ProductForm, 'sort_order'> & { sort_order: number }> = [
  { name: 'PPA', description: 'Produto base para agenda e acompanhamento de consultoria MX.', category: 'Consultoria', target_roles: DEFAULT_PRODUCT_AUDIENCES, status: 'ativo', sort_order: 10 },
  { name: 'PPA PREMIUM', description: 'Produto premium para agenda e acompanhamento de consultoria MX.', category: 'Consultoria', target_roles: DEFAULT_PRODUCT_AUDIENCES, status: 'ativo', sort_order: 20 },
  { name: 'PMR RENOVAÇÃO', description: 'Produto de renovação PMR para agenda e rotinas comerciais.', category: 'Gestão', target_roles: DEFAULT_PRODUCT_AUDIENCES, status: 'ativo', sort_order: 30 },
  { name: 'PMR PRESENCIAL', description: 'Produto PMR presencial para agenda e execução de consultoria.', category: 'Gestão', target_roles: DEFAULT_PRODUCT_AUDIENCES, status: 'ativo', sort_order: 40 },
  { name: 'PMR ONLINE', description: 'Produto PMR online para agenda e acompanhamento remoto.', category: 'Gestão', target_roles: DEFAULT_PRODUCT_AUDIENCES, status: 'ativo', sort_order: 50 },
  { name: 'MENTORIA', description: 'Produto de mentoria para desenvolvimento comercial e acompanhamento.', category: 'Treinamento', target_roles: DEFAULT_PRODUCT_AUDIENCES, status: 'ativo', sort_order: 60 },
]

export const defaultProductForm: ProductForm = {
  name: '',
  description: '',
  category: 'Operacional',
  target_roles: DEFAULT_PRODUCT_AUDIENCES,
  status: 'ativo',
  sort_order: '0',
}

export function buildInternalProductLink(productName: string) {
  const slug = productName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mxperformance.vercel.app'
  return `${origin}/produtos?produto=${slug}`
}

export function getRoleLabel(role: ProductAudience) {
  return PRODUCT_AUDIENCES.find((item) => item.key === role)?.label || role
}

export function toProductForm(product: ProductRecord): ProductForm {
  return {
    name: product.name || '',
    description: product.description || '',
    category: product.category || 'Operacional',
    target_roles: product.target_roles?.length ? product.target_roles : DEFAULT_PRODUCT_AUDIENCES,
    status: product.status || 'ativo',
    sort_order: String(product.sort_order ?? 0),
  }
}

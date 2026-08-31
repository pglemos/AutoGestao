import type { ConsultingProduct, ProductStatus } from './consultingProducts'

export const OFFICIAL_CONSULTING_PRODUCT_KEYS = [
  'pmr_online',
  'pmr_hibrido',
  'pmr_plus',
  'ppa',
] as const

export type OfficialConsultingProductKey = (typeof OFFICIAL_CONSULTING_PRODUCT_KEYS)[number]

export const LEGACY_CONSULTING_PRODUCT_KEYS = ['pmr_7', 'pmr_9', 'mx_start'] as const

export type OfficialConsultingProductDefinition = {
  program_key: OfficialConsultingProductKey
  name: string
  shortName: string
  descricao: string
  modalidade: string
  total_visits: number
  min_presenciais: number
  max_presenciais: number
  evolution_group: string
  modality_variant: string | null
  ladderLabel: string
}

/** Catálogo canônico Base44 — quatro programas comercializados, sem MX START / pmr_7 / pmr_9. */
export const OFFICIAL_CONSULTING_PRODUCT_DEFINITIONS: readonly OfficialConsultingProductDefinition[] = [
  {
    program_key: 'pmr_online',
    name: 'PMR Online',
    shortName: 'PMR Online',
    descricao: 'Programa de Maximização de Resultados — 12 encontros, todos online.',
    modalidade: 'online',
    total_visits: 12,
    min_presenciais: 0,
    max_presenciais: 0,
    evolution_group: 'CONSULTORIA_EVOLUTIVA_PRINCIPAL',
    modality_variant: 'ONLINE',
    ladderLabel: 'PMR Online',
  },
  {
    program_key: 'pmr_hibrido',
    name: 'PMR Híbrido',
    shortName: 'PMR Híbrido',
    descricao: 'Programa de Maximização de Resultados — 12 encontros, de 2 a 9 presenciais.',
    modalidade: 'hibrido',
    total_visits: 12,
    min_presenciais: 2,
    max_presenciais: 9,
    evolution_group: 'CONSULTORIA_EVOLUTIVA_PRINCIPAL',
    modality_variant: 'HIBRIDO',
    ladderLabel: 'PMR Híbrido',
  },
  {
    program_key: 'pmr_plus',
    name: 'PMR Plus',
    shortName: 'PMR Plus',
    descricao: 'Programa avançado com foco financeiro, processos e gestão (9 encontros).',
    modalidade: 'presencial',
    total_visits: 9,
    min_presenciais: 2,
    max_presenciais: 9,
    evolution_group: 'CONSULTORIA_EVOLUTIVA_PMR_PLUS',
    modality_variant: 'FLEXIVEL',
    ladderLabel: 'PMR Plus',
  },
  {
    program_key: 'ppa',
    name: 'PPA',
    shortName: 'PPA',
    descricao: 'Programa de Performance Acelerada — 9 encontros, de 2 a 9 presenciais.',
    modalidade: 'presencial',
    total_visits: 9,
    min_presenciais: 2,
    max_presenciais: 9,
    evolution_group: 'CONSULTORIA_EVOLUTIVA_PPA',
    modality_variant: 'FLEXIVEL',
    ladderLabel: 'PPA',
  },
] as const

export type ProductCatalogAction =
  | 'abrir'
  | 'editar'
  | 'enviar_revisao'
  | 'publicar'
  | 'suspender'
  | 'arquivar'
  | 'restaurar_rascunho'
  | 'nova_versao'
  | 'excluir_rascunho'

export type ProductCatalogActionDescriptor = {
  action: ProductCatalogAction
  label: string
  primary?: boolean
}

const STATUS_LABEL: Record<ProductStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  publicado: 'Publicado',
  suspenso_novas_contratacoes: 'Suspenso para novas contratações',
  arquivado: 'Arquivado',
}

export function officialProductDefinition(programKey: string) {
  return OFFICIAL_CONSULTING_PRODUCT_DEFINITIONS.find(item => item.program_key === programKey) ?? null
}

export function isOfficialConsultingProductKey(programKey: string): programKey is OfficialConsultingProductKey {
  return (OFFICIAL_CONSULTING_PRODUCT_KEYS as readonly string[]).includes(programKey)
}

export function isLegacyConsultingProductKey(programKey: string): boolean {
  return (LEGACY_CONSULTING_PRODUCT_KEYS as readonly string[]).includes(programKey)
}

export function officialProductSortIndex(programKey: string) {
  const index = OFFICIAL_CONSULTING_PRODUCT_KEYS.indexOf(programKey as OfficialConsultingProductKey)
  return index === -1 ? 100 + programKey.localeCompare('') : index
}

export function productStatusLabel(status: ProductStatus) {
  return STATUS_LABEL[status]
}

export function formatPresenciaisRange(product: Pick<ConsultingProduct, 'min_presenciais' | 'max_presenciais'>) {
  const min = product.min_presenciais
  const max = product.max_presenciais
  if (min == null && max == null) return '—'
  if (min != null && max != null && min === max) return String(min)
  return `${min ?? '—'} a ${max ?? '—'}`
}

export type ConsultingCatalogPartition = {
  official: ConsultingProduct[]
  versionDrafts: ConsultingProduct[]
  legacy: ConsultingProduct[]
}

/** Separa catálogo oficial, versões derivadas e chaves legadas fora da IA Base44. */
export function partitionConsultingCatalog(rows: ConsultingProduct[]): ConsultingCatalogPartition {
  const official: ConsultingProduct[] = []
  const versionDrafts: ConsultingProduct[] = []
  const legacy: ConsultingProduct[] = []

  for (const product of rows) {
    if (isOfficialConsultingProductKey(product.program_key)) {
      official.push(product)
      continue
    }
    if (isLegacyConsultingProductKey(product.program_key)) {
      legacy.push(product)
      continue
    }
    const baseKey = product.program_key.replace(/_v\d+$/, '')
    if (isOfficialConsultingProductKey(baseKey)) {
      versionDrafts.push(product)
      continue
    }
    versionDrafts.push(product)
  }

  official.sort((left, right) => officialProductSortIndex(left.program_key) - officialProductSortIndex(right.program_key))
  versionDrafts.sort((left, right) => left.name?.localeCompare(right.name ?? '') ?? left.program_key.localeCompare(right.program_key))
  legacy.sort((left, right) => left.name?.localeCompare(right.name ?? '') ?? left.program_key.localeCompare(right.program_key))

  return { official, versionDrafts, legacy }
}

export function visibleProductActions(product: Pick<ConsultingProduct, 'status' | 'clients'>, options?: {
  requiresNewVersion?: boolean
}): ProductCatalogActionDescriptor[] {
  const requiresNewVersion = options?.requiresNewVersion ?? false
  const actions: ProductCatalogActionDescriptor[] = [{ action: 'abrir', label: 'Abrir' }]

  if (product.status === 'rascunho') {
    actions.push({ action: 'editar', label: 'Editar' })
    actions.push({ action: 'enviar_revisao', label: 'Enviar para revisão', primary: true })
    if (product.clients === 0) actions.push({ action: 'excluir_rascunho', label: 'Excluir rascunho' })
    return actions
  }

  if (product.status === 'em_revisao') {
    actions.push({ action: 'editar', label: 'Editar' })
    actions.push({ action: 'publicar', label: 'Publicar', primary: true })
    actions.push({ action: 'restaurar_rascunho', label: 'Voltar a rascunho' })
    actions.push({ action: 'arquivar', label: 'Arquivar' })
    return actions
  }

  if (product.status === 'publicado' || product.status === 'suspenso_novas_contratacoes') {
    actions.push({ action: 'editar', label: requiresNewVersion ? 'Editar / nova versão' : 'Editar' })
    if (product.status === 'publicado') {
      actions.push({ action: 'suspender', label: 'Suspender novas contratações' })
    } else {
      actions.push({ action: 'publicar', label: 'Publicar', primary: true })
    }
    actions.push({ action: 'arquivar', label: 'Arquivar' })
    actions.push({ action: 'nova_versao', label: 'Nova versão' })
    return actions
  }

  actions.push({ action: 'restaurar_rascunho', label: 'Voltar a rascunho' })
  return actions
}

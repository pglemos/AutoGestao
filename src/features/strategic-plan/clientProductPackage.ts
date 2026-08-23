// Produto contratado → pacote de indicadores → roster do plano do cliente.
//
// Substitui a regra implícita "todo indicador publicado vale para todo cliente"
// pela regra do Base44: o plano recebe os indicadores do pacote do produto que
// o cliente contratou, na versão publicada daquele pacote.
//
// A resolução falha por motivos distintos e cada um pede uma ação diferente na
// tela. Devolver só `null` obrigaria quem chama a adivinhar qual é o caso.

import { matchCanonicalIndicator } from '@/features/admin-mx/indicadores/canonicalBase44Catalog'

export type ProductPackageBlockReason =
  | 'CLIENTE_SEM_PRODUTO'
  | 'PRODUTO_NAO_ENCONTRADO'
  | 'PRODUTO_NAO_USA_PLANO'
  | 'PRODUTO_SEM_PACOTE'
  | 'PACOTE_NAO_ENCONTRADO'
  | 'PACOTE_NAO_PUBLICADO'
  | 'PACOTE_SEM_ITENS'
  | 'ERRO_ACESSO_DADOS'

export const PRODUCT_PACKAGE_BLOCK_LABEL: Record<ProductPackageBlockReason, string> = {
  CLIENTE_SEM_PRODUTO: 'Cliente sem produto de consultoria contratado.',
  PRODUTO_NAO_ENCONTRADO: 'O produto contratado não foi encontrado no catálogo.',
  PRODUTO_NAO_USA_PLANO: 'Este produto não utiliza Plano Estratégico.',
  PRODUTO_SEM_PACOTE: 'Produto sem pacote de indicadores vinculado.',
  PACOTE_NAO_ENCONTRADO: 'Pacote de indicadores não encontrado.',
  PACOTE_NAO_PUBLICADO: 'A versão do pacote de indicadores não está publicada.',
  PACOTE_SEM_ITENS: 'A versão publicada do pacote não tem indicadores.',
  ERRO_ACESSO_DADOS: 'Não foi possível consultar o produto e o pacote de indicadores.',
}

export type ProductRow = {
  program_key: string
  name: string | null
  status: string | null
  usa_plano_estrategico: boolean | null
  indicator_package_version_id: string | null
}

export type PackageVersionRow = {
  id: string
  nome: string | null
  status: string | null
  versao: number | null
  total_indicadores: number | null
}

export type PackageItemRow = {
  id: string
  version_id: string
  metric_key: string
  label_snapshot: string | null
  area_snapshot: string | null
  input_mode_snapshot: string | null
  ordem_snapshot: number | null
  is_required: boolean | null
  inclusion_reason: string | null
  unit_entry_mode_snapshot: string | null
  unit_rollup_method_snapshot: string | null
  weight_indicator_code_snapshot: string | null
}

export type ResolvedProductPackage = {
  product: ProductRow
  packageVersion: PackageVersionRow
  items: PackageItemRow[]
  /** Códigos do roster, na ordem do pacote — é o que o plano do cliente deve conter. */
  indicatorCodes: string[]
  manualCount: number
  calculatedCount: number
  departments: string[]
}

export type ProductPackageResolution =
  | { ok: true; resolution: ResolvedProductPackage }
  | { ok: false; reason: ProductPackageBlockReason; message: string; product: ProductRow | null }

function blocked(reason: ProductPackageBlockReason, product: ProductRow | null = null, message?: string): ProductPackageResolution {
  return { ok: false, reason, message: message ?? PRODUCT_PACKAGE_BLOCK_LABEL[reason], product }
}

export function productPackageDataError(message: string, product: ProductRow | null = null): ProductPackageResolution {
  console.error('[strategic-plan] product package data access failed', message)
  return blocked('ERRO_ACESSO_DADOS', product)
}

/**
 * Decide o roster a partir do que já foi carregado.
 *
 * Separada do acesso a dados para poder ser exercitada em todos os caminhos de
 * recusa, que são a maior parte do comportamento.
 */
export function decideProductPackage(input: {
  programKey: string | null | undefined
  product: ProductRow | null | undefined
  packageVersion: PackageVersionRow | null | undefined
  items: PackageItemRow[]
}): ProductPackageResolution {
  if (!input.programKey) return blocked('CLIENTE_SEM_PRODUTO')
  if (!input.product) return blocked('PRODUTO_NAO_ENCONTRADO')
  if (input.product.usa_plano_estrategico !== true) return blocked('PRODUTO_NAO_USA_PLANO', input.product)
  if (!input.product.indicator_package_version_id) return blocked('PRODUTO_SEM_PACOTE', input.product)
  if (!input.packageVersion) return blocked('PACOTE_NAO_ENCONTRADO', input.product)
  if (input.packageVersion.status !== 'publicada') return blocked('PACOTE_NAO_PUBLICADO', input.product)
  if (input.items.length === 0) return blocked('PACOTE_SEM_ITENS', input.product)

  const items = [...input.items].sort(
    (a, b) => (a.ordem_snapshot ?? 999) - (b.ordem_snapshot ?? 999),
  )

  // O catálogo MX grava 'manual'/'calculado' em minúsculas; o Base44 usava
  // 'MANUAL'/'CALCULATED'. Comparar com um só dos dois zera a contagem em
  // silêncio — foi o que aconteceu na primeira versão desta função.
  // Para códigos oficiais Base44, a fonte de verdade é target_calculation_mode
  // do catálogo canônico (18 MANUAL / 27 CALCULATED), não o snapshot do pacote.
  const isMode = (value: string | null, ...accepted: string[]) =>
    value != null && accepted.includes(value.trim().toLowerCase())

  const classify = (item: PackageItemRow) => {
    const canon = matchCanonicalIndicator(item.metric_key)
    if (canon) {
      const mode = String(canon.target_calculation_mode ?? '').toUpperCase()
      return mode === 'MANUAL' ? 'manual' : 'calculated'
    }
    if (isMode(item.input_mode_snapshot, 'manual')) return 'manual'
    return 'calculated'
  }

  const classes = items.map(classify)

  return {
    ok: true,
    resolution: {
      product: input.product,
      packageVersion: input.packageVersion,
      items,
      indicatorCodes: items.map(item => item.metric_key),
      manualCount: classes.filter(mode => mode === 'manual').length,
      calculatedCount: classes.filter(mode => mode === 'calculated').length,
      departments: [...new Set(items.map(item => item.area_snapshot).filter((area): area is string => Boolean(area)))],
    },
  }
}

/**
 * Indicadores que o plano tem a mais e a menos em relação ao pacote contratado.
 *
 * É o que permite detectar um plano desalinhado depois de o pacote mudar de
 * versão — hoje nada percebe essa divergência.
 */
export function diffRosterAgainstPackage(
  planIndicatorCodes: string[],
  packageIndicatorCodes: string[],
): { missing: string[]; extra: string[]; aligned: boolean; disjoint: boolean } {
  const inPackage = new Set(packageIndicatorCodes)
  const inPlan = new Set(planIndicatorCodes)
  const missing = packageIndicatorCodes.filter(code => !inPlan.has(code))
  const extra = planIndicatorCodes.filter(code => !inPackage.has(code))
  const shared = planIndicatorCodes.filter(code => inPackage.has(code)).length

  // Divergência quase total não é cliente mal configurado: é o plano e o pacote
  // falando taxonomias diferentes (`sales_volume` na tela contra `sales_total`
  // no pacote, e assim por diante). Avisar o consultor não resolveria nada —
  // ele não tem como reconciliar isso pela tela — e o aviso apareceria em todo
  // cliente, todo dia. Quem trata disso é a unificação da taxonomia.
  const universe = new Set([...planIndicatorCodes, ...packageIndicatorCodes]).size
  const disjoint = universe > 0 && shared / universe < 0.2

  return { missing, extra, aligned: missing.length === 0 && extra.length === 0, disjoint }
}

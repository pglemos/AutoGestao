import type { StoreMetaRules } from '@/types/database'

type StoreSalesRulesInput = {
  storeId?: string | null
  monthlyGoal: number
  metaRules?: StoreMetaRules | null
}

export function buildStoreSalesRules({ storeId, monthlyGoal, metaRules }: StoreSalesRulesInput): StoreMetaRules {
  return {
    store_id: storeId || metaRules?.store_id || '',
    monthly_goal: metaRules?.monthly_goal ?? monthlyGoal,
    individual_goal_mode: metaRules?.individual_goal_mode || 'even',
    include_venda_loja_in_store_total: metaRules?.include_venda_loja_in_store_total ?? true,
    include_venda_loja_in_individual_goal: metaRules?.include_venda_loja_in_individual_goal ?? false,
    bench_lead_agd: metaRules?.bench_lead_agd ?? 20,
    bench_agd_visita: metaRules?.bench_agd_visita ?? 60,
    bench_visita_vnd: metaRules?.bench_visita_vnd ?? 33,
    projection_mode: metaRules?.projection_mode || 'calendar',
    remuneracao_detalhes_visivel: metaRules?.remuneracao_detalhes_visivel ?? true,
    updated_by: metaRules?.updated_by ?? null,
    updated_at: metaRules?.updated_at || new Date(0).toISOString(),
  }
}

export type ResolveCanonicalIndividualGoalInput = {
  /** Meta individual devolvida pelo read model oficial, quando disponível. */
  officialGoal?: number | null
  /** Meta mensal da loja usada somente como fallback local. */
  storeMonthlyGoal?: number | null
  /** Quantidade de vendedores ativos elegíveis ao rateio. */
  activeSellersCount?: number | null
  /** Conta operacional sem meta individual própria. */
  isVendaLoja?: boolean | null
}

/**
 * Resolve a meta individual sem deixar a meta total da loja vazar para cada
 * linha da equipe. O read model oficial tem precedência (inclusive `0` para
 * Venda Loja); enquanto ele carrega, o fallback local divide apenas entre os
 * vendedores ativos elegíveis.
 */
export function resolveCanonicalIndividualGoal({
  officialGoal,
  storeMonthlyGoal,
  activeSellersCount,
  isVendaLoja = false,
}: ResolveCanonicalIndividualGoalInput): number {
  if (officialGoal !== null && officialGoal !== undefined) {
    const canonical = Number(officialGoal)
    if (Number.isFinite(canonical)) return canonical
  }

  if (isVendaLoja) return 0

  const storeGoal = Number(storeMonthlyGoal)
  const sellerCount = Number(activeSellersCount)
  if (!Number.isFinite(storeGoal) || storeGoal <= 0 || !Number.isFinite(sellerCount) || sellerCount <= 0) return 0

  return storeGoal / sellerCount
}

/**
 * Deriva a meta individual do vendedor a partir da meta da loja
 * (`regras_metas_loja.monthly_goal`) e do modo de rateio configurado
 * (`regras_metas_loja.individual_goal_mode`).
 *
 * Modos suportados:
 * - `even` (padrão): divide a meta da loja igualmente entre os vendedores
 *   ativos (`activeSellersCount`, ex.: via RPC `contar_vendedores_ativos_loja`).
 * - `custom`: usa o valor individual configurado para o vendedor no mês/ano
 *   vigente (tabela `metas`, colunas `store_id`/`user_id`/`month`/`year`/`target`).
 *   Sem valor configurado (`customGoal` nulo/zero), cai no valor cheio da loja
 *   até o gerente cadastrar a meta individual deste vendedor.
 * - `proportional`: rateia a meta da loja por uma fração (`proportionalShare`,
 *   0-1) definida por uma regra externa a esta função. Hoje o schema não tem
 *   nenhuma coluna/tabela que armazene peso ou proporção por vendedor (nem em
 *   `regras_metas_loja`, nem em `vendedores_loja`, nem em `vinculos_loja`) —
 *   por isso `proportionalShare` normalmente chega `undefined` e a função cai
 *   no valor cheio da loja (mesmo comportamento de hoje). Ver Artigo IV (No
 *   Invention): a UI não deve inventar essa fonte de dado; quando o schema
 *   ganhar uma fonte de peso/proporção por vendedor, basta passar
 *   `proportionalShare` calculado a partir dela.
 */
export type IndividualGoalMode = StoreMetaRules['individual_goal_mode']

export type ResolveIndividualGoalInput = {
  /** `regras_metas_loja.individual_goal_mode`. Aceita string solta (dado vindo do banco) e cai em 'even' se ausente/desconhecido. */
  mode?: IndividualGoalMode | string | null
  /** `regras_metas_loja.monthly_goal` da loja ativa. */
  storeMonthlyGoal?: number | null
  /** Quantidade de vendedores ativos da loja, usada no modo 'even'. */
  activeSellersCount?: number | null
  /** Valor individual configurado para o vendedor (tabela `metas.target`), usado no modo 'custom'. */
  customGoal?: number | null
  /** Fração (0-1) da meta da loja atribuída a este vendedor, usada no modo 'proportional'. */
  proportionalShare?: number | null
}

export function resolveIndividualGoal({
  mode,
  storeMonthlyGoal,
  activeSellersCount,
  customGoal,
  proportionalShare,
}: ResolveIndividualGoalInput): number | null {
  const storeGoal = typeof storeMonthlyGoal === 'number' ? storeMonthlyGoal : Number(storeMonthlyGoal)
  if (!Number.isFinite(storeGoal) || storeGoal <= 0) return null

  const resolvedMode = String(mode || 'even')

  if (resolvedMode === 'custom') {
    const custom = typeof customGoal === 'number' ? customGoal : Number(customGoal)
    if (Number.isFinite(custom) && custom > 0) return custom
    return storeGoal
  }

  if (resolvedMode === 'proportional') {
    const share = typeof proportionalShare === 'number' ? proportionalShare : Number(proportionalShare)
    if (Number.isFinite(share) && share > 0) {
      return Math.round(storeGoal * Math.min(share, 1))
    }
    return storeGoal
  }

  if (activeSellersCount && activeSellersCount > 0) {
    return Math.round(storeGoal / activeSellersCount)
  }
  return storeGoal
}

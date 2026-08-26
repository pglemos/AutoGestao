// Políticas de unidade e consolidação por indicador.
//
// unit_entry_mode — onde o valor é cadastrado:
//   PER_UNIT_REQUIRED    cada unidade ativa precisa ter valor
//   PER_UNIT_OPTIONAL    pode existir valor em apenas algumas unidades
//   COMPANY_ONLY         cadastrado somente no consolidado da empresa
//   SHARED_COMPANY_VALUE cadastrado uma vez, exibido nas unidades, sem soma
//
// unit_rollup_method — como o consolidado do cliente é obtido:
//   SUM                    soma dos valores das unidades
//   RECALCULATE_FROM_BASES recalcula pela fórmula sobre as bases já consolidadas
//   WEIGHTED_AVERAGE       média ponderada por um indicador-peso
//   AVERAGE_VALID_VALUES   média simples dos valores válidos
//   LAST_VALID_VALUE       último valor válido
//   SHARED_NO_SUM          valor compartilhado entre unidades
//   COMPANY_VALUE          valor empresarial centralizado
//   MANUAL_CONSOLIDATED    consolidado digitado à mão

import { catalogAliasKeys } from '@/features/admin-mx/indicadores/canonicalBase44Catalog'

export type UnitEntryMode =
  | 'PER_UNIT_REQUIRED'
  | 'PER_UNIT_OPTIONAL'
  | 'COMPANY_ONLY'
  | 'SHARED_COMPANY_VALUE'

export type UnitRollupMethod =
  | 'SUM'
  | 'RECALCULATE_FROM_BASES'
  | 'WEIGHTED_AVERAGE'
  | 'AVERAGE_VALID_VALUES'
  | 'LAST_VALID_VALUE'
  | 'SHARED_NO_SUM'
  | 'COMPANY_VALUE'
  | 'MANUAL_CONSOLIDATED'

export type UnitPolicy = {
  unit_entry_mode: UnitEntryMode | null
  unit_rollup_method: UnitRollupMethod | null
  weight_indicator_code: string | null
}

type PolicyDefault = {
  unit_entry_mode: UnitEntryMode
  unit_rollup_method: UnitRollupMethod
  weight_indicator_code?: string
}

export const UNIT_ENTRY_MODES: Record<UnitEntryMode, { label: string; short: string }> = {
  PER_UNIT_REQUIRED: { label: 'Por unidade (obrigatório)', short: 'Por unidade' },
  PER_UNIT_OPTIONAL: { label: 'Por unidade (opcional)', short: 'Opcional' },
  COMPANY_ONLY: { label: 'Somente empresa', short: 'Empresa' },
  SHARED_COMPANY_VALUE: { label: 'Valor compartilhado', short: 'Compartilhado' },
}

export const UNIT_ROLLUP_METHODS: Record<UnitRollupMethod, { label: string; short: string }> = {
  SUM: { label: 'Soma das unidades', short: 'Soma' },
  RECALCULATE_FROM_BASES: { label: 'Recálculo pelas bases', short: 'Recálculo' },
  WEIGHTED_AVERAGE: { label: 'Média ponderada', short: 'Ponderada' },
  AVERAGE_VALID_VALUES: { label: 'Média dos valores válidos', short: 'Média' },
  LAST_VALID_VALUE: { label: 'Último valor válido', short: 'Último' },
  SHARED_NO_SUM: { label: 'Compartilhado (não somar)', short: 'Compartilhado' },
  COMPANY_VALUE: { label: 'Valor empresarial', short: 'Empresa' },
  MANUAL_CONSOLIDATED: { label: 'Consolidado manual', short: 'Manual' },
}

const sum = (unit_entry_mode: UnitEntryMode = 'PER_UNIT_REQUIRED'): PolicyDefault => ({
  unit_entry_mode,
  unit_rollup_method: 'SUM',
})

const recalc = (): PolicyDefault => ({
  unit_entry_mode: 'PER_UNIT_REQUIRED',
  unit_rollup_method: 'RECALCULATE_FROM_BASES',
})

const weighted = (weight_indicator_code: string): PolicyDefault => ({
  unit_entry_mode: 'PER_UNIT_OPTIONAL',
  unit_rollup_method: 'WEIGHTED_AVERAGE',
  weight_indicator_code,
})

const companyOnly = (): PolicyDefault => ({
  unit_entry_mode: 'COMPANY_ONLY',
  unit_rollup_method: 'COMPANY_VALUE',
})

export const UNIT_POLICY_DEFAULTS = {
  // Aditivos — somar unidades é correto.
  SALES_WALKIN: sum(),
  SALES_REFERRAL: sum(),
  SALES_COMPANY_PORTFOLIO: sum(),
  SALES_SELLER_PORTFOLIO: sum(),
  SALES_INTERNET: sum(),
  SALES_OTHER: sum(),
  SELLER_COUNT: sum(),
  LEADS_RECEIVED: sum(),
  VEHICLES_APPRAISED: sum(),
  SALES_WITH_TRADE: sum(),
  APPROVED_CREDIT_APPLICATIONS: sum(),
  PAID_CREDIT_APPLICATIONS: sum(),
  APPOINTMENTS_VOLUME: sum(),
  VISITS_VOLUME: sum(),
  INTERNET_INVESTMENT: sum(),
  AFTER_SALES_VOLUME: sum(),
  EMPLOYEE_COUNT: sum(),
  ACTIVE_INVENTORY: sum(),
  INVENTORY_TOTAL: sum(),
  INVENTORY_OVER_90_VOLUME: sum(),
  CONTRIBUTION_MARGIN: sum(),
  ADDITIONAL_REVENUE: sum(),

  // Percentuais, razões e médias — somar produz número plausível e errado.
  SALES_TOTAL: recalc(),
  SALES_PER_SELLER: recalc(),
  LEADS_PER_SELLER: recalc(),
  TRADE_SALES_PERCENTAGE: recalc(),
  FINANCED_SALES_PERCENTAGE: recalc(),
  APPOINTMENTS_PER_INTERNET_SALE: recalc(),
  LEAD_TO_APPOINTMENT_CONVERSION: recalc(),
  APPOINTMENT_TO_VISIT_CONVERSION: recalc(),
  VISIT_TO_SALE_CONVERSION: recalc(),
  INTERNET_COST_PER_SALE: recalc(),
  INVENTORY_TURNOVER: recalc(),
  INVENTORY_OVER_90_PERCENTAGE: recalc(),
  NET_PROFIT: recalc(),
  AVERAGE_SALES_MARGIN: recalc(),
  AFTER_SALES_PERCENTAGE: recalc(),

  // Médias ponderadas por um indicador-peso.
  INVENTORY_AVERAGE_TICKET: weighted('INVENTORY_TOTAL'),
  INVENTORY_AVERAGE_MARGIN: weighted('INVENTORY_TOTAL'),
  AVERAGE_AFTER_SALES_COST: weighted('AFTER_SALES_VOLUME'),

  // Centralizados na empresa.
  INSTAGRAM_FOLLOWERS: companyOnly(),
  GOOGLE_BUSINESS_RATING: companyOnly(),
  CONTENT_QUALITY: companyOnly(),
  TOTAL_EXPENSE: companyOnly(),
  AVERAGE_PREPARATION_COST: companyOnly(),

  // ── Vocabulário do catálogo MX (`catalogo_metricas_consultoria.metric_key`) ──
  // Os códigos acima vêm do catálogo Base44; o catálogo em produção usa outros.
  // Sem estas entradas, todo indicador MX ficaria sem política — e portanto sem
  // consolidado.

  // Contagens e valores aditivos.
  sales_goal: sum(),
  sales_total: sum(),
  sales_door_flow: sum(),
  sales_referral: sum(),
  sales_company_wallet: sum(),
  sales_seller_wallet: sum(),
  sales_internet: sum(),
  sales_other: sum(),
  seller_count: sum(),
  leads_received: sum(),
  appointments: sum(),
  visits: sum(),
  internet_investment: sum(),
  inventory_investment: sum(),
  stock_total: sum(),
  active_stock: sum(),
  trade_in_volume: sum(),
  gross_revenue: sum(),
  net_revenue: sum(),
  net_profit: sum(),
  preparation_cost: sum(),
  post_sale_cost: sum(),

  // Taxas, razões e médias por vendedor: recalculadas sobre as bases.
  goal_achievement_rate: recalc(),
  active_sellers_rate: recalc(),
  avg_sales_per_seller: recalc(),
  avg_leads_per_seller: recalc(),
  appointments_per_sale: recalc(),
  lead_to_appointment_rate: recalc(),
  internet_sales_share: recalc(),
  appointment_to_visit_rate: recalc(),
  visit_to_sale_rate: recalc(),
  no_show_rate: recalc(),
  crm_follow_up_rate: recalc(),
  internet_cost_per_sale: recalc(),
  cost_per_lead: recalc(),
  stock_turnover: recalc(),
  stock_over_90_rate: recalc(),
  trade_in_to_sales_rate: recalc(),
  gross_margin_rate: recalc(),
  fixed_expense_rate: recalc(),
  training_completion_rate: recalc(),

  // Médias de estoque e de margem: ponderadas pelo volume correspondente.
  avg_stock_price: weighted('stock_total'),
  avg_stock_km: weighted('stock_total'),
  avg_fipe_delta: weighted('stock_total'),
  avg_stock_age_days: weighted('stock_total'),
  trade_in_avg_margin: weighted('trade_in_volume'),
  avg_margin: weighted('sales_total'),


  // ── Indicadores do cockpit executivo adotados no catálogo (2026-08-26) ──
  // Medidas da operação como um todo. Consolidação entre filiais fica como
  // valor empresarial: a metodologia ainda não definiu como somar ou ponderar
  // um score executivo entre unidades, e inventar a regra produziria número
  // plausível e errado.

  sales_volume: companyOnly(),
  sales_goal_attainment: companyOnly(),
  daily_sales_rhythm: companyOnly(),
  lead_to_schedule_rate: companyOnly(),
  schedule_to_visit_rate: companyOnly(),
  commercial_pipeline_health: companyOnly(),
  seller_ranking_spread: companyOnly(),
  leads_total: companyOnly(),
  digital_leads_share: companyOnly(),
  lead_quality_score: companyOnly(),
  campaign_cadence_score: companyOnly(),
  channel_mix_score: companyOnly(),
  marketing_positioning_score: companyOnly(),
  inventory_total: companyOnly(),
  inventory_over_90_days: companyOnly(),
  stock_turnover_rate: companyOnly(),
  average_vehicle_margin: companyOnly(),
  pricing_accuracy_score: companyOnly(),
  preparation_cycle_days: companyOnly(),
  vehicle_mix_score: companyOnly(),
  gross_profit: companyOnly(),
  gross_margin_pct: companyOnly(),
  cost_per_sale: companyOnly(),
  fixed_cost_ratio: companyOnly(),
  cash_flow_balance: companyOnly(),
  dre_completion_rate: companyOnly(),
  financial_risk_score: companyOnly(),
  employees_total: companyOnly(),
  feedback_cadence_rate: companyOnly(),
  pdi_completion_rate: companyOnly(),
  turnover_rate: companyOnly(),
  happiness_index: companyOnly(),
  role_clarity_score: companyOnly(),
  behavioral_fit_score: companyOnly(),
  routine_discipline_rate: companyOnly(),
  agenda_fulfillment_rate: companyOnly(),
  daily_checkin_coverage: companyOnly(),
  action_plan_on_time_rate: companyOnly(),
  evidence_completion_rate: companyOnly(),
  executive_agenda_adherence: companyOnly(),
  process_quality_score: companyOnly(),

  // Presença digital: medida para a empresa, não por unidade.
  instagram_followers: companyOnly(),
  google_rating: companyOnly(),
  content_quality: companyOnly(),
} satisfies Record<string, PolicyDefault>

type ClientIndicatorPolicySource = {
  unit_entry_mode?: string | null
  unit_rollup_method?: string | null
  weight_indicator_code?: string | null
}

type PackageItemPolicySource = {
  unit_entry_mode_snapshot?: string | null
  unit_rollup_method_snapshot?: string | null
  weight_indicator_code_snapshot?: string | null
}

/**
 * Resolve a política efetiva de um indicador.
 *
 * Hierarquia: override do cliente > snapshot do pacote > catálogo > padrão do módulo.
 * Sem nenhuma fonte, devolve política indefinida — nunca assume soma, porque somar
 * um percentual passa despercebido.
 */
export function resolveUnitPolicy(
  indicatorCode: string,
  clientIndicator?: ClientIndicatorPolicySource | null,
  packageItem?: PackageItemPolicySource | null,
  indicatorDef?: ClientIndicatorPolicySource | null,
): UnitPolicy {
  if (clientIndicator?.unit_entry_mode && clientIndicator?.unit_rollup_method) {
    return {
      unit_entry_mode: clientIndicator.unit_entry_mode as UnitEntryMode,
      unit_rollup_method: clientIndicator.unit_rollup_method as UnitRollupMethod,
      weight_indicator_code: clientIndicator.weight_indicator_code ?? null,
    }
  }

  if (packageItem?.unit_entry_mode_snapshot && packageItem?.unit_rollup_method_snapshot) {
    return {
      unit_entry_mode: packageItem.unit_entry_mode_snapshot as UnitEntryMode,
      unit_rollup_method: packageItem.unit_rollup_method_snapshot as UnitRollupMethod,
      weight_indicator_code: packageItem.weight_indicator_code_snapshot ?? null,
    }
  }

  if (indicatorDef?.unit_entry_mode && indicatorDef?.unit_rollup_method) {
    return {
      unit_entry_mode: indicatorDef.unit_entry_mode as UnitEntryMode,
      unit_rollup_method: indicatorDef.unit_rollup_method as UnitRollupMethod,
      weight_indicator_code: indicatorDef.weight_indicator_code ?? null,
    }
  }

  const fallback = lookupPolicyDefault(indicatorCode)
  if (fallback) {
    return {
      unit_entry_mode: fallback.unit_entry_mode,
      unit_rollup_method: fallback.unit_rollup_method,
      weight_indicator_code: fallback.weight_indicator_code ?? null,
    }
  }

  return { unit_entry_mode: null, unit_rollup_method: null, weight_indicator_code: null }
}

/**
 * Busca o padrão tolerando o vocabulário do código.
 *
 * O roster persistido usa `snake_case` minúsculo (`additional_revenue`) e os
 * padrões daqui usam o código canônico Base44 (`ADDITIONAL_REVENUE`). O lookup
 * exato deixava 12 dos 45 indicadores sem política, e política ausente é
 * impedimento crítico: um plano já publicado exibia "12 impedimento(s)
 * crítico(s) antes de publicar" no módulo Dono.
 */
function lookupPolicyDefault(indicatorCode: string): PolicyDefault | undefined {
  const table = UNIT_POLICY_DEFAULTS as Record<string, PolicyDefault | undefined>
  for (const alias of catalogAliasKeys(indicatorCode)) {
    const hit = table[alias] ?? table[alias.toUpperCase()] ?? table[alias.toLowerCase()]
    if (hit) return hit
  }
  return undefined
}

/** Política incompleta bloqueia a publicação do plano. */
export function isUnitPolicyDefined(policy: Partial<UnitPolicy> | null | undefined): boolean {
  return Boolean(policy?.unit_entry_mode && policy?.unit_rollup_method)
}

// ─── Fórmulas de consolidação ────────────────────────────────────────────────
//
// No catálogo MX todos os 50 indicadores são de entrada manual: o usuário digita
// o percentual da unidade, não uma fórmula. Isso serve para o lançamento por
// loja, mas não responde qual é o número do cliente — somar percentuais é errado
// e a média simples ignora o peso de cada unidade.
//
// Estas fórmulas existem só para a consolidação: recompõem o indicador a partir
// das bases já consolidadas. Não alteram o cadastro, que segue manual por unidade.
//
// Só constam as composições inequívocas a partir do próprio catálogo. Indicadores
// cuja base não existe no catálogo — `stock_over_90_rate` (falta o volume acima de
// 90 dias), `active_sellers_rate` (falta o contador de ativos), `crm_follow_up_rate`,
// `stock_turnover`, `gross_margin_rate`, `fixed_expense_rate`,
// `training_completion_rate` — ficam de fora de propósito: chutar o denominador
// produziria um número plausível e errado, que é exatamente o que este módulo
// existe para evitar.

export const CONSOLIDATION_FORMULAS: Record<string, string> = {
  goal_achievement_rate: 'IND("sales_total") / IND("sales_goal")',
  avg_sales_per_seller: 'IND("sales_total") / IND("seller_count")',
  avg_leads_per_seller: 'IND("leads_received") / IND("seller_count")',
  appointments_per_sale: 'IND("appointments") / IND("sales_total")',
  lead_to_appointment_rate: 'IND("appointments") / IND("leads_received")',
  appointment_to_visit_rate: 'IND("visits") / IND("appointments")',
  visit_to_sale_rate: 'IND("sales_total") / IND("visits")',
  internet_sales_share: 'IND("sales_internet") / IND("sales_total")',
  internet_cost_per_sale: 'IND("internet_investment") / IND("sales_internet")',
  cost_per_lead: 'IND("internet_investment") / IND("leads_received")',
  trade_in_to_sales_rate: 'IND("trade_in_volume") / IND("sales_total")',
  no_show_rate: '(IND("appointments") - IND("visits")) / IND("appointments")',
}

/** Fórmula de consolidação de um indicador, quando o catálogo não traz uma. */
export function resolveConsolidationFormula(
  indicatorCode: string,
  catalogFormula?: string | null,
): string | null {
  if (catalogFormula) return catalogFormula
  return CONSOLIDATION_FORMULAS[indicatorCode] ?? null
}

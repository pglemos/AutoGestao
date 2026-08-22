export type CanonicalDepartment = 'COMERCIAL' | 'MARKETING' | 'PRODUTO_ESTOQUE' | 'FINANCEIRO' | 'OPERACOES' | 'PESSOAS_RH'
export type CanonicalCalcMode = 'MANUAL' | 'CALCULATED_LOCKED' | 'CALCULATED_ADJUSTABLE'

export type CanonicalIndicator = {
  code: string
  name: string
  department: CanonicalDepartment
  area: string
  target_calculation_mode: CanonicalCalcMode
  formula_expression: string | null
  display_order: number
  aliases: string[]
}

export const BASE44_DEPARTMENT_LABEL: Record<CanonicalDepartment, string> = {
  COMERCIAL: 'Comercial',
  MARKETING: 'Marketing',
  PRODUTO_ESTOQUE: 'Produto e Estoque',
  FINANCEIRO: 'Financeiro',
  OPERACOES: 'Operações',
  PESSOAS_RH: 'Pessoas - RH',
}

export const BASE44_DEPARTMENT_ORDER = ['Comercial', 'Marketing', 'Produto e Estoque', 'Financeiro', 'Operações', 'Pessoas - RH'] as const

export const BASE44_STANDARD_INDICATORS: CanonicalIndicator[] = [
  { code: 'SALES_TOTAL', name: "Vendas Total", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"SALES_WALKIN\") + IND(\"SALES_REFERRAL\") + IND(\"SALES_COMPANY_PORTFOLIO\") + IND(\"SALES_SELLER_PORTFOLIO\") + IND(\"SALES_INTERNET\") + IND(\"SALES_OTHER\")", display_order: 1, aliases: ["sales_total"] },
  { code: 'SALES_WALKIN', name: "Vendas - Fluxo de Porta", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 2, aliases: ["sales_walkin","sales_door","sales_door_flow","vendas_fluxo_de_porta"] },
  { code: 'SALES_REFERRAL', name: "Vendas - Indicação", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 3, aliases: ["sales_referral","sales_indication","vendas_indicacao"] },
  { code: 'SALES_COMPANY_PORTFOLIO', name: "Vendas - Carteira Empresa", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 4, aliases: ["sales_company_portfolio","sales_company","sales_carteira_empresa"] },
  { code: 'SALES_SELLER_PORTFOLIO', name: "Vendas - Carteira Vendedor", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 5, aliases: ["sales_seller_portfolio","sales_seller","sales_carteira_vendedor"] },
  { code: 'SALES_INTERNET', name: "Vendas - Internet", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 6, aliases: ["sales_internet","sales_web","vendas_internet"] },
  { code: 'SALES_OTHER', name: "Vendas - Outros", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 7, aliases: ["sales_other","sales_others","vendas_outros"] },
  { code: 'SELLER_COUNT', name: "Volume de Vendedores", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 8, aliases: ["seller_count","sellers","volume_vendedores"] },
  { code: 'SALES_PER_SELLER', name: "Média de Vendas por Vendedor", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"SALES_TOTAL\") / IND(\"SELLER_COUNT\")", display_order: 9, aliases: ["sales_per_seller"] },
  { code: 'LEADS_PER_SELLER', name: "Média de Leads por Vendedor", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"LEADS_RECEIVED\") / IND(\"SELLER_COUNT\")", display_order: 10, aliases: ["leads_per_seller"] },
  { code: 'VEHICLES_APPRAISED', name: "Volume de Carros Avaliados", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"SALES_WITH_TRADE\") * PAR(\"EVALUATIONS_PER_TRADE_SALE\")", display_order: 11, aliases: ["vehicles_appraised"] },
  { code: 'SALES_WITH_TRADE', name: "Volume de Vendas com Troca", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"SALES_TOTAL\") * PAR(\"TRADE_SALES_RATE\")", display_order: 12, aliases: ["sales_with_trade"] },
  { code: 'TRADE_SALES_PERCENTAGE', name: "% Venda com Troca", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"SALES_WITH_TRADE\") / IND(\"SALES_TOTAL\")", display_order: 13, aliases: ["trade_sales_percentage"] },
  { code: 'APPROVED_CREDIT_APPLICATIONS', name: "Volume de Fichas Aprovadas", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"SALES_TOTAL\") * PAR(\"FINANCED_SALES_RATE\") * PAR(\"APPROVAL_BUFFER_MULTIPLIER\")", display_order: 14, aliases: ["approved_credit_applications"] },
  { code: 'PAID_CREDIT_APPLICATIONS', name: "Volume de Fichas Pagas", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"APPROVED_CREDIT_APPLICATIONS\") * PAR(\"APPROVED_TO_PAID_CONVERSION\")", display_order: 15, aliases: ["paid_credit_applications"] },
  { code: 'FINANCED_SALES_PERCENTAGE', name: "% Vendas Financiadas", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"PAID_CREDIT_APPLICATIONS\") / IND(\"SALES_TOTAL\")", display_order: 16, aliases: ["financed_sales_percentage"] },
  { code: 'APPOINTMENTS_VOLUME', name: "Volume de Agendamentos", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"LEADS_RECEIVED\") * PAR(\"LEAD_TO_APPOINTMENT_RATE\")", display_order: 17, aliases: ["appointments_volume"] },
  { code: 'VISITS_VOLUME', name: "Volume de Visitas", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"APPOINTMENTS_VOLUME\") * PAR(\"APPOINTMENT_TO_VISIT_RATE\")", display_order: 18, aliases: ["visits_volume"] },
  { code: 'APPOINTMENTS_PER_INTERNET_SALE', name: "Volume de Agendamentos por Venda", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"APPOINTMENTS_VOLUME\") / IND(\"SALES_INTERNET\")", display_order: 19, aliases: ["appointments_per_internet_sale"] },
  { code: 'LEAD_TO_APPOINTMENT_CONVERSION', name: "Conversão de Leads em Agendamentos", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"APPOINTMENTS_VOLUME\") / IND(\"LEADS_RECEIVED\")", display_order: 20, aliases: ["lead_to_appointment_conversion"] },
  { code: 'APPOINTMENT_TO_VISIT_CONVERSION', name: "Conversão de Agendamentos em Visitas", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"VISITS_VOLUME\") / IND(\"APPOINTMENTS_VOLUME\")", display_order: 21, aliases: ["appointment_to_visit_conversion"] },
  { code: 'VISIT_TO_SALE_CONVERSION', name: "Conversão de Visitas em Vendas", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"SALES_INTERNET\") / IND(\"VISITS_VOLUME\")", display_order: 22, aliases: ["visit_to_sale_conversion"] },
  { code: 'LEADS_RECEIVED', name: "Volume de Leads Recebidos", department: 'MARKETING', area: 'Marketing', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"SALES_INTERNET\") * PAR(\"LEADS_PER_INTERNET_SALE\")", display_order: 1, aliases: ["leads_received","leads","volume_leads"] },
  { code: 'INTERNET_INVESTMENT', name: "Investimento Internet", department: 'MARKETING', area: 'Marketing', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"INTERNET_COST_PER_SALE\") * IND(\"SALES_INTERNET\")", display_order: 2, aliases: ["internet_investment"] },
  { code: 'INTERNET_COST_PER_SALE', name: "Custo por Venda na Internet", department: 'MARKETING', area: 'Marketing', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 3, aliases: ["internet_cost_per_sale"] },
  { code: 'INSTAGRAM_FOLLOWERS', name: "Volume de Seguidores Instagram", department: 'MARKETING', area: 'Marketing', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 4, aliases: ["instagram_followers"] },
  { code: 'GOOGLE_BUSINESS_RATING', name: "Avaliação Google Meu Negócio", department: 'MARKETING', area: 'Marketing', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 5, aliases: ["google_business_rating"] },
  { code: 'CONTENT_QUALITY', name: "Qualidade do Conteúdo", department: 'MARKETING', area: 'Marketing', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 6, aliases: ["content_quality"] },
  { code: 'INVENTORY_TURNOVER', name: "Giro de Estoque", department: 'PRODUTO_ESTOQUE', area: 'Produto e Estoque', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"SALES_TOTAL\") / IND(\"INVENTORY_TOTAL\")", display_order: 1, aliases: ["inventory_turnover"] },
  { code: 'ACTIVE_INVENTORY', name: "Estoque Ativo", department: 'PRODUTO_ESTOQUE', area: 'Produto e Estoque', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"INVENTORY_TOTAL\") * PAR(\"ACTIVE_STOCK_RATE\")", display_order: 2, aliases: ["active_inventory"] },
  { code: 'INVENTORY_TOTAL', name: "Estoque Total", department: 'PRODUTO_ESTOQUE', area: 'Produto e Estoque', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"SALES_TOTAL\") * PAR(\"STOCK_TO_SALES_RATIO\")", display_order: 3, aliases: ["inventory_total"] },
  { code: 'INVENTORY_OVER_90_VOLUME', name: "Tempo de Estoque > 90", department: 'PRODUTO_ESTOQUE', area: 'Produto e Estoque', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"INVENTORY_TOTAL\") * PAR(\"OVER_90_STOCK_RATE\")", display_order: 4, aliases: ["inventory_over_90_volume"] },
  { code: 'INVENTORY_OVER_90_PERCENTAGE', name: "% Estoque > 90 Dias", department: 'PRODUTO_ESTOQUE', area: 'Produto e Estoque', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"INVENTORY_OVER_90_VOLUME\") / IND(\"INVENTORY_TOTAL\")", display_order: 5, aliases: ["inventory_over_90_percentage"] },
  { code: 'INVENTORY_AVERAGE_TICKET', name: "Ticket Médio do Estoque", department: 'PRODUTO_ESTOQUE', area: 'Produto e Estoque', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 6, aliases: ["inventory_average_ticket"] },
  { code: 'INVENTORY_AVERAGE_MARGIN', name: "Margem Média do Estoque", department: 'PRODUTO_ESTOQUE', area: 'Produto e Estoque', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"INVENTORY_AVERAGE_TICKET\") * PAR(\"STOCK_MARGIN_RATE\")", display_order: 7, aliases: ["inventory_average_margin"] },
  { code: 'CONTRIBUTION_MARGIN', name: "Margem de Contribuição", department: 'FINANCEIRO', area: 'Financeiro', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 1, aliases: ["contribution_margin"] },
  { code: 'ADDITIONAL_REVENUE', name: "Receita Adicional", department: 'FINANCEIRO', area: 'Financeiro', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 2, aliases: ["additional_revenue"] },
  { code: 'TOTAL_EXPENSE', name: "Despesa Total", department: 'FINANCEIRO', area: 'Financeiro', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 3, aliases: ["total_expense"] },
  { code: 'NET_PROFIT', name: "Lucro Líquido", department: 'FINANCEIRO', area: 'Financeiro', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"CONTRIBUTION_MARGIN\") + IND(\"ADDITIONAL_REVENUE\") - IND(\"TOTAL_EXPENSE\")", display_order: 4, aliases: ["net_profit"] },
  { code: 'AVERAGE_SALES_MARGIN', name: "Margem Média de Venda", department: 'FINANCEIRO', area: 'Financeiro', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"CONTRIBUTION_MARGIN\") / IND(\"SALES_TOTAL\")", display_order: 5, aliases: ["average_sales_margin"] },
  { code: 'AVERAGE_PREPARATION_COST', name: "Custo Médio Preparação", department: 'OPERACOES', area: 'Operações', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 1, aliases: ["average_preparation_cost"] },
  { code: 'AVERAGE_AFTER_SALES_COST', name: "Custo Médio Pós-Venda", department: 'OPERACOES', area: 'Operações', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 2, aliases: ["average_after_sales_cost"] },
  { code: 'AFTER_SALES_VOLUME', name: "Volume de Pós-Venda", department: 'OPERACOES', area: 'Operações', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: "IND(\"SALES_TOTAL\") * PAR(\"POST_SALE_RATE\")", display_order: 3, aliases: ["after_sales_volume"] },
  { code: 'AFTER_SALES_PERCENTAGE', name: "% de Pós-Venda", department: 'OPERACOES', area: 'Operações', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: "IND(\"AFTER_SALES_VOLUME\") / IND(\"SALES_TOTAL\")", display_order: 4, aliases: ["after_sales_percentage"] },
  { code: 'EMPLOYEE_COUNT', name: "Quadro de Colaboradores", department: 'PESSOAS_RH', area: 'Pessoas - RH', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 5, aliases: ["employee_count","employees","quadro_colaboradores"] },
]

export function normalizeCatalogKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

const INDEX = new Map<string, CanonicalIndicator>()
for (const item of BASE44_STANDARD_INDICATORS) {
  INDEX.set(normalizeCatalogKey(item.code), item)
  for (const alias of item.aliases) INDEX.set(normalizeCatalogKey(alias), item)
}

export function matchCanonicalIndicator(metricKey: string) {
  return INDEX.get(normalizeCatalogKey(metricKey)) ?? null
}

export function rewriteCanonicalFormula(expression: string, resolveKey: (code: string) => string) {
  return expression.replace(/\b(IND|PAR)\("([^"]+)"\)/g, (_match, fn: string, code: string) => `${fn}("${resolveKey(code)}")`)
}

export const BASE44_GLOBAL_ORDER: Record<string, number> = {
  SALES_TOTAL: 1, SALES_WALKIN: 2, SALES_REFERRAL: 3, SALES_COMPANY_PORTFOLIO: 4,
  SALES_SELLER_PORTFOLIO: 5, SALES_INTERNET: 6, SALES_OTHER: 7, SELLER_COUNT: 8,
  SALES_PER_SELLER: 9, LEADS_RECEIVED: 10, LEADS_PER_SELLER: 11, VEHICLES_APPRAISED: 12,
  SALES_WITH_TRADE: 13, TRADE_SALES_PERCENTAGE: 14, APPROVED_CREDIT_APPLICATIONS: 15,
  PAID_CREDIT_APPLICATIONS: 16, FINANCED_SALES_PERCENTAGE: 17, APPOINTMENTS_VOLUME: 18,
  VISITS_VOLUME: 19, APPOINTMENTS_PER_INTERNET_SALE: 20, LEAD_TO_APPOINTMENT_CONVERSION: 21,
  APPOINTMENT_TO_VISIT_CONVERSION: 22, VISIT_TO_SALE_CONVERSION: 23, INTERNET_INVESTMENT: 24,
  INTERNET_COST_PER_SALE: 25, INSTAGRAM_FOLLOWERS: 26, GOOGLE_BUSINESS_RATING: 27,
  CONTENT_QUALITY: 28, INVENTORY_TURNOVER: 29, ACTIVE_INVENTORY: 30, INVENTORY_TOTAL: 31,
  INVENTORY_OVER_90_VOLUME: 32, INVENTORY_OVER_90_PERCENTAGE: 33, INVENTORY_AVERAGE_TICKET: 34,
  INVENTORY_AVERAGE_MARGIN: 35, CONTRIBUTION_MARGIN: 36, ADDITIONAL_REVENUE: 37,
  TOTAL_EXPENSE: 38, NET_PROFIT: 39, AVERAGE_SALES_MARGIN: 40, AVERAGE_PREPARATION_COST: 41,
  AVERAGE_AFTER_SALES_COST: 42, AFTER_SALES_VOLUME: 43, AFTER_SALES_PERCENTAGE: 44,
  EMPLOYEE_COUNT: 45,
}

export function officialCatalogCode(metricKey: string) {
  return matchCanonicalIndicator(metricKey)?.code ?? metricKey
}

export function officialCatalogOrder(metricKey: string, fallback = 999) {
  const canon = matchCanonicalIndicator(metricKey)
  return canon ? BASE44_GLOBAL_ORDER[canon.code] ?? fallback : fallback
}

export function buildCatalogKeyMap(keys: string[]) {
  const map = new Map<string, string>()
  for (const key of keys) {
    map.set(normalizeCatalogKey(key), key)
    const canon = matchCanonicalIndicator(key)
    if (!canon) continue
    map.set(normalizeCatalogKey(canon.code), key)
    for (const alias of canon.aliases) map.set(normalizeCatalogKey(alias), key)
  }
  return map
}

export function overlayCanonicalIndicator<T extends {
  metric_key: string
  label: string
  area: string
  formula_expression: string | null
  target_calculation_mode: string | null
  sort_order: number
}>(row: T, keyMap?: Map<string, string>): T {
  const canon = matchCanonicalIndicator(row.metric_key)
  if (!canon) return row
  const resolve = (code: string) => keyMap?.get(normalizeCatalogKey(code))
    ?? keyMap?.get(normalizeCatalogKey(code.replace(/_/g, '')))
    ?? code.toLowerCase()
  return {
    ...row,
    label: canon.name,
    area: canon.area,
    formula_expression: canon.formula_expression ? rewriteCanonicalFormula(canon.formula_expression, resolve) : null,
    target_calculation_mode: canon.target_calculation_mode,
    sort_order: officialCatalogOrder(canon.code, row.sort_order),
  }
}

export function overlayCanonicalCatalog<T extends {
  metric_key: string
  label: string
  area: string
  formula_expression: string | null
  target_calculation_mode: string | null
  sort_order: number
}>(rows: T[]) {
  const keyMap = buildCatalogKeyMap(rows.map(row => row.metric_key))
  return rows.map(row => overlayCanonicalIndicator(row, keyMap))
}

export function sortCatalogAreas(areas: string[]) {
  return [...areas].sort((left, right) => {
    const leftIndex = BASE44_DEPARTMENT_ORDER.indexOf(left as typeof BASE44_DEPARTMENT_ORDER[number])
    const rightIndex = BASE44_DEPARTMENT_ORDER.indexOf(right as typeof BASE44_DEPARTMENT_ORDER[number])
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex) || left.localeCompare(right, 'pt-BR')
  })
}


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
  { code: 'SALES_COMPANY_PORTFOLIO', name: "Vendas - Carteira Empresa", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 4, aliases: ["sales_company_portfolio","sales_company","sales_company_wallet","sales_carteira_empresa"] },
  { code: 'SALES_SELLER_PORTFOLIO', name: "Vendas - Carteira Vendedor", department: 'COMERCIAL', area: 'Comercial', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 5, aliases: ["sales_seller_portfolio","sales_seller","sales_seller_wallet","sales_carteira_vendedor"] },
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
  { code: 'VOLUME_DE_LEADS_POR_VENDA', name: "Volume de Leads por Venda", department: 'MARKETING', area: 'Marketing', target_calculation_mode: 'MANUAL', formula_expression: null, display_order: 26, aliases: ["volume_de_leads_por_venda", "volume_leads_por_venda", "leads_per_sale"] },
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
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/%/g, 'pct_')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

const EXTRA_ALIASES: Record<string, string[]> = {
  SALES_COMPANY_PORTFOLIO: ['sales_company_wallet', 'carteira_empresa'],
  SALES_SELLER_PORTFOLIO: ['sales_seller_wallet', 'carteira_vendedor'],
  SALES_PER_SELLER: ['avg_sales_per_seller', 'media_de_vendas_por_vendedor', 'media_vendas_por_vendedor'],
  LEADS_PER_SELLER: ['avg_leads_per_seller', 'media_de_leads_por_vendedor'],
  SALES_WITH_TRADE: ['trade_in_volume', 'volume_de_carros_de_troca', 'volume_de_vendas_com_troca'],
  TRADE_SALES_PERCENTAGE: ['trade_in_to_sales_rate', 'participacao_da_troca_nas_vendas'],
  APPOINTMENTS_VOLUME: ['appointments', 'agendamentos', 'volume_de_agendamentos'],
  VISITS_VOLUME: ['visits', 'comparecimentos', 'visitas', 'volume_de_visitas'],
  APPOINTMENTS_PER_INTERNET_SALE: ['appointments_per_sale', 'agendamentos_por_venda'],
  LEAD_TO_APPOINTMENT_CONVERSION: ['lead_to_appointment_rate', 'conversao_lead_para_agendamento'],
  APPOINTMENT_TO_VISIT_CONVERSION: ['appointment_to_visit_rate', 'conversao_agendamento_para_visita'],
  VISIT_TO_SALE_CONVERSION: ['visit_to_sale_rate', 'conversao_visita_para_venda'],
  GOOGLE_BUSINESS_RATING: ['google_rating', 'avaliacao_google_meu_negocio'],
  INVENTORY_TURNOVER: ['stock_turnover', 'giro_de_estoque'],
  ACTIVE_INVENTORY: ['active_stock', 'estoque_ativo'],
  INVENTORY_TOTAL: ['stock_total', 'estoque_total'],
  INVENTORY_OVER_90_PERCENTAGE: ['stock_over_90_rate', 'estoque_acima_de_90_dias'],
  INVENTORY_AVERAGE_TICKET: ['avg_stock_price', 'preco_medio_do_estoque', 'ticket_medio_do_estoque'],
  AVERAGE_SALES_MARGIN: ['avg_margin', 'margem_media', 'margem_media_de_venda'],
  AVERAGE_PREPARATION_COST: ['preparation_cost', 'custo_de_preparacao', 'custo_medio_preparacao'],
  AVERAGE_AFTER_SALES_COST: ['post_sale_cost', 'custo_pos_venda', 'custo_medio_pos_venda'],
  CONTRIBUTION_MARGIN: ['margem_de_contribuicao'],
  ADDITIONAL_REVENUE: ['receita_adicional'],
  TOTAL_EXPENSE: ['despesa_total'],
  EMPLOYEE_COUNT: ['employee_count', 'quadro_de_colaboradores'],
}

const OFFICIAL_VALUE_TYPE: Record<string, 'number' | 'percent' | 'currency'> = {
  INTERNET_INVESTMENT: 'currency', INTERNET_COST_PER_SALE: 'currency',
  INVENTORY_AVERAGE_TICKET: 'currency', INVENTORY_AVERAGE_MARGIN: 'currency',
  CONTRIBUTION_MARGIN: 'currency', ADDITIONAL_REVENUE: 'currency',
  TOTAL_EXPENSE: 'currency', NET_PROFIT: 'currency',
  AVERAGE_SALES_MARGIN: 'currency', AVERAGE_PREPARATION_COST: 'currency',
  AVERAGE_AFTER_SALES_COST: 'currency',
  TRADE_SALES_PERCENTAGE: 'percent', FINANCED_SALES_PERCENTAGE: 'percent',
  LEAD_TO_APPOINTMENT_CONVERSION: 'percent', APPOINTMENT_TO_VISIT_CONVERSION: 'percent',
  VISIT_TO_SALE_CONVERSION: 'percent', INVENTORY_OVER_90_PERCENTAGE: 'percent',
  AFTER_SALES_PERCENTAGE: 'percent',
}

const OFFICIAL_DIRECTION: Record<string, 'increase' | 'decrease'> = {
  INTERNET_INVESTMENT: 'decrease', INTERNET_COST_PER_SALE: 'decrease',
  INVENTORY_OVER_90_VOLUME: 'decrease', INVENTORY_OVER_90_PERCENTAGE: 'decrease',
  TOTAL_EXPENSE: 'decrease', AVERAGE_PREPARATION_COST: 'decrease',
  AVERAGE_AFTER_SALES_COST: 'decrease', AFTER_SALES_VOLUME: 'decrease',
  AFTER_SALES_PERCENTAGE: 'decrease', EMPLOYEE_COUNT: 'decrease',
}

export const BASE44_STANDARD_PARAMETERS = [
  { code: 'LEADS_PER_INTERNET_SALE', name: 'Leads necessários por venda de Internet', default_value: 40 },
  { code: 'TRADE_SALES_RATE', name: 'Percentual de vendas com troca', default_value: 0.50 },
  { code: 'EVALUATIONS_PER_TRADE_SALE', name: 'Avaliações necessárias por venda com troca', default_value: 3 },
  { code: 'FINANCED_SALES_RATE', name: 'Percentual de vendas financiadas', default_value: 0.60 },
  { code: 'APPROVAL_BUFFER_MULTIPLIER', name: 'Margem adicional de fichas aprovadas', default_value: 1.10 },
  { code: 'APPROVED_TO_PAID_CONVERSION', name: 'Conversão de fichas aprovadas em fichas pagas', default_value: 0.909091 },
  { code: 'LEAD_TO_APPOINTMENT_RATE', name: 'Conversão planejada de leads em agendamentos', default_value: 0.20 },
  { code: 'APPOINTMENT_TO_VISIT_RATE', name: 'Conversão planejada de agendamentos em visitas', default_value: 0.33 },
  { code: 'ACTIVE_STOCK_RATE', name: 'Percentual planejado de estoque ativo', default_value: 0.65 },
  { code: 'STOCK_TO_SALES_RATIO', name: 'Relação planejada entre estoque total e vendas', default_value: 1.65, monthly_defaults: [1.70, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65] },
  { code: 'OVER_90_STOCK_RATE', name: 'Percentual máximo de estoque acima de 90 dias', default_value: 0.15 },
  { code: 'STOCK_MARGIN_RATE', name: 'Margem média planejada sobre o Ticket do Estoque', default_value: 0.20 },
  { code: 'POST_SALE_RATE', name: 'Percentual planejado de pós-venda', default_value: 0.20 },
] as const

export function officialValueType(code: string) {
  return OFFICIAL_VALUE_TYPE[code] ?? 'number'
}

export function officialDirection(code: string) {
  return OFFICIAL_DIRECTION[code] ?? 'increase'
}

const OFFICIAL_UNIT_LABEL: Record<string, string> = {
  SALES_TOTAL: 'veículos', SALES_WALKIN: 'veículos', SALES_REFERRAL: 'veículos',
  SALES_COMPANY_PORTFOLIO: 'veículos', SALES_SELLER_PORTFOLIO: 'veículos',
  SALES_INTERNET: 'veículos', SALES_OTHER: 'veículos',
  SELLER_COUNT: 'vendedores', LEADS_RECEIVED: 'leads',
  INSTAGRAM_FOLLOWERS: 'seguidores', EMPLOYEE_COUNT: 'colaboradores',
  SALES_PER_SELLER: 'veículos', LEADS_PER_SELLER: 'leads',
  VEHICLES_APPRAISED: 'veículos', SALES_WITH_TRADE: 'veículos',
  APPROVED_CREDIT_APPLICATIONS: 'fichas', PAID_CREDIT_APPLICATIONS: 'fichas',
  APPOINTMENTS_VOLUME: 'agendamentos', VISITS_VOLUME: 'visitas',
  ACTIVE_INVENTORY: 'veículos', INVENTORY_TOTAL: 'veículos',
  INVENTORY_OVER_90_VOLUME: 'veículos', AFTER_SALES_VOLUME: 'ocorrências', VOLUME_DE_LEADS_POR_VENDA: 'leads/venda',
  TRADE_SALES_PERCENTAGE: '%', FINANCED_SALES_PERCENTAGE: '%',
  LEAD_TO_APPOINTMENT_CONVERSION: '%', APPOINTMENT_TO_VISIT_CONVERSION: '%',
  VISIT_TO_SALE_CONVERSION: '%', INVENTORY_OVER_90_PERCENTAGE: '%',
  AFTER_SALES_PERCENTAGE: '%',
  INTERNET_INVESTMENT: 'R$', INTERNET_COST_PER_SALE: 'R$',
  INVENTORY_AVERAGE_TICKET: 'R$', INVENTORY_AVERAGE_MARGIN: 'R$',
  CONTRIBUTION_MARGIN: 'R$', ADDITIONAL_REVENUE: 'R$',
  TOTAL_EXPENSE: 'R$', NET_PROFIT: 'R$', AVERAGE_SALES_MARGIN: 'R$',
  AVERAGE_PREPARATION_COST: 'R$', AVERAGE_AFTER_SALES_COST: 'R$',
  GOOGLE_BUSINESS_RATING: 'nota 0-5', CONTENT_QUALITY: 'nota 0-5',
  APPOINTMENTS_PER_INTERNET_SALE: 'agend./venda',
  INVENTORY_TURNOVER: 'giros',
}

export function officialUnitLabel(code: string) {
  return OFFICIAL_UNIT_LABEL[code] ?? (officialValueType(code) === 'percent' ? '%' : officialValueType(code) === 'currency' ? 'R$' : 'número')
}

/** Unidade gravada no IndicatorDefinition do Base44 (`unit`, não `unit_label`). */
const OFFICIAL_DEFINITION_UNIT: Record<string, string> = {
  SALES_TOTAL: 'Número inteiro', SALES_WALKIN: 'Número inteiro', SALES_REFERRAL: 'Número inteiro',
  SALES_COMPANY_PORTFOLIO: 'Número inteiro', SALES_SELLER_PORTFOLIO: 'Número inteiro',
  SALES_INTERNET: 'Número inteiro', SALES_OTHER: 'Número inteiro', SELLER_COUNT: 'Número inteiro',
  SALES_PER_SELLER: 'Número decimal', LEADS_PER_SELLER: 'Número decimal',
  VEHICLES_APPRAISED: 'Número decimal', SALES_WITH_TRADE: 'Número decimal',
  TRADE_SALES_PERCENTAGE: 'Percentual', APPROVED_CREDIT_APPLICATIONS: 'Número decimal',
  PAID_CREDIT_APPLICATIONS: 'Número decimal', FINANCED_SALES_PERCENTAGE: 'Percentual',
  APPOINTMENTS_VOLUME: 'Número decimal', VISITS_VOLUME: 'Número decimal',
  APPOINTMENTS_PER_INTERNET_SALE: 'Número decimal',
  LEAD_TO_APPOINTMENT_CONVERSION: 'Percentual', APPOINTMENT_TO_VISIT_CONVERSION: 'Percentual',
  VISIT_TO_SALE_CONVERSION: 'Percentual',
  LEADS_RECEIVED: 'Número inteiro', INTERNET_INVESTMENT: 'Moeda', INTERNET_COST_PER_SALE: 'Moeda',
  INSTAGRAM_FOLLOWERS: 'Número inteiro', GOOGLE_BUSINESS_RATING: 'Número decimal', CONTENT_QUALITY: 'Nota',
  INVENTORY_TURNOVER: 'Razão', ACTIVE_INVENTORY: 'Número decimal', INVENTORY_TOTAL: 'Número decimal',
  INVENTORY_OVER_90_VOLUME: 'Número decimal', INVENTORY_OVER_90_PERCENTAGE: 'Percentual',
  INVENTORY_AVERAGE_TICKET: 'Moeda', INVENTORY_AVERAGE_MARGIN: 'Moeda',
  CONTRIBUTION_MARGIN: 'Moeda', ADDITIONAL_REVENUE: 'Moeda', TOTAL_EXPENSE: 'Moeda',
  NET_PROFIT: 'Moeda', AVERAGE_SALES_MARGIN: 'Moeda',
  AVERAGE_PREPARATION_COST: 'Moeda', AVERAGE_AFTER_SALES_COST: 'Moeda',
  AFTER_SALES_VOLUME: 'Número decimal', AFTER_SALES_PERCENTAGE: 'Percentual',
  VOLUME_DE_LEADS_POR_VENDA: 'Número decimal',
  EMPLOYEE_COUNT: 'Número inteiro',
}

const OFFICIAL_DEFINITION_DIRECTION: Record<string, 'AUMENTAR' | 'DIMINUIR'> = {
  APPOINTMENTS_PER_INTERNET_SALE: 'DIMINUIR',
  INTERNET_INVESTMENT: 'DIMINUIR', INTERNET_COST_PER_SALE: 'DIMINUIR',
  INVENTORY_OVER_90_VOLUME: 'DIMINUIR', INVENTORY_OVER_90_PERCENTAGE: 'DIMINUIR',
  TOTAL_EXPENSE: 'DIMINUIR', AVERAGE_PREPARATION_COST: 'DIMINUIR',
  AVERAGE_AFTER_SALES_COST: 'DIMINUIR', AFTER_SALES_VOLUME: 'DIMINUIR',
  AFTER_SALES_PERCENTAGE: 'DIMINUIR', EMPLOYEE_COUNT: 'DIMINUIR',
}

const INDEX = new Map<string, CanonicalIndicator>()
for (const item of BASE44_STANDARD_INDICATORS) {
  INDEX.set(normalizeCatalogKey(item.code), item)
  for (const alias of item.aliases) INDEX.set(normalizeCatalogKey(alias), item)
}
for (const [code, aliases] of Object.entries(EXTRA_ALIASES)) {
  const item = INDEX.get(normalizeCatalogKey(code))
  if (!item) continue
  for (const alias of aliases) INDEX.set(normalizeCatalogKey(alias), item)
}

export function matchCanonicalIndicator(metricKey: string) {
  return INDEX.get(normalizeCatalogKey(metricKey)) ?? null
}

export function officialDefinitionUnit(code: string) {
  const canon = matchCanonicalIndicator(code)?.code ?? code
  return OFFICIAL_DEFINITION_UNIT[canon] ?? 'Número inteiro'
}

export function officialDefinitionDirection(code: string) {
  const canon = matchCanonicalIndicator(code)?.code ?? code
  return OFFICIAL_DEFINITION_DIRECTION[canon] ?? 'AUMENTAR'
}

export function isOfficialBase44Key(metricKey: string) {
  return matchCanonicalIndicator(metricKey) != null
}

export function officialPersistenceKeys() {
  return [...INDEX.keys()].sort()
}

export function filterOfficialRows<T extends { metric_key: string }>(rows: T[]) {
  const seen = new Set<string>()
  return rows.filter(row => {
    const canon = matchCanonicalIndicator(row.metric_key)
    if (!canon || seen.has(canon.code)) return false
    seen.add(canon.code)
    return true
  })
}

export function liveOfficialCatalogRows<T extends OverlayCatalogRow>(rows: T[]) {
  return filterOfficialRows(rows.filter(row => row.status !== 'arquivado' && row.active !== false))
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
  INTERNET_COST_PER_SALE: 25, VOLUME_DE_LEADS_POR_VENDA: 26, INSTAGRAM_FOLLOWERS: 27,
  GOOGLE_BUSINESS_RATING: 28, CONTENT_QUALITY: 29, INVENTORY_TURNOVER: 30, ACTIVE_INVENTORY: 31,
  INVENTORY_TOTAL: 32, INVENTORY_OVER_90_VOLUME: 33, INVENTORY_OVER_90_PERCENTAGE: 34,
  INVENTORY_AVERAGE_TICKET: 35, INVENTORY_AVERAGE_MARGIN: 36, CONTRIBUTION_MARGIN: 37,
  ADDITIONAL_REVENUE: 38, TOTAL_EXPENSE: 39, NET_PROFIT: 40, AVERAGE_SALES_MARGIN: 41,
  AVERAGE_PREPARATION_COST: 42, AVERAGE_AFTER_SALES_COST: 43, AFTER_SALES_VOLUME: 44,
  AFTER_SALES_PERCENTAGE: 45, EMPLOYEE_COUNT: 46,
}

/** Garante display_order global 1…46 (não reinicia por departamento). */
for (const item of BASE44_STANDARD_INDICATORS) {
  const global = BASE44_GLOBAL_ORDER[item.code]
  if (global != null) (item as { display_order: number }).display_order = global
}

export const OFFICIAL_CODES_BY_ORDER = Object.entries(BASE44_GLOBAL_ORDER)
  .sort((a, b) => a[1] - b[1])
  .map(([code]) => code)

export function officialCatalogCode(metricKey: string) {
  return matchCanonicalIndicator(metricKey)?.code ?? metricKey
}

export const OFFICIAL_DEMO_MANUAL_VALUES: Record<string, number> = {
  SALES_WALKIN: 15,
  SALES_REFERRAL: 5,
  SALES_COMPANY_PORTFOLIO: 5,
  SALES_SELLER_PORTFOLIO: 10,
  SALES_INTERNET: 20,
  SALES_OTHER: 0,
  SELLER_COUNT: 7,
  CONTRIBUTION_MARGIN: 440000,
  ADDITIONAL_REVENUE: 50000,
  TOTAL_EXPENSE: 300000,
  INVENTORY_AVERAGE_TICKET: 45000,
  INTERNET_COST_PER_SALE: 350,
  INSTAGRAM_FOLLOWERS: 5000,
  GOOGLE_BUSINESS_RATING: 4.9,
  CONTENT_QUALITY: 5,
  AVERAGE_PREPARATION_COST: 800,
  AVERAGE_AFTER_SALES_COST: 600,
  EMPLOYEE_COUNT: 12,
}

export function officialDemoManualValue(metricKey: string) {
  const code = matchCanonicalIndicator(metricKey)?.code
  return code == null ? null : OFFICIAL_DEMO_MANUAL_VALUES[code] ?? null
}

export function matchOfficialParameter(code: string) {
  const normalized = normalizeCatalogKey(code)
  return BASE44_STANDARD_PARAMETERS.find(item => normalizeCatalogKey(item.code) === normalized) ?? null
}

export function officialParameterDefaults(month = 1): Record<string, number> {
  const map: Record<string, number> = {}
  for (const item of BASE44_STANDARD_PARAMETERS) {
    const monthly = 'monthly_defaults' in item ? item.monthly_defaults[month - 1] : undefined
    const value = monthly ?? item.default_value
    map[item.code] = value
    map[item.code.toLowerCase()] = value
  }
  return map
}

export function catalogAliasKeys(metricKey: string) {
  const canon = matchCanonicalIndicator(metricKey)
  if (!canon) return [metricKey]
  return [...new Set([metricKey, canon.code, canon.code.toLowerCase(), ...canon.aliases])]
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

type OverlayCatalogRow = {
  metric_key: string
  label: string
  area: string
  formula_expression: string | null
  target_calculation_mode: string | null
  sort_order: number
  status?: string
  active?: boolean
  value_type?: string
  direction?: string
  /** `criado_mx` marca indicador adotado pela MX além do conjunto Base44. */
  created_origin?: string
}

export function findCatalogRow<T extends OverlayCatalogRow>(rows: T[], canon: CanonicalIndicator, used: Set<string>) {
  const unused = rows.filter(row => !used.has(row.metric_key))
  const byKey = unused.find(row => matchCanonicalIndicator(row.metric_key)?.code === canon.code)
  if (byKey) return byKey
  const nameKey = normalizeCatalogKey(canon.name)
  return unused.find(row => normalizeCatalogKey(row.label) === nameKey) ?? null
}

export function synthesizeCanonicalIndicator(canon: CanonicalIndicator, keyMap?: Map<string, string>) {
  const valueType = officialValueType(canon.code)
  const resolve = (code: string) => keyMap?.get(normalizeCatalogKey(code)) ?? code.toLowerCase()
  return {
    metric_key: canon.code.toLowerCase(),
    label: canon.name,
    area: canon.area,
    descricao: null,
    value_type: valueType,
    direction: officialDirection(canon.code),
    source_scope: canon.formula_expression ? 'computed' : 'manual',
    status: 'publicado' as const,
    frequencia: 'mensal' as const,
    casas_decimais: valueType === 'number' ? 0 : 2,
    visivel_dono: true,
    ano_inicial: null,
    ano_final: null,
    formula_expression: canon.formula_expression ? rewriteCanonicalFormula(canon.formula_expression, resolve) : null,
    target_calculation_mode: canon.target_calculation_mode,
    created_origin: 'mx_padrao' as const,
    sort_order: officialCatalogOrder(canon.code),
    active: true,
    targets: 0,
    annual_target: null,
  }
}

export function overlayCanonicalIndicator<T extends OverlayCatalogRow>(row: T, keyMap?: Map<string, string>): T {
  const canon = matchCanonicalIndicator(row.metric_key) ?? matchCanonicalIndicator(row.label)
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
    ...(row.value_type !== undefined ? { value_type: officialValueType(canon.code) } : {}),
    ...(row.direction !== undefined ? { direction: officialDirection(canon.code) } : {}),
    ...(row.status !== undefined ? { status: 'publicado', active: true } : {}),
  }
}

export function overlayCanonicalCatalog<T extends OverlayCatalogRow>(rows: T[]) {
  const used = new Set<string>()
  const resolved = new Map<string, string>()
  for (const canon of BASE44_STANDARD_INDICATORS) {
    const match = findCatalogRow(rows, canon, used)
    const key = match?.metric_key ?? canon.code.toLowerCase()
    if (match) used.add(match.metric_key)
    resolved.set(canon.code, key)
  }
  const keyMap = buildCatalogKeyMap([...used, ...resolved.values()])
  for (const [code, key] of resolved) keyMap.set(normalizeCatalogKey(code), key)

  const official = BASE44_STANDARD_INDICATORS.map(canon => {
    const key = resolved.get(canon.code) ?? canon.code.toLowerCase()
    const match = rows.find(row => row.metric_key === key)
    return match ? overlayCanonicalIndicator(match, keyMap) : synthesizeCanonicalIndicator(canon, keyMap) as unknown as T
  })
  // Fora dos 45 canônicos existem dois casos diferentes:
  //
  //  - legado `mx_padrao` que saiu da metodologia: continua exibido como
  //    arquivado, independente do que o banco diga;
  //  - indicadores `criado_mx`, que a MX adotou depois do conjunto Base44:
  //    mantêm o próprio status. Forçá-los a "arquivado" fazia um indicador
  //    publicado aparecer fora de operação, sem nada explicando por quê.
  const extras = rows
    .filter(row => !used.has(row.metric_key))
    .map(row => (row.created_origin === 'criado_mx'
      ? row
      : { ...row, status: 'arquivado', active: false }))
  return [...official, ...extras]
}

export function sortCatalogAreas(areas: string[]) {
  return [...areas].sort((left, right) => {
    const leftIndex = BASE44_DEPARTMENT_ORDER.indexOf(left as typeof BASE44_DEPARTMENT_ORDER[number])
    const rightIndex = BASE44_DEPARTMENT_ORDER.indexOf(right as typeof BASE44_DEPARTMENT_ORDER[number])
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex) || left.localeCompare(right, 'pt-BR')
  })
}

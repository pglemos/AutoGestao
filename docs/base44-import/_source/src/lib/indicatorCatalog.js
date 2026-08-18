// Catálogo oficial dos 45 indicadores padrão MX + 13 parâmetros
// Fonte: NOME DA LOJA - MX Consultoria - Planejamento Estrategico - V2.xlsx + Modelo_plan_estrat(1).pdf

export const DEPARTMENTS = {
  COMERCIAL: { label: 'Comercial', color: 'bg-blue-100 text-blue-700' },
  MARKETING: { label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
  PRODUTO_ESTOQUE: { label: 'Produto e Estoque', color: 'bg-orange-100 text-orange-700' },
  PESSOAS_RH: { label: 'Pessoas - RH', color: 'bg-teal-100 text-teal-700' },
  FINANCEIRO: { label: 'Financeiro', color: 'bg-green-100 text-green-700' },
  OPERACOES: { label: 'Operações', color: 'bg-purple-100 text-purple-700' },
  // Legacy alias for backward compatibility
  PRODUTO: { label: 'Produto e Estoque', color: 'bg-orange-100 text-orange-700' },
};

// target_calculation_mode: MANUAL | CALCULATED_LOCKED | CALCULATED_ADJUSTABLE
// annual_aggregation: SUM_MONTHS | AVERAGE_MONTHS | LAST_VALID_MONTH | RECALCULATE_FROM_ANNUAL_BASES | RECALCULATE_FROM_LAST_PERIOD_BASES
// direction: AUMENTAR | DIMINUIR | MANTER | FAIXA

export const STANDARD_INDICATORS = [
  // ── COMERCIAL (22) ──────────────────────────────────────────────────────────
  {
    code: 'SALES_TOTAL', name: 'Vendas Total', department: 'COMERCIAL',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("SALES_WALKIN") + IND("SALES_REFERRAL") + IND("SALES_COMPANY_PORTFOLIO") + IND("SALES_SELLER_PORTFOLIO") + IND("SALES_INTERNET") + IND("SALES_OTHER")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'Soma das vendas oficiais por canal', display_order: 1,
  },
  {
    code: 'SALES_WALKIN', name: 'Vendas - Fluxo de Porta', department: 'COMERCIAL',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'SUM_MONTHS', display_order: 2,
  },
  {
    code: 'SALES_REFERRAL', name: 'Vendas - Indicação', department: 'COMERCIAL',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'SUM_MONTHS', display_order: 3,
  },
  {
    code: 'SALES_COMPANY_PORTFOLIO', name: 'Vendas - Carteira Empresa', department: 'COMERCIAL',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'SUM_MONTHS', display_order: 4,
  },
  {
    code: 'SALES_SELLER_PORTFOLIO', name: 'Vendas - Carteira Vendedor', department: 'COMERCIAL',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'SUM_MONTHS', display_order: 5,
  },
  {
    code: 'SALES_INTERNET', name: 'Vendas - Internet', department: 'COMERCIAL',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'SUM_MONTHS', display_order: 6,
  },
  {
    code: 'SALES_OTHER', name: 'Vendas - Outros', department: 'COMERCIAL',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'SUM_MONTHS', display_order: 7,
  },
  {
    code: 'SELLER_COUNT', name: 'Volume de Vendedores', department: 'COMERCIAL',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'LAST_VALID_MONTH', display_order: 8,
  },
  {
    code: 'SALES_PER_SELLER', name: 'Média de Vendas por Vendedor', department: 'COMERCIAL',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("SALES_TOTAL") / IND("SELLER_COUNT")',
    annual_aggregation: 'AVERAGE_MONTHS', display_order: 9,
  },
  {
    code: 'LEADS_PER_SELLER', name: 'Média de Leads por Vendedor', department: 'COMERCIAL',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("LEADS_RECEIVED") / IND("SELLER_COUNT")',
    annual_aggregation: 'AVERAGE_MONTHS', display_order: 10,
  },
  {
    code: 'VEHICLES_APPRAISED', name: 'Volume de Carros Avaliados', department: 'COMERCIAL',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("SALES_WITH_TRADE") * PAR("EVALUATIONS_PER_TRADE_SALE")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'Quantidade oficial de avaliações realizadas', display_order: 11,
  },
  {
    code: 'SALES_WITH_TRADE', name: 'Volume de Vendas com Troca', department: 'COMERCIAL',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("SALES_TOTAL") * PAR("TRADE_SALES_RATE")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'Vendas oficiais marcadas com troca', display_order: 12,
  },
  {
    code: 'TRADE_SALES_PERCENTAGE', name: '% Venda com Troca', department: 'COMERCIAL',
    unit: 'Percentual', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("SALES_WITH_TRADE") / IND("SALES_TOTAL")',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    annual_formula: 'SUM_ANNUAL("SALES_WITH_TRADE") / SUM_ANNUAL("SALES_TOTAL")',
    display_order: 13,
  },
  {
    code: 'APPROVED_CREDIT_APPLICATIONS', name: 'Volume de Fichas Aprovadas', department: 'COMERCIAL',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("SALES_TOTAL") * PAR("FINANCED_SALES_RATE") * PAR("APPROVAL_BUFFER_MULTIPLIER")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'Fichas oficialmente aprovadas', display_order: 14,
  },
  {
    code: 'PAID_CREDIT_APPLICATIONS', name: 'Volume de Fichas Pagas', department: 'COMERCIAL',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("APPROVED_CREDIT_APPLICATIONS") * PAR("APPROVED_TO_PAID_CONVERSION")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'Fichas oficialmente pagas', display_order: 15,
  },
  {
    code: 'FINANCED_SALES_PERCENTAGE', name: '% Vendas Financiadas', department: 'COMERCIAL',
    unit: 'Percentual', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("PAID_CREDIT_APPLICATIONS") / IND("SALES_TOTAL")',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    annual_formula: 'SUM_ANNUAL("PAID_CREDIT_APPLICATIONS") / SUM_ANNUAL("SALES_TOTAL")',
    display_order: 16,
  },
  {
    code: 'APPOINTMENTS_VOLUME', name: 'Volume de Agendamentos', department: 'COMERCIAL',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("LEADS_RECEIVED") * PAR("LEAD_TO_APPOINTMENT_RATE")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'Quantidade oficial de agendamentos', display_order: 17,
  },
  {
    code: 'VISITS_VOLUME', name: 'Volume de Visitas', department: 'COMERCIAL',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("APPOINTMENTS_VOLUME") * PAR("APPOINTMENT_TO_VISIT_RATE")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'Quantidade oficial de visitas', display_order: 18,
  },
  {
    code: 'APPOINTMENTS_PER_INTERNET_SALE', name: 'Volume de Agendamentos por Venda', department: 'COMERCIAL',
    unit: 'Número decimal', direction: 'DIMINUIR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("APPOINTMENTS_VOLUME") / IND("SALES_INTERNET")',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    annual_formula: 'SUM_ANNUAL("APPOINTMENTS_VOLUME") / SUM_ANNUAL("SALES_INTERNET")',
    display_order: 19,
  },
  {
    code: 'LEAD_TO_APPOINTMENT_CONVERSION', name: 'Conversão de Leads em Agendamentos', department: 'COMERCIAL',
    unit: 'Percentual', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("APPOINTMENTS_VOLUME") / IND("LEADS_RECEIVED")',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    display_order: 20,
  },
  {
    code: 'APPOINTMENT_TO_VISIT_CONVERSION', name: 'Conversão de Agendamentos em Visitas', department: 'COMERCIAL',
    unit: 'Percentual', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("VISITS_VOLUME") / IND("APPOINTMENTS_VOLUME")',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    display_order: 21,
  },
  {
    code: 'VISIT_TO_SALE_CONVERSION', name: 'Conversão de Visitas em Vendas', department: 'COMERCIAL',
    unit: 'Percentual', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("SALES_INTERNET") / IND("VISITS_VOLUME")',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    annual_formula: 'SUM_ANNUAL("SALES_INTERNET") / SUM_ANNUAL("VISITS_VOLUME")',
    display_order: 22,
  },

  // ── MARKETING (6) ────────────────────────────────────────────────────────────
  {
    code: 'LEADS_RECEIVED', name: 'Volume de Leads Recebidos', department: 'MARKETING',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("SALES_INTERNET") * PAR("LEADS_PER_INTERNET_SALE")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'CRM, conferência de Leads, importação ou valor oficial', display_order: 1,
  },
  {
    code: 'INTERNET_INVESTMENT', name: 'Investimento Internet', department: 'MARKETING',
    unit: 'Moeda', direction: 'DIMINUIR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("INTERNET_COST_PER_SALE") * IND("SALES_INTERNET")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'Valor oficial investido em Marketing', display_order: 2,
  },
  {
    code: 'INTERNET_COST_PER_SALE', name: 'Custo por Venda na Internet', department: 'MARKETING',
    unit: 'Moeda', direction: 'DIMINUIR',
    target_calculation_mode: 'MANUAL',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    annual_formula: 'SUM_ANNUAL("INTERNET_INVESTMENT") / SUM_ANNUAL("SALES_INTERNET")',
    display_order: 3,
  },
  {
    code: 'INSTAGRAM_FOLLOWERS', name: 'Volume de Seguidores Instagram', department: 'MARKETING',
    unit: 'Número inteiro', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'LAST_VALID_MONTH', display_order: 4,
  },
  {
    code: 'GOOGLE_BUSINESS_RATING', name: 'Avaliação Google Meu Negócio', department: 'MARKETING',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'AVERAGE_MONTHS',
    valid_range: '0 a 5', display_order: 5,
  },
  {
    code: 'CONTENT_QUALITY', name: 'Qualidade do Conteúdo', department: 'MARKETING',
    unit: 'Nota', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'AVERAGE_MONTHS',
    valid_range: '0 a 5', display_order: 6,
  },

  // ── PRODUTO / ESTOQUE (7) ─────────────────────────────────────────────────────
  {
    code: 'INVENTORY_TURNOVER', name: 'Giro de Estoque', department: 'PRODUTO_ESTOQUE',
    unit: 'Razão', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("SALES_TOTAL") / IND("INVENTORY_TOTAL")',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    annual_formula: 'SUM_ANNUAL("SALES_TOTAL") / AVG_ANNUAL("INVENTORY_TOTAL")',
    display_order: 1,
  },
  {
    code: 'ACTIVE_INVENTORY', name: 'Estoque Ativo', department: 'PRODUTO_ESTOQUE',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("INVENTORY_TOTAL") * PAR("ACTIVE_STOCK_RATE")',
    annual_aggregation: 'LAST_VALID_MONTH',
    actual_source: 'Quantidade oficial de veículos ativos', display_order: 2,
  },
  {
    code: 'INVENTORY_TOTAL', name: 'Estoque Total', department: 'PRODUTO_ESTOQUE',
    unit: 'Número decimal', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("SALES_TOTAL") * PAR("STOCK_TO_SALES_RATIO")',
    annual_aggregation: 'LAST_VALID_MONTH',
    actual_source: 'Estoque oficial da empresa', display_order: 3,
  },
  {
    code: 'INVENTORY_OVER_90_VOLUME', name: 'Tempo de Estoque > 90', department: 'PRODUTO_ESTOQUE',
    unit: 'Número decimal', direction: 'DIMINUIR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("INVENTORY_TOTAL") * PAR("OVER_90_STOCK_RATE")',
    annual_aggregation: 'LAST_VALID_MONTH', display_order: 4,
  },
  {
    code: 'INVENTORY_OVER_90_PERCENTAGE', name: '% Estoque > 90 Dias', department: 'PRODUTO_ESTOQUE',
    unit: 'Percentual', direction: 'DIMINUIR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("INVENTORY_OVER_90_VOLUME") / IND("INVENTORY_TOTAL")',
    annual_aggregation: 'RECALCULATE_FROM_LAST_PERIOD_BASES',
    annual_formula: 'LAST_ANNUAL("INVENTORY_OVER_90_VOLUME") / LAST_ANNUAL("INVENTORY_TOTAL")',
    display_order: 5,
  },
  {
    code: 'INVENTORY_AVERAGE_TICKET', name: 'Ticket Médio do Estoque', department: 'PRODUTO_ESTOQUE',
    unit: 'Moeda', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'AVERAGE_MONTHS',
    aliases: ['Tícket Médio do Estoque'], display_order: 6,
  },
  {
    code: 'INVENTORY_AVERAGE_MARGIN', name: 'Margem Média do Estoque', department: 'PRODUTO_ESTOQUE',
    unit: 'Moeda', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("INVENTORY_AVERAGE_TICKET") * PAR("STOCK_MARGIN_RATE")',
    annual_aggregation: 'AVERAGE_MONTHS',
    actual_source: 'Margem oficial do estoque ou cálculo financeiro validado', display_order: 7,
  },

  // ── FINANCEIRO (5) ────────────────────────────────────────────────────────────
  {
    code: 'CONTRIBUTION_MARGIN', name: 'Margem de Contribuição', department: 'FINANCEIRO',
    unit: 'Moeda', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'SUM_MONTHS', display_order: 1,
  },
  {
    code: 'ADDITIONAL_REVENUE', name: 'Receita Adicional', department: 'FINANCEIRO',
    unit: 'Moeda', direction: 'AUMENTAR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'SUM_MONTHS', display_order: 2,
  },
  {
    code: 'TOTAL_EXPENSE', name: 'Despesa Total', department: 'FINANCEIRO',
    unit: 'Moeda', direction: 'DIMINUIR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'SUM_MONTHS', display_order: 3,
  },
  {
    code: 'NET_PROFIT', name: 'Lucro Líquido', department: 'FINANCEIRO',
    unit: 'Moeda', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("CONTRIBUTION_MARGIN") + IND("ADDITIONAL_REVENUE") - IND("TOTAL_EXPENSE")',
    annual_aggregation: 'SUM_MONTHS',
    aliases: ['Lúcro Líquido'], display_order: 4,
  },
  {
    code: 'AVERAGE_SALES_MARGIN', name: 'Margem Média de Venda', department: 'FINANCEIRO',
    unit: 'Moeda', direction: 'AUMENTAR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("CONTRIBUTION_MARGIN") / IND("SALES_TOTAL")',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    annual_formula: 'SUM_ANNUAL("CONTRIBUTION_MARGIN") / SUM_ANNUAL("SALES_TOTAL")',
    display_order: 5,
  },

  // ── OPERAÇÕES / PESSOAS (5) ───────────────────────────────────────────────────
  {
    code: 'AVERAGE_PREPARATION_COST', name: 'Custo Médio Preparação', department: 'OPERACOES',
    unit: 'Moeda', direction: 'DIMINUIR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'AVERAGE_MONTHS', display_order: 1,
  },
  {
    code: 'AVERAGE_AFTER_SALES_COST', name: 'Custo Médio Pós-Venda', department: 'OPERACOES',
    unit: 'Moeda', direction: 'DIMINUIR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'AVERAGE_MONTHS', display_order: 2,
  },
  {
    code: 'AFTER_SALES_VOLUME', name: 'Volume de Pós-Venda', department: 'OPERACOES',
    unit: 'Número decimal', direction: 'DIMINUIR',
    target_calculation_mode: 'CALCULATED_ADJUSTABLE',
    formula_expression: 'IND("SALES_TOTAL") * PAR("POST_SALE_RATE")',
    annual_aggregation: 'SUM_MONTHS',
    actual_source: 'Ocorrências oficiais de pós-venda', display_order: 3,
  },
  {
    code: 'AFTER_SALES_PERCENTAGE', name: '% de Pós-Venda', department: 'OPERACOES',
    unit: 'Percentual', direction: 'DIMINUIR',
    target_calculation_mode: 'CALCULATED_LOCKED',
    formula_expression: 'IND("AFTER_SALES_VOLUME") / IND("SALES_TOTAL")',
    annual_aggregation: 'RECALCULATE_FROM_ANNUAL_BASES',
    annual_formula: 'SUM_ANNUAL("AFTER_SALES_VOLUME") / SUM_ANNUAL("SALES_TOTAL")',
    display_order: 4,
  },
  {
    code: 'EMPLOYEE_COUNT', name: 'Quadro de Colaboradores', department: 'PESSOAS_RH',
    unit: 'Número inteiro', direction: 'DIMINUIR',
    target_calculation_mode: 'MANUAL', annual_aggregation: 'LAST_VALID_MONTH',
    actual_source: 'Cadastro de pessoas, RH ou valor oficial informado', display_order: 5,
  },
];

// ── Ordem global oficial dos 45 indicadores (planilha V2) ────────────────────
export const GLOBAL_DISPLAY_ORDER = {
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
};

// Ordem oficial dos departamentos (primeira ocorrência na planilha)
export const DEPARTMENT_ORDER = ['COMERCIAL', 'MARKETING', 'PRODUTO_ESTOQUE', 'FINANCEIRO', 'OPERACOES', 'PESSOAS_RH'];

// ── Mapas de formato oficial (v1.7) ──────────────────────────────────────────
const VALUE_FORMAT_MAP = {
  // INTEGER
  SALES_TOTAL: 'INTEGER', SALES_WALKIN: 'INTEGER', SALES_REFERRAL: 'INTEGER',
  SALES_COMPANY_PORTFOLIO: 'INTEGER', SALES_SELLER_PORTFOLIO: 'INTEGER',
  SALES_INTERNET: 'INTEGER', SALES_OTHER: 'INTEGER',
  SELLER_COUNT: 'INTEGER', LEADS_RECEIVED: 'INTEGER',
  INSTAGRAM_FOLLOWERS: 'INTEGER', EMPLOYEE_COUNT: 'INTEGER',
  // DECIMAL
  SALES_PER_SELLER: 'DECIMAL', LEADS_PER_SELLER: 'DECIMAL',
  VEHICLES_APPRAISED: 'DECIMAL', SALES_WITH_TRADE: 'DECIMAL',
  APPROVED_CREDIT_APPLICATIONS: 'DECIMAL', PAID_CREDIT_APPLICATIONS: 'DECIMAL',
  APPOINTMENTS_VOLUME: 'DECIMAL', VISITS_VOLUME: 'DECIMAL',
  ACTIVE_INVENTORY: 'DECIMAL', INVENTORY_TOTAL: 'DECIMAL',
  INVENTORY_OVER_90_VOLUME: 'DECIMAL', AFTER_SALES_VOLUME: 'DECIMAL',
  // CURRENCY_BRL
  INTERNET_INVESTMENT: 'CURRENCY_BRL', INTERNET_COST_PER_SALE: 'CURRENCY_BRL',
  INVENTORY_AVERAGE_TICKET: 'CURRENCY_BRL', INVENTORY_AVERAGE_MARGIN: 'CURRENCY_BRL',
  CONTRIBUTION_MARGIN: 'CURRENCY_BRL', ADDITIONAL_REVENUE: 'CURRENCY_BRL',
  TOTAL_EXPENSE: 'CURRENCY_BRL', NET_PROFIT: 'CURRENCY_BRL',
  AVERAGE_SALES_MARGIN: 'CURRENCY_BRL', AVERAGE_PREPARATION_COST: 'CURRENCY_BRL',
  AVERAGE_AFTER_SALES_COST: 'CURRENCY_BRL',
  // PERCENTAGE
  TRADE_SALES_PERCENTAGE: 'PERCENTAGE', FINANCED_SALES_PERCENTAGE: 'PERCENTAGE',
  LEAD_TO_APPOINTMENT_CONVERSION: 'PERCENTAGE', APPOINTMENT_TO_VISIT_CONVERSION: 'PERCENTAGE',
  VISIT_TO_SALE_CONVERSION: 'PERCENTAGE', INVENTORY_OVER_90_PERCENTAGE: 'PERCENTAGE',
  AFTER_SALES_PERCENTAGE: 'PERCENTAGE',
  // SCORE_0_5
  GOOGLE_BUSINESS_RATING: 'SCORE_0_5', CONTENT_QUALITY: 'SCORE_0_5',
  // RATIO
  APPOINTMENTS_PER_INTERNET_SALE: 'RATIO',
  // INVENTORY_TURNOVER
  INVENTORY_TURNOVER: 'INVENTORY_TURNOVER',
};

const UNIT_LABEL_MAP = {
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
  INVENTORY_OVER_90_VOLUME: 'veículos', AFTER_SALES_VOLUME: 'ocorrências',
};

const ALLOW_NEGATIVE_MAP = {
  CONTRIBUTION_MARGIN: true, NET_PROFIT: true, AVERAGE_SALES_MARGIN: true,
};

const SUFFIX_DETAIL_MAP = {
  APPOINTMENTS_PER_INTERNET_SALE: 'agend./venda',
};

const PARAM_VALUE_FORMAT_MAP = {
  LEADS_PER_INTERNET_SALE: 'INTEGER',
  TRADE_SALES_RATE: 'PERCENTAGE',
  EVALUATIONS_PER_TRADE_SALE: 'DECIMAL',
  FINANCED_SALES_RATE: 'PERCENTAGE',
  APPROVAL_BUFFER_MULTIPLIER: 'RATIO',
  APPROVED_TO_PAID_CONVERSION: 'PERCENTAGE',
  LEAD_TO_APPOINTMENT_RATE: 'PERCENTAGE',
  APPOINTMENT_TO_VISIT_RATE: 'PERCENTAGE',
  ACTIVE_STOCK_RATE: 'PERCENTAGE',
  STOCK_TO_SALES_RATIO: 'RATIO',
  OVER_90_STOCK_RATE: 'PERCENTAGE',
  STOCK_MARGIN_RATE: 'PERCENTAGE',
  POST_SALE_RATE: 'PERCENTAGE',
};

// ─── Políticas padrão de unidade e consolidação (Seções 13-14, 18-22) ──────────
import { UNIT_POLICY_DEFAULTS, resolveUnitPolicy, isUnitPolicyDefined, UNIT_ENTRY_MODES, UNIT_ROLLUP_METHODS } from '@/lib/unitPolicyDefaults';
export { UNIT_POLICY_DEFAULTS, resolveUnitPolicy, isUnitPolicyDefined, UNIT_ENTRY_MODES, UNIT_ROLLUP_METHODS };

// ── Enriquecer indicadores com campos v1.2/v1.7 ─────────────────────────────
STANDARD_INDICATORS.forEach(ind => {
  ind.value_format = VALUE_FORMAT_MAP[ind.code] || 'INTEGER';
  ind.unit_label = UNIT_LABEL_MAP[ind.code] || '';
  ind.allow_negative = ALLOW_NEGATIVE_MAP[ind.code] || false;
  ind.suffix_detail = SUFFIX_DETAIL_MAP[ind.code] || '';
  ind.global_display_order = GLOBAL_DISPLAY_ORDER[ind.code] || 999;
  ind.department_display_order = ind.display_order;
  ind.input_mode = ind.target_calculation_mode === 'MANUAL' ? 'MANUAL' : 'CALCULATED';
  ind.formula_type = ind.target_calculation_mode === 'MANUAL' ? 'NONE'
    : ind.target_calculation_mode === 'CALCULATED_LOCKED' ? 'DIRECT_FORMULA'
    : 'PARAMETERIZED_FORMULA';
  ind.is_parameterized = ind.target_calculation_mode === 'CALCULATED_ADJUSTABLE';
  ind.parameter_codes = ind.formula_expression
    ? [...ind.formula_expression.matchAll(/PAR\("([^"]+)"\)/g)].map(m => m[1])
    : [];
  // Políticas de unidade e consolidação (Seções 13-14, 18-22)
  const unitPolicy = UNIT_POLICY_DEFAULTS[ind.code];
  if (unitPolicy) {
    ind.unit_entry_mode = unitPolicy.unit_entry_mode;
    ind.unit_rollup_method = unitPolicy.unit_rollup_method;
    ind.weight_indicator_code = unitPolicy.weight_indicator_code || null;
  }
});

export const STANDARD_PARAMETERS = [
  { code: 'LEADS_PER_INTERNET_SALE', name: 'Leads necessários por venda de Internet', unit: 'Leads por venda', default_value: 40, allows_client_override: true },
  { code: 'TRADE_SALES_RATE', name: 'Percentual de vendas com troca', unit: '%', default_value: 0.50, allows_client_override: true },
  { code: 'EVALUATIONS_PER_TRADE_SALE', name: 'Avaliações necessárias por venda com troca', unit: 'avaliações/venda', default_value: 3, allows_client_override: true },
  { code: 'FINANCED_SALES_RATE', name: 'Percentual de vendas financiadas', unit: '%', default_value: 0.60, allows_client_override: true },
  { code: 'APPROVAL_BUFFER_MULTIPLIER', name: 'Margem adicional de fichas aprovadas', unit: 'multiplicador', default_value: 1.10, allows_client_override: true },
  { code: 'APPROVED_TO_PAID_CONVERSION', name: 'Conversão de fichas aprovadas em fichas pagas', unit: '%', default_value: 0.909091, allows_client_override: true },
  { code: 'LEAD_TO_APPOINTMENT_RATE', name: 'Conversão planejada de leads em agendamentos', unit: '%', default_value: 0.20, allows_client_override: true },
  { code: 'APPOINTMENT_TO_VISIT_RATE', name: 'Conversão planejada de agendamentos em visitas', unit: '%', default_value: 0.33, allows_client_override: true },
  { code: 'ACTIVE_STOCK_RATE', name: 'Percentual planejado de estoque ativo', unit: '%', default_value: 0.65, allows_client_override: true },
  {
    code: 'STOCK_TO_SALES_RATIO', name: 'Relação planejada entre estoque total e vendas',
    unit: 'razão', allows_monthly_values: true, allows_client_override: true,
    monthly_defaults: [1.70, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65, 1.65],
  },
  { code: 'OVER_90_STOCK_RATE', name: 'Percentual máximo de estoque acima de 90 dias', unit: '%', default_value: 0.15, allows_client_override: true },
  { code: 'STOCK_MARGIN_RATE', name: 'Margem média planejada sobre o Ticket do Estoque', unit: '%', default_value: 0.20, allows_client_override: true },
  { code: 'POST_SALE_RATE', name: 'Percentual planejado de pós-venda', unit: '%', default_value: 0.20, allows_client_override: true },
];

// ── Departamento e indicadores impactados por parâmetro ──────────────────────
const PARAM_DEPARTMENT = {
  LEADS_PER_INTERNET_SALE: 'MARKETING',
  TRADE_SALES_RATE: 'COMERCIAL',
  EVALUATIONS_PER_TRADE_SALE: 'COMERCIAL',
  FINANCED_SALES_RATE: 'COMERCIAL',
  APPROVAL_BUFFER_MULTIPLIER: 'COMERCIAL',
  APPROVED_TO_PAID_CONVERSION: 'COMERCIAL',
  LEAD_TO_APPOINTMENT_RATE: 'COMERCIAL',
  APPOINTMENT_TO_VISIT_RATE: 'COMERCIAL',
  ACTIVE_STOCK_RATE: 'PRODUTO_ESTOQUE',
  STOCK_TO_SALES_RATIO: 'PRODUTO_ESTOQUE',
  OVER_90_STOCK_RATE: 'PRODUTO_ESTOQUE',
  STOCK_MARGIN_RATE: 'PRODUTO_ESTOQUE',
  POST_SALE_RATE: 'OPERACOES',
};

const PARAM_TO_INDICATORS = {};
STANDARD_INDICATORS.forEach(ind => {
  (ind.parameter_codes || []).forEach(pc => {
    if (!PARAM_TO_INDICATORS[pc]) PARAM_TO_INDICATORS[pc] = [];
    PARAM_TO_INDICATORS[pc].push(ind.code);
  });
});

STANDARD_PARAMETERS.forEach(p => {
  p.value_format = PARAM_VALUE_FORMAT_MAP[p.code] || 'INTEGER';
  p.department = PARAM_DEPARTMENT[p.code] || 'OPERACOES';
  p.indicator_codes = PARAM_TO_INDICATORS[p.code] || [];
});

export const CALC_MODE_LABELS = {
  MANUAL: 'Manual',
  CALCULATED_LOCKED: 'Calculado (bloqueado)',
  CALCULATED_ADJUSTABLE: 'Calculado (ajustável)',
};

export const CALC_MODE_COLORS = {
  MANUAL: 'bg-gray-100 text-gray-600',
  CALCULATED_LOCKED: 'bg-blue-100 text-blue-700',
  CALCULATED_ADJUSTABLE: 'bg-purple-100 text-purple-700',
};

export const ANNUAL_AGG_LABELS = {
  SUM_MONTHS: 'Soma dos meses',
  AVERAGE_MONTHS: 'Média dos meses',
  LAST_VALID_MONTH: 'Último mês válido',
  RECALCULATE_FROM_ANNUAL_BASES: 'Recalculado pelas bases anuais',
  RECALCULATE_FROM_LAST_PERIOD_BASES: 'Recalculado pelo último período',
};

// Engine de cálculo de fórmula com lookup de indicadores e parâmetros
export function evaluateFormula(formulaExpression, indicatorValues, parameterValues) {
  if (!formulaExpression) return null;
  try {
    let expr = formulaExpression;
    // substituir IND("code") e PAR("code")
    expr = expr.replace(/IND\("([^"]+)"\)/g, (_, code) => {
      const v = indicatorValues[code];
      if (v == null || isNaN(v)) return 'null';
      return String(v);
    });
    expr = expr.replace(/PAR\("([^"]+)"\)/g, (_, code) => {
      const v = parameterValues[code];
      if (v == null || isNaN(v)) return 'null';
      return String(v);
    });
    if (expr.includes('null')) return null; // base ausente → Sem base
    // divisão por zero
    if (/\/ *0(?:[^.]|$)/.test(expr)) return null;
    // avaliação segura (apenas aritmética)
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + expr + ')')();
    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

// Cálculo do total anual dado os valores mensais e a política
// allIndicatorMonthlyValues: { [code]: { 1: val, 2: val, ... } } — para recalcular bases anuais
export function calculateAnnualValue(monthlyValues, policy, annualFormula, indicatorValues, allIndicatorMonthlyValues) {
  const valid = monthlyValues.filter(v => v != null && !isNaN(v));
  if (valid.length === 0) return null;
  switch (policy) {
    case 'SUM_MONTHS': return valid.reduce((s, v) => s + v, 0);
    case 'AVERAGE_MONTHS': return valid.reduce((s, v) => s + v, 0) / valid.length;
    case 'LAST_VALID_MONTH': return valid[valid.length - 1];
    case 'RECALCULATE_FROM_ANNUAL_BASES':
    case 'RECALCULATE_FROM_LAST_PERIOD_BASES':
      if (annualFormula && allIndicatorMonthlyValues) {
        // Construir mapa de valores anuais para SUM_ANNUAL, AVG_ANNUAL, LAST_ANNUAL
        const annualMap = {};
        const sumAnnual = (code) => {
          const vals = Object.values(allIndicatorMonthlyValues[code] || {}).filter(v => v != null && !isNaN(v));
          return vals.reduce((s, v) => s + v, 0);
        };
        const avgAnnual = (code) => {
          const vals = Object.values(allIndicatorMonthlyValues[code] || {}).filter(v => v != null && !isNaN(v));
          return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
        };
        const lastAnnual = (code) => {
          const vals = Object.values(allIndicatorMonthlyValues[code] || {}).filter(v => v != null && !isNaN(v));
          return vals.length > 0 ? vals[vals.length - 1] : null;
        };
        let expr = annualFormula;
        expr = expr.replace(/SUM_ANNUAL\("([^"]+)"\)/g, (_, code) => { const v = sumAnnual(code); return v != null ? String(v) : 'null'; });
        expr = expr.replace(/AVG_ANNUAL\("([^"]+)"\)/g, (_, code) => { const v = avgAnnual(code); return v != null ? String(v) : 'null'; });
        expr = expr.replace(/LAST_ANNUAL\("([^"]+)"\)/g, (_, code) => { const v = lastAnnual(code); return v != null ? String(v) : 'null'; });
        if (expr.includes('null')) return null;
        try {
          // eslint-disable-next-line no-new-func
          const result = Function('"use strict"; return (' + expr + ')')();
          return isFinite(result) ? result : null;
        } catch { return null; }
      }
      return valid.reduce((s, v) => s + v, 0);
    default: return valid.reduce((s, v) => s + v, 0);
  }
}

export type CanonicalCalcMode = 'CALCULATED_LOCKED' | 'CALCULATED_ADJUSTABLE'

export type CanonicalFormula = {
  metric_key: string
  target_calculation_mode: CanonicalCalcMode
  formula_expression: string
}

export const CANONICAL_CALCULATED_INDICATORS: CanonicalFormula[] = [
  { metric_key: 'sales_total', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("sales_walkin") + IND("sales_referral") + IND("sales_company_portfolio") + IND("sales_seller_portfolio") + IND("sales_internet") + IND("sales_other")' },
  { metric_key: 'sales_per_seller', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("sales_total") / IND("seller_count")' },
  { metric_key: 'leads_per_seller', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("leads_received") / IND("seller_count")' },
  { metric_key: 'vehicles_appraised', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("sales_with_trade") * PAR("evaluations_per_trade_sale")' },
  { metric_key: 'sales_with_trade', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("sales_total") * PAR("trade_sales_rate")' },
  { metric_key: 'trade_sales_percentage', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("sales_with_trade") / IND("sales_total")' },
  { metric_key: 'approved_credit_applications', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("sales_total") * PAR("financed_sales_rate") * PAR("approval_buffer_multiplier")' },
  { metric_key: 'paid_credit_applications', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("approved_credit_applications") * PAR("approved_to_paid_conversion")' },
  { metric_key: 'financed_sales_percentage', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("paid_credit_applications") / IND("sales_total")' },
  { metric_key: 'appointments_volume', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("leads_received") * PAR("lead_to_appointment_rate")' },
  { metric_key: 'visits_volume', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("appointments_volume") * PAR("appointment_to_visit_rate")' },
  { metric_key: 'appointments_per_internet_sale', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("appointments_volume") / IND("sales_internet")' },
  { metric_key: 'lead_to_appointment_conversion', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("appointments_volume") / IND("leads_received")' },
  { metric_key: 'appointment_to_visit_conversion', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("visits_volume") / IND("appointments_volume")' },
  { metric_key: 'visit_to_sale_conversion', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("sales_internet") / IND("visits_volume")' },
  { metric_key: 'leads_received', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("sales_internet") * PAR("leads_per_internet_sale")' },
  { metric_key: 'internet_investment', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("internet_cost_per_sale") * IND("sales_internet")' },
  { metric_key: 'inventory_turnover', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("sales_total") / IND("inventory_total")' },
  { metric_key: 'active_inventory', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("inventory_total") * PAR("active_stock_rate")' },
  { metric_key: 'inventory_total', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("sales_total") * PAR("stock_to_sales_ratio")' },
  { metric_key: 'inventory_over_90_volume', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("inventory_total") * PAR("over_90_stock_rate")' },
  { metric_key: 'inventory_over_90_percentage', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("inventory_over_90_volume") / IND("inventory_total")' },
  { metric_key: 'inventory_average_margin', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("inventory_average_ticket") * PAR("stock_margin_rate")' },
  { metric_key: 'net_profit', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("contribution_margin") + IND("additional_revenue") - IND("total_expense")' },
  { metric_key: 'average_sales_margin', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("contribution_margin") / IND("sales_total")' },
  { metric_key: 'after_sales_volume', target_calculation_mode: 'CALCULATED_ADJUSTABLE', formula_expression: 'IND("sales_total") * PAR("post_sale_rate")' },
  { metric_key: 'after_sales_percentage', target_calculation_mode: 'CALCULATED_LOCKED', formula_expression: 'IND("after_sales_volume") / IND("sales_total")' },
]

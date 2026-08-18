// ─── Políticas padrão de unidade e consolidação por indicador ─────────────────
// Fonte: Seções 18-22 do PROMPT DE IMPLEMENTAÇÃO MULTIUNIDADE
//
// unit_entry_mode:
//   PER_UNIT_REQUIRED   — cada unidade ativa precisa possuir valor
//   PER_UNIT_OPTIONAL    — pode existir valor em apenas algumas unidades
//   COMPANY_ONLY        — cadastrado somente no consolidado da empresa
//   SHARED_COMPANY_VALUE — valor cadastrado uma vez, exibido nas unidades, sem soma
//
// unit_rollup_method:
//   SUM                    — soma dos valores das unidades
//   RECALCULATE_FROM_BASES — recalcular a partir das bases consolidadas
//   WEIGHTED_AVERAGE       — média ponderada por um indicador-peso
//   AVERAGE_VALID_VALUES   — média simples dos valores válidos
//   LAST_VALID_VALUE       — último valor válido
//   SHARED_NO_SUM          — valor compartilhado (não somar)
//   COMPANY_VALUE          — valor empresarial centralizado
//   MANUAL_CONSOLIDATED    — valor consolidado digitado manualmente

export const UNIT_ENTRY_MODES = {
  PER_UNIT_REQUIRED: { label: 'Por unidade (obrigatório)', short: 'Por unidade' },
  PER_UNIT_OPTIONAL: { label: 'Por unidade (opcional)', short: 'Opcional' },
  COMPANY_ONLY: { label: 'Somente empresa', short: 'Empresa' },
  SHARED_COMPANY_VALUE: { label: 'Valor compartilhado', short: 'Compartilhado' },
};

export const UNIT_ROLLUP_METHODS = {
  SUM: { label: 'Soma das unidades', short: 'Soma' },
  RECALCULATE_FROM_BASES: { label: 'Recálculo pelas bases', short: 'Recálculo' },
  WEIGHTED_AVERAGE: { label: 'Média ponderada', short: 'Ponderada' },
  AVERAGE_VALID_VALUES: { label: 'Média dos valores válidos', short: 'Média' },
  LAST_VALID_VALUE: { label: 'Último valor válido', short: 'Último' },
  SHARED_NO_SUM: { label: 'Compartilhado (não somar)', short: 'Compartilhado' },
  COMPANY_VALUE: { label: 'Valor empresarial', short: 'Empresa' },
  MANUAL_CONSOLIDATED: { label: 'Consolidado manual', short: 'Manual' },
};

// Políticas padrão do Catálogo Mestre — Seções 18-22
export const UNIT_POLICY_DEFAULTS = {
  // ── SUM (PER_UNIT_REQUIRED) — Seção 18: Indicadores aditivos ──
  SALES_WALKIN:               { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  SALES_REFERRAL:             { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  SALES_COMPANY_PORTFOLIO:    { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  SALES_SELLER_PORTFOLIO:     { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  SALES_INTERNET:             { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  SALES_OTHER:                { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  SELLER_COUNT:               { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  LEADS_RECEIVED:             { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  VEHICLES_APPRAISED:         { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  SALES_WITH_TRADE:           { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  APPROVED_CREDIT_APPLICATIONS: { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  PAID_CREDIT_APPLICATIONS:   { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  APPOINTMENTS_VOLUME:        { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  VISITS_VOLUME:              { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  INTERNET_INVESTMENT:        { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  AFTER_SALES_VOLUME:         { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  EMPLOYEE_COUNT:             { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },

  // ── RECALCULATE_FROM_BASES — Seção 19: Não somar percentuais/médias ──
  SALES_TOTAL:                { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  SALES_PER_SELLER:           { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  LEADS_PER_SELLER:           { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  TRADE_SALES_PERCENTAGE:      { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  FINANCED_SALES_PERCENTAGE:  { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  APPOINTMENTS_PER_INTERNET_SALE: { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  LEAD_TO_APPOINTMENT_CONVERSION: { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  APPOINTMENT_TO_VISIT_CONVERSION: { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  VISIT_TO_SALE_CONVERSION:  { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  INTERNET_COST_PER_SALE:     { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  INVENTORY_TURNOVER:         { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  INVENTORY_OVER_90_PERCENTAGE: { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  NET_PROFIT:                 { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  AVERAGE_SALES_MARGIN:       { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },
  AFTER_SALES_PERCENTAGE:     { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'RECALCULATE_FROM_BASES' },

  // ── WEIGHTED_AVERAGE — Seção 21: Médias ponderadas ──
  INVENTORY_AVERAGE_TICKET:  { unit_entry_mode: 'PER_UNIT_OPTIONAL', unit_rollup_method: 'WEIGHTED_AVERAGE', weight_indicator_code: 'INVENTORY_TOTAL' },
  INVENTORY_AVERAGE_MARGIN:  { unit_entry_mode: 'PER_UNIT_OPTIONAL', unit_rollup_method: 'WEIGHTED_AVERAGE', weight_indicator_code: 'INVENTORY_TOTAL' },
  AVERAGE_AFTER_SALES_COST:  { unit_entry_mode: 'PER_UNIT_OPTIONAL', unit_rollup_method: 'WEIGHTED_AVERAGE', weight_indicator_code: 'AFTER_SALES_VOLUME' },

  // ── COMPANY_ONLY — Seção 22: Configuráveis, padrão centralizado ──
  INSTAGRAM_FOLLOWERS:       { unit_entry_mode: 'COMPANY_ONLY', unit_rollup_method: 'COMPANY_VALUE' },
  GOOGLE_BUSINESS_RATING:    { unit_entry_mode: 'COMPANY_ONLY', unit_rollup_method: 'COMPANY_VALUE' },
  CONTENT_QUALITY:           { unit_entry_mode: 'COMPANY_ONLY', unit_rollup_method: 'COMPANY_VALUE' },
  TOTAL_EXPENSE:             { unit_entry_mode: 'COMPANY_ONLY', unit_rollup_method: 'COMPANY_VALUE' },
  AVERAGE_PREPARATION_COST:  { unit_entry_mode: 'COMPANY_ONLY', unit_rollup_method: 'COMPANY_VALUE' },

  // ── PER_UNIT_REQUIRED + SUM (configurável, pode virar SHARED_COMPANY_VALUE) — Seção 22 ──
  ACTIVE_INVENTORY:          { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  INVENTORY_TOTAL:           { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  INVENTORY_OVER_90_VOLUME:  { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  CONTRIBUTION_MARGIN:       { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
  ADDITIONAL_REVENUE:        { unit_entry_mode: 'PER_UNIT_REQUIRED', unit_rollup_method: 'SUM' },
};

// Resolver política efetiva de um indicador (hierarquia: override cliente > pacote > catálogo)
export function resolveUnitPolicy(indicatorCode, clientIndicator = null, packageItem = null, indicatorDef = null) {
  // 1. Override do cliente (ClientStrategicIndicator ou ClientIndicatorUnitPolicyOverride)
  if (clientIndicator?.unit_entry_mode && clientIndicator?.unit_rollup_method) {
    return {
      unit_entry_mode: clientIndicator.unit_entry_mode,
      unit_rollup_method: clientIndicator.unit_rollup_method,
      weight_indicator_code: clientIndicator.weight_indicator_code || null,
    };
  }
  // 2. Snapshot do pacote
  if (packageItem?.unit_entry_mode_snapshot && packageItem?.unit_rollup_method_snapshot) {
    return {
      unit_entry_mode: packageItem.unit_entry_mode_snapshot,
      unit_rollup_method: packageItem.unit_rollup_method_snapshot,
      weight_indicator_code: packageItem.weight_indicator_code_snapshot || null,
    };
  }
  // 3. Catálogo (IndicatorDefinition)
  if (indicatorDef?.unit_entry_mode && indicatorDef?.unit_rollup_method) {
    return {
      unit_entry_mode: indicatorDef.unit_entry_mode,
      unit_rollup_method: indicatorDef.unit_rollup_method,
      weight_indicator_code: indicatorDef.weight_indicator_code || null,
    };
  }
  // 4. Padrão do módulo
  const def = UNIT_POLICY_DEFAULTS[indicatorCode];
  if (def) return { ...def };
  // 5. Fallback seguro — bloquear publicação se não definido
  return { unit_entry_mode: null, unit_rollup_method: null, weight_indicator_code: null };
}

// Verificar se a política está definida (para bloquear publicação se ausente — Seção 15.4)
export function isUnitPolicyDefined(policy) {
  return !!(policy?.unit_entry_mode && policy?.unit_rollup_method);
}

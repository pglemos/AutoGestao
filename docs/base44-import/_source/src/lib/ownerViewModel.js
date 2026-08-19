import { base44 } from '@/api/base44Client';
import { calculateAnnualValue } from '@/lib/indicatorCatalog';
import { computeConsolidatedValueMap } from '@/lib/unitConsolidation';
import { ACTUAL_BLANK_POLICY } from '@/lib/actualCalc';

export async function getOwnerStrategicPlanViewModel({ clientAccountId, referenceYear, scopeType = 'ALL_STORES', storeId = null }) {
  const year = Number(referenceYear);
  const cycles = await base44.entities.StrategicPlanCycle
    .filter({ client_account_id: clientAccountId, year })
    .catch(() => []);

  const publishedCycle = cycles.find(c => c.status === 'PUBLICADO') || null;
  const draftCycle = cycles.find(c => c.status !== 'PUBLICADO') || null;
  const client = await base44.entities.ClientAccount.get(clientAccountId).catch(() => null);

  if (!publishedCycle) {
    return {
      publishedCycle: null, draftCycle, client,
      targets: [], indicators: [],
      metaValueMap: {}, actualValueMap: {}, previousYearValueMap: {},
      scopeType, storeId,
    };
  }

  const [targets, monthlyValues, indicators, params, overrides, actuals, previousYearActuals] = await Promise.all([
    base44.entities.StrategicTarget.filter({ strategic_plan_cycle_id: publishedCycle.id }).catch(() => []),
    base44.entities.StrategicTargetMonthlyValue.filter({ strategic_plan_cycle_id: publishedCycle.id }).catch(() => []),
    base44.entities.IndicatorDefinition.filter({ status: 'PUBLICADO' }).catch(() => []),
    base44.entities.StrategicParameterDefinition.filter({ status: 'ATIVO' }).catch(() => []),
    base44.entities.ClientStrategicParameterOverride.filter({ client_account_id: clientAccountId, reference_year: year, status: 'ATIVO' }).catch(() => []),
    base44.entities.IndicatorActualSnapshot.filter({ client_account_id: clientAccountId, reference_year: year, view_type: 'ACTUAL' }).catch(() => []),
    base44.entities.IndicatorActualSnapshot.filter({ client_account_id: clientAccountId, reference_year: year - 1, view_type: 'PREVIOUS_YEAR' }).catch(() => []),
  ]);

  const ownerTargets = targets.filter(t => {
    const ind = indicators.find(i => i.id === t.indicator_definition_id);
    return ind?.default_owner_visibility !== false;
  });

  const rosterIndicators = targets.map(t => indicators.find(i => i.id === t.indicator_definition_id)).filter(Boolean);

  // Filtrar registros por unidade quando scopeType === 'STORE'
  // Mantém registros da loja selecionada + registros de escopo COMPANY (COMPANY_ONLY / SHARED_COMPANY_VALUE)
  const filterByStore = (records) => {
    if (scopeType === 'STORE' && storeId) {
      return records.filter(r =>
        r.store_id === storeId ||
        r.scope_type === 'COMPANY'
      );
    }
    return records;
  };

  const filteredMonthlyValues = filterByStore(monthlyValues);
  const filteredActuals = filterByStore(actuals);
  const filteredPreviousYearActuals = filterByStore(previousYearActuals);

  // Motor único de consolidação — para STORE com uma única unidade, efetivamente retorna os valores da loja
  const { valueMap: metaValueMap } = computeConsolidatedValueMap({
    records: filteredMonthlyValues, indicators: rosterIndicators, params, overrides,
    valueField: 'applied_value', useParams: true,
  });

  const { valueMap: actualValueMap } = computeConsolidatedValueMap({
    records: filteredActuals, indicators: rosterIndicators,
    valueField: 'effective_value', useParams: false, blankPolicy: ACTUAL_BLANK_POLICY,
  });

  const { valueMap: previousYearValueMap } = computeConsolidatedValueMap({
    records: filteredPreviousYearActuals, indicators: rosterIndicators,
    valueField: 'effective_value', useParams: false, blankPolicy: ACTUAL_BLANK_POLICY,
  });

  return {
    publishedCycle, draftCycle, client,
    targets: ownerTargets, indicators,
    metaValueMap, actualValueMap, previousYearValueMap,
    scopeType, storeId,
  };
}

export function getAnnualForMap(valueMap, indicatorCode, indicators) {
  const monthly = valueMap[indicatorCode] || {};
  const monthlyArr = Array.from({ length: 12 }, (_, i) => monthly[i + 1] ?? null);
  const ind = indicators.find(i => i.code === indicatorCode);
  if (!ind) return null;
  return calculateAnnualValue(monthlyArr, ind.annual_aggregation, ind.annual_formula, valueMap, valueMap);
}

export function getMonthlyValue(valueMap, indicatorCode, month) {
  return valueMap[indicatorCode]?.[month] ?? null;
}

export function calcAttainment(meta, realizado) {
  if (meta == null || realizado == null || meta === 0) return null;
  return (realizado / meta) * 100;
}

export function calcVariation(current, previous) {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function getStatus(meta, realizado, direction) {
  if (meta == null || realizado == null) return 'sem_base';
  const att = realizado / meta;
  if (direction === 'DIMINUIR') {
    if (att <= 1) return 'positivo';
    if (att <= 1.1) return 'atencao';
    return 'critico';
  }
  if (att >= 1) return 'positivo';
  if (att >= 0.9) return 'atencao';
  return 'critico';
}

export const STATUS_CONFIG = {
  positivo: { label: 'Positivo', bg: 'bg-green-100 text-green-700' },
  atencao: { label: 'Atenção', bg: 'bg-amber-100 text-amber-700' },
  critico: { label: 'Crítico', bg: 'bg-red-100 text-red-700' },
  sem_base: { label: 'Sem base', bg: 'bg-gray-100 text-gray-500' },
  neutro: { label: 'Neutro', bg: 'bg-gray-100 text-gray-600' },
};

export const FULL_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const SHORT_MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const DEPT_LABELS = {
  COMERCIAL: 'Vendas',
  MARKETING: 'Marketing',
  PRODUTO_ESTOQUE: 'Estoque',
  FINANCEIRO: 'Financeiro',
  OPERACOES: 'Operacional',
  PESSOAS_RH: 'Pessoas - RH',
};

export function getAccumulatedUntilMonth(valueMap, indicatorCode, indicators, untilMonth) {
  const ind = indicators.find(i => i.code === indicatorCode);
  if (!ind) return null;
  const monthly = valueMap[indicatorCode] || {};

  if ((ind.annual_aggregation === 'RECALCULATE_FROM_ANNUAL_BASES' || ind.annual_aggregation === 'RECALCULATE_FROM_LAST_PERIOD_BASES') && ind.annual_formula) {
    let expr = ind.annual_formula;
    expr = expr.replace(/SUM_ANNUAL\("([^"]+)"\)/g, (_, code) => {
      let sum = 0, hasVal = false;
      for (let m = 1; m <= untilMonth; m++) { const v = valueMap[code]?.[m]; if (v != null && !isNaN(v)) { sum += v; hasVal = true; } }
      return hasVal ? String(sum) : 'null';
    });
    expr = expr.replace(/AVG_ANNUAL\("([^"]+)"\)/g, (_, code) => {
      const vals = [];
      for (let m = 1; m <= untilMonth; m++) { const v = valueMap[code]?.[m]; if (v != null && !isNaN(v)) vals.push(v); }
      return vals.length > 0 ? String(vals.reduce((s, v) => s + v, 0) / vals.length) : 'null';
    });
    expr = expr.replace(/LAST_ANNUAL\("([^"]+)"\)/g, (_, code) => {
      let lastVal = null;
      for (let m = 1; m <= untilMonth; m++) { const v = valueMap[code]?.[m]; if (v != null && !isNaN(v)) lastVal = v; }
      return lastVal != null ? String(lastVal) : 'null';
    });
    if (expr.includes('null')) return null;
    try { const result = Function('"use strict"; return (' + expr + ')')(); return isFinite(result) ? result : null; } catch { return null; }
  }

  if (ind.annual_aggregation === 'AVERAGE_MONTHS') {
    const vals = [];
    for (let m = 1; m <= untilMonth; m++) { const v = monthly[m]; if (v != null && !isNaN(v)) vals.push(v); }
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  }

  if (ind.annual_aggregation === 'LAST_VALID_MONTH') {
    let lastVal = null;
    for (let m = 1; m <= untilMonth; m++) { const v = monthly[m]; if (v != null && !isNaN(v)) lastVal = v; }
    return lastVal;
  }

  let sum = 0, hasVal = false;
  for (let m = 1; m <= untilMonth; m++) { const v = monthly[m]; if (v != null && !isNaN(v)) { sum += v; hasVal = true; } }
  return hasVal ? sum : null;
}
// Motor único de cálculo do Plano Estratégico — computa valores calculados em tempo real no frontend
// e persiste via recalculateMonthlyValues no backend.
import { evaluateFormula, calculateAnnualValue, DEPARTMENT_ORDER } from '@/lib/indicatorCatalog';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// ─── Parâmetro efetivo (hierarquia: cliente/mês > cliente/ano > MX mês > MX padrão) ──────────────
export function getEffectiveParameter(paramCode, month, params, overrides) {
  const param = params.find(p => p.code === paramCode);
  if (!param) return { value: null, source: 'SEM_PARAMETRO' };

  const monthOverride = overrides.find(o => o.parameter_code === paramCode && o.status === 'ATIVO' && o.month === month);
  if (monthOverride) return { value: monthOverride.override_value, source: 'CLIENT_MONTH_OVERRIDE' };

  const yearOverride = overrides.find(o => o.parameter_code === paramCode && o.status === 'ATIVO' && !o.month);
  if (yearOverride) return { value: yearOverride.override_value, source: 'CLIENT_YEAR_OVERRIDE' };

  if (param.allows_monthly_values && param.monthly_defaults) {
    const monthly = typeof param.monthly_defaults === 'string' ? JSON.parse(param.monthly_defaults) : param.monthly_defaults;
    if (monthly && monthly[month - 1] != null) return { value: monthly[month - 1], source: 'MX_DEFAULT' };
  }

  return { value: param.default_value, source: 'MX_DEFAULT' };
}

// ─── Construir paramMap efetivo para um mês específico ──────────────────────────────────────────
export function buildParamMapForMonth(params, overrides, month) {
  const paramMap = {};
  for (const p of params) {
    const eff = getEffectiveParameter(p.code, month, params, overrides);
    paramMap[p.code] = eff.value;
  }
  return paramMap;
}

// ─── Motor de cálculo: computa todos os valores (manuais + calculados) em tempo real ────────────
// Retorna: { valueMap, paramMap, calcStatus }
// valueMap: { [indicatorCode]: { 1: val, 2: val, ... } }
// paramMap: { [paramCode]: { 1: val, 2: val, ... } }  — efetivo por mês
// calcStatus: { [indicatorCode]: { 1: 'CALCULATED'|'WITHOUT_BASE'|'MISSING_PARAMETER', ... } }
export function computeValueMap(monthlyValues, indicators, params, overrides) {
  const indicatorMap = {};
  for (const ind of indicators) indicatorMap[ind.code] = ind;

  // 1. Inicializar valueMap com valores manuais
  const valueMap = {};
  for (const mv of monthlyValues) {
    if (!valueMap[mv.indicator_code]) valueMap[mv.indicator_code] = {};
    const isManual = indicatorMap[mv.indicator_code]?.input_mode === 'MANUAL' ||
      indicatorMap[mv.indicator_code]?.target_calculation_mode === 'MANUAL';
    if (isManual) {
      valueMap[mv.indicator_code][mv.month] = mv.applied_value ?? mv.target_value;
    }
  }

  // 2. Construir paramMap efetivo por mês
  const paramMapByMonth = {};
  for (const month of MONTHS) {
    paramMapByMonth[month] = buildParamMapForMonth(params, overrides, month);
  }

  // 3. Ordenar indicadores calculados por dependência (ordem global = topológica aproximada)
  const calculatedIndicators = indicators
    .filter(i => i.input_mode !== 'MANUAL' && i.target_calculation_mode !== 'MANUAL' && i.formula_expression)
    .sort((a, b) => (a.global_display_order ?? 999) - (b.global_display_order ?? 999));

  // 4. Múltiplas passagens para resolver dependências (3 passos = suficiente para cadeias)
  const calcStatus = {};
  for (let pass = 0; pass < 3; pass++) {
    for (const ind of calculatedIndicators) {
      if (!valueMap[ind.code]) valueMap[ind.code] = {};
      if (!calcStatus[ind.code]) calcStatus[ind.code] = {};

      for (const month of MONTHS) {
        if (pass > 0 && calcStatus[ind.code][month] === 'CALCULATED') continue;

        // Construir mapa de valores flat para este mês (evaluateFormula espera valores simples, não aninhados)
        const flatValues = {};
        for (const [code, monthMap] of Object.entries(valueMap)) {
          flatValues[code] = monthMap[month] ?? null;
        }
        const paramMap = paramMapByMonth[month];
        const calc = evaluateFormula(ind.formula_expression, flatValues, paramMap);

        if (calc != null && !isNaN(calc)) {
          valueMap[ind.code][month] = calc;
          calcStatus[ind.code][month] = 'CALCULATED';
        } else {
          // Verificar se é sem base ou parâmetro pendente
          const expr = ind.formula_expression || '';
          const hasNullInd = [...expr.matchAll(/IND\("([^"]+)"\)/g)].some(m => {
            const v = flatValues[m[1]];
            return v == null || isNaN(v);
          });
          const hasNullParam = [...expr.matchAll(/PAR\("([^"]+)"\)/g)].some(m => {
            const v = paramMap[m[1]];
            return v == null || isNaN(v);
          });
          if (hasNullParam) {
            calcStatus[ind.code][month] = 'MISSING_PARAMETER';
          } else {
            calcStatus[ind.code][month] = 'WITHOUT_BASE';
          }
          valueMap[ind.code][month] = null;
        }
      }
    }
  }

  return { valueMap, paramMapByMonth, calcStatus };
}

// ─── Calcular valor anual de um indicador usando o valueMap computado ──────────────────────────
export function computeAnnualValue(indicatorCode, valueMap, indicators) {
  const ind = indicators.find(i => i.code === indicatorCode);
  if (!ind) return null;
  const monthlyVals = valueMap[indicatorCode] || {};
  const allMonths = Object.values(monthlyVals).filter(v => v != null && !isNaN(v));
  if (allMonths.length === 0) return null;
  return calculateAnnualValue(allMonths, ind.annual_aggregation, ind.annual_formula, valueMap, valueMap);
}

// ─── Calcular valor mensal de um indicador (manual ou calculado) ───────────────────────────────
export function computeMonthValue(indicatorCode, month, valueMap, indicators) {
  const ind = indicators.find(i => i.code === indicatorCode);
  if (!ind) return null;
  return valueMap[indicatorCode]?.[month] ?? null;
}

// ─── Mapeamento de indicadores relacionados (impactados por cada indicador manual) ─────────────
// Para cada indicador manual, lista os indicadores calculados que dependem dele direta ou indiretamente
export function buildImpactMap(indicators) {
  const directDeps = {}; // code → [codes it depends on]
  const directDependents = {}; // code → [codes that depend on it)
  for (const ind of indicators) {
    if (!ind.formula_expression) continue;
    const deps = [...ind.formula_expression.matchAll(/IND\("([^"]+)"\)/g)].map(m => m[1]);
    directDeps[ind.code] = deps;
    for (const dep of deps) {
      if (!directDependents[dep]) directDependents[dep] = [];
      if (!directDependents[dep].includes(ind.code)) directDependents[dep].push(ind.code);
    }
  }

  // Resolver dependências indiretas (transitivas) via BFS
  const transitiveDependents = {};
  for (const ind of indicators) {
    if (ind.input_mode !== 'MANUAL' && ind.target_calculation_mode !== 'MANUAL') continue;
    const visited = new Set();
    const queue = [...(directDependents[ind.code] || [])];
    while (queue.length > 0) {
      const code = queue.shift();
      if (visited.has(code)) continue;
      visited.add(code);
      queue.push(...(directDependents[code] || []));
    }
    transitiveDependents[ind.code] = [...visited];
  }

  return transitiveDependents;
}

// ─── Status do cálculo para exibição ───────────────────────────────────────────────────────────
export const CALC_STATUS_LABELS = {
  CALCULATED: null, // mostra o valor
  WITHOUT_BASE: 'Sem base',
  MISSING_PARAMETER: 'Parâmetro pendente',
  INVALID_FORMULA: 'Erro técnico',
  CIRCULAR_DEPENDENCY: 'Dependência circular',
  TECHNICAL_ERROR: 'Erro técnico',
};

export function calcStatusLabel(status) {
  return CALC_STATUS_LABELS[status] || null;
}

// ─── Indicadores manuais por departamento (para Cadastro Rápido) ──────────────────────────────
export function getManualIndicatorsByDept(targets, indicators) {
  const byDept = {};
  for (const t of targets) {
    const ind = indicators.find(i => i.id === t.indicator_definition_id);
    if (!ind) continue;
    if (ind.input_mode !== 'MANUAL' && ind.target_calculation_mode !== 'MANUAL') continue;
    const dept = ind.department || 'OPERACOES';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push({ target: t, indicator: ind });
  }
  for (const dept of Object.keys(byDept)) {
    byDept[dept].sort((a, b) =>
      (a.indicator.global_display_order ?? 999) - (b.indicator.global_display_order ?? 999));
  }
  return byDept;
}

// ─── Todos os indicadores por departamento (para Revisão Completa) ─────────────────────────────
export function getAllIndicatorsByDept(targets, indicators) {
  const byDept = {};
  for (const t of targets) {
    const ind = indicators.find(i => i.id === t.indicator_definition_id);
    if (!ind) continue;
    const dept = ind.department || 'OPERACOES';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push({ target: t, indicator: ind });
  }
  for (const dept of Object.keys(byDept)) {
    byDept[dept].sort((a, b) =>
      (a.indicator.global_display_order ?? 999) - (b.indicator.global_display_order ?? 999));
  }
  return byDept;
}

// ─── Contar progresso por departamento ─────────────────────────────────────────────────────────
export function computeDeptProgress(byDept, monthlyValues) {
  const progress = {};
  for (const dept of DEPARTMENT_ORDER) {
    const items = byDept[dept] || [];
    const filled = items.filter(({ target }) => {
      const mvs = monthlyValues.filter(m => m.strategic_target_id === target.id);
      const monthsWithValues = new Set(mvs.filter(m => (m.applied_value ?? m.target_value) != null).map(m => m.month));
      return monthsWithValues.size === 12;
    }).length;
    progress[dept] = { filled, total: items.length };
  }
  return progress;
}

// ─── Contar indicadores calculados com base ───────────────────────────────────────────────────
export function countCalculatedWithBase(calcStatus, indicators) {
  const calculatedInds = indicators.filter(i => i.input_mode !== 'MANUAL' && i.target_calculation_mode !== 'MANUAL');
  let withBase = 0;
  let withoutBase = 0;
  for (const ind of calculatedInds) {
    const statuses = Object.values(calcStatus[ind.code] || {});
    if (statuses.some(s => s === 'CALCULATED')) withBase++;
    else withoutBase++;
  }
  return { withBase, withoutBase, total: calculatedInds.length };
}

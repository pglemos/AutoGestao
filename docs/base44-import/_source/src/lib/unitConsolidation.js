// ─── Motor de Consolidação Multiunidade ──────────────────────────────────────
// Seções 10-14, 23-24: consolida valores por unidade em uma visão consolidada
// conforme a política de cada indicador (unit_rollup_method).
//
// Ordem do cálculo consolidado (Seção 23):
//   1. carregar valores de cada unidade
//   2. consolidar as bases conforme a política
//   3. recalcular os indicadores derivados
//   4. aplicar a formatação
//   5. registrar situação de integridade

import { evaluateFormula } from '@/lib/indicatorCatalog';
import { resolveUnitPolicy } from '@/lib/unitPolicyDefaults';
import { buildParamMapForMonth } from '@/lib/strategicCalc';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Status de integridade do consolidado (Seção 37)
export const CONSOLIDATION_STATUS = {
  COMPLETO: 'COMPLETO',
  PARCIAL: 'PARCIAL',
  SEM_BASE: 'SEM_BASE',
  INCONSISTENTE: 'INCONSISTENTE',
  ERRO_TECNICO: 'ERRO_TECNICO',
};

// ─── Consolidar valores de unidades para um mês específico ────────────────────
// unitValueMap: { [indicatorCode]: { [storeId]: value } }  — valores por unidade
// companyValueMap: { [indicatorCode]: value }  — valores empresariais (scope_type=COMPANY)
// indicators: array de IndicatorDefinition
// policies: { [indicatorCode]: { unit_entry_mode, unit_rollup_method, weight_indicator_code } }
// params: { [paramCode]: value }  — parâmetros efetivos (para fórmulas)
//
// Retorna: { consolidated: { [code]: value }, integrity: { [code]: { status, unitsWithData, totalUnits, explanation } } }
export function computeConsolidatedMonth({ unitValueMap, companyValueMap, indicators, policies, params = {}, month, blankPolicy = null }) {
  const consolidated = {};
  const integrity = {};

  // Ordenar indicadores: bases (MANUAL/SUM/WEIGHTED_AVERAGE) antes de derivados (RECALCULATE)
  const sortedIndicators = [...indicators].sort((a, b) => {
    const pa = policies[a.code]?.unit_rollup_method || 'SUM';
    const pb = policies[b.code]?.unit_rollup_method || 'SUM';
    const isDerivedA = pa === 'RECALCULATE_FROM_BASES' ? 1 : 0;
    const isDerivedB = pb === 'RECALCULATE_FROM_BASES' ? 1 : 0;
    if (isDerivedA !== isDerivedB) return isDerivedA - isDerivedB;
    return (a.global_display_order ?? 999) - (b.global_display_order ?? 999);
  });

  for (const ind of sortedIndicators) {
    const policy = policies[ind.code] || resolveUnitPolicy(ind.code, null, null, ind);
    const method = policy.unit_rollup_method || 'SUM';
    const unitVals = unitValueMap[ind.code] || {};
    const storeIds = Object.keys(unitVals);
    const companyVal = companyValueMap[ind.code];

    // Contar unidades com dados
    const unitsWithData = storeIds.filter(sid => unitVals[sid] != null && !isNaN(unitVals[sid]));
    const totalUnits = storeIds.length;

    let value = null;
    let status = CONSOLIDATION_STATUS.SEM_BASE;
    let explanation = '';

    switch (method) {
      case 'SUM': {
        const valid = unitsWithData.map(sid => unitVals[sid]);
        if (valid.length > 0) {
          value = valid.reduce((s, v) => s + v, 0);
          status = valid.length === totalUnits ? CONSOLIDATION_STATUS.COMPLETO : CONSOLIDATION_STATUS.PARCIAL;
          explanation = `Soma de ${valid.length} de ${totalUnits} unidades`;
        } else if (blankPolicy?.[ind.code] === 'ZERO_IF_EMPTY') {
          value = 0;
          status = CONSOLIDATION_STATUS.COMPLETO;
          explanation = 'Política ZERO_IF_EMPTY: valor 0 quando vazio';
        } else {
          status = CONSOLIDATION_STATUS.SEM_BASE;
          explanation = 'Nenhuma unidade possui dados';
        }
        break;
      }

      case 'WEIGHTED_AVERAGE': {
        const weightCode = policy.weight_indicator_code;
        const weightVals = weightCode ? (unitValueMap[weightCode] || {}) : {};
        let num = 0, denom = 0;
        for (const sid of unitsWithData) {
          const w = weightVals[sid];
          if (w != null && !isNaN(w) && w !== 0) {
            num += unitVals[sid] * w;
            denom += w;
          }
        }
        if (denom !== 0) {
          value = num / denom;
          status = unitsWithData.length === totalUnits ? CONSOLIDATION_STATUS.COMPLETO : CONSOLIDATION_STATUS.PARCIAL;
          explanation = `Média ponderada por ${weightCode} (${unitsWithData.length}/${totalUnits} unidades)`;
        } else {
          status = CONSOLIDATION_STATUS.SEM_BASE;
          explanation = `Sem peso (${weightCode}) para média ponderada`;
        }
        break;
      }

      case 'AVERAGE_VALID_VALUES': {
        const valid = unitsWithData.map(sid => unitVals[sid]);
        if (valid.length > 0) {
          value = valid.reduce((s, v) => s + v, 0) / valid.length;
          status = valid.length === totalUnits ? CONSOLIDATION_STATUS.COMPLETO : CONSOLIDATION_STATUS.PARCIAL;
          explanation = `Média de ${valid.length} valores válidos`;
        } else {
          status = CONSOLIDATION_STATUS.SEM_BASE;
        }
        break;
      }

      case 'LAST_VALID_VALUE': {
        const valid = unitsWithData.map(sid => ({ sid, val: unitVals[sid] }));
        if (valid.length > 0) {
          value = valid[valid.length - 1].val;
          status = CONSOLIDATION_STATUS.COMPLETO;
          explanation = `Último valor válido (${valid.length} unidades)`;
        } else {
          status = CONSOLIDATION_STATUS.SEM_BASE;
        }
        break;
      }

      case 'SHARED_NO_SUM':
      case 'COMPANY_VALUE':
      case 'MANUAL_CONSOLIDATED': {
        if (companyVal != null && !isNaN(companyVal)) {
          value = companyVal;
          status = CONSOLIDATION_STATUS.COMPLETO;
          explanation = method === 'SHARED_NO_SUM' ? 'Valor compartilhado entre as unidades' : 'Valor empresarial centralizado';
        } else {
          status = CONSOLIDATION_STATUS.SEM_BASE;
          explanation = 'Valor empresarial não cadastrado';
        }
        break;
      }

      case 'RECALCULATE_FROM_BASES': {
        // Avaliar fórmula com valores consolidados já computados
        if (ind.formula_expression) {
          const calc = evaluateFormula(ind.formula_expression, consolidated, params);
          if (calc != null && !isNaN(calc) && isFinite(calc)) {
            value = calc;
            status = CONSOLIDATION_STATUS.COMPLETO;
            explanation = `Recalculado pelas bases consolidadas`;
          } else {
            // Verificar quais bases faltam
            const deps = [...ind.formula_expression.matchAll(/IND\("([^"]+)"\)/g)].map(m => m[1]);
            const missing = deps.filter(d => consolidated[d] == null);
            status = missing.length > 0 ? CONSOLIDATION_STATUS.SEM_BASE : CONSOLIDATION_STATUS.INCONSISTENTE;
            explanation = missing.length > 0 ? `Faltam bases: ${missing.join(', ')}` : 'Divisão por zero ou inconsistência';
          }
        } else {
          status = CONSOLIDATION_STATUS.SEM_BASE;
          explanation = 'Indicador sem fórmula definida';
        }
        break;
      }

      default:
        status = CONSOLIDATION_STATUS.INCONSISTENTE;
        explanation = `Método de consolidação não reconhecido: ${method}`;
    }

    consolidated[ind.code] = value;
    integrity[ind.code] = {
      status,
      unitsWithData: unitsWithData.length,
      totalUnits,
      explanation,
      month,
    };
  }

  return { consolidated, integrity };
}

// ─── Consolidar todos os 12 meses ─────────────────────────────────────────────
// unitMonthlyMap: { [indicatorCode]: { [storeId]: { [month]: value } } }
// companyMonthlyMap: { [indicatorCode]: { [month]: value } }
export function computeConsolidatedYear({ unitMonthlyMap, companyMonthlyMap, indicators, policies, params = {}, paramMapByMonth = null, blankPolicy = null }) {
  const consolidatedByMonth = {};
  const integrityByMonth = {};

  for (const month of MONTHS) {
    // Extrair valores deste mês
    const unitValueMap = {};
    for (const [code, storeMap] of Object.entries(unitMonthlyMap)) {
      unitValueMap[code] = {};
      for (const [storeId, monthMap] of Object.entries(storeMap)) {
        unitValueMap[code][storeId] = monthMap[month] ?? null;
      }
    }
    const companyValueMap = {};
    for (const [code, monthMap] of Object.entries(companyMonthlyMap)) {
      companyValueMap[code] = monthMap[month] ?? null;
    }

    const monthParams = paramMapByMonth ? (paramMapByMonth[month] || params) : params;
    const result = computeConsolidatedMonth({
      unitValueMap, companyValueMap, indicators, policies, params: monthParams, month, blankPolicy,
    });
    consolidatedByMonth[month] = result.consolidated;
    integrityByMonth[month] = result.integrity;
  }

  return { consolidatedByMonth, integrityByMonth };
}

// ─── Agrupar valores mensais por unidade ──────────────────────────────────────
// Converte lista de StrategicTargetMonthlyValue (ou IndicatorActualSnapshot) em mapa por unidade
// records: array de { indicator_code, store_id, scope_type, month, applied_value/effective_value }
export function groupValuesByUnit(records, valueField = 'applied_value') {
  const unitMonthlyMap = {};  // { [code]: { [storeId]: { [month]: value } } }
  const companyMonthlyMap = {};  // { [code]: { [month]: value } }

  for (const r of records) {
    const code = r.indicator_code;
    const month = r.month;
    const val = r[valueField] ?? r.effective_value ?? r.calculated_value ?? r.target_value ?? r.manual_value;

    if (r.scope_type === 'COMPANY' || (!r.store_id && r.scope_type !== 'STORE')) {
      // Valor empresarial
      if (!companyMonthlyMap[code]) companyMonthlyMap[code] = {};
      companyMonthlyMap[code][month] = val;
    } else if (r.store_id) {
      // Valor por unidade
      if (!unitMonthlyMap[code]) unitMonthlyMap[code] = {};
      if (!unitMonthlyMap[code][r.store_id]) unitMonthlyMap[code][r.store_id] = {};
      unitMonthlyMap[code][r.store_id][month] = val;
    } else {
      // Legado: sem store_id nem scope_type=COMPANY → tratar como COMPANY_LEGACY
      if (!companyMonthlyMap[code]) companyMonthlyMap[code] = {};
      companyMonthlyMap[code][month] = val;
    }
  }

  return { unitMonthlyMap, companyMonthlyMap };
}

// ─── Verificar se um indicador é editável em um escopo ─────────────────────────
export function isEditableInScope(indicatorCode, scopeType, policies) {
  const policy = policies[indicatorCode];
  if (!policy) return false;
  const entryMode = policy.unit_entry_mode;

  if (scopeType === 'COMPANY' || scopeType === 'CONSOLIDADO') {
    // No consolidado: editável apenas para COMPANY_ONLY e SHARED_COMPANY_VALUE
    return entryMode === 'COMPANY_ONLY' || entryMode === 'SHARED_COMPANY_VALUE';
  }
  // Por unidade: editável para PER_UNIT_REQUIRED e PER_UNIT_OPTIONAL
  return entryMode === 'PER_UNIT_REQUIRED' || entryMode === 'PER_UNIT_OPTIONAL';
}

// ─── Badge de escopo do indicador ─────────────────────────────────────────────
export function getIndicatorScopeBadge(indicatorCode, policies) {
  const policy = policies[indicatorCode];
  if (!policy) return null;
  const entryMode = policy.unit_entry_mode;

  switch (entryMode) {
    case 'COMPANY_ONLY':
      return { label: 'Indicador consolidado da empresa', className: 'bg-indigo-100 text-indigo-700' };
    case 'SHARED_COMPANY_VALUE':
      return { label: 'Estoque compartilhado entre as unidades', className: 'bg-cyan-100 text-cyan-700' };
    case 'PER_UNIT_REQUIRED':
      return null;  // Sem badge — comportamento padrão
    case 'PER_UNIT_OPTIONAL':
      return { label: 'Cadastro opcional por unidade', className: 'bg-gray-100 text-gray-600' };
    default:
      return null;
  }
}

// ─── Computar valueMap consolidado (compatível com computeValueMap/computeActualValueMap) ────
// ÚNICA função de consolidação para Meta, Realizado e Ano Anterior.
//
// records: array de StrategicTargetMonthlyValue (Meta) ou IndicatorActualSnapshot (Realizado/Ano Anterior)
// indicators: array de IndicatorDefinition (roster do plano)
// params: array de StrategicParameterDefinition (Meta apenas)
// overrides: array de ClientStrategicParameterOverride (Meta apenas)
// valueField: 'applied_value' (Meta) ou 'effective_value' (Realizado/Ano Anterior)
// useParams: true para Meta, false para Realizado/Ano Anterior
// blankPolicy: { [code]: 'ZERO_IF_EMPTY' } — política de branco (Realizado)
//
// Retorna: { valueMap, paramMapByMonth, calcStatus, calcDetails, integrityByMonth }
// valueMap: { [code]: { [month]: value } }  — mesmo formato que computeValueMap
export function computeConsolidatedValueMap({ records, indicators, params = [], overrides = [], valueField = 'applied_value', useParams = false, blankPolicy = null }) {
  // 1. Agrupar valores por unidade (Seção 8: carregar valores por store_id + COMPANY)
  const { unitMonthlyMap, companyMonthlyMap } = groupValuesByUnit(records, valueField);

  // 2. Aplicar política de branco (Seção 21: ZERO é válido, VAZIO é ausência — exceto SALES_OTHER)
  if (blankPolicy) {
    for (const [code, policy] of Object.entries(blankPolicy)) {
      if (policy === 'ZERO_IF_EMPTY' && unitMonthlyMap[code]) {
        for (const storeId of Object.keys(unitMonthlyMap[code])) {
          for (const month of MONTHS) {
            if (unitMonthlyMap[code][storeId][month] == null) {
              unitMonthlyMap[code][storeId][month] = 0;
            }
          }
        }
      }
    }
  }

  // 3. Resolver políticas de consolidação para cada indicador (Seção 6: hierarquia override > pacote > catálogo)
  const policies = {};
  for (const ind of indicators) {
    policies[ind.code] = resolveUnitPolicy(ind.code, null, null, ind);
  }

  // 4. Construir paramMapByMonth (Meta apenas — Realizado/Ano Anterior não usa parâmetros)
  let paramMapByMonth = {};
  let flatParams = {};
  if (useParams) {
    for (const month of MONTHS) {
      paramMapByMonth[month] = buildParamMapForMonth(params, overrides, month);
    }
    flatParams = paramMapByMonth[1] || {};
  }

  // 5. Consolidar mês a mês (Seção 9: processar cada mês separadamente, depois anual)
  const { consolidatedByMonth, integrityByMonth } = computeConsolidatedYear({
    unitMonthlyMap, companyMonthlyMap, indicators, policies,
    paramMapByMonth: useParams ? paramMapByMonth : null,
    params: flatParams,
    blankPolicy,
  });

  // 6. Construir valueMap no formato { [code]: { [month]: value } } — compatível com computeValueMap
  const valueMap = {};
  const calcStatus = {};
  const calcDetails = {};

  for (const ind of indicators) {
    valueMap[ind.code] = {};
    calcStatus[ind.code] = {};
    calcDetails[ind.code] = {};
  }

  for (const month of MONTHS) {
    const consolidated = consolidatedByMonth[month] || {};
    const integrity = integrityByMonth[month] || {};
    for (const ind of indicators) {
      const val = consolidated[ind.code];
      const isValid = val != null && !isNaN(val) && isFinite(val);
      valueMap[ind.code][month] = isValid ? val : null;

      if (isValid) {
        calcStatus[ind.code][month] = 'CALCULATED';
      } else {
        calcStatus[ind.code][month] = 'WITHOUT_BASE';
      }
      calcDetails[ind.code][month] = {
        missingDeps: [],
        reason: integrity[ind.code]?.explanation || '',
        completeness: integrity[ind.code]?.status || null,
        unitsWithData: integrity[ind.code]?.unitsWithData || 0,
        totalUnits: integrity[ind.code]?.totalUnits || 0,
      };
    }
  }

  return { valueMap, paramMapByMonth, calcStatus, calcDetails, integrityByMonth };
}

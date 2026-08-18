// Motor de cálculo para Realizado e Ano Anterior
// Diferente da Meta: não usa parâmetros de planejamento (PAR), somente dados oficiais (IND)
import { evaluateFormula, calculateAnnualValue, DEPARTMENT_ORDER } from '@/lib/indicatorCatalog';
import { base44 } from '@/api/base44Client';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// 30 resultados-base digitáveis (entrada manual oficial)
export const ACTUAL_MANUAL_CODES = [
  // COMERCIAL (13)
  'SALES_WALKIN', 'SALES_REFERRAL', 'SALES_COMPANY_PORTFOLIO', 'SALES_SELLER_PORTFOLIO',
  'SALES_INTERNET', 'SALES_OTHER', 'SELLER_COUNT', 'VEHICLES_APPRAISED', 'SALES_WITH_TRADE',
  'APPROVED_CREDIT_APPLICATIONS', 'PAID_CREDIT_APPLICATIONS', 'APPOINTMENTS_VOLUME', 'VISITS_VOLUME',
  // MARKETING (5)
  'LEADS_RECEIVED', 'INTERNET_INVESTMENT', 'INSTAGRAM_FOLLOWERS', 'GOOGLE_BUSINESS_RATING', 'CONTENT_QUALITY',
  // PRODUTO_ESTOQUE (5)
  'ACTIVE_INVENTORY', 'INVENTORY_TOTAL', 'INVENTORY_OVER_90_VOLUME', 'INVENTORY_AVERAGE_TICKET', 'INVENTORY_AVERAGE_MARGIN',
  // FINANCEIRO (3)
  'CONTRIBUTION_MARGIN', 'ADDITIONAL_REVENUE', 'TOTAL_EXPENSE',
  // OPERACOES (3)
  'AVERAGE_PREPARATION_COST', 'AVERAGE_AFTER_SALES_COST', 'AFTER_SALES_VOLUME',
  // PESSOAS_RH (1)
  'EMPLOYEE_COUNT',
];

// 15 indicadores calculados no Realizado/Ano Anterior (somente dados oficiais, sem PAR)
export const ACTUAL_CALCULATED = {
  SALES_TOTAL: 'IND("SALES_WALKIN") + IND("SALES_REFERRAL") + IND("SALES_COMPANY_PORTFOLIO") + IND("SALES_SELLER_PORTFOLIO") + IND("SALES_INTERNET") + IND("SALES_OTHER")',
  SALES_PER_SELLER: 'IND("SALES_TOTAL") / IND("SELLER_COUNT")',
  LEADS_PER_SELLER: 'IND("LEADS_RECEIVED") / IND("SELLER_COUNT")',
  TRADE_SALES_PERCENTAGE: 'IND("SALES_WITH_TRADE") / IND("SALES_TOTAL")',
  FINANCED_SALES_PERCENTAGE: 'IND("PAID_CREDIT_APPLICATIONS") / IND("SALES_TOTAL")',
  APPOINTMENTS_PER_INTERNET_SALE: 'IND("APPOINTMENTS_VOLUME") / IND("SALES_INTERNET")',
  LEAD_TO_APPOINTMENT_CONVERSION: 'IND("APPOINTMENTS_VOLUME") / IND("LEADS_RECEIVED")',
  APPOINTMENT_TO_VISIT_CONVERSION: 'IND("VISITS_VOLUME") / IND("APPOINTMENTS_VOLUME")',
  VISIT_TO_SALE_CONVERSION: 'IND("SALES_INTERNET") / IND("VISITS_VOLUME")',
  INTERNET_COST_PER_SALE: 'IND("INTERNET_INVESTMENT") / IND("SALES_INTERNET")',
  INVENTORY_TURNOVER: 'IND("SALES_TOTAL") / IND("INVENTORY_TOTAL")',
  INVENTORY_OVER_90_PERCENTAGE: 'IND("INVENTORY_OVER_90_VOLUME") / IND("INVENTORY_TOTAL")',
  NET_PROFIT: 'IND("CONTRIBUTION_MARGIN") + IND("ADDITIONAL_REVENUE") - IND("TOTAL_EXPENSE")',
  AVERAGE_SALES_MARGIN: 'IND("CONTRIBUTION_MARGIN") / IND("SALES_TOTAL")',
  AFTER_SALES_PERCENTAGE: 'IND("AFTER_SALES_VOLUME") / IND("SALES_TOTAL")',
};

// Política de blank: indicadores cujo vazio deve ser tratado como zero nas fórmulas
// Aplicado SOMENTE a SALES_OTHER — não transforma todos os vazios em zero
export const ACTUAL_BLANK_POLICY = {
  SALES_OTHER: 'ZERO_IF_EMPTY',
};

// Políticas de agregação anual para o Realizado (mesmas da Meta)
export const ACTUAL_ANNUAL_AGG = {
  SALES_TOTAL: 'SUM_MONTHS',
  SALES_PER_SELLER: 'AVERAGE_MONTHS',
  LEADS_PER_SELLER: 'AVERAGE_MONTHS',
  TRADE_SALES_PERCENTAGE: 'RECALCULATE_FROM_ANNUAL_BASES',
  FINANCED_SALES_PERCENTAGE: 'RECALCULATE_FROM_ANNUAL_BASES',
  APPOINTMENTS_PER_INTERNET_SALE: 'RECALCULATE_FROM_ANNUAL_BASES',
  LEAD_TO_APPOINTMENT_CONVERSION: 'RECALCULATE_FROM_ANNUAL_BASES',
  APPOINTMENT_TO_VISIT_CONVERSION: 'RECALCULATE_FROM_ANNUAL_BASES',
  VISIT_TO_SALE_CONVERSION: 'RECALCULATE_FROM_ANNUAL_BASES',
  INTERNET_COST_PER_SALE: 'RECALCULATE_FROM_ANNUAL_BASES',
  INVENTORY_TURNOVER: 'RECALCULATE_FROM_ANNUAL_BASES',
  INVENTORY_OVER_90_PERCENTAGE: 'RECALCULATE_FROM_LAST_PERIOD_BASES',
  NET_PROFIT: 'SUM_MONTHS',
  AVERAGE_SALES_MARGIN: 'RECALCULATE_FROM_ANNUAL_BASES',
  AFTER_SALES_PERCENTAGE: 'RECALCULATE_FROM_ANNUAL_BASES',
};

// Fórmulas anuais para indicadores recalculados
export const ACTUAL_ANNUAL_FORMULA = {
  TRADE_SALES_PERCENTAGE: 'SUM_ANNUAL("SALES_WITH_TRADE") / SUM_ANNUAL("SALES_TOTAL")',
  FINANCED_SALES_PERCENTAGE: 'SUM_ANNUAL("PAID_CREDIT_APPLICATIONS") / SUM_ANNUAL("SALES_TOTAL")',
  APPOINTMENTS_PER_INTERNET_SALE: 'SUM_ANNUAL("APPOINTMENTS_VOLUME") / SUM_ANNUAL("SALES_INTERNET")',
  LEAD_TO_APPOINTMENT_CONVERSION: 'SUM_ANNUAL("APPOINTMENTS_VOLUME") / SUM_ANNUAL("LEADS_RECEIVED")',
  APPOINTMENT_TO_VISIT_CONVERSION: 'SUM_ANNUAL("VISITS_VOLUME") / SUM_ANNUAL("APPOINTMENTS_VOLUME")',
  VISIT_TO_SALE_CONVERSION: 'SUM_ANNUAL("SALES_INTERNET") / SUM_ANNUAL("VISITS_VOLUME")',
  INTERNET_COST_PER_SALE: 'SUM_ANNUAL("INTERNET_INVESTMENT") / SUM_ANNUAL("SALES_INTERNET")',
  INVENTORY_TURNOVER: 'SUM_ANNUAL("SALES_TOTAL") / AVG_ANNUAL("INVENTORY_TOTAL")',
  INVENTORY_OVER_90_PERCENTAGE: 'LAST_ANNUAL("INVENTORY_OVER_90_VOLUME") / LAST_ANNUAL("INVENTORY_TOTAL")',
  AVERAGE_SALES_MARGIN: 'SUM_ANNUAL("CONTRIBUTION_MARGIN") / SUM_ANNUAL("SALES_TOTAL")',
  AFTER_SALES_PERCENTAGE: 'SUM_ANNUAL("AFTER_SALES_VOLUME") / SUM_ANNUAL("SALES_TOTAL")',
};

// Verificar se um indicador é manual no Realizado
// CORREÇÃO: indicadores adicionais (não listados em ACTUAL_CALCULATED) são manuais/digitáveis
// Isso garante que qualquer indicador vinculado ao Plano apareça no Realizado/Ano Anterior
export function isActualManual(code) {
  return !Object.prototype.hasOwnProperty.call(ACTUAL_CALCULATED, code);
}

// Verificar se um indicador é calculado no Realizado
export function isActualCalculated(code) {
  return code in ACTUAL_CALCULATED;
}

// Motor de cálculo do Realizado — computa valores calculados a partir dos manuais (sem parâmetros)
// CORREÇÃO: construir mapa flat por mês antes de chamar evaluateFormula (que espera escalares)
// CORREÇÃO: política ZERO_IF_EMPTY para SALES_OTHER — vazio = 0, não bloqueia SALES_TOTAL
// CORREÇÃO: retornar calcDetails com missingDeps para exibir motivo do "Sem base"
export function computeActualValueMap(snapshots) {
  // snapshots: array de IndicatorActualSnapshot
  const valueMap = {};
  const calcStatus = {};
  const calcDetails = {}; // { [code]: { [month]: { missingDeps: [], reason: '' } } }

  // 1. Inicializar todos os códigos manuais (garante que BLANK_POLICY seja aplicado mesmo sem snapshot)
  for (const code of ACTUAL_MANUAL_CODES) {
    if (!valueMap[code]) valueMap[code] = {};
  }
  for (const s of snapshots) {
    if (!valueMap[s.indicator_code]) valueMap[s.indicator_code] = {};
    if (isActualManual(s.indicator_code)) {
      valueMap[s.indicator_code][s.month] = s.effective_value ?? s.manual_value;
    }
  }

  // 2. Calcular indicadores calculados (3 passagens para resolver dependências topológicas)
  for (let pass = 0; pass < 3; pass++) {
    for (const [code, formula] of Object.entries(ACTUAL_CALCULATED)) {
      if (!valueMap[code]) valueMap[code] = {};
      if (!calcStatus[code]) calcStatus[code] = {};
      if (!calcDetails[code]) calcDetails[code] = {};

      for (const month of MONTHS) {
        if (pass > 0 && calcStatus[code][month] === 'CALCULATED') continue;

        // Verificar se há override manual — preservar valor oficial
        const snap = snapshots.find(s => s.indicator_code === code && s.month === month && s.value_mode === 'MANUAL_OVERRIDE');
        if (snap && pass === 0) {
          valueMap[code][month] = snap.effective_value;
          calcStatus[code][month] = 'CALCULATED';
          calcDetails[code][month] = { missingDeps: [], reason: '' };
          continue;
        }

        // Construir mapa flat para este mês (evaluateFormula espera escalares, não objetos aninhados)
        // Aplicar política ZERO_IF_EMPTY: SALES_OTHER vazio = 0 nas fórmulas (não bloqueia SALES_TOTAL)
        const flatValues = {};
        for (const [c, monthMap] of Object.entries(valueMap)) {
          let v = monthMap[month] ?? null;
          if (v == null && ACTUAL_BLANK_POLICY[c] === 'ZERO_IF_EMPTY') {
            v = 0;
          }
          flatValues[c] = v;
        }

        const calc = evaluateFormula(formula, flatValues, {});
        if (calc != null && !isNaN(calc) && isFinite(calc)) {
          valueMap[code][month] = calc;
          calcStatus[code][month] = 'CALCULATED';
          calcDetails[code][month] = { missingDeps: [], reason: '' };
        } else {
          // Determinar causa específica: base ausente vs divisor zero
          const deps = [...formula.matchAll(/IND\("([^"]+)"\)/g)].map(m => m[1]);
          const missingDeps = deps.filter(d => flatValues[d] == null || isNaN(flatValues[d]));
          if (missingDeps.length > 0) {
            calcStatus[code][month] = 'WITHOUT_BASE';
            calcDetails[code][month] = { missingDeps, reason: `Falta: ${missingDeps.join(', ')}` };
          } else {
            // Todas as bases presentes mas resultado inválido → divisor zero
            calcStatus[code][month] = 'DIVISION_BY_ZERO';
            calcDetails[code][month] = { missingDeps: [], reason: 'Divisão por zero' };
          }
          valueMap[code][month] = null;
        }
      }
    }
  }

  return { valueMap, calcStatus, calcDetails };
}

// ─── Serviço único de recálculo: computa e persiste indicadores derivados ─────────────────────
// Reutilizado por Realizado e Ano Anterior. Idempotente: não cria duplicatas nem sobrescreve
// valores iguais. Preserva MANUAL_OVERRIDE (valor oficial informado manualmente).
export async function persistActualCalculations({ clientId, cycleId, referenceYear, viewType, snapshots, indicators, userName = 'Sistema MX' }) {
  const { valueMap, calcStatus } = computeActualValueMap(snapshots);
  const report = { calculated: 0, updated: 0, created: 0, withoutBase: 0, preserved: 0, errors: [] };
  const updatedSnapshots = [...snapshots];

  const toCreate = [];
  const toUpdate = [];

  for (const code of Object.keys(ACTUAL_CALCULATED)) {
    const ind = indicators.find(i => i.code === code);
    if (!ind) continue;

    for (let month = 1; month <= 12; month++) {
      const status = calcStatus[code]?.[month];
      const val = valueMap[code]?.[month];
      const existing = updatedSnapshots.find(s => s.indicator_code === code && s.month === month);

      // Preservar MANUAL_OVERRIDE — atualizar calculated_value mas manter effective_value
      if (existing?.value_mode === 'MANUAL_OVERRIDE') {
        if (status === 'CALCULATED' && val != null && existing.calculated_value !== val) {
          toUpdate.push({
            id: existing.id,
            calculated_value: val,
            calculation_status: 'CALCULATED',
            calculated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        report.preserved++;
        continue;
      }

      if (status === 'CALCULATED' && val != null) {
        const calcData = {
          calculated_value: val,
          effective_value: val,
          value_mode: 'AUTO_CALCULATED',
          source_type: 'CALCULATION',
          calculation_status: 'CALCULATED',
          calculated_at: new Date().toISOString(),
          updated_by: userName,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          // Idempotente: só atualizar se valor mudou
          if (existing.calculated_value !== val || existing.effective_value !== val || existing.calculation_status !== 'CALCULATED') {
            toUpdate.push({ id: existing.id, ...calcData });
          }
        } else {
          toCreate.push({
            client_account_id: clientId,
            strategic_plan_cycle_id: cycleId,
            indicator_definition_id: ind.id,
            indicator_code: code,
            indicator_name: ind.name,
            view_type: viewType,
            reference_year: Number(referenceYear),
            month,
            quality_state: 'NAO_AVALIADA',
            ...calcData,
          });
        }
        report.calculated++;
      } else {
        // WITHOUT_BASE ou DIVISION_BY_ZERO — limpar registro obsoleto se existir (e não for oficial)
        if (existing && existing.value_mode !== 'MANUAL_OVERRIDE' && existing.value_mode !== 'MANUAL_OFFICIAL') {
          if (existing.calculated_value != null || existing.effective_value != null || existing.calculation_status !== status) {
            toUpdate.push({
              id: existing.id,
              calculated_value: null,
              effective_value: null,
              value_mode: 'AUTO_CALCULATED',
              source_type: 'CALCULATION',
              calculation_status: status,
              updated_at: new Date().toISOString(),
            });
          }
        }
        report.withoutBase++;
      }
    }
  }

  // Operações em lote para eficiência (máx 2 chamadas API)
  if (toCreate.length > 0) {
    try {
      const created = await base44.entities.IndicatorActualSnapshot.bulkCreate(toCreate);
      updatedSnapshots.push(...(Array.isArray(created) ? created : []));
      report.created = Array.isArray(created) ? created.length : 0;
    } catch (e) {
      report.errors.push({ error: e.message, context: 'bulkCreate', count: toCreate.length });
    }
  }

  if (toUpdate.length > 0) {
    try {
      await base44.entities.IndicatorActualSnapshot.bulkUpdate(toUpdate);
      for (const u of toUpdate) {
        const idx = updatedSnapshots.findIndex(s => s.id === u.id);
        if (idx >= 0) updatedSnapshots[idx] = { ...updatedSnapshots[idx], ...u };
      }
      report.updated = toUpdate.length;
    } catch (e) {
      report.errors.push({ error: e.message, context: 'bulkUpdate', count: toUpdate.length });
    }
  }

  return { report, snapshots: updatedSnapshots, valueMap, calcStatus };
}

// ─── Reparação idempotente de indicadores calculados existentes ────────────────────────────────
// Carrega snapshots do banco, recalcula e persiste. Usado ao abrir a aba e pelo botão Recalcular.
export async function repairActualCalculatedIndicators({ clientId, referenceYear, viewType, indicators, cycleId, userName = 'Sistema MX' }) {
  const snapshots = await base44.entities.IndicatorActualSnapshot.filter({
    client_account_id: clientId,
    reference_year: Number(referenceYear),
    view_type: viewType,
  }).catch(() => []);

  return persistActualCalculations({
    clientId,
    cycleId: cycleId || snapshots[0]?.strategic_plan_cycle_id,
    referenceYear,
    viewType,
    snapshots,
    indicators,
    userName,
  });
}

// Calcular valor anual para o Realizado
export function computeActualAnnualValue(code, valueMap, indicators) {
  const ind = indicators.find(i => i.code === code);
  const policy = ACTUAL_ANNUAL_AGG[code] || ind?.annual_aggregation || 'SUM_MONTHS';
  const annualFormula = ACTUAL_ANNUAL_FORMULA[code] || ind?.annual_formula;
  const vals = valueMap[code] || {};
  const monthly = Object.values(vals).filter(v => v != null);
  if (monthly.length === 0) return null;
  return calculateAnnualValue(monthly, policy, annualFormula, valueMap, valueMap);
}

// Agrupar indicadores do Realizado por departamento (ordenado pela Ordem Oficial global)
// CORREÇÃO: usa o roster do Plano (targets) em vez de listas hard-coded
// Garante que todos os indicadores vinculados ao Plano apareçam em Realizado/Ano Anterior
export function getActualIndicatorsByDept(indicators, targets) {
  const byDept = {};
  if (!targets || targets.length === 0) return byDept;
  for (const t of targets) {
    const ind = indicators.find(i => i.id === t.indicator_definition_id);
    if (!ind) continue;
    const dept = ind.department || 'OPERACOES';
    if (!byDept[dept]) byDept[dept] = [];
    byDept[dept].push(ind);
  }
  for (const dept of Object.keys(byDept)) {
    byDept[dept].sort((a, b) =>
      (a.global_display_order ?? 999) - (b.global_display_order ?? 999) ||
      (a.department_display_order ?? 99) - (b.department_display_order ?? 99)
    );
  }
  return byDept;
}

// Contar progresso do Realizado — por competência selecionada (mês específico)
// CORREÇÃO: total manual vem do roster do Plano (não de lista fixa)
export function computeActualProgress(snapshots, viewType, selectedMonth, manualTotal) {
  const manualSnapshots = snapshots.filter(s =>
    isActualManual(s.indicator_code) && (selectedMonth ? s.month === selectedMonth : true)
  );
  const filled = new Set();
  for (const s of manualSnapshots) {
    if (s.effective_value != null || s.manual_value != null) {
      filled.add(s.indicator_code);
    }
  }
  return { filled: filled.size, total: manualTotal ?? ACTUAL_MANUAL_CODES.length };
}

// Calcular valor acumulado até um mês específico (para coluna "Acumulado até [mês]")
export function computeActualAccumulatedUntilMonth(code, valueMap, indicators, untilMonth) {
  const ind = indicators.find(i => i.code === code);
  const policy = ACTUAL_ANNUAL_AGG[code] || ind?.annual_aggregation || 'SUM_MONTHS';
  const annualFormula = ACTUAL_ANNUAL_FORMULA[code] || ind?.annual_formula;
  const vals = valueMap[code] || {};

  if ((policy === 'RECALCULATE_FROM_ANNUAL_BASES' || policy === 'RECALCULATE_FROM_LAST_PERIOD_BASES') && annualFormula) {
    let expr = annualFormula;
    expr = expr.replace(/SUM_ANNUAL\("([^"]+)"\)/g, (_, depCode) => {
      let sum = 0, hasVal = false;
      for (let m = 1; m <= untilMonth; m++) { const v = valueMap[depCode]?.[m]; if (v != null && !isNaN(v)) { sum += v; hasVal = true; } }
      return hasVal ? String(sum) : 'null';
    });
    expr = expr.replace(/AVG_ANNUAL\("([^"]+)"\)/g, (_, depCode) => {
      const vs = [];
      for (let m = 1; m <= untilMonth; m++) { const v = valueMap[depCode]?.[m]; if (v != null && !isNaN(v)) vs.push(v); }
      return vs.length > 0 ? String(vs.reduce((s, v) => s + v, 0) / vs.length) : 'null';
    });
    expr = expr.replace(/LAST_ANNUAL\("([^"]+)"\)/g, (_, depCode) => {
      let lastVal = null;
      for (let m = 1; m <= untilMonth; m++) { const v = valueMap[depCode]?.[m]; if (v != null && !isNaN(v)) lastVal = v; }
      return lastVal != null ? String(lastVal) : 'null';
    });
    if (expr.includes('null')) return null;
    try { const result = Function('"use strict"; return (' + expr + ')')(); return isFinite(result) ? result : null; } catch { return null; }
  }

  const monthly = [];
  for (let m = 1; m <= untilMonth; m++) { const v = vals[m]; if (v != null && !isNaN(v)) monthly.push(v); }
  if (monthly.length === 0) return null;

  if (policy === 'AVERAGE_MONTHS') return monthly.reduce((s, v) => s + v, 0) / monthly.length;
  if (policy === 'LAST_VALID_MONTH') return monthly[monthly.length - 1];
  return monthly.reduce((s, v) => s + v, 0);
}

// Resolver mês padrão para a competência (M-1 ou último sem resultado para planos passados)
export function resolveDefaultMonth(snapshots, referenceYear, viewType, competence) {
  if (competence.isPlanPastYear) {
    for (let m = 12; m >= 1; m--) {
      const hasAny = snapshots.some(s =>
        isActualManual(s.indicator_code) &&
        s.month === m &&
        (s.effective_value != null || s.manual_value != null)
      );
      if (!hasAny) return m;
    }
    return 12;
  }
  return viewType === 'ACTUAL' ? competence.targetActualMonth : competence.previousYearMonth;
}
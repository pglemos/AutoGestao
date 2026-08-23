import { supabase } from "@/lib/supabase";
import { actionPlanLiveRepository } from "@/components/owner/actionplan/actionPlanLiveRepository";
import { strategicIndicatorCatalog } from "./strategicIndicatorCatalog";
import {
  MONTHS,
  SELECTED_MONTH_INDEX,
  REFERENCE_YEAR,
  calculatePercentageOfTarget,
  calculateVariation,
  consolidateValues,
  formatCellValue,
  getConsolidatedLabel,
  resolveDefaultSelectedMonthIndex,
} from "./strategicUtils";

const CHECKIN_SELECT = "reference_date,submission_status,metric_scope,leads_prev_day,agd_cart_prev_day,agd_net_prev_day,vnd_porta_prev_day,vnd_cart_prev_day,vnd_net_prev_day,visit_prev_day";

const EMPTY_BY_MONTH = () => Array(12).fill(null);

function monthIndex(value) {
  const month = Number(String(value || "").slice(5, 7));
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month - 1 : null;
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowsByMonth(rows, selector, year) {
  const values = Array(12).fill(0);
  const seen = new Set();
  for (const row of rows || []) {
    if (String(row.reference_date || "").slice(0, 4) !== String(year)) continue;
    const index = monthIndex(row.reference_date);
    if (index === null) continue;
    values[index] += numberValue(selector(row));
    seen.add(index);
  }
  return values.map((value, index) => (seen.has(index) ? value : null));
}

function distinctSellersByMonth(rows, year) {
  const sellers = Array.from({ length: 12 }, () => new Set());
  for (const row of rows || []) {
    if (String(row.reference_date || "").slice(0, 4) !== String(year)) continue;
    const index = monthIndex(row.reference_date);
    if (index !== null && row.seller_user_id) sellers[index].add(row.seller_user_id);
  }
  return sellers.map((set) => (set.size ? set.size : null));
}

export function sumSeries(...series) {
  const length = Math.max(0, ...series.map((values) => values?.length || 0));
  return Array.from({ length }, (_, index) => (
    series.reduce((sum, values) => sum + numberValue(values?.[index]), 0)
  ));
}

function currentMonthIndex(year, now = new Date()) {
  return resolveDefaultSelectedMonthIndex(year, now);
}

function maskFuture(values, year, now = new Date()) {
  const selected = currentMonthIndex(year, now);
  return values.map((value, index) => (index > selected ? null : value));
}

function deriveValues(rows, year, inventoryRows) {
  const salesPorta = rowsByMonth(rows, (row) => row.vnd_porta_prev_day, year);
  const salesCart = rowsByMonth(rows, (row) => row.vnd_cart_prev_day, year);
  const salesNet = rowsByMonth(rows, (row) => row.vnd_net_prev_day, year);
  const salesTotal = sumSeries(salesPorta, salesCart, salesNet);
  const leads = rowsByMonth(rows, (row) => row.leads_prev_day, year);
  const appointments = sumSeries(
    rowsByMonth(rows, (row) => row.agd_cart_prev_day, year),
    rowsByMonth(rows, (row) => row.agd_net_prev_day, year),
  );
  const visits = rowsByMonth(rows, (row) => row.visit_prev_day, year);
  const sellers = distinctSellersByMonth(rows, year);
  const inventoryByMonth = Array(12).fill(null);
  const agingByMonth = Array(12).fill(null);
  const activeByMonth = Array(12).fill(null);
  for (const row of inventoryRows || []) {
    const index = monthIndex(row.reference_month);
    if (index === null) continue;
    inventoryByMonth[index] = numberValue(row.total_stock ?? row.active_stock);
    activeByMonth[index] = numberValue(row.active_stock ?? row.total_stock);
    agingByMonth[index] = numberValue(row.percent_over_90_days);
  }

  const average = (numerator, denominator) => numerator.map((value, index) => (
    value == null || !denominator[index] ? null : value / denominator[index]
  ));
  const percentage = (numerator, denominator) => numerator.map((value, index) => (
    value == null || !denominator[index] ? null : (value / denominator[index]) * 100
  ));

  return {
    "SP-001": salesTotal,
    "SP-002": salesPorta,
    "SP-004": salesCart,
    "SP-006": salesNet,
    "SP-008": sellers,
    "SP-009": average(salesTotal, sellers),
    "SP-010": average(leads, sellers),
    "SP-017": appointments,
    "SP-018": visits,
    "SP-020": percentage(appointments, leads),
    "SP-021": percentage(visits, appointments),
    "SP-022": percentage(salesTotal, visits),
    "SP-023": leads,
    "SP-030": activeByMonth,
    "SP-031": inventoryByMonth,
    "SP-033": agingByMonth,
  };
}

function buildSeries(indicator, currentValues, previousValues, monthlyGoal, year) {
  const metric = String(indicator.metricCode || indicator.code || indicator.id || "")
  const isSalesTotal = indicator.id === "SP-001"
    || ["SALES_TOTAL", "sales_total"].includes(metric)
  const targetValues = isSalesTotal && monthlyGoal != null
    ? Array(12).fill(numberValue(monthlyGoal))
    : EMPTY_BY_MONTH();
  const actual = currentValues || EMPTY_BY_MONTH();
  const previous = previousValues || EMPTY_BY_MONTH();
  return {
    ...indicator,
    targetValues,
    currentValues: maskFuture(actual, year),
    previousYearValues: previous,
  };
}

function blankSeries(indicator) {
  return buildSeries(indicator, EMPTY_BY_MONTH(), EMPTY_BY_MONTH(), null, REFERENCE_YEAR);
}

class StrategicPlanLiveRepository {
  constructor() {
    this.cache = null;
    this.preferences = {};
  }

  async load({ storeId, year = REFERENCE_YEAR } = {}) {
    if (!storeId) {
      this.cache = { storeId: null, year, series: new Map(), actions: [], error: null };
      return this.cache;
    }

    const previousYear = year - 1;
    const [goalResult, currentResult, previousResult, inventoryResult, actionsResult] = await Promise.all([
      supabase.from("regras_metas_loja").select("monthly_goal").eq("store_id", storeId).maybeSingle(),
      supabase.rpc("get_lancamentos_por_loja_periodo", {
        p_store_id: storeId,
        p_start_date: `${year}-01-01`,
        p_end_date: `${year}-12-31`,
        p_scope: "daily",
      }),
      supabase.rpc("get_lancamentos_por_loja_periodo", {
        p_store_id: storeId,
        p_start_date: `${previousYear}-01-01`,
        p_end_date: `${previousYear}-12-31`,
        p_scope: "daily",
      }),
      supabase.from("veiculos_estoque").select("status,data_entrada").eq("loja_id", storeId),
      actionPlanLiveRepository.getActions({ storeId }).catch(() => []),
    ]);

    const error = goalResult.error || currentResult.error || previousResult.error || inventoryResult.error;
    if (error) throw error;

    const currentRows = currentResult.data || [];
    const previousRows = previousResult.data || [];
    const inventoryRows = inventoryResult.data || [];
    const activeInventory = inventoryRows.filter((row) => row.status !== "vendido");
    const agedInventory = activeInventory.filter((row) => {
      if (!row.data_entrada) return false;
      const enteredAt = new Date(`${row.data_entrada}T12:00:00`);
      return Number.isFinite(enteredAt.getTime()) && (Date.now() - enteredAt.getTime()) / 86400000 > 90;
    });
    const liveInventorySnapshot = currentMonthIndex(year) >= 0 ? [{
      reference_month: `${year}-${String(currentMonthIndex(year) + 1).padStart(2, "0")}-01`,
      total_stock: activeInventory.length,
      active_stock: activeInventory.filter((row) => row.status === "disponivel").length,
      percent_over_90_days: activeInventory.length ? (agedInventory.length / activeInventory.length) * 100 : 0,
    }] : [];
    const currentValues = deriveValues(currentRows, year, liveInventorySnapshot);
    const previousValues = deriveValues(previousRows, previousYear, []);
    const series = new Map();
    for (const indicator of strategicIndicatorCatalog) {
      series.set(indicator.id, buildSeries(
        indicator,
        currentValues[indicator.id],
        previousValues[indicator.id],
        goalResult.data?.monthly_goal ?? null,
        year,
      ));
    }
    this.cache = { storeId, year, series, actions: actionsResult, error: null };
    return this.cache;
  }

  getIndicatorCatalog() { return strategicIndicatorCatalog; }

  getIndicatorById(id) { return strategicIndicatorCatalog.find((indicator) => indicator.id === id) || null; }

  getIndicatorSeries(indicatorId) {
    return this.cache?.series?.get(indicatorId) || blankSeries(this.getIndicatorById(indicatorId));
  }

  getOverviewData() {
    return strategicIndicatorCatalog.map((indicator) => this.getIndicatorSeries(indicator.id));
  }

  getActionItems(indicatorId) {
    return (this.cache?.actions || []).filter((action) => !indicatorId || action.indicator === indicatorId);
  }

  getTargetHistory() { return []; }

  async updateTargets(indicatorId, _year, values) {
    const metric = this.getIndicatorById(indicatorId)?.metricCode || indicatorId;
    const isSalesTotal = ["SP-001", "SALES_TOTAL", "sales_total"].includes(indicatorId) || ["SALES_TOTAL", "sales_total"].includes(metric);
    if (!isSalesTotal) {
      throw new Error("Este indicador ainda não possui meta persistida para a unidade selecionada.");
    }
    const normalized = values.map((value) => Number(value));
    if (!normalized.every(Number.isFinite) || new Set(normalized).size !== 1) {
      throw new Error("A meta de vendas da unidade é mensal e deve ter o mesmo valor nos 12 meses.");
    }
    if (!this.cache?.storeId) throw new Error("Nenhuma unidade selecionada para atualizar a meta.");
    const { error } = await supabase.from("regras_metas_loja").upsert({
      store_id: this.cache.storeId,
      monthly_goal: normalized[0],
    }, { onConflict: "store_id" });
    if (error) throw error;
    await this.load({ storeId: this.cache.storeId, year: this.cache.year });
  }

  async createActionItem(payload) {
    if (!this.cache?.storeId) throw new Error("Nenhuma unidade selecionada para criar a ação.");
    const action = await actionPlanLiveRepository.createAction({
      title: payload.action,
      description: payload.note || payload.problem || null,
      problemOrOpportunity: payload.problem,
      indicator: payload.indicatorId || "Plano Estratégico",
      department: payload.area || "general",
      responsible: payload.responsible,
      dueDate: payload.deadline,
      priority: payload.priority,
      origin: "strategic_plan",
      createdBy: payload.createdBy,
    }, { storeId: this.cache.storeId });
    this.cache.actions = [action, ...(this.cache.actions || [])].filter(Boolean);
    return action;
  }

  restoreHistoryVersion() { throw new Error("O histórico de metas ainda não possui contrato persistido para este indicador."); }

  exportIndicatorData(indicatorId, year = REFERENCE_YEAR) {
    const series = this.getIndicatorSeries(indicatorId);
    if (!series) return "";
    const { targetValues, currentValues, previousYearValues, displayFormat, decimalPlaces, aggregationMode } = series;
    const consTarget = consolidateValues(targetValues, aggregationMode, SELECTED_MONTH_INDEX);
    const consCurrent = consolidateValues(currentValues, aggregationMode, SELECTED_MONTH_INDEX);
    const consPrevious = consolidateValues(previousYearValues, aggregationMode, SELECTED_MONTH_INDEX);
    const pctValues = currentValues.map((value, index) => (value != null && targetValues[index] ? calculatePercentageOfTarget(value, targetValues[index]) : null));
    const varValues = currentValues.map((value, index) => (value != null ? calculateVariation(value, previousYearValues[index]) : null));
    const rows = [
      ["Código", "Indicador", "Área", "Direção", "Série", ...MONTHS, getConsolidatedLabel(aggregationMode, SELECTED_MONTH_INDEX)],
      ["Meta", series.name, series.area, series.direction, "Meta", ...targetValues, consTarget],
      ["Resultado Atual", series.name, series.area, series.direction, "Resultado Atual", ...currentValues, consCurrent],
      ["% da Meta", series.name, series.area, series.direction, "% da Meta", ...pctValues, consCurrent != null && consTarget ? calculatePercentageOfTarget(consCurrent, consTarget) : null],
      ["Ano Anterior", series.name, series.area, series.direction, "Ano Anterior", ...previousYearValues, consPrevious],
      ["Variação", series.name, series.area, series.direction, "Variação", ...varValues, consCurrent != null && consPrevious ? calculateVariation(consCurrent, consPrevious) : null],
    ];
    return rows.map((row) => row.map((value, index) => {
      const formatted = index < 5 || value == null ? (value == null ? "—" : value) : formatCellValue(value, index === 5 + 12 ? displayFormat : displayFormat, decimalPlaces);
      return `"${String(formatted).replaceAll('"', '""')}"`;
    }).join(";")).join("\n");
  }

  exportOverviewData() {
    return this.getOverviewData().map((series) => [series.code, series.name, series.area, ...series.targetValues].join(";")).join("\n");
  }

  getPreferences() { return this.preferences; }
  setPreferences(prefs) { this.preferences = { ...this.preferences, ...prefs }; }
}

export const strategicPlanRepository = new StrategicPlanLiveRepository();

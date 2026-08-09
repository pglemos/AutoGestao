// Utilitários do Plano Estratégico: formatação, cálculos, estilos e constantes.
import { formatBRL, formatNumber, formatPercent } from "@/features/owner/lib/ownerFormatters";

export const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
export const SELECTED_MONTH_INDEX = 6; // Julho
export const REFERENCE_YEAR = 2026;

export const VIEW_OPTIONS = [
  { value: "meta", label: "Meta" },
  { value: "realizado", label: "Resultado Atual" },
  { value: "ano_anterior", label: "Ano Anterior" },
];

export const DISPLAY_MODES = [
  { value: "both", label: "Ambos" },
  { value: "table", label: "Tabela" },
  { value: "chart", label: "Gráfico" },
];

export const AREA_STYLES = {
  Vendas: { bg: "bg-violet-50", text: "text-violet-700", iconBg: "bg-violet-100 text-violet-600", dot: "bg-violet-500", border: "border-violet-200", hex: "#7C3AED", lightBg: "bg-violet-50/50" },
  Marketing: { bg: "bg-indigo-50", text: "text-indigo-700", iconBg: "bg-indigo-100 text-indigo-600", dot: "bg-indigo-500", border: "border-indigo-200", hex: "#4F46E5", lightBg: "bg-indigo-50/50" },
  Estoque: { bg: "bg-blue-50", text: "text-blue-700", iconBg: "bg-blue-100 text-blue-600", dot: "bg-blue-500", border: "border-blue-200", hex: "#2563EB", lightBg: "bg-blue-50/50" },
  Financeiro: { bg: "bg-emerald-50", text: "text-emerald-700", iconBg: "bg-emerald-100 text-emerald-600", dot: "bg-emerald-500", border: "border-emerald-200", hex: "#16A34A", lightBg: "bg-emerald-50/50" },
  Operacional: { bg: "bg-orange-50", text: "text-orange-700", iconBg: "bg-orange-100 text-orange-600", dot: "bg-orange-500", border: "border-orange-200", hex: "#F97316", lightBg: "bg-orange-50/50" },
};

export const AREA_HEX = Object.fromEntries(
  Object.entries(AREA_STYLES).map(([k, v]) => [k, v.hex])
);

export const CARD_ICON_STYLES = {
  green: "bg-emerald-100 text-emerald-600",
  purple: "bg-violet-100 text-violet-600",
  orange: "bg-indigo-100 text-indigo-600",
  blue: "bg-blue-100 text-blue-600",
  teal: "bg-orange-100 text-orange-600",
};

export const SPARK_COLORS = {
  green: "text-emerald-500",
  purple: "text-violet-500",
  orange: "text-indigo-500",
  blue: "text-blue-500",
  teal: "text-orange-500",
};

export const STATUS_STYLES = {
  good: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Bom" },
  attention: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Atenção" },
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Crítico" },
  neutral: { bg: "bg-slate-100", text: "text-slate-500", border: "border-slate-200", label: "Sem dados" },
};

export function formatCellValue(value, format, decimalPlaces = 0) {
  if (value === null || value === undefined || value === "—") return "—";
  switch (format) {
    case "integer":
      return formatNumber(value, 0);
    case "decimal":
      return formatNumber(value, decimalPlaces);
    case "percentage":
      return formatPercent(value, decimalPlaces);
    case "currency":
      return formatBRL(value);
    case "rating":
      return formatNumber(value, 1);
    default:
      return String(value);
  }
}

export function normalizeText(text) {
  return (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function calculatePercentageOfTarget(current, target) {
  if (current === null || current === undefined || current === "—") return null;
  if (!target || target === 0) return null;
  return (current / target) * 100;
}

export function calculateVariation(current, previous) {
  if (current === null || current === undefined || current === "—") return null;
  if (previous === null || previous === undefined || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function getStatusFromPercentage(percentage, direction) {
  if (percentage === null || percentage === undefined || isNaN(percentage)) return "neutral";
  if (direction === "increase") {
    if (percentage >= 100) return "good";
    if (percentage >= 90) return "attention";
    return "critical";
  } else {
    if (percentage <= 100) return "good";
    if (percentage <= 110) return "attention";
    return "critical";
  }
}

export function consolidateValues(values, aggregationMode, selectedIndex) {
  if (!values || values.length === 0) return null;
  const slice = values.slice(0, selectedIndex + 1);
  const valid = slice.filter((v) => v !== null && v !== undefined && v !== "—");
  if (valid.length === 0) return null;

  switch (aggregationMode) {
    case "sum":
      return valid.reduce((a, b) => a + b, 0);
    case "average":
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    case "last":
      return valid[valid.length - 1];
    default:
      return null;
  }
}

export function getConsolidatedLabel(aggregationMode, selectedIndex) {
  const monthName = MONTHS_FULL[selectedIndex];
  switch (aggregationMode) {
    case "sum":
      return `Acumulado até ${monthName}`;
    case "average":
      return `Média até ${monthName}`;
    case "last":
      return "Último valor";
    default:
      return "Consolidado";
  }
}

export function formatVariation(variation) {
  if (variation === null || variation === undefined) return "—";
  const sign = variation > 0 ? "+" : "";
  return `${sign}${formatPercent(variation, 1)}`;
}

// Utilitários do Plano Estratégico: formatação, cálculos, estilos e constantes.
import { formatBRL, formatNumber, formatPercent } from "@/features/owner/lib/ownerFormatters";
import { chartTokens } from "@/lib/charts/tokens";

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
  Vendas: { bg: "bg-status-info-surface", text: "text-status-info-text", iconBg: "bg-status-info-surface text-status-info-text", dot: "bg-status-info", border: "border-status-info/30", hex: chartTokens.info(), lightBg: "bg-status-info-surface/50" },
  Marketing: { bg: "bg-status-info-surface", text: "text-status-info-text", iconBg: "bg-status-info-surface text-status-info-text", dot: "bg-status-info", border: "border-status-info/30", hex: "#4F46E5", lightBg: "bg-status-info-surface/50" },
  Estoque: { bg: "bg-status-info-surface", text: "text-status-info-text", iconBg: "bg-status-info-surface text-status-info-text", dot: "bg-status-info", border: "border-status-info/30", hex: "#2563EB", lightBg: "bg-status-info-surface/50" },
  Financeiro: { bg: "bg-status-success-surface", text: "text-status-success-text", iconBg: "bg-status-success-surface text-status-success-text", dot: "bg-status-success", border: "border-status-success/30", hex: "#16A34A", lightBg: "bg-status-success-surface/50" },
  Operacional: { bg: "bg-status-warning-surface", text: "text-status-warning-text", iconBg: "bg-status-warning-surface text-status-warning-text", dot: "bg-status-warning", border: "border-status-warning/30", hex: "#F97316", lightBg: "bg-status-warning-surface/50" },
};

export const AREA_HEX = Object.fromEntries(
  Object.entries(AREA_STYLES).map(([k, v]) => [k, v.hex])
);

export const CARD_ICON_STYLES = {
  green: "bg-status-success-surface text-status-success-text",
  purple: "bg-status-info-surface text-status-info-text",
  orange: "bg-status-info-surface text-status-info-text",
  blue: "bg-status-info-surface text-status-info-text",
  teal: "bg-status-warning-surface text-status-warning-text",
};

export const SPARK_COLORS = {
  green: "text-status-success-text",
  purple: "text-status-info-text",
  orange: "text-status-info",
  blue: "text-status-info-text",
  teal: "text-status-warning-text",
};

export const STATUS_STYLES = {
  good: { bg: "bg-status-success-surface", text: "text-status-success-text", border: "border-status-success/30", label: "Bom" },
  attention: { bg: "bg-status-warning-surface", text: "text-status-warning-text", border: "border-status-warning/30", label: "Atenção" },
  critical: { bg: "bg-status-error-surface", text: "text-status-error-text", border: "border-status-error/30", label: "Crítico" },
  neutral: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: "Sem dados" },
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

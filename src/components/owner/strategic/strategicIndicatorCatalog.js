// Metadados de apresentação do Plano Estratégico.
// Valores, metas e resultados são carregados pelo repositório Supabase em
// strategicPlanLiveRepository; este catálogo não contém dados de negócio.
import { CENTRAL_MX_PLANNING_INDICATORS } from "@/lib/central-mx-engine";

const AREA_LABELS = {
  comercial: "Vendas",
  marketing: "Marketing",
  produto: "Estoque",
  financeiro: "Financeiro",
  rh: "Operacional",
  operacional: "Operacional",
};

const DISPLAY_FORMATS = {
  currency: "currency",
  percent: "percentage",
  number: "integer",
  days: "decimal",
  score: "rating",
};

const UNIT_LABELS = {
  currency: "R$",
  percent: "%",
  number: "unidades",
  days: "dias",
  score: "pontos",
};

export const strategicIndicatorCatalog = CENTRAL_MX_PLANNING_INDICATORS.map((definition, index) => ({
  id: `SP-${String(index + 1).padStart(3, "0")}`,
  code: `SP-${String(index + 1).padStart(3, "0")}`,
  metricCode: definition.code,
  name: definition.label,
  area: AREA_LABELS[definition.department] || definition.department,
  direction: definition.targetDirection === "higher" ? "increase" : "decrease",
  sourceType: "MX",
  displayFormat: DISPLAY_FORMATS[definition.unit] || "integer",
  aggregationMode: definition.unit === "number" ? "sum" : "average",
  unitLabel: UNIT_LABELS[definition.unit] || "—",
  decimalPlaces: definition.unit === "percent" || definition.unit === "score" ? 1 : 0,
  targetValues: Array(12).fill(null),
  active: true,
}));

export const AREA_LIST = ["Vendas", "Marketing", "Estoque", "Financeiro", "Operacional"];

export const AREA_INDICATOR_COUNTS = AREA_LIST.reduce((acc, area) => {
  acc[area] = strategicIndicatorCatalog.filter((indicator) => indicator.area === area).length;
  return acc;
}, {});

export const DIRECTION_LABELS = { increase: "Aumentar", decrease: "Diminuir" };
export const AGGREGATION_LABELS = { sum: "Soma", average: "Média", last: "Último valor" };
export const FORMAT_LABELS = { integer: "Inteiro", decimal: "Decimal", percentage: "Percentual", currency: "Moeda", rating: "Avaliação" };

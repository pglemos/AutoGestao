// Leitura executiva do indicador — texto determinístico baseado nos dados.
import { ShoppingCart, Megaphone, Package, Wallet, Settings, BookOpen } from "lucide-react";
import { formatCellValue, calculatePercentageOfTarget, consolidateValues, SELECTED_MONTH_INDEX, REFERENCE_YEAR, MONTHS_FULL, AREA_STYLES, isActualMonthClosed } from "./strategicUtils";

const AREA_ICONS = {
  Vendas: ShoppingCart,
  Marketing: Megaphone,
  Estoque: Package,
  Financeiro: Wallet,
  Operacional: Settings,
};

export default function StrategicIndicatorReading({ series, monthIndex = SELECTED_MONTH_INDEX, year = REFERENCE_YEAR }) {
  if (!series) return null;
  const { targetValues, currentValues, previousYearValues, displayFormat, decimalPlaces, direction, aggregationMode, unitLabel, area } = series;
  const areaStyle = AREA_STYLES[area] || {};
  const AreaIcon = AREA_ICONS[area] || BookOpen;
  const idx = monthIndex;
  const meta = targetValues[idx];
  const resultado = currentValues[idx];
  const pct = calculatePercentageOfTarget(resultado, meta);

  const consCurrent = consolidateValues(currentValues, aggregationMode, idx);
  const consTarget = consolidateValues(targetValues, aggregationMode, idx);

  const fmt = (v) => formatCellValue(v, displayFormat, decimalPlaces);

  let mainText = "";
  let distanceText = "";
  if (!isActualMonthClosed(idx, year)) {
    mainText = `A competência de ${MONTHS_FULL[idx]} ainda não encerrada. A meta pode aparecer; o resultado atual e o % da meta ficam indisponíveis até o fechamento.`;
  } else if (resultado === null) {
    mainText = "Ainda não há resultado registrado para este indicador no período.";
  } else if (meta === 0) {
    mainText = "Este indicador ainda não possui uma meta definida para o período.";
  } else if (direction === "increase") {
    if (pct >= 100) {
      mainText = `O resultado alcançou ${formatCellValue(pct, "percentage", 1)} da meta e está dentro do esperado para o período.`;
    } else {
      const diff = meta - resultado;
      mainText = `O resultado de ${fmt(resultado)} representa ${formatCellValue(pct, "percentage", 1)} da meta de ${fmt(meta)}.`;
      distanceText = ` Faltam ${fmt(diff)} para alcançar o objetivo do mês.`;
    }
  } else {
    if (pct <= 100) {
      mainText = `O resultado de ${fmt(resultado)} está dentro do limite planejado de ${fmt(meta)} e apresenta situação favorável.`;
    } else {
      const excess = ((resultado - meta) / meta) * 100;
      mainText = `O resultado de ${fmt(resultado)} está ${formatCellValue(excess, "percentage", 1)} acima do limite planejado de ${fmt(meta)}.`;
    }
  }

  let accumText = "";
  if (consCurrent !== null && consTarget !== null) {
    accumText = ` No acumulado até ${MONTHS_FULL[idx]}, o resultado é ${fmt(consCurrent)}, diante de uma meta acumulada de ${fmt(consTarget)}.`;
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${areaStyle.iconBg || "bg-muted"}`}>
          <AreaIcon className="h-4 w-4" />
        </div>
        <h4 className="text-sm font-semibold text-foreground">Leitura do indicador</h4>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {mainText}
        {distanceText}
        {accumText}
      </p>
    </div>
  );
}
// Faixa horizontal de resumo do indicador: identidade + 4 métricas.
import { Target, TrendingUp, Percent, ArrowLeftRight, ShoppingCart, Megaphone, Package, Wallet, Settings } from "lucide-react";
import { formatCellValue, calculatePercentageOfTarget, calculateVariation, getStatusFromPercentage, STATUS_STYLES, AREA_STYLES, SELECTED_MONTH_INDEX, REFERENCE_YEAR, formatVariation, isActualMonthClosed } from "./strategicUtils";
import { DIRECTION_LABELS } from "./strategicIndicatorCatalog";

const AREA_ICONS = {
  Vendas: ShoppingCart,
  Marketing: Megaphone,
  Estoque: Package,
  Financeiro: Wallet,
  Operacional: Settings,
};

function MetricBlock({ icon: Icon, label, value, complement, status }) {
  const statusStyle = status ? STATUS_STYLES[status] : null;
  return (
    <div className="flex flex-col justify-center px-4">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{value}</p>
      <div className="mt-0.5">
        {statusStyle ? (
          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
        ) : (
          complement && <span className="text-xs text-muted-foreground">{complement}</span>
        )}
      </div>
    </div>
  );
}

export default function StrategicIndicatorSummaryCards({ series, monthIndex = SELECTED_MONTH_INDEX, year = REFERENCE_YEAR }) {
  if (!series) return null;
  const { targetValues, currentValues, previousYearValues, displayFormat, decimalPlaces, direction, area, name, code } = series;
  const idx = monthIndex;
  const areaStyle = AREA_STYLES[area] || {};
  const AreaIcon = AREA_ICONS[area] || Target;

  const monthClosed = isActualMonthClosed(idx, year);
  const meta = targetValues[idx];
  const resultado = monthClosed ? currentValues[idx] : null;
  const anoAnterior = previousYearValues[idx];
  const resultadoLabel = !monthClosed ? "Competência ainda não encerrada" : resultado !== null ? formatCellValue(resultado, displayFormat, decimalPlaces) : "—";

  const pct = calculatePercentageOfTarget(resultado, meta);
  const atingimentoLabel = !monthClosed ? "Indisponível" : pct !== null ? formatCellValue(pct, "percentage", 1) : "—";
  const status = pct !== null ? getStatusFromPercentage(pct, direction) : "neutral";
  const statusStyle = STATUS_STYLES[status];

  const variacao = calculateVariation(resultado, anoAnterior);
  const variacaoStatus = variacao !== null ? getStatusFromPercentage(direction === "increase" ? 100 + variacao : 100 - variacao, direction) : "neutral";

  // Distância para a meta
  let distanceText = "";
  if (resultado !== null && meta && direction === "increase") {
    const diff = meta - resultado;
    distanceText = diff > 0 ? `${formatCellValue(Math.abs(diff), displayFormat, decimalPlaces)} abaixo` : `${formatCellValue(Math.abs(diff), displayFormat, decimalPlaces)} acima`;
  } else if (resultado !== null && meta && direction === "decrease") {
    const diff = resultado - meta;
    distanceText = diff > 0 ? `${formatCellValue(Math.abs(diff), displayFormat, decimalPlaces)} acima` : `${formatCellValue(Math.abs(diff), displayFormat, decimalPlaces)} abaixo`;
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-border bg-card shadow-sm ${areaStyle.border || ""}`}>
      <div className={`h-1 ${areaStyle.dot || "bg-muted"}`} />
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        {/* Lado esquerdo: identidade */}
        <div className="flex items-center gap-3 border-b border-border p-4 lg:border-b-0 lg:border-r lg:min-w-[260px]">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${areaStyle.iconBg || "bg-muted"}`}>
            <AreaIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${areaStyle.bg || "bg-muted"} ${areaStyle.text || "text-muted-foreground"}`}>{area}</span>
              <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground">{DIRECTION_LABELS[direction]}</span>
              <span className="text-xs text-muted-foreground">{code}</span>
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
            </div>
          </div>
        </div>

        {/* Lado direito: 4 métricas */}
        <div className="flex flex-1 flex-col divide-y divide-border sm:grid sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <MetricBlock icon={Target} label="Meta do mês" value={formatCellValue(meta, displayFormat, decimalPlaces)} complement={displayFormat === "currency" ? "" : `em ${series.unitLabel}`} />
          <MetricBlock icon={TrendingUp} label="Resultado do mês" value={resultadoLabel} complement={resultado !== null ? `em ${series.unitLabel}` : (!monthClosed ? "Mês ainda aberto" : "Sem resultado")} />
          <MetricBlock icon={Percent} label="Atingimento" value={atingimentoLabel} status={pct !== null ? status : "neutral"} complement={distanceText || (pct !== null ? "da meta" : (!monthClosed ? "Aguarde o encerramento" : "Sem meta"))} />
          <MetricBlock icon={ArrowLeftRight} label="Variação vs. ano anterior" value={formatVariation(variacao)} status={variacao !== null ? variacaoStatus : "neutral"} complement={variacao !== null ? "vs. ano anterior" : "Sem dados"} />
        </div>
      </div>
    </div>
  );
}
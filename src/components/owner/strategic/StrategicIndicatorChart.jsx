// Gráfico de linhas: Meta (tracejada), Resultado Atual (cor da área + área preenchida), Ano Anterior.
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { MONTHS, SELECTED_MONTH_INDEX, REFERENCE_YEAR, formatCellValue, calculatePercentageOfTarget, getStatusFromPercentage, STATUS_STYLES, AREA_HEX } from "./strategicUtils";
import { chartTokens } from "@/lib/charts/tokens"

const META_COLOR = chartTokens.info();
const ANTERIOR_COLOR = chartTokens.warning();

const SERIES_LABELS = {
  meta: "Meta",
  atual: "Resultado Atual",
  anterior: "Ano Anterior",
};

function ChartTooltip({ active, payload, label, displayFormat, decimalPlaces, series }) {
  if (!active || !payload || !payload.length) return null;
  const idx = MONTHS.indexOf(label);
  const meta = series.targetValues[idx];
  const atual = series.currentValues[idx];
  const anterior = series.previousYearValues[idx];
  const pct = calculatePercentageOfTarget(atual, meta);
  const status = pct !== null ? getStatusFromPercentage(pct, series.direction) : null;
  const statusStyle = status ? STATUS_STYLES[status] : null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      {payload.map((p) => {
        if (p.value === null || p.value === undefined) return null;
        return (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{SERIES_LABELS[p.dataKey]}:</span>
            <span className="font-medium text-foreground">{formatCellValue(p.value, displayFormat, decimalPlaces)}</span>
          </div>
        );
      })}
      {statusStyle && pct !== null && (
        <div className="mt-1.5 flex items-center gap-1.5 border-t border-border pt-1.5">
          <span className="text-muted-foreground">Atingimento:</span>
          <span className={`font-medium ${statusStyle.text}`}>{formatCellValue(pct, "percentage", 1)}</span>
          <span className={`rounded px-1 py-0.5 text-xs ${statusStyle.bg} ${statusStyle.text}`}>{statusStyle.label}</span>
        </div>
      )}
    </div>
  );
}

export default function StrategicIndicatorChart({ series, height = 360, monthIndex = SELECTED_MONTH_INDEX }) {
  const [hidden, setHidden] = useState({ meta: false, atual: false, anterior: false });
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!series) return null;
  const { targetValues, currentValues, previousYearValues, displayFormat, decimalPlaces, name, area } = series;
  const areaHex = AREA_HEX[area] || chartTokens.success();

  const idx = monthIndex;
  const pct = calculatePercentageOfTarget(currentValues[idx], targetValues[idx]);
  const status = pct !== null ? getStatusFromPercentage(pct, series.direction) : "neutral";
  const statusStyle = STATUS_STYLES[status];

  const data = MONTHS.map((m, i) => ({
    month: m,
    meta: hidden.meta ? null : targetValues[i],
    atual: hidden.atual ? null : currentValues[i],
    anterior: hidden.anterior ? null : previousYearValues[i],
  }));

  const toggleSeries = (key) => setHidden((p) => ({ ...p, [key]: !p[key] }));

  const seriesColors = { meta: META_COLOR, atual: areaHex, anterior: ANTERIOR_COLOR };

  return (
    <div className="flex min-h-[320px] min-w-0 flex-col rounded-xl border border-border bg-card shadow-sm" style={{ height: Math.max(Number(height) || 0, 320) }}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Evolução do indicador</h4>
          <p className="text-xs text-muted-foreground">{name} — {REFERENCE_YEAR}</p>
        </div>
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
          {statusStyle.label}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-4 pt-2.5">
        {Object.entries(SERIES_LABELS).map(([key, label]) => (
          <button key={key} onClick={() => toggleSeries(key)} className="flex items-center gap-1.5 text-xs">
            {key === "meta" ? (
              <span className="h-0.5 w-4 rounded" style={{ backgroundColor: hidden[key] ? chartTokens.axisTickMuted() : seriesColors[key], borderTop: "2px dashed" }} />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hidden[key] ? chartTokens.axisTickMuted() : seriesColors[key] }} />
            )}
            <span className={hidden[key] ? "text-muted-foreground line-through" : "text-foreground"}>{label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 px-2 pb-2 min-w-0 min-h-[220px]">
        {chartReady ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220} initialDimension={{ width: 320, height: 220 }}>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <ReferenceLine x={MONTHS[idx]} stroke={areaHex} strokeOpacity={0.25} strokeWidth={6} />
            <CartesianGrid strokeDasharray="3 3" stroke={chartTokens.grid()} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: chartTokens.axisTick() }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: chartTokens.axisTick() }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatCellValue(v, displayFormat, decimalPlaces)}
              width={70}
            />
            <Tooltip content={<ChartTooltip displayFormat={displayFormat} decimalPlaces={decimalPlaces} series={series} />} />
            <Line type="monotone" dataKey="meta" stroke={META_COLOR} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
            <Line type="monotone" dataKey="atual" stroke={areaHex} strokeWidth={3} dot={{ r: 3, fill: areaHex }} connectNulls={false} />
            <Line type="monotone" dataKey="anterior" stroke={ANTERIOR_COLOR} strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer> : <div className="grid h-full min-h-[220px] place-items-center" role="status" aria-label="Preparando gráfico"><div className="h-full min-h-[180px] w-full animate-pulse rounded-lg bg-muted" /></div>}
      </div>
    </div>
  );
}

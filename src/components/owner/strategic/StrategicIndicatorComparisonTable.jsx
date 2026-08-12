// Tabela mensal comparativa com rolagem interna, cabeçalho e primeira coluna fixos.
import React, { useRef, useEffect } from "react";
import { MONTHS, SELECTED_MONTH_INDEX, formatCellValue, calculatePercentageOfTarget, calculateVariation, consolidateValues, getConsolidatedLabel, getStatusFromPercentage, STATUS_STYLES, AREA_STYLES, formatVariation } from "./strategicUtils";

export default function StrategicIndicatorComparisonTable({ series, height = 360 }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const targetCell = container.querySelector(`[data-month-idx="${SELECTED_MONTH_INDEX}"]`);
    if (targetCell) {
      const cellLeft = targetCell.offsetLeft;
      const cellWidth = targetCell.offsetWidth;
      const containerWidth = container.clientWidth;
      const scrollLeft = cellLeft - containerWidth / 2 + cellWidth / 2;
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: "auto" });
    }
  }, [series]);

  if (!series) return null;
  const { targetValues, currentValues, previousYearValues, displayFormat, decimalPlaces, direction, aggregationMode, area } = series;
  const idx = SELECTED_MONTH_INDEX;
  const consLabel = getConsolidatedLabel(aggregationMode, idx);
  const areaStyle = AREA_STYLES[area] || {};

  const pctValues = currentValues.map((c, i) => (c !== null && targetValues[i] ? calculatePercentageOfTarget(c, targetValues[i]) : null));
  const varValues = currentValues.map((c, i) => (c !== null ? calculateVariation(c, previousYearValues[i]) : null));

  const consTarget = consolidateValues(targetValues, aggregationMode, idx);
  const consCurrent = consolidateValues(currentValues, aggregationMode, idx);
  const consPrevious = consolidateValues(previousYearValues, aggregationMode, idx);
  const consPct = consCurrent !== null && consTarget ? calculatePercentageOfTarget(consCurrent, consTarget) : null;
  const consVar = consCurrent !== null && consPrevious ? calculateVariation(consCurrent, consPrevious) : null;

  const rows = [
    { label: "Meta", values: targetValues, cons: consTarget, fmt: (v) => formatCellValue(v, displayFormat, decimalPlaces), rowClass: "text-status-info-text" },
    { label: "Resultado Atual", values: currentValues, cons: consCurrent, fmt: (v) => formatCellValue(v, displayFormat, decimalPlaces), rowClass: areaStyle.text || "text-foreground", rowFont: "font-semibold" },
    { label: "% da Meta", values: pctValues, cons: consPct, fmt: (v) => (v !== null ? formatCellValue(v, "percentage", 1) : "—"), status: true },
    { label: "Ano Anterior", values: previousYearValues, cons: consPrevious, fmt: (v) => formatCellValue(v, displayFormat, decimalPlaces), rowClass: "text-muted-foreground" },
    { label: "Variação vs. Ano Anterior", values: varValues, cons: consVar, fmt: (v) => (v !== null ? formatVariation(v) : "—"), status: true },
  ];

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card shadow-sm" style={{ height }}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Comparativo mensal</h4>
          <p className="text-xs text-muted-foreground">Meta, resultado, atingimento e ano anterior</p>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto" role="region" tabIndex={0} aria-label="Comparativo de indicadores com rolagem">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-border bg-surface-alt">
              <th className="sticky left-0 z-30 min-w-[168px] border-r border-border bg-surface-alt px-3 py-2 text-left text-xs font-semibold text-foreground">Comparativo</th>
              {MONTHS.map((m, i) => (
                <th
                  key={m}
                  data-month-idx={i}
                  className={`px-2 py-2 text-center text-xs font-semibold ${i === idx ? "border-b-2 border-status-info/50 bg-status-info-surface text-status-info-text" : "text-muted-foreground"}`}
                >
                  {m}
                </th>
              ))}
              <th className="bg-muted px-3 py-2 text-center text-xs font-semibold text-foreground">{consLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border/40 bg-card hover:bg-surface-alt/50">
                <td className="sticky left-0 z-10 min-w-[168px] border-r border-border bg-card px-3 py-1.5 text-left text-xs font-medium text-foreground">
                  {row.label === "Meta" && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-status-info align-middle" />}
                  {row.label === "Resultado Atual" && <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${areaStyle.dot} align-middle`} />}
                  {row.label}
                </td>
                {row.values.map((v, ci) => {
                  const isFuture = row.label === "Resultado Atual" && v === null;
                  let cellStatus = null;
                  if (row.status && v !== null && !isFuture) {
                    if (row.label === "% da Meta") cellStatus = getStatusFromPercentage(v, direction);
                    else if (row.label === "Variação vs. Ano Anterior") cellStatus = getStatusFromPercentage(direction === "increase" ? 100 + v : 100 - v, direction);
                  }
                  const statusStyle = cellStatus ? STATUS_STYLES[cellStatus] : null;
                  return (
                    <td
                      key={ci}
                      data-month-idx={ci}
                      className={`px-2 py-1.5 text-center text-xs ${ci === idx ? "bg-status-info-surface/60 font-medium text-status-info-text" : ""} ${row.rowClass || "text-muted-foreground"} ${row.rowFont || ""}`}
                    >
                      {statusStyle ? (
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>{row.fmt(v)}</span>
                      ) : (
                        row.fmt(v)
                      )}
                    </td>
                  );
                })}
                <td className="bg-surface-alt/80 px-3 py-1.5 text-center text-xs font-semibold text-foreground">
                  {row.cons !== null && row.cons !== undefined ? row.fmt(row.cons) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

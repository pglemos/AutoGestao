// Menu de exportação: CSV do indicador, CSV da visão geral, imprimir/PDF.
import { useState } from "react";
import { Download, FileText, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { strategicPlanRepository } from "./strategicPlanLiveRepository";
import { MONTHS, SELECTED_MONTH_INDEX, MONTHS_FULL, REFERENCE_YEAR, formatCellValue, consolidateValues, getConsolidatedLabel } from "./strategicUtils";

function downloadFile(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function StrategicExportMenu({ indicatorId, year }) {
  const exportIndicator = () => {
    const csv = strategicPlanRepository.exportIndicatorData(indicatorId, year);
    const ind = strategicPlanRepository.getIndicatorById(indicatorId);
    downloadFile(`plano-estrategico-${ind?.code || indicatorId}-${year}.csv`, csv);
  };

  const exportOverview = () => {
    const csv = strategicPlanRepository.exportOverviewData(year);
    downloadFile(`plano-estrategico-visao-geral-${year}.csv`, csv);
  };

  const printPDF = () => {
    const series = strategicPlanRepository.getIndicatorSeries(indicatorId, year);
    if (!series) return;
    const idx = SELECTED_MONTH_INDEX;
    const consLabel = getConsolidatedLabel(series.aggregationMode, idx);
    const consTarget = consolidateValues(series.targetValues, series.aggregationMode, idx);
    const consCurrent = consolidateValues(series.currentValues, series.aggregationMode, idx);
    const consPrevious = consolidateValues(series.previousYearValues, series.aggregationMode, idx);

    const html = `
      <html><head><title>Plano Estratégico — ${series.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin: 16px 0 8px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
        th, td { border: 1px solid #ddd; padding: 4px 6px; text-align: center; }
        th { background: #f5f5f5; font-weight: 600; }
        th:first-child, td:first-child { text-align: left; }
        .meta { background: #f0f7ff; }
        .info { font-size: 12px; color: #666; margin-bottom: 12px; }
      </style></head><body>
      <h1>Plano Estratégico — ${series.name}</h1>
      <div class="info">
        Empresa e unidade: contexto selecionado no módulo Dono · Período: ${MONTHS_FULL[idx]}/${year}<br/>
        Código: ${series.code} · Área: ${series.area} · Direção: ${series.direction === "increase" ? "Aumentar" : "Diminuir"} · Formato: ${series.displayFormat}
      </div>
      <h2>Resumo do mês</h2>
      <table>
        <tr><th>Meta</th><th>Resultado</th><th>Consolidado Meta</th><th>Consolidado Resultado</th></tr>
        <tr>
          <td>${formatCellValue(series.targetValues[idx], series.displayFormat, series.decimalPlaces)}</td>
          <td>${formatCellValue(series.currentValues[idx], series.displayFormat, series.decimalPlaces)}</td>
          <td>${formatCellValue(consTarget, series.displayFormat, series.decimalPlaces)}</td>
          <td>${formatCellValue(consCurrent, series.displayFormat, series.decimalPlaces)}</td>
        </tr>
      </table>
      <h2>Tabela mensal</h2>
      <table>
        <tr><th>Comparativo</th>${MONTHS.map((m) => `<th>${m}</th>`).join("")}<th>${consLabel}</th></tr>
        <tr class="meta"><td>Meta</td>${series.targetValues.map((v) => `<td>${formatCellValue(v, series.displayFormat, series.decimalPlaces)}</td>`).join("")}<td>${formatCellValue(consTarget, series.displayFormat, series.decimalPlaces)}</td></tr>
        <tr><td>Resultado Atual</td>${series.currentValues.map((v) => `<td>${formatCellValue(v, series.displayFormat, series.decimalPlaces)}</td>`).join("")}<td>${formatCellValue(consCurrent, series.displayFormat, series.decimalPlaces)}</td></tr>
        <tr><td>Ano Anterior</td>${series.previousYearValues.map((v) => `<td>${formatCellValue(v, series.displayFormat, series.decimalPlaces)}</td>`).join("")}<td>${formatCellValue(consPrevious, series.displayFormat, series.decimalPlaces)}</td></tr>
      </table>
      </body></html>`;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportIndicator}>
          <FileText className="mr-2 h-4 w-4" /> Exportar indicador (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportOverview}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Visão Geral (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={printPDF}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar como PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

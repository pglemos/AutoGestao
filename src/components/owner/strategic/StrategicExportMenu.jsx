import { Download, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MONTHS, SELECTED_MONTH_INDEX, formatCellValue, consolidateValues, getConsolidatedLabel } from './strategicUtils'

function downloadFile(filename, content, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\ufeff' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function StrategicExportMenu({ repository, indicatorId, year }) {
  const exportIndicator = () => {
    const csv = repository.exportIndicatorData(indicatorId, year)
    const indicator = repository.getIndicatorById(indicatorId)
    downloadFile(`plano-estrategico-${indicator?.code || indicatorId}-${year}.csv`, csv)
  }
  const exportOverview = () => downloadFile(`plano-estrategico-visao-geral-${year}.csv`, repository.exportOverviewData(year))
  const printPDF = () => {
    const series = repository.getIndicatorSeries(indicatorId, year)
    if (!series) return
    const index = SELECTED_MONTH_INDEX
    const target = consolidateValues(series.targetValues, series.aggregationMode, index)
    const current = consolidateValues(series.currentValues, series.aggregationMode, index)
    const previous = consolidateValues(series.previousYearValues, series.aggregationMode, index)
    const html = `<html><head><title>Plano Estratégico — ${series.name}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;padding:24px;color:#18181b}h1{font-size:18px;font-weight:700;margin-bottom:4px}p{font-size:12px;color:#71717a;margin-top:0;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #e4e4e7;padding:6px;text-align:center}th{background:#f4f4f5;font-weight:600}th:first-child,td:first-child{text-align:left}</style></head><body><h1>${series.name}</h1><p>${series.code} · ${series.area} · ${year}</p><table><tr><th>Série</th>${MONTHS.map(month => `<th>${month}</th>`).join('')}<th>${getConsolidatedLabel(series.aggregationMode,index)}</th></tr><tr><td>Meta</td>${series.targetValues.map(value => `<td>${formatCellValue(value,series.displayFormat,series.decimalPlaces)}</td>`).join('')}<td>${formatCellValue(target,series.displayFormat,series.decimalPlaces)}</td></tr><tr><td>Resultado</td>${series.currentValues.map(value => `<td>${formatCellValue(value,series.displayFormat,series.decimalPlaces)}</td>`).join('')}<td>${formatCellValue(current,series.displayFormat,series.decimalPlaces)}</td></tr><tr><td>Ano anterior</td>${series.previousYearValues.map(value => `<td>${formatCellValue(value,series.displayFormat,series.decimalPlaces)}</td>`).join('')}<td>${formatCellValue(previous,series.displayFormat,series.decimalPlaces)}</td></tr></table></body></html>`
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 300)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="text-muted-foreground"><Download className="h-4 w-4" /> Exportar</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportIndicator}><FileText className="mr-2 h-4 w-4" /> Exportar indicador (CSV)</DropdownMenuItem>
        <DropdownMenuItem onClick={exportOverview}><FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Visão Geral (CSV)</DropdownMenuItem>
        <DropdownMenuItem onClick={printPDF}><Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar como PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

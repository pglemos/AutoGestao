import { ChevronRight, FileText } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxProgress, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import type { PDIAvaliacao360, PDISessionSummary } from '@/hooks/usePDI_MX'

export interface DevelopmentPdiRow {
  seller: { id: string; name: string }
  pdi: PDISessionSummary | null
  status: { key: 'none' | 'active' | 'overdue' | 'completed'; label: string; rank: number; className: string }
  progress: number
  overdueActions: number
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

export function DevelopmentPdiTable({ rows, onOpenOrStart }: { rows: DevelopmentPdiRow[]; onOpenOrStart: (row: DevelopmentPdiRow) => void }) {
  if (!rows.length) return <MxEmptyState icon={FileText} title="Nenhum vendedor encontrado" description="Ajuste os filtros para localizar os PDIs da equipe." />
  return (
    <MxTableSurface>
      <Table className="min-w-[1080px]">
        <TableHeader><TableRow>{['Vendedor', 'Status', 'Última avaliação', 'Próxima revisão', 'Competências', 'Progresso', 'Ações vencidas', ''].map((label) => <TableHead key={label} className="text-xs font-semibold uppercase tracking-wide">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.seller.id}>
              <TableCell className="font-medium text-foreground">{row.seller.name}</TableCell>
              <TableCell><span className={`rounded-lg px-2 py-1 text-xs font-medium ${row.status.className}`}>{row.status.label}</span></TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.pdi?.data_realizacao || row.pdi?.created_at)}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(row.pdi?.due_date)}</TableCell>
              <TableCell className="max-w-60 text-xs text-muted-foreground">{(row.pdi?.top_5_gaps ?? []).map((gap: PDIAvaliacao360) => gap.competencia).slice(0, 3).join(', ') || '—'}</TableCell>
              <TableCell className="min-w-40">{row.pdi ? <MxProgress value={row.progress} /> : '—'}</TableCell>
              <TableCell><span className={row.overdueActions > 0 ? 'font-medium text-status-error-text' : 'text-muted-foreground'}>{row.overdueActions}</span></TableCell>
              <TableCell><Button variant="ghost" size="sm" onClick={() => onOpenOrStart(row)}>{row.pdi ? 'Abrir' : 'Iniciar'}<ChevronRight size={14} className="ml-1" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </MxTableSurface>
  )
}

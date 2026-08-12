import { ChevronRight, FileText } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxProgress, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
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
  if (!rows.length) return <MxTableSurface><MxEmptyState icon={FileText} title="Nenhum vendedor encontrado" description="Ajuste os filtros para localizar os PDIs da equipe." /></MxTableSurface>
  return (
    <MxTableSurface>
      <table className="w-full min-w-[1080px] text-sm">
        <thead className="border-b border-border-subtle bg-gray-50"><tr>{['Vendedor', 'Status', 'Última avaliação', 'Próxima revisão', 'Competências', 'Progresso', 'Ações vencidas', ''].map((label) => <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <tr key={row.seller.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-foreground">{row.seller.name}</td>
              <td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-medium ${row.status.className}`}>{row.status.label}</span></td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(row.pdi?.data_realizacao || row.pdi?.created_at)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(row.pdi?.due_date)}</td>
              <td className="max-w-60 px-4 py-3 text-xs text-muted-foreground">{(row.pdi?.top_5_gaps ?? []).map((gap: PDIAvaliacao360) => gap.competencia).slice(0, 3).join(', ') || '—'}</td>
              <td className="min-w-40 px-4 py-3">{row.pdi ? <MxProgress value={row.progress} /> : '—'}</td>
              <td className="px-4 py-3"><span className={row.overdueActions > 0 ? 'font-medium text-red-600' : 'text-muted-foreground'}>{row.overdueActions}</span></td>
              <td className="px-4 py-3"><Button variant="ghost" size="sm" onClick={() => onOpenOrStart(row)}>{row.pdi ? 'Abrir' : 'Iniciar'}<ChevronRight size={14} className="ml-1" /></Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </MxTableSurface>
  )
}

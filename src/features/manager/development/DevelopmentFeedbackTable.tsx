import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import { getFeedbackSellerName, formatSafeDate, type FeedbackListItem } from '@/features/gerente-feedback/lib/helpers'
import { getFeedbackCompetency } from './development-filters'

export function DevelopmentFeedbackTable({ feedbacks, onOpen, onShareWhatsApp }: { feedbacks: FeedbackListItem[]; onOpen: (item: FeedbackListItem) => void; onShareWhatsApp: (item: FeedbackListItem) => void }) {
  if (!feedbacks.length) {
    return <MxEmptyState icon={MessageSquare} title="Nenhum feedback registrado no período" description="Ajuste os filtros ou registre um novo feedback para a equipe." />
  }

  return (
    <MxTableSurface>
      <Table className="min-w-[1048px]">
        <TableHeader>
          <TableRow>
            {['Data', 'Vendedor', 'Tipo', 'Competência', 'Situação', 'Compromisso', 'Semana', 'Status', 'Ações'].map((label) => (
              <TableHead key={label} className="text-xs font-semibold uppercase tracking-wide">{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {feedbacks.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground">{formatSafeDate(item.created_at)}</TableCell>
              <TableCell className="font-medium text-foreground">{getFeedbackSellerName(item)}</TableCell>
              <TableCell><span className={`rounded-lg px-2 py-1 text-xs font-medium ${item.attention_points?.trim() ? 'bg-status-warning-surface text-status-warning-text' : 'bg-status-success-surface text-status-success-text'}`}>{item.attention_points?.trim() ? 'Desenvolvimento' : 'Positivo'}</span></TableCell>
              <TableCell className="text-muted-foreground">{getFeedbackCompetency(item) || '—'}</TableCell>
              <TableCell className="max-w-56 truncate text-muted-foreground">{item.attention_points || item.positives || '—'}</TableCell>
              <TableCell className="max-w-56 truncate text-muted-foreground">{item.action || '—'}</TableCell>
              <TableCell className="text-muted-foreground">{formatSafeDate(item.week_reference)}</TableCell>
              <TableCell><span className={`rounded-lg px-2 py-1 text-xs font-medium ${!item.visible_to_seller ? 'bg-muted text-muted-foreground' : item.acknowledged ? 'bg-status-success-surface text-status-success-text' : 'bg-status-info-surface text-status-info-text'}`}>{!item.visible_to_seller ? 'Somente liderança' : item.acknowledged ? 'Ciência registrada' : 'Aguardando ciência'}</span></TableCell>
              <TableCell><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => onOpen(item)}>Ver</Button><Button variant="ghost" size="sm" onClick={() => onShareWhatsApp(item)}>WhatsApp</Button></div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </MxTableSurface>
  )
}

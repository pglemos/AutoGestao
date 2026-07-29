import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxTableSurface } from '@/components/module/MxModuleVisualPrimitives'
import { getFeedbackSellerName, formatSafeDate, type FeedbackListItem } from '@/features/gerente-feedback/lib/helpers'
import { getFeedbackCompetency } from './development-filters'

export function DevelopmentFeedbackTable({ feedbacks, onOpen, onShareWhatsApp }: { feedbacks: FeedbackListItem[]; onOpen: (item: FeedbackListItem) => void; onShareWhatsApp: (item: FeedbackListItem) => void }) {
  if (!feedbacks.length) {
    return <MxTableSurface><MxEmptyState icon={MessageSquare} title="Nenhum feedback registrado no período" description="Ajuste os filtros ou registre um novo feedback para a equipe." /></MxTableSurface>
  }

  return (
    <MxTableSurface>
      <table className="w-full min-w-[1050px] text-sm">
        <thead className="border-b border-gray-100 bg-gray-50">
          <tr>
            {['Data', 'Vendedor', 'Tipo', 'Competência', 'Situação', 'Compromisso', 'Semana', 'Status', 'Ações'].map((label) => (
              <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {feedbacks.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600">{formatSafeDate(item.created_at)}</td>
              <td className="px-4 py-3 font-medium text-gray-800">{getFeedbackSellerName(item)}</td>
              <td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-medium ${item.attention_points?.trim() ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.attention_points?.trim() ? 'Desenvolvimento' : 'Positivo'}</span></td>
              <td className="px-4 py-3 text-gray-600">{getFeedbackCompetency(item) || '—'}</td>
              <td className="max-w-56 truncate px-4 py-3 text-gray-600">{item.attention_points || item.positives || '—'}</td>
              <td className="max-w-56 truncate px-4 py-3 text-gray-600">{item.action || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{formatSafeDate(item.week_reference)}</td>
              <td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-medium ${!item.visible_to_seller ? 'bg-gray-100 text-gray-600' : item.acknowledged ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{!item.visible_to_seller ? 'Somente liderança' : item.acknowledged ? 'Ciência registrada' : 'Aguardando ciência'}</span></td>
              <td className="px-4 py-3"><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => onOpen(item)}>Ver</Button><Button variant="ghost" size="sm" onClick={() => onShareWhatsApp(item)}>WhatsApp</Button></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </MxTableSurface>
  )
}

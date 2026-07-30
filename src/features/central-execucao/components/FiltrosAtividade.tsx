import { cn } from '@/lib/utils'
import type { CentralExecutionAction } from '@/features/central-execucao/types/central-execucao.types'

export type CentralActivityFilter =
  | 'todos'
  | 'atendimento'
  | 'entrega'
  | 'garantia'
  | 'retorno'
  | 'pos_venda'
  | 'comercial'

export const CENTRAL_FILTERS: Array<{ id: CentralActivityFilter; label: string }> = [
  { id: 'todos', label: 'Todas' },
  { id: 'atendimento', label: 'Agendamentos' },
  { id: 'entrega', label: 'Entregas' },
  { id: 'garantia', label: 'Garantias' },
  { id: 'retorno', label: 'Retornos' },
  { id: 'pos_venda', label: 'Pós-venda' },
  { id: 'comercial', label: 'Comercial' },
]

export function matchesCentralFilter(action: CentralExecutionAction, filter: CentralActivityFilter) {
  if (filter === 'todos') return true
  if (filter === 'atendimento') {
    return ['atendimento', 'visita', 'test_drive', 'negociacao'].includes(action.activityType)
  }
  if (filter === 'comercial') {
    return ['comercial', 'pdi', 'feedback', 'funil', 'documentacao', 'aniversario'].includes(action.activityType)
  }
  return action.activityType === filter
}

export function FiltrosAtividade({
  actions,
  value,
  onChange,
}: {
  actions: CentralExecutionAction[]
  value: CentralActivityFilter
  onChange: (filter: CentralActivityFilter) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtrar atividades">
      {CENTRAL_FILTERS.map(filter => {
        const count = actions.filter(action => matchesCentralFilter(action, filter.id)).length
        if (filter.id !== 'todos' && count === 0) return null
        const active = filter.id === value

        return (
          <button
            key={filter.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(filter.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-info/30',
              active
                ? 'border-status-info bg-status-info text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-status-info hover:text-status-info',
            )}
          >
            {filter.label}
            <span className={cn(
              'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
              active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
            )}>
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

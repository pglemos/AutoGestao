import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AtividadeCard } from '@/features/central-execucao/components/AtividadeCard'
import {
  CENTRAL_FILTERS,
  FiltrosAtividade,
  matchesCentralFilter,
  type CentralActivityFilter,
} from '@/features/central-execucao/components/FiltrosAtividade'
import { PendenciasBanner } from '@/features/central-execucao/components/PendenciasBanner'
import { EstadoVazio } from '@/features/central-execucao/components/EstadoVazio'
import type { CentralExecutionAction } from '@/features/central-execucao/types/central-execucao.types'

export type CentralOrder = 'prioridade' | 'horario' | 'tipo' | 'cliente'

function clientName(action: CentralExecutionAction) {
  return action.client?.nome || action.snapshots.name || ''
}

function orderActions(actions: CentralExecutionAction[], order: CentralOrder) {
  const result = [...actions]
  if (order === 'horario') return result.sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime())
  if (order === 'tipo') return result.sort((left, right) => left.activityType.localeCompare(right.activityType))
  if (order === 'cliente') return result.sort((left, right) => clientName(left).localeCompare(clientName(right), 'pt-BR'))
  return result.sort((left, right) => {
    const leftLate = new Date(left.dueAt).getTime() < Date.now()
    const rightLate = new Date(right.dueAt).getTime() < Date.now()
    if (leftLate !== rightLate) return leftLate ? -1 : 1
    if (left.priorityRank !== right.priorityRank) return left.priorityRank - right.priorityRank
    return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime()
  })
}

export function HojeTab({
  actions,
  pendingCount,
  loading,
  error,
  onOpenPending,
  onCreate,
  onOpenRoutine,
  onResolve,
  onEscalate,
  onOpenClient,
  onWhatsapp,
}: {
  actions: CentralExecutionAction[]
  pendingCount: number
  loading: boolean
  error: string | null
  onOpenPending: () => void
  onCreate: () => void
  onOpenRoutine: () => void
  onResolve: (action: CentralExecutionAction) => void
  onEscalate: (action: CentralExecutionAction) => void
  onOpenClient: (action: CentralExecutionAction) => void
  onWhatsapp: (action: CentralExecutionAction) => void
}) {
  const [filter, setFilter] = useState<CentralActivityFilter>('todos')
  const [order, setOrder] = useState<CentralOrder>('prioridade')

  const filtered = useMemo(() => {
    return orderActions(actions.filter(action => matchesCentralFilter(action, filter)), order)
  }, [actions, filter, order])

  const filterLabel = CENTRAL_FILTERS.find(item => item.id === filter)?.label

  return (
    <div className="space-y-5">
      <PendenciasBanner count={pendingCount} onOpen={onOpenPending} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold text-gray-800">O que você não pode deixar de fazer hoje</h2>
          <p className="text-[12px] text-slate-400">Atividades previstas para hoje. Execute e registre o resultado.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Ordenar atividades"
            value={order}
            onChange={event => setOrder(event.target.value as CentralOrder)}
            className="h-8 w-[150px] rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 outline-none focus:border-status-info focus:ring-2 focus:ring-status-info/15"
          >
            <option value="prioridade">Prioridade</option>
            <option value="horario">Horário</option>
            <option value="tipo">Tipo</option>
            <option value="cliente">Cliente</option>
          </select>
          <button type="button" onClick={onCreate} className="flex items-center gap-1.5 rounded-xl bg-status-info px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-blue-100 transition-colors hover:bg-blue-700">
            <Plus className="h-4 w-4" aria-hidden="true" /> Nova atividade
          </button>
        </div>
      </div>

      {actions.length > 0 && <FiltrosAtividade actions={actions} value={filter} onChange={setFilter} />}

      {loading ? (
        <div className="space-y-3" aria-label="Carregando atividades">
          {[0, 1, 2].map(item => <div key={item} className="h-[82px] animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : error ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[13px] font-semibold text-red-700">{error}</p>
      ) : filtered.length === 0 ? (
        <EstadoVazio
          filtered={actions.length > 0 && filter !== 'todos'}
          filterLabel={filterLabel}
          onClearFilter={() => setFilter('todos')}
          onOpenRoutine={onOpenRoutine}
          onCreate={onCreate}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(action => (
            <AtividadeCard
              key={action.id}
              action={action}
              onResolve={onResolve}
              onEscalate={onEscalate}
              onOpenClient={onOpenClient}
              onWhatsapp={onWhatsapp}
            />
          ))}
        </div>
      )}
    </div>
  )
}

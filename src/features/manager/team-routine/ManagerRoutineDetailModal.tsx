import { format, parseISO } from 'date-fns'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from '@/components/organisms/Modal'
import type { OfficialRoutineScore } from './manager-team-routine'

export type RoutineDetailAction = {
  id: string
  title: string
  description?: string | null
  status: string
  source_type?: string
  due_at: string
  completed_at?: string | null
  justificativa?: string | null
}

type ManagerRoutineDetailModalProps = {
  open: boolean
  sellerName: string
  date: string
  actions: RoutineDetailAction[]
  appointments: number
  execution: number | null
  officialScore?: OfficialRoutineScore
  onClose: () => void
}

export function ManagerRoutineDetailModal({ open, sellerName, date, actions, appointments, execution, officialScore, onClose }: ManagerRoutineDetailModalProps) {
  const completed = actions.filter((action) => action.status === 'concluida' || action.status === 'justificada').length
  const hasRoutine = actions.length > 0
  const formattedDate = (() => {
    try { return format(parseISO(date), 'dd/MM/yyyy') } catch { return date }
  })()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={hasRoutine ? `Rotina do Dia — ${sellerName}` : 'Rotina do Dia'}
      description={hasRoutine ? `Atividades oficiais para ${formattedDate}.` : `Nenhuma rotina registrada para ${sellerName} em ${formattedDate}.`}
      size={hasRoutine ? 'xl' : 'md'}
      footer={hasRoutine ? <div className="flex w-full justify-end"><button type="button" className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted" onClick={onClose}>Fechar</button></div> : undefined}
    >
      {!hasRoutine ? <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma rotina registrada para este vendedor nesta data.</p>
        </div> : <div className="space-y-5">
          <p className="text-xs text-muted-foreground">Unidade e atividades oficiais da Central de Execução para {formattedDate}.</p>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-surface-alt p-4 sm:grid-cols-4">
            <DetailMetric label="Execução" value={execution === null ? '—' : `${execution}%`} />
            <DetailMetric label="Ações" value={`${completed}/${actions.length}`} />
            <DetailMetric label="Agendamentos" value={String(appointments)} />
            <DetailMetric label="Status" value={execution === null ? 'Sem dados' : execution >= 75 ? 'Em dia' : execution >= 50 ? 'Atenção' : 'Crítico'} />
          </div>
          {officialScore && <section aria-label="Componentes da pontuação oficial" className="rounded-xl border border-border-subtle bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Pontuação oficial — 100 pontos</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {officialScore.components.map(component => <div key={component.key} className="rounded-lg border border-border-subtle bg-surface-alt p-3">
                <div className="flex items-start justify-between gap-3"><span className="text-xs font-medium text-foreground">{COMPONENT_LABELS[component.key]}</span><span className="text-xs font-semibold text-foreground">{formatComponentValue(component)}</span></div>
                <p className="mt-1 text-caption text-muted-foreground">Peso {component.weight} pontos · {component.applicable ? component.evidence || component.source : component.reason || 'Não aplicável'}</p>
              </div>)}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Denominador aplicado: {officialScore.denominator} pontos.</p>
          </section>}
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><CheckCircle2 size={16} className="text-status-success-text" />Atividades da Central de Execução</h3>
            <ul className="space-y-2">
              {actions.map((action) => (
                <li key={action.id} className="rounded-xl border border-border-subtle bg-surface-alt p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="text-sm font-semibold text-foreground">{action.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatActionDate(action.due_at)} · {action.source_type || 'Central de Execução'}</p></div>
                    <span className={`rounded-lg px-2 py-1 text-xs font-medium ${action.status === 'concluida' || action.status === 'justificada' ? 'bg-status-success-surface text-status-success-text' : 'bg-status-warning-surface text-status-warning-text'}`}>{formatStatus(action.status)}</span>
                  </div>
                  {action.description && <p className="mt-2 text-xs text-muted-foreground">{action.description}</p>}
                  {action.justificativa && <p className="mt-2 flex items-start gap-1 text-xs text-status-warning-text"><AlertCircle size={12} className="mt-0.5 shrink-0" />{action.justificativa}</p>}
                </li>
              ))}
            </ul>
          </div>
          </div>}
    </Modal>
  )
}

const COMPONENT_LABELS: Record<keyof import('./manager-team-routine').OfficialRoutineScoreInput, string> = {
  routineAccess: 'Acessou a Rotina do Dia',
  resolvedPendencies: 'Resolveu pendências',
  attackPlan: 'Executou Plano de Ataque',
  prospectingAgenda: 'Executou agenda de prospecção',
  updatedClients: 'Atualizou clientes',
  dailyClosing: 'Realizou Fechamento Diário',
}

function formatComponentValue(component: OfficialRoutineScore['components'][number]) {
  if (!component.applicable || component.value === null) return 'Não aplicável'
  return `${Math.round(component.value)}%`
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return <div><span className="text-xs text-muted-foreground">{label}</span><span className="mt-0.5 block text-sm font-semibold text-foreground">{value}</span></div>
}

function formatActionDate(value: string) {
  try { return format(parseISO(value), "dd/MM/yyyy HH:mm") } catch { return value }
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ')
}

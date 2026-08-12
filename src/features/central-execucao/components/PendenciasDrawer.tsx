import { AlertTriangle, Calendar, MessageCircle, Phone, UserRound } from 'lucide-react'
import { Modal } from '@/components/organisms/Modal'
import { cn } from '@/lib/utils'
import type { CentralExecutionAction } from '@/features/central-execucao/types/central-execucao.types'

function onlyDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function daysLate(value: string) {
  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return 0
  return Math.max(0, Math.floor((Date.now() - due.getTime()) / 86_400_000))
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

function barColor(type: CentralExecutionAction['activityType']) {
  if (['atendimento', 'visita', 'test_drive', 'negociacao'].includes(type)) return 'bg-status-info'
  if (type === 'retorno') return 'bg-status-warning'
  if (type === 'entrega') return 'bg-status-info'
  if (type === 'pos_venda') return 'bg-teal-500'
  if (type === 'garantia') return 'bg-status-warning'
  if (type === 'aniversario') return 'bg-indigo-500'
  return 'bg-slate-400'
}

export function PendenciasDrawer({
  open,
  actions,
  onClose,
  onResolve,
  onReschedule,
  onEscalate,
  onOpenClient,
  onWhatsapp,
}: {
  open: boolean
  actions: CentralExecutionAction[]
  onClose: () => void
  onResolve: (action: CentralExecutionAction) => void
  onReschedule: (action: CentralExecutionAction) => void
  onEscalate: (action: CentralExecutionAction) => void
  onOpenClient: (action: CentralExecutionAction) => void
  onWhatsapp: (action: CentralExecutionAction) => void
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Pendências anteriores (${actions.length})`}
      description="Resolva ou reagende atividades que ficaram para trás."
      size="md"
      referenceStyle
    >
      {actions.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-muted-foreground">Nenhuma pendência anterior.</p>
      ) : (
        <div className="space-y-3">
          {actions.map(action => {
            const clientName = action.client?.nome || action.snapshots.name || '—'
            const phone = action.client?.telefone || action.snapshots.phone
            const phoneDigits = onlyDigits(phone)
            const vehicle = action.opportunity?.veiculo_interesse || action.snapshots.vehicle
            const late = daysLate(action.dueAt)

            return (
              <article key={action.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={cn('w-1.5 self-stretch rounded-full', barColor(action.activityType))} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-caption font-bold uppercase tracking-wider text-muted-foreground">{action.title}</span>
                      <span className="rounded-full bg-status-error-surface px-2 py-0.5 text-caption font-bold text-status-error">{late === 0 ? 'Hoje' : `${late}d atraso`}</span>
                    </div>
                    <p className="truncate text-body-sm font-bold text-foreground">{clientName}</p>
                    {vehicle && <p className="truncate text-[12px] text-muted-foreground">{vehicle}</p>}
                    {action.description && <p className="mt-0.5 text-[12px] text-muted-foreground">{action.description}</p>}
                    <p className="mt-0.5 text-caption text-text-disabled">{formatDate(action.dueAt)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {phoneDigits && (
                    <button type="button" onClick={() => onWhatsapp(action)} className="flex items-center gap-1 rounded-lg bg-green-500 px-2.5 py-1.5 text-caption font-bold text-white hover:bg-green-600">
                      <MessageCircle className="h-3 w-3" aria-hidden="true" /> WhatsApp
                    </button>
                  )}
                  {phoneDigits && (
                    <a href={`tel:${phoneDigits}`} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-caption font-bold text-muted-foreground hover:bg-slate-50">
                      <Phone className="h-3 w-3" aria-hidden="true" /> Ligar
                    </a>
                  )}
                  {action.clientId && (
                    <button type="button" onClick={() => onOpenClient(action)} className="flex items-center gap-1 rounded-lg border border-status-info/30 px-2.5 py-1.5 text-caption font-bold text-status-info hover:bg-status-info-surface">
                      <UserRound className="h-3 w-3" aria-hidden="true" /> Abrir cliente
                    </button>
                  )}
                  <button type="button" onClick={() => onReschedule(action)} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-caption font-bold text-muted-foreground hover:bg-slate-50">
                    <Calendar className="h-3 w-3" aria-hidden="true" /> Reagendar
                  </button>
                  <button type="button" onClick={() => onEscalate(action)} className="flex items-center gap-1 rounded-lg border border-status-warning/30 px-2.5 py-1.5 text-caption font-bold text-status-warning-text hover:bg-status-warning-surface">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" /> Pedir apoio
                  </button>
                  <button type="button" onClick={() => onResolve(action)} className="ml-auto rounded-lg bg-status-info px-2.5 py-1.5 text-caption font-bold text-white hover:bg-status-info">Resolver</button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="sr-only"><AlertTriangle /></div>
    </Modal>
  )
}

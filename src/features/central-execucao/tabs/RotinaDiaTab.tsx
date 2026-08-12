import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Headphones,
  ListChecks,
  Phone,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Modal } from '@/components/organisms/Modal'
import { useRoutinePlaybook, TIPO_ACAO_LABEL, type ProspectingScheduleRow } from '@/features/crm/hooks/useRoutinePlaybook'
import { useVendedorPerfil } from '@/features/crm/hooks/useVendedorPerfil'
import type { CentralExecutionAction } from '@/features/central-execucao/types/central-execucao.types'

const STEP_ICONS: Record<string, LucideIcon> = {
  motivacao: Brain,
  organizacao: FolderOpen,
  novos_clientes: UserPlus,
  prospeccao: Phone,
  atendimento: Headphones,
  lista_quente: ListChecks,
  fechamento: CheckCircle2,
}

const STEP_LABELS: Record<string, string> = {
  motivacao: 'Foco do Dia',
  organizacao: 'Organização do Dia',
  novos_clientes: 'Contato com Novos Clientes',
  prospeccao: 'Prospecção',
  atendimento: 'Atendimento',
  lista_quente: 'Lista Quente',
  fechamento: 'Fechamento do Dia',
}

function isPast(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const now = new Date()
  const current = Number(new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Sao_Paulo',
  }).format(now).replace(':', ''))
  return hours * 100 + minutes < current
}

function actionConflictsNow(action: CentralExecutionAction) {
  const due = new Date(action.dueAt)
  if (Number.isNaN(due.getTime())) return false
  return Math.abs(due.getTime() - Date.now()) <= 45 * 60 * 1_000
}

export function RotinaDiaTab({ actions }: { actions: CentralExecutionAction[] }) {
  const { perfil } = useVendedorPerfil()
  const playbook = useRoutinePlaybook({
    workStartTime: perfil.hora_entrada,
    lunchEndTime: perfil.hora_almoco_fim,
    workEndTime: perfil.hora_saida,
    agendaHojeItems: [],
  })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [howTo, setHowTo] = useState<ProspectingScheduleRow | null>(null)

  useEffect(() => {
    if (playbook.currentSlot?.key) setExpanded(playbook.currentSlot.key)
  }, [playbook.currentSlot?.key])

  const conflict = useMemo(() => actions.find(actionConflictsNow) ?? null, [actions])

  if (playbook.loading) {
    return <div className="space-y-4">{[0, 1, 2, 3].map(item => <div key={item} className="h-20 animate-pulse rounded-2xl bg-slate-200" />)}</div>
  }

  if (playbook.error) {
    return <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-body-sm font-semibold text-red-700">{playbook.error}</p>
  }

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {conflict && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
              <p className="text-body-sm font-medium text-amber-800">Você possui um cliente agendado neste horário. Priorize o atendimento e retome sua rotina depois.</p>
            </div>
          )}

          {playbook.slots.map(slot => {
            const Icon = STEP_ICONS[slot.key] ?? Zap
            const isExpanded = expanded === slot.key
            const past = isPast(slot.time) && !slot.isCurrent
            const template = slot.template
            const instructions = template?.instrucoes ?? []
            const shortcuts = template?.atalhos ?? []

            return (
              <section key={slot.key} className={`rounded-2xl border bg-white shadow-sm transition-all ${slot.isCurrent ? 'border-status-info shadow-blue-100' : 'border-border'}`}>
                <button type="button" onClick={() => setExpanded(isExpanded ? null : slot.key)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${slot.isCurrent ? 'bg-status-info text-white' : past ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-muted-foreground'}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-lg px-2 py-0.5 text-caption font-bold ${slot.isCurrent ? 'bg-status-info text-white' : 'bg-slate-100 text-muted-foreground'}`}>{slot.time}</span>
                      <span className={`text-[14px] font-bold ${slot.isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>{template?.nome || STEP_LABELS[slot.key] || slot.key}</span>
                      {slot.isCurrent && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-caption font-bold uppercase tracking-wider text-status-info">Agora</span>}
                    </div>
                    {!isExpanded && <p className={`mt-0.5 truncate text-[12px] ${slot.isCurrent ? 'font-semibold text-status-info' : 'text-muted-foreground'}`}>{template?.objetivo || 'Execute esta etapa da rotina.'}</p>}
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-border-subtle px-5 pb-5">
                    <p className="mb-4 mt-3 text-body-sm text-muted-foreground">{template?.objetivo || 'Execute esta etapa com foco e registre os resultados.'}</p>

                    {slot.key === 'prospeccao' ? (
                      <div>
                        <p className="mb-3 text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Ações de hoje</p>
                        {playbook.prospeccaoHoje.length === 0 ? (
                          <p className="text-body-sm text-muted-foreground">Sem ações programadas para hoje. Aproveite para avançar na carteira.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {playbook.prospeccaoHoje.map(item => (
                              <div key={item.id} className="flex flex-col rounded-xl border border-border bg-white p-4">
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div><p className="text-body-sm font-bold text-foreground">{TIPO_ACAO_LABEL[item.tipo_acao] || item.tipo_acao}</p><p className="text-caption text-muted-foreground">{item.publico || 'Todos'}</p></div>
                                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-caption font-bold text-status-info">{item.quantidade ? `${item.quantidade}/${item.periodicidade || 'dia'}` : item.periodicidade || 'Hoje'}</span>
                                </div>
                                {item.objetivo && <p className="mb-3 text-[12px] text-muted-foreground">{item.objetivo}</p>}
                                <button type="button" onClick={() => setHowTo(item)} className="mt-auto flex items-center gap-1.5 text-[12px] font-bold text-status-info hover:underline"><BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> Ver como fazer</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <ol className="space-y-2">
                        {instructions.map((instruction, index) => (
                          <li key={`${slot.key}-${index}`} className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-status-info text-caption font-bold text-white">{index + 1}</span>
                            <span className="text-body-sm leading-5 text-foreground">{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    )}

                    {template?.meta_sugerida && <p className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-[12px] font-semibold text-status-info">Meta sugerida: {template.meta_sugerida}</p>}

                    {shortcuts.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {shortcuts.map(shortcut => shortcut.type === 'route' && shortcut.target ? (
                          <Link key={`${slot.key}-${shortcut.label}`} to={shortcut.target} className="rounded-xl border border-blue-200 px-3 py-2 text-[12px] font-bold text-status-info hover:bg-blue-50">{shortcut.label}</Link>
                        ) : (
                          <span key={`${slot.key}-${shortcut.label}`} className="rounded-xl border border-border px-3 py-2 text-[12px] font-bold text-muted-foreground">{shortcut.label}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <aside className="hidden rounded-2xl border border-border bg-white p-5 shadow-sm lg:block">
          <h3 className="mb-4 text-body-sm font-bold uppercase tracking-wider text-muted-foreground">Linha do dia</h3>
          <ol className="space-y-0">
            {playbook.slots.map((slot, index) => (
              <li key={`timeline-${slot.key}`} className="relative flex gap-3 pb-5 last:pb-0">
                {index < playbook.slots.length - 1 && <span className="absolute left-[4px] top-3 h-full w-px bg-slate-200" />}
                <span className={`relative mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-white ring-1 ${slot.isCurrent ? 'bg-status-info ring-blue-300' : isPast(slot.time) ? 'bg-green-500 ring-green-200' : 'bg-slate-200 ring-border'}`} />
                <div><p className="text-caption font-bold text-muted-foreground">{slot.time}</p><p className={`text-[12px] font-bold ${slot.isCurrent ? 'text-status-info' : 'text-muted-foreground'}`}>{slot.template?.nome || STEP_LABELS[slot.key] || slot.key}</p></div>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <Modal open={Boolean(howTo)} onClose={() => setHowTo(null)} title={howTo ? TIPO_ACAO_LABEL[howTo.tipo_acao] || howTo.tipo_acao : 'Como fazer'} size="sm" referenceStyle>
        {howTo && (
          <div className="space-y-4">
            <div className="rounded-xl bg-blue-50 p-3 text-[12px] text-muted-foreground"><strong className="text-status-info">Objetivo:</strong> {howTo.objetivo || 'Executar a ação de prospecção.'}</div>
            <p className="text-body-sm leading-6 text-muted-foreground">Use uma mensagem simples, pessoal e com uma chamada clara para conversa. Registre os retornos relevantes na Carteira.</p>
            {playbook.storyIdeaHoje && <div className="rounded-xl bg-slate-50 p-3"><p className="text-[12px] font-bold text-foreground">{playbook.storyIdeaHoje.titulo}</p><ol className="mt-2 space-y-1 text-[12px] text-muted-foreground">{playbook.storyIdeaHoje.passos.map((step, index) => <li key={index}>{index + 1}. {step}</li>)}</ol></div>}
          </div>
        )}
      </Modal>
    </>
  )
}

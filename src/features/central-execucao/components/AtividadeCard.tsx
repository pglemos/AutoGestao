import {
  Calendar,
  Clock,
  FileText,
  Gift,
  Headphones,
  MessageCircle,
  MoreVertical,
  Phone,
  RefreshCw,
  Shield,
  Truck,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  CentralActivityType,
  CentralExecutionAction,
} from '@/features/central-execucao/types/central-execucao.types'

const TYPE_LABEL: Record<CentralActivityType, string> = {
  atendimento: 'Atendimento',
  visita: 'Atendimento',
  retorno: 'Retorno',
  documentacao: 'Documentação',
  entrega: 'Entrega',
  pos_venda: 'Pós-venda',
  aniversario: 'Aniversário',
  garantia: 'Garantia',
  comercial: 'Outra atividade comercial',
  test_drive: 'Atendimento',
  negociacao: 'Atendimento',
  pdi: 'Outra atividade comercial',
  feedback: 'Outra atividade comercial',
  funil: 'Outra atividade comercial',
}

const TYPE_BAR: Record<CentralActivityType, string> = {
  atendimento: 'bg-status-info',
  visita: 'bg-status-info',
  retorno: 'bg-status-warning',
  documentacao: 'bg-slate-400',
  entrega: 'bg-status-info',
  pos_venda: 'bg-brand-primary',
  aniversario: 'bg-status-info',
  garantia: 'bg-status-warning',
  comercial: 'bg-slate-400',
  test_drive: 'bg-status-info',
  negociacao: 'bg-status-info',
  pdi: 'bg-slate-400',
  feedback: 'bg-slate-400',
  funil: 'bg-slate-400',
}

const TYPE_BADGE: Record<CentralActivityType, string> = {
  atendimento: 'bg-status-info-surface text-status-info-text',
  visita: 'bg-status-info-surface text-status-info-text',
  retorno: 'bg-status-warning-surface text-status-warning-text',
  documentacao: 'bg-slate-100 text-muted-foreground',
  entrega: 'bg-status-info-surface text-status-info-text',
  pos_venda: 'bg-brand-primary-subtle text-brand-primary',
  aniversario: 'bg-status-info-surface text-status-info-text',
  garantia: 'bg-status-warning-surface text-status-warning-text',
  comercial: 'bg-slate-100 text-muted-foreground',
  test_drive: 'bg-status-info-surface text-status-info-text',
  negociacao: 'bg-status-info-surface text-status-info-text',
  pdi: 'bg-slate-100 text-muted-foreground',
  feedback: 'bg-slate-100 text-muted-foreground',
  funil: 'bg-slate-100 text-muted-foreground',
}

const TYPE_ICON: Record<CentralActivityType, LucideIcon> = {
  atendimento: Calendar,
  visita: Calendar,
  retorno: RefreshCw,
  documentacao: FileText,
  entrega: Truck,
  pos_venda: Users,
  aniversario: Gift,
  garantia: Wrench,
  comercial: MoreVertical,
  test_drive: Calendar,
  negociacao: Calendar,
  pdi: Shield,
  feedback: Users,
  funil: MoreVertical,
}

const PRIORITY_LABEL: Record<CentralExecutionAction['priority'], string> = {
  urgent: 'Alta',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

const PRIORITY_BADGE: Record<CentralExecutionAction['priority'], string> = {
  urgent: 'bg-status-error-surface text-status-error-text',
  high: 'bg-status-error-surface text-status-error-text',
  medium: 'bg-status-warning-surface text-status-warning-text',
  low: 'bg-slate-100 text-muted-foreground',
}

function formatPhoneDisplay(value: string | null | undefined) {
  const digits = onlyDigits(value)
  if (!digits) return null
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return value ?? null
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '')
}

function formatHour(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
}

export function AtividadeCard({
  action,
  onResolve,
  onEscalate,
  onOpenClient,
  onWhatsapp,
}: {
  action: CentralExecutionAction
  onResolve: (action: CentralExecutionAction) => void
  onEscalate: (action: CentralExecutionAction) => void
  onOpenClient: (action: CentralExecutionAction) => void
  onWhatsapp: (action: CentralExecutionAction) => void
}) {
  const Icon = TYPE_ICON[action.activityType]
  const typeLabel = TYPE_LABEL[action.activityType]
  const clientName = action.client?.nome || action.snapshots.name || '—'
  const clientPhone = action.client?.telefone || action.snapshots.phone
  const vehicle = action.opportunity?.veiculo_interesse || action.snapshots.vehicle
  const phoneDigits = onlyDigits(clientPhone)
  const phoneDisplay = formatPhoneDisplay(clientPhone)
  const overdue = Number.isFinite(new Date(action.dueAt).getTime()) && new Date(action.dueAt).getTime() < Date.now()
  const hour = formatHour(action.dueAt)
  const alreadyEscalated = action.managerRequired

  return (
    <article className={cn(
      'overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md',
      overdue ? 'border-status-error/30' : 'border-border',
    )}>
      <div className="md:hidden">
        <div className={cn('h-1 w-full', TYPE_BAR[action.activityType])} />
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full px-2 py-0.5 text-caption font-bold', TYPE_BADGE[action.activityType])}>{typeLabel}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-caption font-bold', PRIORITY_BADGE[action.priority])}>{PRIORITY_LABEL[action.priority]}</span>
              {overdue && <span className="rounded-full bg-status-error-surface px-2 py-0.5 text-caption font-bold text-status-error-text">Vencido</span>}
              {alreadyEscalated && <span className="rounded-full bg-status-warning-surface px-2 py-0.5 text-caption font-bold text-status-warning-text">Aguardando gerente</span>}
            </div>
            <div className="flex items-center gap-1 text-caption font-bold text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />{hour}
            </div>
          </div>

          <div className="mb-2 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-muted-foreground">
              {initials(clientName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-foreground">{clientName}</p>
              {vehicle && <p className="truncate text-[12px] text-muted-foreground">{vehicle}</p>}
              {phoneDisplay && <p className="truncate text-caption text-muted-foreground">{phoneDisplay}</p>}
            </div>
          </div>

          {action.objective && <p className="mb-1 text-[12px] font-semibold text-muted-foreground">{action.objective}</p>}
          {action.description && <p className="mb-3 text-[12px] text-muted-foreground">{action.description}</p>}

          <div className="flex flex-wrap items-center gap-2">
            {phoneDigits && (
              <button
                type="button"
                onClick={() => onWhatsapp(action)}
                className="flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-1.5 text-caption font-bold text-white transition-colors hover:bg-brand-primary"
              >
                <MessageCircle className="h-3 w-3" aria-hidden="true" /> WhatsApp
              </button>
            )}
            {phoneDigits && (
              <a href={`tel:${phoneDigits}`} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-caption font-bold text-muted-foreground transition-colors hover:bg-slate-50">
                <Phone className="h-3 w-3" aria-hidden="true" /> Ligar
              </a>
            )}
            {action.clientId && (
              <button type="button" onClick={() => onOpenClient(action)} className="flex items-center gap-1 rounded-lg border border-status-info/30 px-3 py-1.5 text-caption font-bold text-status-info-text transition-colors hover:bg-status-info-surface">
                <UserRound className="h-3 w-3" aria-hidden="true" /> Cliente
              </button>
            )}
            {!alreadyEscalated && (
              <button type="button" onClick={() => onEscalate(action)} className="flex items-center gap-1 rounded-lg border border-status-warning/30 px-3 py-1.5 text-caption font-bold text-status-warning-text transition-colors hover:bg-status-warning-surface">
                <Shield className="h-3 w-3" aria-hidden="true" /> Apoio
              </button>
            )}
            <button type="button" onClick={() => onResolve(action)} className="ml-auto rounded-lg bg-status-info px-4 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-status-info">
              Resolver
            </button>
          </div>
        </div>
      </div>

      <div className="hidden md:flex">
        <div className={cn('w-1.5 shrink-0', TYPE_BAR[action.activityType])} />
        <div className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4">
          <div className="w-12 shrink-0 text-center">
            <div className={cn('mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-xl', TYPE_BADGE[action.activityType])}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <p className={cn('text-caption font-bold', overdue ? 'text-status-error-text' : 'text-muted-foreground')}>{hour}</p>
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-muted-foreground">
              {initials(clientName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-[14px] font-bold text-foreground">{clientName}</p>
                <span className={cn('rounded-full px-2 py-0.5 text-caption font-bold', TYPE_BADGE[action.activityType])}>{typeLabel}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-caption font-bold', PRIORITY_BADGE[action.priority])}>{PRIORITY_LABEL[action.priority]}</span>
                {overdue && <span className="rounded-full bg-status-error-surface px-2 py-0.5 text-caption font-bold text-status-error-text">Vencido</span>}
                {alreadyEscalated && <span className="rounded-full bg-status-warning-surface px-2 py-0.5 text-caption font-bold text-status-warning-text">Aguardando gerente</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                {vehicle && <span className="truncate">{vehicle}</span>}
                {phoneDisplay && <span className="truncate">{phoneDisplay}</span>}
              </div>
              {action.objective && <p className="truncate text-[12px] font-semibold text-muted-foreground">{action.objective}</p>}
              {action.description && <p className="truncate text-[12px] text-muted-foreground">{action.description}</p>}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {!alreadyEscalated && (
              <button type="button" title="Pedir apoio do gerente" aria-label={`Pedir apoio do gerente para ${clientName}`} onClick={() => onEscalate(action)} className="rounded-xl bg-status-warning-surface p-2 text-status-warning-text transition-colors hover:bg-status-warning-surface">
                <Shield className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {phoneDigits && (
              <button type="button" title="WhatsApp" aria-label={`Abrir WhatsApp de ${clientName}`} onClick={() => onWhatsapp(action)} className="rounded-xl bg-brand-primary-subtle p-2 text-status-success-text transition-colors hover:bg-brand-primary-subtle">
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {phoneDigits && (
              <a href={`tel:${phoneDigits}`} title="Ligar" aria-label={`Ligar para ${clientName}`} className="rounded-xl bg-slate-50 p-2 text-muted-foreground transition-colors hover:bg-slate-100">
                <Phone className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
            {action.clientId && (
              <button type="button" title="Abrir cliente" aria-label={`Abrir cliente ${clientName}`} onClick={() => onOpenClient(action)} className="rounded-xl bg-status-info-surface p-2 text-status-info-text transition-colors hover:bg-status-info-surface">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={() => onResolve(action)} className="ml-1 rounded-xl bg-status-info px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-status-info">
              Resolver
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}

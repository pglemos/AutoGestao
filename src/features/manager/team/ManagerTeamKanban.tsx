import { useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertOctagon,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  GraduationCap,
  MessageSquarePlus,
  MoreVertical,
  TrendingUp,
  UserX,
  Users,
  Wallet } from 'lucide-react'
import type { RankingEntry } from '@/types/database'
import {
  getManagerTeamNextStep,
  getManagerTeamStatus,
  groupManagerTeamCards,
  MANAGER_TEAM_COLUMN_GUIDANCE,
  summarizeManagerTeam,
  type ManagerTeamCard,
  type ManagerTeamStatus,
  type ManagerTeamView,
} from './manager-team-kanban'
import type { ManagerTeamAction } from './manager-team-navigation'

export type { ManagerTeamAction }

type ManagerTeamKanbanProps = {
  cards: ManagerTeamCard[]
  view: ManagerTeamView
  storeName: string
  onViewChange: (view: ManagerTeamView) => void
  onOpenProfile: (row: RankingEntry) => void
  onAction: (action: ManagerTeamAction, row: RankingEntry) => void
}

const STATUS_ORDER = ['critical', 'attention', 'on_track'] as const

const COLUMN_CONFIG = {
  critical: {
    label: 'Críticos',
    icon: AlertOctagon,
    header: 'border-status-error/30 bg-status-error-surface text-status-error-text',
    body: 'border-status-error/30 bg-status-error-surface/50',
    footer: 'border-status-error/20 bg-status-error-surface text-status-error-text',
    active: 'border-status-error bg-status-error text-status-error-foreground',
  },
  attention: {
    label: 'Atenção',
    icon: AlertCircle,
    header: 'border-status-warning/30 bg-status-warning-surface text-status-warning-text',
    body: 'border-status-warning/30 bg-status-warning-surface/50',
    footer: 'border-status-warning/20 bg-status-warning-surface text-status-warning-text',
    active: 'border-status-warning bg-status-warning text-status-warning-foreground',
  },
  on_track: {
    label: 'Em dia',
    icon: CheckCircle2,
    header: 'border-status-success/30 bg-status-success-surface text-status-success-text',
    body: 'border-status-success/30 bg-status-success-surface/50',
    footer: 'border-status-success/20 bg-status-success-surface text-status-success-text',
    active: 'border-status-success bg-brand-primary text-white',
  },
} as const

const CARD_THEME = {
  critical: {
    border: 'border-status-error/40',
    badge: 'bg-status-error-surface text-status-error-text',
    avatar: 'bg-status-error-surface text-status-error-text',
    advice: 'bg-status-error-surface text-status-error-text',
    action: 'border-status-error/30 text-status-error-text hover:bg-status-error-surface',
  },
  attention: {
    border: 'border-status-warning/40',
    badge: 'bg-status-warning-surface text-status-warning-text',
    avatar: 'bg-status-warning-surface text-status-warning-text',
    advice: 'bg-status-warning-surface text-status-warning-text',
    action: 'border-status-warning/30 text-status-warning-text hover:bg-status-warning-surface',
  },
  on_track: {
    border: 'border-status-success/40',
    badge: 'bg-status-success-surface text-status-success-text',
    avatar: 'bg-status-success-surface text-status-success-text',
    advice: 'bg-status-success-surface text-status-success-text',
    action: 'border-status-success/30 text-status-success-text hover:bg-status-success-surface',
  },
} as const

const VIEW_OPTIONS: Array<{ value: ManagerTeamView; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'result', label: 'Resultado' },
  { value: 'consistency', label: 'Consistência' },
]

export function ManagerTeamKanban({ cards, view, storeName, onViewChange, onOpenProfile, onAction }: ManagerTeamKanbanProps) {
  const [mobileStatus, setMobileStatus] = useState<Exclude<ManagerTeamStatus, 'not_applicable'>>('critical')
  const groups = useMemo(() => groupManagerTeamCards(cards, view), [cards, view])
  const summary = useMemo(() => summarizeManagerTeam(groups), [groups])
  const activeMobileStatus = groups[mobileStatus].length > 0
    ? mobileStatus
    : STATUS_ORDER.find(status => groups[status].length > 0) ?? 'critical'

  return <div className="space-y-4">
    <section className="rounded-2xl border border-border-subtle bg-white p-4 shadow-sm" data-tour="kanban-equipe" aria-label="Visão do Kanban">
      <div className="mb-1.5 flex items-center gap-1.5"><Eye size={14} className="text-muted-foreground"/><p className="text-xs font-medium text-muted-foreground">Visão do Kanban</p></div>
      <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-surface-alt p-1" role="tablist" aria-label="Classificação da equipe">
        {VIEW_OPTIONS.map(option => <button key={option.value} type="button" role="tab" aria-selected={view === option.value} onClick={() => onViewChange(option.value)} className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${view === option.value ? 'bg-brand-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-white hover:text-foreground'}`}>{option.label}</button>)}
      </div>
      <p className="mt-1.5 text-caption text-muted-foreground">A posição no Kanban muda conforme a visão selecionada.</p>
    </section>

    <div className="sticky top-0 z-[var(--mx-z-topbar)] bg-surface-alt py-1">
      <div className="flex items-center justify-center gap-2 py-2">
      <Users size={15} className="text-status-success-text"/>
      {summary.onTrackPercentage === null ? (
        <p className="text-sm font-semibold text-foreground">Nenhum vendedor elegível no período</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-foreground"><span className="text-base text-status-success-text">{summary.onTrackPercentage}%</span> da equipe Em dia</p>
          <span className="text-xs text-muted-foreground">({summary.eligible} vendedores elegíveis)</span>
        </>
      )}
      </div>
    </div>

    <div className="hidden items-start gap-4 lg:grid lg:grid-cols-3">
      {STATUS_ORDER.map(status => <KanbanColumn key={status} status={status} cards={groups[status]} view={view} storeName={storeName} onOpenProfile={onOpenProfile} onAction={onAction}/>)}
    </div>

    <div data-mx-scroll-region="horizontal" className="-mx-1 hidden snap-x snap-mandatory items-start gap-3 overflow-x-auto px-1 pb-2 md:flex lg:hidden">
      {STATUS_ORDER.map(status => <div key={status} className="w-[300px] shrink-0 snap-start"><KanbanColumn status={status} cards={groups[status]} view={view} storeName={storeName} onOpenProfile={onOpenProfile} onAction={onAction}/></div>)}
    </div>

    <div className="space-y-3 md:hidden">
      <div className="grid grid-cols-3 gap-2">
        {STATUS_ORDER.map(status => {
          const config = COLUMN_CONFIG[status]
          const Icon = config.icon
          const active = activeMobileStatus === status
          return <button key={status} type="button" disabled={groups[status].length === 0} onClick={() => setMobileStatus(status)} className={`rounded-xl border py-2.5 transition-colors ${active ? config.active : groups[status].length === 0 ? 'border-border-subtle bg-surface-alt text-text-disabled' : `${config.header} bg-opacity-60`}`}>
            <span className="flex items-center justify-center gap-1 text-xs font-semibold"><Icon size={14}/>{config.label}</span>
            <span className="mt-0.5 block text-lg font-bold">{groups[status].length}</span>
          </button>
        })}
      </div>
      <KanbanMobileList status={activeMobileStatus} cards={groups[activeMobileStatus]} view={view} storeName={storeName} onOpenProfile={onOpenProfile} onAction={onAction}/>
    </div>

    <NotApplicableSellers cards={groups.not_applicable} storeName={storeName}/>
  </div>
}

type ColumnProps = {
  status: Exclude<ManagerTeamStatus, 'not_applicable'>
  cards: ManagerTeamCard[]
  view: ManagerTeamView
  storeName: string
  onOpenProfile: (row: RankingEntry) => void
  onAction: (action: ManagerTeamAction, row: RankingEntry) => void
}

function KanbanColumn({ status, cards, view, storeName, onOpenProfile, onAction }: ColumnProps) {
  const config = COLUMN_CONFIG[status]
  const Icon = config.icon
  const guidance = MANAGER_TEAM_COLUMN_GUIDANCE[view][status]
  return <section className={`flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border ${config.body}`} aria-label={`${config.label}: ${cards.length}`}>
    <header className={`flex min-h-[52px] items-center justify-between border-b px-4 py-3 ${config.header}`}><div className="flex items-center gap-2"><Icon size={18}/><h2 className="text-sm font-bold">{config.label}</h2></div><span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-bold">{cards.length}</span></header>
    <div className="flex min-h-[100px] flex-1 flex-col gap-3 p-3">{cards.length ? cards.map(card => <ManagerSellerCard key={card.row.user_id} card={card} view={view} status={status} storeName={storeName} onOpenProfile={onOpenProfile} onAction={onAction}/>) : <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">Nenhum vendedor nesta coluna</div>}</div>
    <footer className={`border-t px-3 py-2.5 ${config.footer}`}><p className="text-xs font-semibold">{guidance.title}</p><p className="mt-0.5 text-caption leading-snug">{guidance.detail}</p></footer>
  </section>
}

function KanbanMobileList(props: ColumnProps) {
  const guidance = MANAGER_TEAM_COLUMN_GUIDANCE[props.view][props.status]
  const config = COLUMN_CONFIG[props.status]
  return <>{props.cards.length ? <div className="space-y-3">{props.cards.map(card => <ManagerSellerCard key={card.row.user_id} card={card} view={props.view} status={props.status} storeName={props.storeName} onOpenProfile={props.onOpenProfile} onAction={props.onAction}/>)}</div> : <div className="rounded-2xl border border-border-subtle bg-white py-12 text-center text-sm text-muted-foreground">Nenhum vendedor nesta coluna</div>}<div className={`mt-3 rounded-2xl border p-3 ${config.footer}`}><p className="text-xs font-semibold">{guidance.title}</p><p className="mt-0.5 text-caption leading-snug">{guidance.detail}</p></div></>
}

function ManagerSellerCard({ card, view, status, storeName, onOpenProfile, onAction }: Omit<ColumnProps, 'cards'> & { card: ManagerTeamCard }) {
  const theme = CARD_THEME[status]
  const statusLabel = COLUMN_CONFIG[status].label === 'Críticos' ? 'Crítico' : COLUMN_CONFIG[status].label
  return <article className={`grid min-h-[260px] grid-rows-[auto_auto_1fr_auto] rounded-2xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${theme.border}`}>
    <div className="mb-3 flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2.5"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${theme.avatar}`}>{initials(card.row.user_name)}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{card.row.user_name}</p><p className="truncate text-xs text-muted-foreground">{storeName}</p></div></div><span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-medium ${theme.badge}`}>{statusLabel}</span></div>
    <div className="mb-3 grid grid-cols-2 gap-2"><KanbanMetric label="Resultado" value={card.result} status={card.resultStatus} highlight={view === 'result'}/><KanbanMetric label="Consistência" value={card.consistency} status={card.consistencyStatus} highlight={view === 'consistency'}/></div>
    <div className={`mb-3 rounded-xl p-2.5 ${theme.advice}`}><div className="flex items-start gap-1.5"><TrendingUp size={13} className="mt-0.5 shrink-0"/><p className="min-h-12 text-xs leading-snug">{getManagerTeamNextStep(card, view)}</p></div></div>
    <div className="mt-auto flex items-center gap-1"><button type="button" onClick={() => onOpenProfile(card.row)} className={`flex min-h-9 flex-1 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-semibold transition-colors ${theme.action}`}>Ver perfil completo <ChevronRight size={14}/></button><details className="group relative"><summary aria-label={`Mais ações para ${card.row.user_name}`} className={`grid h-9 w-9 cursor-pointer list-none place-items-center rounded-xl border transition-colors [&::-webkit-details-marker]:hidden ${theme.action}`}><MoreVertical size={14}/></summary><div className="absolute bottom-11 right-0 z-[var(--mx-z-popover)] w-52 overflow-hidden rounded-xl border border-border bg-white p-1 shadow-xl"><ActionItem icon={CalendarClock} label="Ver rotina de hoje" onClick={() => onAction('routine', card.row)}/><ActionItem icon={MessageSquarePlus} label="Registrar feedback" onClick={() => onAction('feedback', card.row)}/><ActionItem icon={FileText} label="Abrir Fechamento Diário" onClick={() => onAction('closing', card.row)}/><ActionItem icon={GraduationCap} label="Recomendar treinamento" onClick={() => onAction('training', card.row)}/><ActionItem icon={Wallet} label="Ver carteira" onClick={() => onAction('wallet', card.row)}/></div></details></div>
  </article>
}

function KanbanMetric({ label, value, status, highlight }: { label: string; value: number | null; status: ManagerTeamStatus; highlight: boolean }) {
  const valueTone = !highlight ? 'text-foreground' : status === 'not_applicable' ? 'text-muted-foreground' : status === 'on_track' ? 'text-status-success-text' : status === 'attention' ? 'text-status-warning-text' : 'text-status-error-text'
  return <div className="rounded-xl border border-border-subtle bg-surface-alt p-2.5 text-center"><p className={`text-xl font-bold ${valueTone}`}>{value === null ? '—' : `${Math.round(value)}%`}</p><p className="text-xs text-muted-foreground">{label}</p></div>
}

function ActionItem({ icon: Icon, label, onClick }: { icon: typeof CalendarClock; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-muted-foreground hover:bg-surface-alt hover:text-foreground"><Icon size={14}/>{label}</button>
}

function NotApplicableSellers({ cards, storeName }: { cards: ManagerTeamCard[]; storeName: string }) {
  if (cards.length === 0) return null
  return <details className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 hover:bg-surface-alt [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-2 text-sm font-semibold text-foreground"><UserX size={16} className="text-muted-foreground"/>Não aplicáveis no período — {cards.length}</span><ChevronDown size={16} className="text-muted-foreground"/></summary><div className="space-y-2 px-4 pb-4">{cards.map(card => <div key={card.row.user_id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-alt p-3"><div className="flex min-w-0 items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">{initials(card.row.user_name)}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{card.row.user_name}</p><p className="truncate text-xs text-muted-foreground">{storeName}</p></div></div><p className="max-w-[220px] text-right text-caption text-muted-foreground">{card.reason}</p></div>)}</div></details>
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : parts[0]?.[0]?.toUpperCase() || '?'
}

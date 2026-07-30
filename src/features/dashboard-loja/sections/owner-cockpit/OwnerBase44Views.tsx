import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Lock,
  MessageSquareText,
  ShieldAlert,
  TrendingUp,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { cn } from '@/lib/utils'
import type { OwnerPerformanceAlert } from '../PerformanceAlerts'
import { ownerPath } from './format'
import { SectionTitle } from './primitives'
import { toneClasses, type ActionRow, type DashboardData } from './types'

type ExecutiveItem = {
  id: string
  title: string
  context: string
  department: string
  owner: string
  due: string
  recommendation: string
  status: string
  tone: ActionRow['tone']
  origin: string
}

function buildExecutiveItems(alerts: OwnerPerformanceAlert[], actions: ActionRow[]): ExecutiveItem[] {
  const fromActions = actions.map(action => ({
    id: `action-${action.id}`,
    title: action.problem,
    context: action.action,
    department: action.department,
    owner: action.owner,
    due: action.due,
    recommendation: action.recommendation,
    status: action.status,
    tone: action.tone,
    origin: action.origin,
  }))

  const fromAlerts = alerts.map((alert, index) => ({
    id: `alert-${index}-${alert.title}-${alert.variant}`,
    title: alert.title,
    context: alert.description,
    department: 'Executivo',
    owner: 'Dono da loja',
    due: alert.variant === 'danger' ? 'Hoje' : 'Próximo ciclo',
    recommendation: alert.recommendation,
    status: alert.variant === 'danger' ? 'Crítico' : alert.variant === 'warning' ? 'Atenção' : 'Monitorar',
    tone: alert.variant === 'danger' ? 'danger' as const : alert.variant === 'warning' ? 'warning' as const : 'info' as const,
    origin: 'Alerta executivo',
  }))

  const priority = { danger: 0, warning: 1, purple: 2, info: 3, brand: 4, success: 5, muted: 6 }
  return [...fromActions, ...fromAlerts].sort((a, b) => priority[a.tone] - priority[b.tone])
}

export function OwnerRoutineView({
  data,
  alerts,
  actions,
}: {
  data: DashboardData
  alerts: OwnerPerformanceAlert[]
  actions: ActionRow[]
}) {
  const navigate = useNavigate()
  const openActions = actions.filter(action => action.status !== 'Concluída')
  const criticalAlerts = alerts.filter(alert => alert.variant === 'danger' || alert.variant === 'warning')
  const actionPreview = openActions.slice(0, 5)
  const alertPreview = criticalAlerts.slice(0, 4)
  const confirmedAppointments = (data.checkins || [])
    .filter(checkin => checkin.reference_date === data.referenceDate)
    .reduce(
      (total, checkin) => total + (checkin.agd_cart_today || 0) + (checkin.agd_net_today || 0),
      0,
    )

  const activeSellers = (data.sellers || []).filter(s => s.active && !s.is_venda_loja)
  const sellerStatus = useMemo(() => {
    const checkinsBySeller = (data.checkins || []).reduce((acc, c) => {
      if (!acc[c.seller_user_id]) acc[c.seller_user_id] = []
      acc[c.seller_user_id].push(c)
      return acc
    }, {} as Record<string, typeof data.checkins>)

    return activeSellers.map(seller => {
      const sellerCheckins = checkinsBySeller[seller.id] || []
      const todayCheckin = sellerCheckins.find(c => c.reference_date === data.referenceDate)
      const totalSales = sellerCheckins.reduce((sum, c) => sum + (c.vnd_porta_prev_day || 0) + (c.vnd_cart_prev_day || 0) + (c.vnd_net_prev_day || 0), 0)
      const totalLeads = sellerCheckins.reduce((sum, c) => sum + (c.leads_prev_day || 0), 0)
      const totalAgd = sellerCheckins.reduce((sum, c) => sum + (c.agd_cart_today || 0) + (c.agd_net_today || 0), 0)

      return {
        id: seller.id,
        name: seller.name,
        checkedIn: seller.checkin_today,
        hasTodayCheckin: Boolean(todayCheckin),
        sales: totalSales,
        leads: totalLeads,
        appointments: totalAgd,
      }
    })
  }, [activeSellers, data.checkins, data.referenceDate])

  const checkedInCount = sellerStatus.filter(s => s.checkedIn).length
  const pendingSellers = sellerStatus.filter(s => !s.checkedIn)

  return (
    <div className="space-y-mx-md">
      <SectionTitle
        title="Rotina do Dia"
        subtitle="O que precisa da atenção do Dono hoje, sem transformar a diretoria em uma lista infinita de tarefas."
      />

      <div className="grid grid-cols-1 gap-mx-md md:grid-cols-3">
        <RoutineMetric
          label="Agenda comercial"
          value={confirmedAppointments}
          detail="Agendamentos registrados na data de referência."
          icon={<CalendarClock size={20} />}
          tone="success"
        />
        <RoutineMetric
          label="Ações abertas"
          value={openActions.length}
          detail="Prioridades do plano que ainda exigem execução ou validação."
          icon={<ClipboardCheck size={20} />}
          tone="warning"
        />
        <RoutineMetric
          label="Riscos prioritários"
          value={criticalAlerts.length}
          detail="Alertas críticos ou em atenção que merecem intervenção executiva."
          icon={<ShieldAlert size={20} />}
          tone="danger"
        />
      </div>

      {/* Fechamento Diário da Equipe */}
      <Card className="border bg-white p-mx-lg">
        <div className="flex items-center justify-between gap-mx-sm">
          <div className="flex items-center gap-mx-sm">
            <span className="flex h-mx-10 w-mx-10 items-center justify-center rounded-mx-xl bg-brand-primary/10">
              <Users size={20} className="text-brand-primary" />
            </span>
            <div>
              <Typography variant="h3" className="text-xl">Fechamento Diário da Equipe</Typography>
              <Typography variant="p" tone="muted" className="mt-1 text-sm font-bold">
                {checkedInCount}/{activeSellers.length} vendedores realizaram o fechamento
              </Typography>
            </div>
          </div>
          {pendingSellers.length > 0 && (
            <span className="rounded-mx-md border border-status-error/20 bg-status-error-surface px-mx-sm py-mx-xs text-mx-tiny font-black text-status-error">
              {pendingSellers.length} pendente{pendingSellers.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="mt-mx-md overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-surface-alt">
              <tr>
                <th className="px-mx-md py-mx-sm text-left text-mx-tiny font-black uppercase tracking-mx-wide text-text-tertiary">Vendedor</th>
                <th className="px-mx-md py-mx-sm text-left text-mx-tiny font-black uppercase tracking-mx-wide text-text-tertiary">Status</th>
                <th className="px-mx-md py-mx-sm text-center text-mx-tiny font-black uppercase tracking-mx-wide text-text-tertiary">Vendas</th>
                <th className="px-mx-md py-mx-sm text-center text-mx-tiny font-black uppercase tracking-mx-wide text-text-tertiary">Leads</th>
                <th className="px-mx-md py-mx-sm text-center text-mx-tiny font-black uppercase tracking-mx-wide text-text-tertiary">Agendamentos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {sellerStatus.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-mx-md py-mx-lg text-center text-sm font-bold text-text-tertiary">
                    Nenhum vendedor vinculado a esta loja.
                  </td>
                </tr>
              ) : sellerStatus.map(seller => (
                <tr key={seller.id} className="transition-colors hover:bg-surface-alt">
                  <td className="px-mx-md py-mx-sm font-black text-text-primary">{seller.name}</td>
                  <td className="px-mx-md py-mx-sm">
                    <span className={cn(
                      'rounded-mx-md px-mx-sm py-mx-xs text-mx-tiny font-black uppercase',
                      seller.checkedIn
                        ? 'bg-status-success-surface text-status-success'
                        : 'bg-status-error-surface text-status-error'
                    )}>
                      {seller.checkedIn ? 'Fechamento feito' : 'Fechamento pendente'}
                    </span>
                  </td>
                  <td className="px-mx-md py-mx-sm text-center tabular-nums font-black">{seller.sales}</td>
                  <td className="px-mx-md py-mx-sm text-center tabular-nums font-black">{seller.leads}</td>
                  <td className="px-mx-md py-mx-sm text-center tabular-nums font-black">{seller.appointments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pendingSellers.length > 0 && (
          <div className="mt-mx-md rounded-mx-xl border border-status-warning/20 bg-status-warning-surface p-mx-md">
            <Typography variant="tiny" className="block text-status-warning">
              Vendedores pendentes
            </Typography>
            <Typography variant="p" className="mt-mx-xs text-sm font-bold text-status-warning">
              {pendingSellers.map(s => s.name).join(', ')}
            </Typography>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-mx-md xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="border bg-white p-mx-lg">
          <div className="flex items-center justify-between gap-mx-sm">
            <div>
              <Typography variant="h3" className="text-xl">Próximas ações do Dono</Typography>
              <Typography variant="p" tone="muted" className="mt-1 text-sm font-bold">Acompanhe, delegue ou converta o desvio em execução.</Typography>
            </div>
            <Button type="button" variant="outline" className="bg-white" onClick={() => navigate(ownerPath('plano-acao'))}>
              Ver plano <ArrowRight size={16} />
            </Button>
          </div>
          <div className="mt-mx-md divide-y divide-border-subtle">
            {actionPreview.length === 0 ? (
              <div className="rounded-mx-xl bg-status-success-surface p-mx-md text-status-success">
                <CheckCircle2 size={20} />
                <p className="mt-mx-xs text-sm font-black">Nenhuma ação executiva pendente neste recorte.</p>
              </div>
            ) : actionPreview.map((action, index) => (
              <button
                type="button"
                key={action.id}
                onClick={() => navigate(ownerPath('plano-acao'))}
                className="flex w-full items-start gap-mx-md py-mx-md text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              >
                <span className="mt-0.5 flex h-mx-8 w-mx-8 shrink-0 items-center justify-center rounded-mx-lg bg-surface-alt text-xs font-black text-text-secondary">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-text-primary">{action.action}</span>
                  <span className="mt-1 block text-sm font-bold text-text-tertiary">{action.owner} · {action.due} · {action.department}</span>
                </span>
                <ArrowRight size={17} className="mt-1 shrink-0 text-text-tertiary" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="border bg-white p-mx-lg">
          <Typography variant="h3" className="text-xl">Riscos e intervenções</Typography>
          <div className="mt-mx-md space-y-mx-sm">
            {alertPreview.length === 0 ? (
              <p className="rounded-mx-xl bg-surface-alt p-mx-md text-sm font-bold text-text-tertiary">Nenhum alerta prioritário no período.</p>
            ) : alertPreview.map((alert, index) => (
              <button
                type="button"
                key={`${alert.title}-${alert.description}-${index}`}
                onClick={() => navigate(ownerPath('decisoes'))}
                className="w-full rounded-mx-xl border border-border-subtle p-mx-md text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
              >
                <div className="flex items-center gap-mx-sm">
                  <AlertTriangle size={17} className={alert.variant === 'danger' ? 'text-status-error' : 'text-status-warning'} />
                  <span className="font-black text-text-primary">{alert.title}</span>
                </div>
                <p className="mt-mx-xs text-sm font-bold text-text-tertiary">{alert.description}</p>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function RoutineMetric({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string
  value: number
  detail: string
  icon: ReactNode
  tone: 'success' | 'warning' | 'danger'
}) {
  const classes = toneClasses[tone]
  return (
    <Card className="border bg-white p-mx-lg">
      <div className="flex items-center gap-mx-sm">
        <span className={cn('flex h-mx-10 w-mx-10 items-center justify-center rounded-mx-xl', classes.soft)}>{icon}</span>
        <div>
          <Typography variant="tiny" tone="muted" className="">{label}</Typography>
          <Typography variant="h2" className="text-3xl tabular-nums">{value}</Typography>
        </div>
      </div>
      <Typography variant="p" tone="muted" className="mt-mx-sm text-sm font-bold">{detail}</Typography>
    </Card>
  )
}

export function OwnerDecisionCenter({
  alerts,
  actions,
  storeId,
}: {
  alerts: OwnerPerformanceAlert[]
  actions: ActionRow[]
  storeId?: string | null
}) {
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const items = useMemo(() => buildExecutiveItems(alerts, actions), [actions, alerts])
  const itemPreview = items.slice(0, 12)

  return (
    <div className="space-y-mx-md">
      <SectionTitle
        title="Central de Decisões"
        subtitle="Prioridades que dependem de aprovação, direção ou intervenção do Dono."
      />

      <div className="grid grid-cols-1 gap-mx-md md:grid-cols-3">
        <DecisionMetric label="Precisam de você" value={items.length} icon={<UserRoundCheck size={20} />} tone="purple" />
        <DecisionMetric label="Críticas" value={items.filter(item => item.tone === 'danger').length} icon={<ShieldAlert size={20} />} tone="danger" />
        <DecisionMetric label="Em atenção" value={items.filter(item => item.tone === 'warning').length} icon={<Clock3 size={20} />} tone="warning" />
      </div>

      <div className="space-y-mx-md">
        {itemPreview.length === 0 ? (
          <Card className="border bg-white p-mx-xl text-center">
            <CheckCircle2 size={32} className="mx-auto text-status-success" />
            <Typography variant="h3" className="mt-mx-sm text-xl">Fila executiva tratada</Typography>
            <Typography variant="p" tone="muted" className="mt-mx-xs font-bold">Não há decisões prioritárias neste recorte.</Typography>
          </Card>
        ) : itemPreview.map(item => {
          const classes = toneClasses[item.tone]
          const expanded = expandedId === item.id
          return (
            <Card key={item.id} className={cn('rounded-mx-2xl border bg-white p-mx-lg shadow-mx-sm', classes.border)}>
              <div className="flex flex-col gap-mx-md xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-mx-sm">
                    <span className={cn('rounded-mx-md border px-mx-sm py-mx-xs text-mx-tiny font-black', classes.soft)}>{item.status}</span>
                    <span className="rounded-mx-md bg-surface-alt px-mx-sm py-mx-xs text-mx-tiny font-black text-text-secondary">{item.department}</span>
                    <span className="text-mx-tiny font-black uppercase tracking-mx-wide text-text-tertiary">{item.origin}</span>
                  </div>
                  <Typography variant="h3" className="mt-mx-sm text-xl">{item.title}</Typography>
                  <Typography variant="p" tone="muted" className="mt-mx-xs font-bold leading-relaxed">{item.context}</Typography>
                  <div className="mt-mx-sm flex flex-wrap gap-x-mx-lg gap-y-mx-xs text-sm font-bold text-text-secondary">
                    <span>Prazo: <strong className={classes.text}>{item.due}</strong></span>
                    <span>Responsável: <strong>{item.owner}</strong></span>
                  </div>
                  {expanded && (
                    <div className="mt-mx-md rounded-mx-xl bg-surface-alt p-mx-md">
                      <p className="text-mx-tiny font-black uppercase tracking-mx-wide text-text-tertiary">Direcionamento MX</p>
                      <p className="mt-mx-xs text-sm font-black leading-relaxed text-text-primary">{item.recommendation}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-mx-sm xl:max-w-[390px] xl:justify-end">
                  <Button type="button" variant="outline" className="bg-white" onClick={() => setExpandedId(expanded ? null : item.id)}>
                    {expanded ? 'Fechar análise' : 'Analisar'}
                  </Button>
                  <Button type="button" className="" onClick={() => navigate(ownerPath('plano-acao'))}>
                    Abrir plano de ação
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className=""
                    onClick={() => navigate(`/falar-consultor?storeId=${encodeURIComponent(storeId || '')}&origem=central-decisoes&titulo=${encodeURIComponent(item.title)}`)}
                  >
                    <MessageSquareText size={16} /> Falar com Consultor
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function DecisionMetric({ label, value, icon, tone }: { label: string; value: number; icon: ReactNode; tone: ActionRow['tone'] }) {
  const classes = toneClasses[tone]
  return (
    <Card className="border bg-white p-mx-lg">
      <div className="flex items-center gap-mx-sm">
        <span className={cn('flex h-mx-10 w-mx-10 items-center justify-center rounded-mx-xl', classes.soft)}>{icon}</span>
        <div>
          <Typography variant="tiny" tone="muted" className="">{label}</Typography>
          <Typography variant="h2" className="text-3xl tabular-nums">{value}</Typography>
        </div>
      </div>
    </Card>
  )
}

export function OwnerConsultingView({ data }: { data: DashboardData }) {
  const navigate = useNavigate()
  const program = data.consultingProgram
  const contextQuery = `storeId=${encodeURIComponent(data.operationalStore?.id || '')}&origem=consultoria`
  const completedVisits = program?.visitsCompleted ?? 0
  const totalVisits = program?.totalVisits ?? 0
  const completion = totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : null
  const nextVisit = program?.nextVisitNumber || (totalVisits > completedVisits ? completedVisits + 1 : null)
  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${data.referenceDate}T12:00:00`))
  const activeProgram = program?.programKey || 'pmr'
  const programCards = [
    { key: 'pmr', name: activeProgram === 'pmr' ? program?.programName || 'PMR' : 'PMR', detail: 'Programa de implementação e acompanhamento.', total: activeProgram === 'pmr' ? totalVisits : null },
    { key: 'pmr_plus', name: 'PMR Plus', detail: 'Processos, acompanhamento e organização financeira.', total: null },
    { key: 'ppa', name: 'PPA', detail: 'Modelo de negócio, planejamento e eficiência em custo.', total: null },
  ]
  const journeyTotal = Math.max(totalVisits, 1)
  const departmentFocus = data.metrics.storeName
    ? [
        { label: 'Unidade', value: data.metrics.storeName, score: data.metrics.attainment },
        { label: 'Vendas no período', value: `${data.metrics.totalSales}`, score: data.metrics.attainment },
        { label: 'Estoque acima de 90 dias', value: `${data.inventory?.agingOver90 ?? 0}`, score: null },
        { label: 'Disciplina operacional', value: `${data.pendingDisciplineSellers.length} pendências`, score: null },
      ]
    : []

  return (
    <div className="space-y-mx-md">
      <div className="flex flex-col gap-mx-xs sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle title="Consultoria" subtitle="Acompanhe o plano contratado, encontros e implicações" />
        <span className="inline-flex w-fit items-center gap-mx-xs rounded-mx-full bg-status-success-surface px-mx-sm py-mx-xs text-mx-tiny font-bold text-status-success">
          <TrendingUp size={14} /> Estágio atual: {program?.clientStatus || 'Não informado'}
        </span>
      </div>

      {data.consultingLoading ? (
        <Card className="border bg-white p-mx-lg"><Typography variant="p" tone="muted">Carregando programa de consultoria…</Typography></Card>
      ) : data.consultingError || !program ? (
        <Card className="border border-dashed bg-white p-mx-lg text-center">
          <Typography variant="h3">Nenhum programa de consultoria ativo</Typography>
          <Typography variant="p" tone="muted" className="mt-mx-xs">{data.consultingError || 'Esta unidade ainda não possui um programa vinculado.'}</Typography>
        </Card>
      ) : (
        <>
          <Card className="border bg-white p-mx-md">
            <div className="grid gap-mx-md xl:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <span className="inline-flex rounded-mx-full bg-status-success-surface px-mx-sm py-mx-xs text-mx-tiny font-bold text-status-success">Programa contratado</span>
                <div className="mt-mx-xs flex flex-wrap items-center gap-mx-xs">
                  <Typography variant="h2" className="text-xl font-bold">{program.programName}</Typography>
                  <span className="inline-flex items-center gap-1 rounded-mx-full bg-status-success-surface px-mx-xs py-0.5 text-mx-tiny font-bold text-status-success"><span className="h-1.5 w-1.5 rounded-full bg-status-success" />Ativo</span>
                </div>
                <Typography variant="p" tone="muted" className="mt-mx-xs text-sm">Acompanhamento do programa no recorte de {monthLabel}.</Typography>
                <div className="mt-mx-sm flex flex-wrap gap-x-mx-md gap-y-mx-xs text-mx-tiny text-text-secondary">
                  <span>Modalidade: <strong className="text-text-primary">{program.clientModality || 'Não informado'}</strong></span>
                  <span>Encontros: <strong className="text-text-primary">{completedVisits} de {totalVisits || '—'}</strong></span>
                  <span>Status: <strong className="text-text-primary">{program.clientStatus || 'Não informado'}</strong></span>
                </div>
                <div className="mt-mx-md grid gap-mx-sm sm:grid-cols-3">
                  <ConsultingMetric label="Encontros realizados" completed={completedVisits} total={totalVisits} percent={completion} />
                  <ConsultingMetric label="Próximo encontro" completed={nextVisit ? `#${nextVisit}` : '—'} total="" percent={null} />
                  <ConsultingMetric label="Dados do programa" completed={program.clientId ? 'Disponível' : '—'} total="" percent={null} />
                </div>
              </div>
              <div className="rounded-mx-lg border border-brand-primary/20 bg-brand-primary/5 p-mx-md">
                <Typography variant="tiny" tone="muted" className="font-bold">Próximo encontro</Typography>
                <Typography variant="p" className="mt-mx-xs font-bold">{nextVisit ? `Encontro ${nextVisit}` : 'A agendar'}</Typography>
                <Typography variant="p" className="text-sm">{program.nextVisitObjective || 'Objetivo ainda não informado.'}</Typography>
                <Typography variant="tiny" tone="muted" className="mt-mx-xs block">{program.nextVisitScheduledAt ? new Date(program.nextVisitScheduledAt).toLocaleString('pt-BR') : 'Sem data registrada'}</Typography>
                <div className="mt-mx-sm space-y-mx-xs">
                  {program.nextVisitMeetLink && <a href={program.nextVisitMeetLink} target="_blank" rel="noreferrer" className="flex h-mx-10 items-center justify-center rounded-mx-lg bg-brand-primary px-mx-sm text-mx-tiny font-bold text-white">Entrar na Reunião</a>}
                  <button type="button" onClick={() => navigate(`/falar-consultor?${contextQuery}`)} className="flex h-mx-10 w-full items-center justify-center gap-mx-xs rounded-mx-lg border border-border-subtle bg-white text-mx-tiny font-bold text-text-primary">Falar com Consultor <ArrowRight size={14} /></button>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-mx-sm md:grid-cols-3">
            {programCards.map(card => {
              const isActive = card.key === activeProgram
              return (
                <div key={card.key} className={cn('rounded-mx-xl border bg-white p-mx-md', isActive ? 'border-brand-primary bg-brand-primary/5' : 'border-border-subtle opacity-60')}>
                  <div className="flex items-center justify-between"><span className={cn('rounded-mx-full px-mx-xs py-0.5 text-mx-tiny font-bold', isActive ? 'bg-brand-primary text-white' : 'bg-surface-alt text-text-secondary')}>{isActive ? 'Ativo' : 'Bloqueado'}</span>{!isActive && <Lock size={15} className="text-text-tertiary" />}</div>
                  <Typography variant="p" className="mt-mx-sm font-bold">{card.name}</Typography>
                  <Typography variant="tiny" tone="muted" className="mt-mx-xs block line-clamp-2">{card.detail}</Typography>
                  <Typography variant="tiny" tone="muted" className="mt-mx-sm block">{card.total ? `${card.total} encontros` : 'Detalhes não disponíveis'}</Typography>
                </div>
              )
            })}
          </div>

          <Card className="border bg-white p-mx-md">
            <Typography variant="h3" className="text-base font-bold">Jornada do Programa</Typography>
            <div className="mt-mx-sm flex gap-mx-xs"><span className="flex-1 rounded-mx-lg border border-border-subtle px-mx-sm py-mx-xs text-mx-tiny"><strong>Implementação</strong> 1–{journeyTotal}</span><span className="flex-1 rounded-mx-lg border border-border-subtle px-mx-sm py-mx-xs text-mx-tiny"><strong>Acompanhamento</strong> —</span></div>
            <div className="mt-mx-md flex flex-wrap gap-x-1 gap-y-mx-sm">
              {Array.from({ length: journeyTotal }, (_, index) => {
                const number = index + 1
                const completed = number <= completedVisits
                const current = number === nextVisit
                return <div key={number} className="flex min-w-[76px] flex-1 flex-col items-center text-center"><div className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 text-mx-tiny font-bold', completed ? 'border-brand-primary bg-brand-primary text-white' : current ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-border-default bg-surface-alt text-text-tertiary')}>{completed ? '✓' : number}</div><span className={cn('mt-mx-xs text-mx-tiny', current ? 'font-bold text-text-primary' : 'text-text-tertiary')}>{current ? program.nextVisitObjective || 'Próximo encontro' : `Encontro ${number}`}</span><span className="mt-0.5 text-[10px] text-text-tertiary">{completed ? 'Concluído' : current ? 'Agendado' : 'Pendente'}</span></div>
              })}
            </div>
          </Card>

          <Card className="border bg-white p-mx-md">
            <Typography variant="h3" className="text-base font-bold">Focos atuais do ciclo</Typography>
            <div className="mt-mx-sm grid gap-mx-sm sm:grid-cols-2 xl:grid-cols-4">
              {departmentFocus.map(focus => <div key={focus.label} className="rounded-mx-lg border border-border-subtle bg-surface-alt/50 p-mx-sm"><Typography variant="tiny" className="font-bold">{focus.label}</Typography><Typography variant="p" className="mt-mx-xs font-bold">{focus.value}</Typography><Typography variant="tiny" tone="muted" className="mt-mx-xs block">{focus.score == null ? 'Sem score registrado' : `${Math.max(0, Math.min(100, Math.round(focus.score)))}% no recorte atual`}</Typography></div>)}
            </div>
          </Card>

          <Card className="border bg-white p-mx-md"><Typography variant="h3" className="text-base font-bold">Detalhes</Typography><div className="mt-mx-sm grid gap-x-mx-md gap-y-mx-xs text-mx-tiny text-text-secondary sm:grid-cols-3"><span>Consultor: <strong className="text-text-primary">Não informado</strong></span><span>Cliente: <strong className="text-text-primary">{program.clientId}</strong></span><span>Início: <strong className="text-text-primary">Não informado</strong></span></div></Card>
        </>
      )}
    </div>
  )
}

function ConsultingMetric({ label, completed, total, percent }: { label: string; completed: string | number; total: string | number; percent: number | null }) {
  return <div className="rounded-lg border border-border-subtle bg-surface-alt/60 p-mx-sm"><Typography variant="tiny" className="font-bold">{label}</Typography><div className="mt-mx-xs flex items-baseline gap-1"><span className="text-base font-bold text-text-primary">{completed}</span>{total !== '' && <span className="text-mx-tiny text-text-tertiary">de {total}</span>}{percent != null && <span className="ml-auto text-mx-tiny text-text-tertiary">{percent}%</span>}</div>{percent != null && <div className="mt-mx-xs h-1.5 overflow-hidden rounded-full bg-border-subtle"><div className="h-full rounded-full bg-brand-primary" style={{ width: `${percent}%` }} /></div>}</div>
}

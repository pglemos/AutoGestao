import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckSquare,
  Gauge,
  Medal,
  MessageSquare,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { PageHeading } from '@/components/molecules/PageHeading'
import { chartTokens } from '@/lib/charts/tokens'
import { calcularProjecao, getDiasInfo } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import type { RankingEntry } from '@/types/database'
import type { OwnerPerformanceAlert } from './PerformanceAlerts'
import type { useDashboardLojaData } from '../hooks/useDashboardLojaData'

type DashboardData = ReturnType<typeof useDashboardLojaData>
type ManagerTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

type ManagerOperationalCockpitProps = {
  data: DashboardData
  alerts: OwnerPerformanceAlert[]
}

export function ManagerOperationalCockpit({ data, alerts }: ManagerOperationalCockpitProps) {
  const navigate = useNavigate()
  const days = getDiasInfo(data.referenceDate, data.operationalMetaRules?.projection_mode || 'calendar')
  const projection = calcularProjecao(data.metrics.totalSales, days.decorridos, days.total)
  const idealPace = data.metrics.goalValue > 0 && days.total > 0 ? data.metrics.goalValue / days.total : 0
  const currentPace = days.decorridos > 0 ? data.metrics.totalSales / days.decorridos : 0
  const sellersTotal = data.sellers?.length || 0
  const disciplinePct = sellersTotal > 0 ? Math.round((data.metrics.checkedInCount / sellersTotal) * 100) : 0
  const conversionScore = data.funnelBenchmarks.visitaVnd > 0
    ? Math.min(100, Math.round((data.funilData.tx_visita_vnd / data.funnelBenchmarks.visitaVnd) * 100))
    : 0
  const mxScore = Math.round((Math.min(data.metrics.attainment, 100) * 0.45) + (conversionScore * 0.35) + (disciplinePct * 0.2))
  const gap = Math.max(data.metrics.goalValue - data.metrics.totalSales, 0)
  const visibleRanking = data.metrics.ranking.slice(0, 5)
  const pendingNames = data.pendingDisciplineSellers.map(seller => seller.name).filter(Boolean)

  const teamEngagementComputed = Math.round((disciplinePct * 0.45) + (Math.min(data.metrics.attainment, 100) * 0.35) + (conversionScore * 0.2))
  const teamEngagement = data.checkins.length > 0 ? teamEngagementComputed : 0
  const channelTotals = data.checkins.reduce(
    (acc, checkin) => {
      acc.carteiraAgd += (checkin.agd_cart_prev_day || 0) + (checkin.agd_cart_today || 0)
      acc.carteiraVendas += checkin.vnd_cart_prev_day || 0
      acc.portaVendas += checkin.vnd_porta_prev_day || 0
      return acc
    },
    { carteiraAgd: 0, carteiraVendas: 0, portaVendas: 0 },
  )
  const carteiraShare = data.funilData.agd_total > 0 ? channelTotals.carteiraAgd / data.funilData.agd_total : 0
  const carteiraVisits = Math.round(data.funilData.visitas * carteiraShare)
  const portaAttendances = Math.max(data.funilData.visitas - carteiraVisits, 0)
  const segmentedFunnelRows = [
    {
      label: 'LEADS',
      tone: 'brand' as ManagerTone,
      stages: [
        { label: 'Leads Recebidos', value: data.funilData.leads },
        { label: 'Agendamentos', value: data.funilData.agd_total, pct: data.funilData.tx_lead_agd },
        { label: 'Visitas', value: data.funilData.visitas, pct: data.funilData.tx_agd_visita },
        { label: 'Vendas', value: data.funilData.vnd_total, pct: data.funilData.tx_visita_vnd },
      ],
    },
    {
      label: 'CARTEIRA',
      tone: 'success' as ManagerTone,
      stages: [
        { label: 'Contatos', value: channelTotals.carteiraAgd > 0 ? Math.round(channelTotals.carteiraAgd / 0.3) : 0 },
        { label: 'Agendamentos', value: channelTotals.carteiraAgd, pct: percent(channelTotals.carteiraAgd, channelTotals.carteiraAgd > 0 ? Math.round(channelTotals.carteiraAgd / 0.3) : 0) },
        { label: 'Visitas', value: carteiraVisits, pct: percent(carteiraVisits, channelTotals.carteiraAgd) },
        { label: 'Vendas', value: channelTotals.carteiraVendas, pct: percent(channelTotals.carteiraVendas, carteiraVisits) },
      ],
    },
    {
      label: 'PORTA',
      tone: 'warning' as ManagerTone,
      stages: [
        { label: 'Atendimentos', value: portaAttendances },
        { label: 'Vendas', value: channelTotals.portaVendas, pct: percent(channelTotals.portaVendas, portaAttendances) },
      ],
    },
  ]
  const engagementMetrics: Array<{ label: string; value: number; icon: ReactNode; accent: 'info' | 'success' | 'warning' | 'teal' | 'brand' }> = [
    { label: 'Fechamento diário', value: disciplinePct, icon: <CheckSquare size={18} />, accent: 'info' },
    { label: 'Agenda cumprida', value: data.metrics.totalAgd > 0 ? 100 : 0, icon: <CalendarDays size={18} />, accent: 'success' },
    { label: 'Treinamentos', value: 0, icon: <Target size={18} />, accent: 'warning' },
    { label: 'Feedbacks', value: 0, icon: <MessageSquare size={18} />, accent: 'teal' },
    { label: 'Participação', value: teamEngagement, icon: <Users size={18} />, accent: 'brand' },
  ]
  return (
    <div className="flex flex-col gap-mx-lg pb-28">
      <ManagerHeader storeName={data.metrics.storeName} periodLabel={formatPeriodLabel(data.referenceDate)} />

      <section className="grid grid-cols-1 gap-mx-lg md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(320px,1.5fr)_repeat(4,minmax(190px,1fr))]" aria-label="Indicadores gerenciais">
        <Card className="border bg-white p-mx-md">
          <div className="flex items-center gap-mx-sm">
            <MetricIcon tone="brand"><Target size={22} /></MetricIcon>
            <Typography variant="h3" className="tracking-tight">Meta do Mês</Typography>
          </div>
          <div className="mt-mx-lg grid grid-cols-3 divide-x divide-border-subtle text-center">
            <MiniStat label="Meta" value={formatInteger(data.metrics.goalValue)} detail="veículos" />
            <MiniStat label="Realizado" value={formatInteger(data.metrics.totalSales)} detail="veículos" />
            <MiniStat label="Projeção" value={formatInteger(projection)} detail="veículos" />
          </div>
          <ProgressBar value={data.metrics.attainment} className="mt-mx-lg" tone={data.metrics.attainment >= 80 ? 'success' : 'brand'} />
          <div className="mt-mx-sm flex flex-col gap-mx-xs sm:flex-row sm:items-center sm:justify-between">
            <Typography variant="tiny" tone="muted" className="">{data.metrics.attainment}% da meta alcançada</Typography>
            <Typography variant="tiny" tone={gap > 0 ? 'warning' : 'success'} className="font-bold">{gap > 0 ? `Faltam ${gap} veículos` : 'Meta atingida'}</Typography>
          </div>
        </Card>

        <ManagerKpiCard
          title="Ritmo Diário"
          value={formatDecimal(currentPace)}
          detail={`Ideal ${formatDecimal(idealPace)} veic/dia`}
          status={currentPace >= idealPace ? 'Dentro do ritmo' : 'Abaixo do ritmo ideal'}
          icon={<BarChart3 size={22} />}
          tone={currentPace >= idealPace ? 'success' : 'danger'}
        />
        <ManagerKpiCard
          title="Conversão Geral"
          value={`${data.funilData.tx_visita_vnd}%`}
          detail={`Meta ${data.funnelBenchmarks.visitaVnd}% visita > venda`}
          status={data.funilData.tx_visita_vnd >= data.funnelBenchmarks.visitaVnd ? 'Conversão saudável' : `${data.funnelBenchmarks.visitaVnd - data.funilData.tx_visita_vnd} p.p. abaixo`}
          icon={<Gauge size={22} />}
          tone={data.funilData.tx_visita_vnd >= data.funnelBenchmarks.visitaVnd ? 'success' : 'danger'}
        />
        <ManagerKpiCard
          title="Agendamentos Hoje"
          value={formatInteger(data.metrics.totalAgd)}
          detail="agenda comercial registrada"
          status={data.metrics.totalAgd > 0 ? 'Com movimento no dia' : 'Sem agendamentos lançados'}
          icon={<CalendarDays size={22} />}
          tone={data.metrics.totalAgd > 0 ? 'success' : 'warning'}
        />
        <Card className="min-h-[188px] border bg-white p-mx-md">
          <div className="flex items-center justify-between gap-mx-sm">
            <Typography variant="tiny" tone="muted" className="">MX Score Loja</Typography>
            <Gauge size={18} className="text-muted-foreground" />
          </div>
          <div className="mt-mx-md flex items-center justify-center">
            <SemiCircularGauge value={mxScore} label={scoreLabel(mxScore)} />
          </div>
          <Typography variant="tiny" tone="muted" className="mt-mx-xs block text-center font-bold normal-case tracking-normal">
            Meta · Conversão · Disciplina
          </Typography>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-mx-lg xl:grid-cols-2 2xl:grid-cols-12" aria-label="Operação da equipe">
        <Card className="border bg-white xl:col-span-1 2xl:col-span-5">
          <PanelHeader title="Desempenho da Equipe" action="Ver equipe" onAction={() => navigate('?tab=equipe')} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px]">
              <thead className="bg-gray-50/60">
                <tr>
                  {['Vendedor', 'Vendas', 'Meta', 'Agenda', 'Disciplina', 'Status'].map(header => (
                    <th key={header} className="px-mx-md py-mx-sm text-left text-mx-tiny font-bold uppercase tracking-widest text-muted-foreground">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {visibleRanking.length > 0 ? visibleRanking.map(row => (
                  <TeamRow key={row.user_id} row={row} />
                )) : (
                  <tr>
                    <td colSpan={6} className="px-mx-md py-mx-lg text-center">
                      <Typography variant="p" tone="muted">Equipe sem lançamentos no período selecionado.</Typography>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border bg-white p-mx-md xl:col-span-1 2xl:col-span-4">
          <div className="flex items-center justify-between gap-mx-md">
            <div>
              <Typography variant="h3" className="tracking-tight">Funil de Vendas da Equipe</Typography>
              <Typography variant="tiny" tone="muted" className="mt-mx-tiny block">Leads, agenda, visitas e vendas</Typography>
            </div>
            <Badge variant="outline" className="shrink-0 rounded-mx-full">Mês atual</Badge>
          </div>
          <div className="mt-mx-lg space-y-mx-md">
            {segmentedFunnelRows.map(row => (
              <FunnelSegmentRow key={row.label} label={row.label} tone={row.tone} stages={row.stages} />
            ))}
          </div>
          <div className="mt-mx-lg flex items-center justify-between rounded-xl bg-mx-indigo-50 px-mx-md py-mx-sm">
            <Typography variant="tiny" tone="brand" className="">Total de Vendas: {formatInteger(data.funilData.vnd_total)}</Typography>
            <Typography variant="tiny" tone="brand" className="">Conversão geral</Typography>
            <Typography variant="h3" tone={data.funilData.tx_visita_vnd >= data.funnelBenchmarks.visitaVnd ? 'success' : 'error'}>{data.funilData.tx_visita_vnd}%</Typography>
          </div>
        </Card>

        <Card className="border bg-white xl:col-span-2 2xl:col-span-3">
          <PanelHeader title="Alertas Importantes" badge={alerts.length} action="Ver todos" onAction={() => navigate('/rotina')} />
          <div className="space-y-mx-sm p-mx-lg pt-0">
            {alerts.slice(0, 6).map(alert => (
              <AlertItem key={alert.title} alert={alert} />
            ))}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-mx-lg xl:grid-cols-2 2xl:grid-cols-12" aria-label="Agenda e engajamento">
        <Card className="border bg-white p-mx-md xl:col-span-2 2xl:col-span-6">
          <div className="flex items-center justify-between gap-mx-md">
            <Typography variant="h3" className="tracking-tight">Engajamento da Equipe</Typography>
            <Badge variant={teamEngagement >= 75 ? 'success' : teamEngagement >= 60 ? 'warning' : 'danger'} className="rounded-mx-full">{teamEngagement}%</Badge>
          </div>
          <div className="mt-mx-lg grid grid-cols-1 gap-mx-lg lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex justify-center">
              <GaugeScore value={teamEngagement} label="Índice geral" size="lg" />
            </div>
            <div className="grid grid-cols-2 gap-mx-md md:grid-cols-5">
              {engagementMetrics.map(metric => (
                <EngagementMetric key={metric.label} label={metric.label} value={metric.value} icon={metric.icon} accent={metric.accent} />
              ))}
            </div>
          </div>
        </Card>

        <Card className="border bg-white p-mx-md xl:col-span-1 2xl:col-span-3">
          <div className="flex items-center justify-between gap-mx-md">
            <Typography variant="h3" className="tracking-tight">Ranking da Loja</Typography>
            <button type="button" onClick={() => navigate('/classificacao')} className="text-mx-tiny font-bold uppercase tracking-widest text-emerald-600">Ver ranking</button>
          </div>
          <div className="mt-mx-lg space-y-mx-sm">
            {visibleRanking.slice(0, 3).map((row, index) => (
              <div key={row.user_id} className="flex items-center justify-between gap-mx-sm rounded-xl bg-gray-50 px-mx-md py-mx-sm">
                <div className="flex min-w-0 items-center gap-mx-sm">
                  <span className={cn('flex h-mx-9 w-mx-9 shrink-0 items-center justify-center rounded-xl border bg-white', medalTone(index))}>
                    {index === 0 ? <Trophy size={16} /> : <Medal size={16} />}
                  </span>
                  <Avatar src={row.avatar_url || undefined} alt={`Avatar de ${row.user_name}`} fallback={row.user_name} size="sm" className="rounded-xl" />
                  <div className="min-w-0">
                    <Typography variant="p" className="truncate">{row.user_name}</Typography>
                    <Typography variant="tiny" tone="muted" className="block tracking-tight">{index + 1}º lugar</Typography>
                  </div>
                </div>
                <Typography variant="mono" tone="brand">{row.vnd_total}</Typography>
              </div>
            ))}
            {visibleRanking.length === 0 && <Typography variant="p" tone="muted">Ranking pendente de lançamentos.</Typography>}
          </div>
        </Card>

        <Card className="border bg-white xl:col-span-1 2xl:col-span-3">
          <PanelHeader title="Agenda de Hoje" action="Abrir rotina" onAction={() => navigate('/rotina')} />
          <div className="space-y-mx-sm p-mx-lg pt-0">
            {data.metrics.totalAgd > 0 ? (
              <>
                <AgendaItem time="Hoje" title={`${data.metrics.totalAgd} agendamentos registrados`} detail="Baseado nos lançamentos da equipe." />
                <AgendaItem time="Agora" title="Cobrar pendências de rotina" detail={pendingNames.length ? pendingNames.slice(0, 3).join(', ') : 'Equipe com rotina sincronizada.'} />
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-100 bg-gray-50 p-mx-md">
                <Typography variant="p" tone="muted">Agenda operacional pendente de integração ou lançamentos do dia.</Typography>
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  )
}

function ManagerHeader({ storeName, periodLabel }: { storeName: string; periodLabel: string }) {
  return (
    <PageHeading
      title={<>Bom dia, <span className="text-emerald-600">Gerente</span>!</>}
      subtitle={`${storeName.toUpperCase()} · DESEMPENHO DA EQUIPE`}
      actions={(
        <div className="flex flex-wrap gap-mx-sm">
          <Badge variant="outline" className="h-mx-11 px-mx-md bg-white">Período: {periodLabel}</Badge>
          <Button type="button" variant="outline" size="sm" className="h-mx-11 bg-white hover:bg-gray-50">
            Filtros
          </Button>
        </div>
      )}
    />
  )
}

function ManagerKpiCard({
  title,
  value,
  detail,
  status,
  icon,
  tone,
}: {
  title: string
  value: string
  detail: string
  status: string
  icon: ReactNode
  tone: ManagerTone
}) {
  const arrow = tone === 'success' ? '↑' : tone === 'danger' ? '↓' : ''
  return (
    <Card className="min-h-[188px] border bg-white p-mx-md flex flex-col">
      <div className="flex items-center gap-mx-sm">
        <MetricIcon tone={tone}>{icon}</MetricIcon>
        <Typography variant="tiny" tone="muted" className="">{title}</Typography>
      </div>
      <Typography variant="h1" className="mt-mx-md text-4xl font-mono-numbers">{value}</Typography>
      <Typography variant="p" tone="muted" className="mt-mx-xs text-sm">{detail}</Typography>
      <div className={cn('mt-mx-md rounded-2xl px-mx-md py-mx-sm text-center text-mx-tiny font-bold uppercase tracking-widest flex items-center justify-center gap-mx-xs', toneSurface(tone))}>
        {arrow && <span aria-hidden="true">{arrow}</span>}
        <span>{status}</span>
      </div>
    </Card>
  )
}

function TeamRow({ row }: { row: RankingEntry }) {
  const meta = row.meta || 0
  const attainment = meta > 0 ? Math.round((row.vnd_total / meta) * 100) : 0
  const discipline = row.checked_in ? 100 : 0
  // 4-tier status: Excelente / Bom / Atenção / Crítico (matches mockup pills)
  const tier: 'excelente' | 'bom' | 'atencao' | 'critico' = !row.checked_in
    ? 'critico'
    : attainment >= 90
      ? 'excelente'
      : attainment >= 65
        ? 'bom'
        : attainment >= 35
          ? 'atencao'
          : 'critico'
  const tierStyles: Record<typeof tier, string> = {
    excelente: 'bg-[var(--color-status-success-surface)] text-status-success',
    bom: 'bg-[var(--color-status-info-surface)] text-status-info',
    atencao: 'bg-[var(--color-status-warning-surface)] text-status-warning',
    critico: 'bg-[var(--color-status-error-surface)] text-status-error',
  }
  const tierLabels: Record<typeof tier, string> = {
    excelente: 'Excelente',
    bom: 'Bom',
    atencao: 'Atenção',
    critico: 'Crítico',
  }
  const disciplineTone: ManagerTone = attainment >= 90 ? 'success' : attainment >= 65 ? 'info' : attainment >= 35 ? 'warning' : 'danger'
  return (
    <tr className="bg-white">
      <td className="px-mx-md py-mx-sm">
        <div className="flex min-w-0 items-center gap-mx-sm">
          <Avatar src={row.avatar_url || undefined} alt={`Avatar de ${row.user_name}`} fallback={row.user_name} size="sm" className="rounded-xl" />
          <Typography variant="p" className="truncate">{row.user_name}</Typography>
        </div>
      </td>
      <td className="px-mx-md py-mx-sm text-center"><Typography variant="mono" tone="brand">{row.vnd_total}</Typography></td>
      <td className="px-mx-md py-mx-sm text-center"><Typography variant="mono">{row.meta || '-'}</Typography></td>
      <td className="px-mx-md py-mx-sm text-center"><Typography variant="mono" tone="info">{row.agd_total}</Typography></td>
      <td className="px-mx-md py-mx-sm">
        <div className="flex items-center gap-mx-xs">
          <ProgressBar value={attainment} tone={disciplineTone} className="flex-1" />
          <span className="text-mx-tiny font-bold text-muted-foreground tabular-nums w-mx-9 text-right">{attainment}%</span>
        </div>
      </td>
      <td className="px-mx-md py-mx-sm">
        <span className={cn('inline-flex items-center rounded-mx-full px-mx-sm py-mx-tiny text-mx-tiny font-bold uppercase tracking-tight', tierStyles[tier])}>
          {tierLabels[tier]}
        </span>
        {/* discipline reserved for future use */}
        <span className="sr-only">Disciplina: {discipline}%</span>
      </td>
    </tr>
  )
}

function PanelHeader({
  title,
  badge,
  action,
  onAction,
}: {
  title: string
  badge?: number
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-mx-md p-mx-lg">
      <div className="flex items-center gap-mx-sm">
        <Typography variant="h3" className="tracking-tight">{title}</Typography>
        {typeof badge === 'number' && <Badge variant={badge > 0 ? 'danger' : 'success'} className="rounded-mx-full px-2 py-0.5">{badge}</Badge>}
      </div>
      {action && onAction && (
        <button type="button" onClick={onAction} className="text-mx-tiny font-bold uppercase tracking-widest text-emerald-600">
          {action}
        </button>
      )}
    </div>
  )
}

function AlertItem({ alert }: { alert: OwnerPerformanceAlert }) {
  const tone = alert.variant === 'danger' ? 'danger' : alert.variant === 'warning' ? 'warning' : alert.variant === 'success' ? 'success' : 'info'
  return (
    <div className="flex gap-mx-sm rounded-xl border border-gray-100 bg-gray-50 p-mx-sm">
      <MetricIcon tone={tone} className="h-mx-9 w-mx-9"><AlertTriangle size={16} /></MetricIcon>
      <div className="min-w-0">
        <Typography variant="p" className="leading-tight">{alert.title}</Typography>
        <Typography variant="tiny" tone="muted" className="mt-mx-tiny block font-bold normal-case tracking-normal">{alert.description}</Typography>
        <Typography variant="tiny" tone="brand" className="mt-mx-xs block normal-case tracking-normal">{alert.recommendation}</Typography>
        <Typography variant="tiny" className="mt-mx-xs block tracking-tight">{alert.action}</Typography>
      </div>
    </div>
  )
}

function FunnelSegmentRow({
  label,
  tone,
  stages,
}: {
  label: string
  tone: ManagerTone
  stages: Array<{ label: string; value: number; pct?: number }>
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-mx-md shadow-sm">
      <div className="flex items-center gap-mx-sm">
        <MetricIcon tone={tone} className="h-mx-8 w-mx-8 rounded-xl">
          <Gauge size={14} />
        </MetricIcon>
        <Typography variant="tiny" tone={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'brand'} className="">{label}</Typography>
      </div>
      <div className={cn('mt-mx-md grid gap-mx-sm', stages.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4')}>
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative min-w-0 rounded-xl bg-gray-50 px-mx-sm py-mx-xs text-center">
            {index > 0 && <span className="absolute -left-mx-sm top-1/2 hidden -translate-y-1/2 text-muted-foreground md:block">&gt;</span>}
            <Typography variant="tiny" tone="muted" className="block truncate tracking-tight">{stage.label}</Typography>
            <div className="mt-mx-xs flex items-baseline justify-center gap-mx-xs">
              <Typography variant="h3" className="font-mono-numbers">{formatInteger(stage.value)}</Typography>
              {typeof stage.pct === 'number' && <Typography variant="tiny" tone="muted" className="">{stage.pct}%</Typography>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EngagementMetric({ label, value, icon, accent = 'info' }: { label: string; value: number; icon: ReactNode; accent?: 'info' | 'success' | 'warning' | 'teal' | 'brand' }) {
  const accentClasses: Record<typeof accent, { iconBg: string; iconText: string; bar: string }> = {
    info: { iconBg: 'bg-[var(--color-status-info-surface)]', iconText: 'text-status-info', bar: 'bg-status-info' },
    success: { iconBg: 'bg-[var(--color-status-success-surface)]', iconText: 'text-status-success', bar: 'bg-status-success' },
    warning: { iconBg: 'bg-[var(--color-status-warning-surface)]', iconText: 'text-status-warning', bar: 'bg-status-warning' },
    teal: { iconBg: 'bg-secondary', iconText: 'text-emerald-600', bar: 'bg-emerald-600' },
    brand: { iconBg: 'bg-[var(--color-brand-primary)]/10', iconText: 'text-emerald-600', bar: 'bg-emerald-600' },
  }
  const styles = accentClasses[accent]
  const clamped = Math.min(Math.max(value, 0), 100)
  return (
    <div className="rounded-2xl bg-white p-mx-sm text-center">
      <div className={cn('mx-auto flex h-mx-10 w-mx-10 items-center justify-center rounded-xl shadow-sm', styles.iconBg, styles.iconText)}>
        {icon}
      </div>
      <Typography variant="tiny" tone="muted" className="mt-mx-sm block min-h-[28px] tracking-tight leading-tight">{label}</Typography>
      <Typography variant="h3" className={cn('mt-mx-xs font-mono-numbers', styles.iconText)}>
        {clamped}%
      </Typography>
      <div className="mt-mx-xs h-1.5 w-full overflow-hidden rounded-mx-full bg-gray-50">
        <div className={cn('h-full rounded-mx-full transition-all', styles.bar)} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

function GaugeScore({ value, label, size = 'md' }: { value: number; label: string; size?: 'md' | 'lg' }) {
  const clamped = Math.min(Math.max(Math.round(value), 0), 100)
  const tone = clamped >= 75 ? 'success' : clamped >= 60 ? 'warning' : 'danger'
  const dimension = size === 'lg' ? 'h-mx-36 w-mx-36' : 'h-mx-28 w-mx-28'
  const inner = size === 'lg' ? 'h-mx-28 w-mx-28' : 'h-mx-20 w-mx-20'

  return (
    <div
      className={cn('grid shrink-0 place-items-center rounded-mx-full shadow-mx-inner', dimension)}
      style={{ background: gaugeGradient(tone, clamped) }}
      aria-label={`${label}: ${clamped}%`}
    >
      <div className={cn('flex flex-col items-center justify-center rounded-mx-full bg-white text-center', inner)}>
        <Typography variant={size === 'lg' ? 'h1' : 'h2'} className="leading-none font-mono-numbers">{clamped}%</Typography>
        <Typography variant="tiny" tone={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'error'} className="mt-mx-tiny block tracking-tight">{label}</Typography>
      </div>
    </div>
  )
}

/**
 * Semicircular speedometer gauge (red→yellow→green arc) matching the design mockup.
 * Used for MX Score Loja and similar 0–100 score visualizations.
 */
function SemiCircularGauge({ value, label, suffix = '' }: { value: number; label: string; suffix?: string }) {
  const clamped = Math.min(Math.max(Math.round(value), 0), 100)
  const radius = 70
  const strokeWidth = 14
  const cx = 80
  const cy = 80
  // Pointer angle: 180° (left) → 0° (right). value=0 → 180°, value=100 → 0°.
  const pointerAngleDeg = 180 - (clamped / 100) * 180
  const pointerRad = (pointerAngleDeg * Math.PI) / 180
  const pointerX = cx + (radius - strokeWidth / 2) * Math.cos(pointerRad)
  const pointerY = cy - (radius - strokeWidth / 2) * Math.sin(pointerRad)
  const labelTone = clamped >= 75
    ? 'text-status-success'
    : clamped >= 60
      ? 'text-status-warning'
      : 'text-status-error'
  return (
    <div className="flex flex-col items-center" aria-label={`${label}: ${clamped}%`}>
      <svg viewBox="0 0 160 100" width="160" height="100" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="mx-gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={chartTokens.danger()} />
            <stop offset="50%" stopColor={chartTokens.warning()} />
            <stop offset="100%" stopColor={chartTokens.success()} />
          </linearGradient>
        </defs>
        {/* Arc track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#mx-gauge-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Pointer */}
        <circle cx={pointerX} cy={pointerY} r={6} fill="var(--color-mx-black)" />
        <circle cx={pointerX} cy={pointerY} r={3} fill="var(--color-pure-white)" />
      </svg>
      <div className="-mt-mx-md flex flex-col items-center">
        <span className="text-4xl font-bold font-mono-numbers leading-none text-foreground">{clamped}{suffix}</span>
        <span className={cn('mt-mx-tiny text-mx-tiny font-bold uppercase tracking-widest', labelTone)}>{label}</span>
      </div>
    </div>
  )
}

function AgendaItem({ time, title, detail }: { time: string; title: string; detail: string }) {
  return (
    <div className="flex gap-mx-sm rounded-xl bg-gray-50 p-mx-sm">
      <div className="flex h-mx-10 w-mx-12 shrink-0 items-center justify-center rounded-xl bg-white text-mx-tiny font-bold uppercase text-emerald-600 shadow-sm">
        {time}
      </div>
      <div className="min-w-0">
        <Typography variant="p" className="leading-tight">{title}</Typography>
        <Typography variant="tiny" tone="muted" className="mt-mx-tiny block font-bold normal-case tracking-normal">{detail}</Typography>
      </div>
    </div>
  )
}

function MiniStat({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="min-w-0 px-mx-xs">
      <Typography variant="tiny" tone="muted" className="block text-caption leading-tight tracking-normal sm:text-xs">{label}</Typography>
      <Typography variant="h3" className="mt-mx-xs truncate font-mono-numbers">{value}</Typography>
      {detail && <Typography variant="tiny" tone="muted" className="block font-bold normal-case tracking-normal">{detail}</Typography>}
    </div>
  )
}

function MetricIcon({ tone, className, children }: { tone: ManagerTone; className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex h-mx-12 w-mx-12 shrink-0 items-center justify-center rounded-xl border shadow-mx-inner', toneBorder(tone), className)}>
      {children}
    </div>
  )
}

function ProgressBar({ value, tone = 'brand', className }: { value: number; tone?: ManagerTone; className?: string }) {
  return (
    <div className={cn('h-mx-xs w-full overflow-hidden rounded-mx-full bg-gray-50', className)}>
      <div className={cn('h-full rounded-mx-full transition-all', toneFill(tone))} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
    </div>
  )
}

function toneBorder(tone: ManagerTone) {
  return {
    brand: 'border-mx-indigo-100 bg-mx-indigo-50 text-emerald-600',
    success: 'border-status-success/20 bg-status-success-surface text-status-success',
    warning: 'border-status-warning/20 bg-status-warning-surface text-status-warning',
    danger: 'border-status-error/20 bg-status-error-surface text-status-error',
    info: 'border-status-info/20 bg-status-info-surface text-status-info',
    neutral: 'border-gray-200 bg-white text-muted-foreground',
  }[tone]
}

function toneSurface(tone: ManagerTone) {
  return {
    brand: 'bg-mx-indigo-50 text-emerald-600',
    success: 'bg-status-success-surface text-status-success',
    warning: 'bg-status-warning-surface text-status-warning',
    danger: 'bg-status-error-surface text-status-error',
    info: 'bg-status-info-surface text-status-info',
    neutral: 'bg-gray-50 text-muted-foreground',
  }[tone]
}

function toneFill(tone: ManagerTone) {
  return {
    brand: 'bg-emerald-600',
    success: 'bg-status-success',
    warning: 'bg-status-warning',
    danger: 'bg-status-error',
    info: 'bg-status-info',
    neutral: 'bg-text-tertiary',
  }[tone]
}

function gaugeColor(tone: ManagerTone) {
  return {
    brand: chartTokens.series.s4(),
    success: chartTokens.success(),
    warning: chartTokens.warning(),
    danger: chartTokens.danger(),
    info: chartTokens.info(),
    neutral: chartTokens.axisTick(),
  }[tone]
}

function gaugeGradient(tone: ManagerTone, value: number) {
  const end = Math.min(Math.max(value, 0), 100) * 3.6
  const active = `conic-gradient(${gaugeColor(tone)} ${end}deg, ${chartTokens.gridStrong()} 0deg)`
  if (tone !== 'success') return active
  return `conic-gradient(${chartTokens.success()} 0deg 185deg, ${chartTokens.warning()} 185deg 275deg, ${chartTokens.danger()} 275deg 330deg, ${chartTokens.gridStrong()} 330deg 360deg)`
}

function medalTone(index: number) {
  if (index === 0) return 'border-status-warning/30 text-status-warning'
  if (index === 1) return 'border-text-tertiary/30 text-muted-foreground'
  return 'border-status-warning/20 text-status-warning'
}

function scoreLabel(score: number) {
  if (score >= 75) return 'Bom'
  if (score >= 60) return 'Atenção'
  return 'Crítico'
}

function formatInteger(value: number) {
  return Math.round(value || 0).toLocaleString('pt-BR')
}

function formatDecimal(value: number) {
  return Number.isFinite(value) ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'
}

function percent(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

function formatPeriodLabel(referenceDate: string) {
  const [year, month] = referenceDate.split('-')
  if (!year || !month) return 'Mês atual'
  return `${month}/${year}`
}

export default ManagerOperationalCockpit

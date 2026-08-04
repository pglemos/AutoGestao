import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDaysInMonth, parseISO } from 'date-fns'
import { AlertTriangle, ArrowUpRight, Bell, CheckCircle2, Clock3, CircleHelp, ClipboardList, LineChart as LineChartIcon, MessageCircle, Search, Target, TrendingDown, Users, Zap } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { chartTokens } from '@/lib/charts/tokens'
import { cn } from '@/lib/utils'
import type { OwnerPerformanceAlert } from '../PerformanceAlerts'
import { toneClasses, type ActionRow, type DashboardData, type DepartmentScore, type KpiTone } from './types'
import { clampScore, formatInteger, ownerPath } from './format'
import { MetricPill, OwnerSemiGauge } from './primitives'

export function SalesGoalCard({ data }: { data: DashboardData }) {
  const navigate = useNavigate()
  const sold = data.metrics.totalSales
  const goal = data.metrics.goalValue
  const missing = Math.max(goal - sold, 0)
  const progress = goal > 0 ? clampScore((sold / goal) * 100) : 0
  const daysInMonth = getDaysInMonth(parseISO(data.referenceDate))
  const referenceDay = Number(data.referenceDate.slice(-2)) || 1
  const actualPace = referenceDay > 0 ? Math.max(sold / referenceDay, 0) : 0
  const idealPace = daysInMonth > 0 ? goal / daysInMonth : 0
  const projected = actualPace > 0 ? Math.round(actualPace * daysInMonth) : sold
  const projectionStatus = goal <= 0
    ? null
    : projected >= goal
      ? { label: 'Acima da meta', arrow: '▲', tone: 'success' as const }
      : projected >= goal * 0.85
        ? { label: 'Dentro da meta', arrow: '►', tone: 'warning' as const }
        : { label: 'Abaixo da meta', arrow: '▼', tone: 'danger' as const }

  const shortfall = goal > 0 ? Math.max(goal - projected, 0) : 0

  // Espelha components/owner/home/SalesGoalBlock.
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-emerald-600" />
        <h2 className="text-base font-semibold text-gray-800">Meta de Venda do Mês</h2>
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-gray-500">Atingimento</span>
            <span className="text-sm font-semibold text-gray-800">{goal > 0 ? `${progress}%` : '--'}</span>
          </div>
          <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-emerald-600/5 p-2.5 text-center">
            <p className="text-xs text-gray-500">Vendidos</p>
            <p className="mt-0.5 text-xl font-bold text-emerald-600">{formatInteger(sold)}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-2.5 text-center">
            <p className="text-xs text-gray-500">Faltam</p>
            <p className="mt-0.5 text-xl font-bold text-red-600">{goal > 0 ? formatInteger(missing) : '--'}</p>
          </div>
          <div className="rounded-lg bg-gray-100/60 p-2.5 text-center">
            <p className="text-xs text-gray-500">Ritmo ideal</p>
            <p className="mt-0.5 text-sm font-bold text-gray-800">
              {idealPace > 0 ? `${idealPace.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/dia` : '--'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div>
            <p className="text-xs text-gray-500">Projeção atual</p>
            <p className="text-sm font-semibold text-gray-800">
              {goal > 0 ? `${formatInteger(projected)} veículos` : 'Pendente'}
            </p>
          </div>
          {projectionStatus && (
            <div className={cn('flex items-center gap-1.5 rounded-full px-2.5 py-1', projectionStatus.tone === 'success' ? 'bg-emerald-50' : 'bg-amber-50')}>
              <TrendingDown className={cn('h-3.5 w-3.5', projectionStatus.tone === 'success' ? 'text-emerald-600' : 'text-amber-600')} />
              <span className={cn('text-xs font-medium', projectionStatus.tone === 'success' ? 'text-emerald-700' : 'text-amber-700')}>
                {projectionStatus.label}
              </span>
            </div>
          )}
        </div>
        {shortfall > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">
              Mantido o ritmo atual, a loja encerrará o mês {formatInteger(shortfall)}{' '}
              {shortfall === 1 ? 'veículo' : 'veículos'} abaixo da meta.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate(ownerPath('departamentos-comercial'))}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        >
          Ver diagnóstico comercial
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  )
}

export function PriorityIntervention({
  alert,
  onOpenConsultant,
}: {
  alert: OwnerPerformanceAlert | null
  onOpenConsultant: () => void
}) {
  const navigate = useNavigate()
  if (!alert) return null
  const isCritical = alert.variant === 'danger'
  // Espelha STATUS_STYLES.critical / .attention de components/owner/home/homeData.
  const style = isCritical
    ? { border: 'border-red-200', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500', label: 'Crítico' }
    : { border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', label: 'Atenção' }
  const details = [
    alert.department ? `Departamento: ${alert.department}` : null,
  ].filter((detail): detail is string => Boolean(detail))
  // Alertas vindos da engine (`alertFromEngine`) preenchem `action` com o rótulo
  // do botão de atalho, não com uma justificativa. Nesse caso o bloco "por que
  // isso importa" ficaria repetindo o texto do CTA — melhor omitir.
  const why = alert.action && alert.action !== alert.ctaLabel ? alert.action : null

  return (
    <section className={cn('rounded-2xl border-2 bg-white p-5 shadow-sm lg:p-6', style.border)}>
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', style.bg)}>
          <Zap className={cn('h-4 w-4', style.text)} />
        </div>
        <h2 className="text-base font-semibold text-gray-800">Intervenção prioritária</h2>
      </div>

      <div className={cn('mt-4 rounded-xl border p-4', style.border, style.bg)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className={cn('mt-0.5 h-5 w-5 shrink-0', style.text)} />
            <div>
              <p className="font-semibold text-gray-800">{alert.title}</p>
              <p className="mt-0.5 text-sm text-gray-500">{alert.description}</p>
            </div>
          </div>
          <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', style.bg, style.text)}>
            {style.label}
          </span>
        </div>
        <div className="mt-3 space-y-1">
          {details.map((detail) => (
            <div key={detail} className="flex items-center gap-2 text-xs text-gray-500">
              <span className={cn('h-1 w-1 rounded-full', style.dot)} />
              {detail}
            </div>
          ))}
        </div>
      </div>

      {why && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Por que isso importa</p>
          <p className="mt-1 text-sm text-gray-800">{why}</p>
        </div>
      )}

      <div className="mt-3 rounded-lg border border-emerald-600/20 bg-emerald-600/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Direcionamento MX</p>
        <p className="mt-1 text-sm text-gray-800">{alert.recommendation}</p>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Impacto estimado</p>
        <ul className="mt-1.5 space-y-1">
          <li className="flex items-start gap-2 text-sm text-gray-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            Impacto {alert.impact.toLowerCase()} sobre o resultado do período.
          </li>
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button type="button" variant="outline" onClick={() => navigate(alert.ctaTo)}>
          <Search size={16} /> {alert.ctaLabel}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(ownerPath('plano-acao'))}>
          <ClipboardList size={16} /> Criar plano de ação
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate(ownerPath('departamentos'))}>
          <Users size={16} /> Delegar ao gerente
        </Button>
        <Button type="button" onClick={onOpenConsultant}>
          <MessageCircle size={16} /> Falar com Consultor
        </Button>
      </div>
    </section>
  )
}

export function ConsultantMxCard({ onOpenConsultant }: { onOpenConsultant: () => void }) {
  return (
    <Card className="border bg-white p-mx-md">
      <div className="flex flex-wrap items-center justify-between gap-mx-sm">
        <div className="flex items-center gap-mx-sm">
          <span className="flex h-mx-10 w-mx-10 shrink-0 items-center justify-center rounded-xl bg-status-success-surface text-status-success">
            <MessageCircle size={20} />
          </span>
          <div>
            <Typography variant="p" className="">Consultor MX</Typography>
            <Typography variant="tiny" tone="muted" className="block font-bold">Precisa de ajuda para decidir? Fale com seu consultor usando o contexto desta tela.</Typography>
          </div>
        </div>
        <Button type="button" onClick={onOpenConsultant}>Perguntar</Button>
      </div>
    </Card>
  )
}

export function OwnerAlertList({ alerts }: { alerts: OwnerPerformanceAlert[] }) {
  const navigate = useNavigate()
  const visibleAlerts = alerts.slice(0, 6)
  return (
    <Card className="border bg-white p-mx-md">
      <div className="flex items-center justify-between gap-mx-sm">
        <div className="flex items-center gap-mx-sm">
          <Bell size={24} className="text-status-error" />
          <Typography variant="h3" className="text-xl">Alertas que exigem sua atenção</Typography>
        </div>
        <span className="min-w-mx-7 h-mx-7 rounded-mx-full bg-status-error px-mx-xs text-white text-xs font-bold flex items-center justify-center">{visibleAlerts.length}</span>
      </div>
      <div className="mt-mx-md divide-y divide-border-subtle">
        {visibleAlerts.map((alert, index) => {
          const tone: KpiTone = alert.variant === 'danger' ? 'danger' : alert.variant === 'warning' ? 'warning' : alert.variant === 'success' ? 'success' : 'muted'
          const classes = toneClasses[tone]
          return (
            <button key={alert.title} type="button" onClick={() => navigate(alert.ctaTo)} className="flex w-full items-center gap-mx-sm py-mx-sm text-left">
              <span className={cn('h-mx-9 w-mx-9 rounded-xl flex shrink-0 items-center justify-center border', classes.soft)}>
                {tone === 'danger' ? <AlertTriangle size={18} /> : tone === 'warning' ? <Clock3 size={18} /> : <CheckCircle2 size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <Typography variant="p" className="text-sm leading-tight">{alert.title}</Typography>
                <Typography variant="tiny" tone="muted" className="block truncate">
                  {alert.department ? `${alert.department} · ` : ''}{alert.description}
                </Typography>
              </span>
              <Typography variant="tiny" className={cn('font-bold', index === 0 ? 'text-status-error' : 'text-gray-500')}>
                {index === 0 ? 'Hoje' : `${index + 1} dias`}
              </Typography>
            </button>
          )
        })}
      </div>
      <Button type="button" variant="ghost" className="mt-mx-sm w-full" onClick={() => navigate(ownerPath('alertas'))}>
        Ver todos os alertas
      </Button>
    </Card>
  )
}

export function NextActionsCard({ actions }: { actions: ActionRow[] }) {
  const navigate = useNavigate()
  return (
    <Card className="border bg-white p-mx-md">
      <div className="flex items-center gap-mx-sm">
        <CheckCircle2 size={24} className="text-emerald-600" />
        <Typography variant="h3" className="text-xl">Próximas ações do Dono</Typography>
      </div>
      <div className="mt-mx-md divide-y divide-border-subtle">
        {actions.slice(0, 5).map((action, index) => (
          <div key={`${action.problem}-${index}`} className="flex items-center gap-mx-sm py-mx-sm">
            <span className="w-mx-20 shrink-0 rounded-xl bg-mx-indigo-50 px-mx-sm py-mx-xs text-center text-xs font-bold text-emerald-600 truncate">
              {action.due || 'Pendente'}
            </span>
            <Typography variant="p" className="min-w-0 flex-1 truncate text-sm font-bold">
              {action.action}
            </Typography>
            <CheckCircle2 size={16} className="shrink-0 text-status-success" aria-hidden="true" />
            <Users size={16} className="shrink-0 text-gray-500" aria-hidden="true" />
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" className="mt-mx-sm w-full" onClick={() => navigate(ownerPath('agenda'))}>
        Ver agenda completa
      </Button>
    </Card>
  )
}

export function OwnerPanoramaChart({
  data,
  goalValue,
  attainment,
}: {
  data: Array<{ label: string; planejado: number; realizado: number }>
  goalValue: number
  attainment: number
}) {
  const [chartReady, setChartReady] = useState(false)

  useEffect(() => {
    setChartReady(false)
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => setChartReady(true))
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [data.length, goalValue])

  return (
    <Card className="border bg-white p-mx-md">
      <div className="flex flex-col gap-mx-md md:flex-row md:items-start md:justify-between">
        <div>
          <Typography variant="h3" className="text-xl">Evolução planejado x realizado</Typography>
          <Typography variant="p" tone="muted" className="mt-1 block font-bold">Ritmo da loja no período selecionado.</Typography>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-mx-md py-mx-sm">
          <Typography variant="tiny" tone="muted" className="block">Meta mensal</Typography>
          <Typography variant="p" className="tabular-nums">{goalValue > 0 ? formatInteger(goalValue) : 'Pendente'}</Typography>
          <Typography variant="tiny" tone={attainment >= 80 ? 'success' : 'warning'} className="block font-bold">
            {goalValue > 0 ? `${attainment}% atingida` : 'Cadastre a meta'}
          </Typography>
        </div>
      </div>

      {data.length >= 2 && goalValue > 0 ? (
        <div className="mt-mx-md h-[250px]">
          {chartReady ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={250} initialDimension={{ width: 320, height: 250 }}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTokens.gridStrong()} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
              <Tooltip />
              <Line type="monotone" dataKey="planejado" stroke={chartTokens.axisTickStrong()} strokeWidth={2} strokeDasharray="5 5" dot={false} name="Planejado" />
              <Line type="monotone" dataKey="realizado" stroke={chartTokens.series.s4()} strokeWidth={4} dot={{ r: 4 }} name="Realizado" />
            </LineChart>
          </ResponsiveContainer> : null}
        </div>
      ) : (
        <div className="mt-mx-md min-h-[250px] rounded-xl border border-dashed border-gray-100 bg-gray-50 flex flex-col items-center justify-center text-center p-mx-lg">
          <LineChartIcon size={40} className="text-gray-500" />
          <Typography variant="h3" className="mt-mx-md text-lg">Dados pendentes</Typography>
          <Typography variant="p" tone="muted" className="mt-mx-xs max-w-sm">A evolução aparece quando a rotina diária tiver histórico no período.</Typography>
        </div>
      )}
    </Card>
  )
}

export function OwnerActionPlanSummary({ actions }: { actions: ActionRow[] }) {
  const navigate = useNavigate()
  const total = actions.length
  const critical = actions.filter(action => action.tone === 'danger').length
  const completed = actions.filter(action => action.status === 'Concluída').length
  const inProgress = actions.filter(action => action.status === 'Em andamento').length
  const eficazesPct = total > 0 ? Math.round((completed / total) * 100) : 0
  const parciaisPct = total > 0 ? Math.round((inProgress / total) * 100) : 0
  const ineficazesPct = total > 0 ? Math.max(0, 100 - eficazesPct - parciaisPct) : 0

  return (
    <Card className="border bg-white p-mx-md">
      <Typography variant="h3" className="text-xl">Eficácia das Ações</Typography>
      <div className="mt-mx-md flex items-center gap-mx-md">
        <EficaciaDonut eficazes={eficazesPct} parciais={parciaisPct} ineficazes={ineficazesPct} />
        <div className="flex flex-col gap-mx-sm flex-1 min-w-0">
          <EficaciaLegendRow color={chartTokens.success()} label="Eficazes" value={`${eficazesPct}%`} />
          <EficaciaLegendRow color={chartTokens.warning()} label="Parcialmente eficazes" value={`${parciaisPct}%`} />
          <EficaciaLegendRow color={chartTokens.danger()} label="Ineficazes" value={`${ineficazesPct}%`} />
        </div>
      </div>
      <div className="mt-mx-md grid grid-cols-3 gap-mx-sm">
        <MetricPill label="Total" value={String(total)} tone="brand" />
        <MetricPill label="Críticas" value={String(critical)} tone={critical > 0 ? 'danger' : 'success'} />
        <MetricPill label="Andamento" value={String(inProgress)} tone="info" />
      </div>
      <Button type="button" className="mt-mx-md w-full" onClick={() => navigate(ownerPath('plano-acao'))}>
        Ver ações
      </Button>
    </Card>
  )
}

function EficaciaDonut({ eficazes, parciais, ineficazes }: { eficazes: number; parciais: number; ineficazes: number }) {
  const total = eficazes + parciais + ineficazes
  const radius = 50
  const innerRadius = 36
  const cx = 60
  const cy = 60
  const segments = [
    { value: eficazes, color: chartTokens.success() },
    { value: parciais, color: chartTokens.warning() },
    { value: ineficazes, color: chartTokens.danger() },
  ]
  let cumulative = -90 // start at top
  const arcs = segments.filter(s => s.value > 0).map((segment, i) => {
    const angle = (segment.value / total) * 360
    const startAngle = cumulative
    const endAngle = cumulative + angle
    cumulative = endAngle
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)
    const x3 = cx + innerRadius * Math.cos(endRad)
    const y3 = cy + innerRadius * Math.sin(endRad)
    const x4 = cx + innerRadius * Math.cos(startRad)
    const y4 = cy + innerRadius * Math.sin(startRad)
    const largeArc = angle > 180 ? 1 : 0
    const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`
    return <path key={i} d={d} fill={segment.color} />
  })
  const headlinePct = Math.round((eficazes / total) * 100) || 0
  return (
    <div className="relative shrink-0" aria-label={`Eficácia ${headlinePct}%`}>
      <svg viewBox="0 0 120 120" width="120" height="120" role="img">
        {arcs}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-gray-800 leading-none">{headlinePct}%</span>
        <span className="text-mx-tiny font-bold uppercase tracking-widest text-gray-500">Média geral</span>
      </div>
    </div>
  )
}

function EficaciaLegendRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-mx-xs text-sm">
      <span className="h-mx-2 w-mx-2 rounded-full shrink-0" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="flex-1 truncate font-bold text-gray-500">{label}</span>
      <span className="font-bold tabular-nums text-gray-800">{value}</span>
    </div>
  )
}

export function OwnerDepartmentScoreGrid({ departments }: { departments: DepartmentScore[] }) {
  const navigate = useNavigate()
  return (
    <Card className="border bg-white p-mx-md">
      <div className="mb-mx-md flex items-center justify-between gap-mx-md">
        <div className="flex items-center gap-mx-xs">
          <Typography variant="h3" className="text-xl">Desempenho por Departamento</Typography>
          <CircleHelp size={14} className="text-gray-500" />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate(ownerPath('departamentos'))}>Ver todas</Button>
      </div>
      <div className="grid grid-cols-1 gap-mx-md sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {departments.map((department) => {
          const classes = toneClasses[department.tone]
          const hasData = department.score !== null
          return (
            <button key={department.name} type="button" onClick={() => navigate(department.path)} className="rounded-xl border border-gray-100 bg-white p-mx-md text-left hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/15 flex flex-col items-center">
              <div className="flex w-full items-center gap-mx-sm">
                <span className={cn('h-mx-9 w-mx-9 rounded-xl flex shrink-0 items-center justify-center', classes.bg)}>{department.icon}</span>
                <Typography variant="p" className="text-sm truncate">{department.name}</Typography>
              </div>
              <div className="mt-mx-sm">
                {hasData ? <OwnerSemiGauge value={department.score as number} /> : <OwnerSemiGauge value={0} muted />}
              </div>
              <div className="mt-mx-tiny flex flex-col items-center gap-mx-tiny">
                <span className="text-3xl font-bold tabular-nums text-gray-800 leading-none">{department.score ?? '--'}</span>
                <span className={cn('inline-flex items-center rounded-xl px-mx-sm py-mx-tiny text-mx-tiny font-bold uppercase tracking-tight', classes.soft)}>{department.status}</span>
              </div>
              <Typography variant="tiny" tone="muted" className="mt-mx-sm block min-h-mx-8 font-bold text-center w-full">{department.detail}</Typography>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  Target,
  TrendingUp,
  UsersRound,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { isPerfilInternoMx } from '@/hooks/useAuth'
import { calcularProjecao, getDiasInfo } from '@/lib/calculations'
import type { UserRole } from '@/types/database'

type Seller = { name: string; checkin_today?: boolean }
type LatestDRE = { net_profit: number } | null
type MetricTone = 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'slate'
type MetricDefinition = {
  title: string
  value: string | number
  detail: string
  icon: LucideIcon
  tone: MetricTone
}

type KpisSectionProps = {
  role: UserRole | null
  isOwner: boolean
  metrics: {
    goalValue: number
    attainment: number
    totalSales: number
    totalLeads: number
    totalAgd: number
    totalVis: number
    checkedInCount: number
  }
  funilData: {
    tx_lead_agd: number
    tx_agd_visita: number
    tx_visita_vnd: number
  }
  funnelBenchmarks: {
    leadAgd: number
    agdVisita: number
    visitaVnd: number
  }
  referenceDate: string
  sellers: Seller[] | null | undefined
  pendingDisciplineSellers: Seller[]
  latestDRE: LatestDRE
}

export function KpisSection({
  role,
  metrics,
  funilData,
  funnelBenchmarks,
  referenceDate,
  sellers,
  pendingDisciplineSellers,
  latestDRE,
}: KpisSectionProps) {
  const navigate = useNavigate()
  const sellersTotal = (sellers || []).length
  const dias = getDiasInfo(referenceDate, 'calendar')
  const projection = calcularProjecao(metrics.totalSales, dias.decorridos, dias.total)
  const disciplinePct = sellersTotal > 0 ? Math.round((metrics.checkedInCount / sellersTotal) * 100) : 0
  const conversionScore = funnelBenchmarks.visitaVnd > 0
    ? Math.min(100, Math.round((funilData.tx_visita_vnd / funnelBenchmarks.visitaVnd) * 100))
    : 0
  const mxScore = Math.round((Math.min(metrics.attainment, 100) * 0.45) + (conversionScore * 0.35) + (disciplinePct * 0.2))

  const cards: MetricDefinition[] = [
    {
      title: 'Meta da unidade',
      value: metrics.goalValue || '—',
      detail: `${metrics.attainment}% atingido`,
      icon: Target,
      tone: 'green',
    },
    {
      title: 'Vendas no período',
      value: metrics.totalSales,
      detail: `${projection || 0} projetadas no ritmo atual`,
      icon: BarChart3,
      tone: metrics.attainment >= 80 ? 'green' : 'amber',
    },
    {
      title: 'Leads registrados',
      value: metrics.totalLeads,
      detail: `${metrics.totalAgd} agendamentos`,
      icon: UsersRound,
      tone: 'blue',
    },
    {
      title: 'Visitas realizadas',
      value: metrics.totalVis,
      detail: `${funilData.tx_visita_vnd}% converteram em venda`,
      icon: CalendarDays,
      tone: 'violet',
    },
    {
      title: 'Disciplina da equipe',
      value: sellersTotal ? `${metrics.checkedInCount}/${sellersTotal}` : '—',
      detail: pendingDisciplineSellers.length
        ? `${pendingDisciplineSellers.length} fechamento${pendingDisciplineSellers.length === 1 ? '' : 's'} pendente${pendingDisciplineSellers.length === 1 ? '' : 's'}`
        : 'Equipe em dia',
      icon: Gauge,
      tone: pendingDisciplineSellers.length ? 'amber' : 'green',
    },
    {
      title: 'MX Score',
      value: mxScore,
      detail: `${disciplinePct}% de disciplina`,
      icon: TrendingUp,
      tone: mxScore >= 75 ? 'green' : mxScore >= 60 ? 'amber' : 'red',
    },
  ]

  if ((isPerfilInternoMx(role) || role === 'gerente') && latestDRE) {
    cards.push({
      title: 'Resultado líquido',
      value: `R$ ${Math.round(latestDRE.net_profit).toLocaleString('pt-BR')}`,
      detail: 'DRE do mês',
      icon: CircleDollarSign,
      tone: latestDRE.net_profit >= 0 ? 'green' : 'red',
    })
  }

  return (
    <section className="space-y-4" aria-labelledby="store-kpis-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="store-kpis-title" className="text-lg font-bold text-foreground">Indicadores da unidade</h2>
          <p className="mt-1 text-sm text-muted-foreground">Leitura comercial, ritmo de meta e disciplina da equipe no período selecionado.</p>
        </div>
        {role === 'gerente' && pendingDisciplineSellers.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/rotina-equipe')}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 text-sm font-semibold text-amber-700 hover:bg-amber-50"
          >
            <Zap size={15} />
            Resolver pendências
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map(card => {
          const Icon = card.icon
          return (
            <MetricCard
              key={card.title}
              title={card.title}
              value={card.value}
              detail={card.detail}
              icon={<Icon size={20} />}
              tone={card.tone}
            />
          )
        })}
      </div>
    </section>
  )
}

function MetricCard({
  title,
  value,
  detail,
  icon,
  tone,
}: {
  title: string
  value: string | number
  detail: string
  icon: ReactNode
  tone: MetricTone
}) {
  const toneClass: Record<MetricTone, string> = {
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-muted-foreground',
  }

  return (
    <article className="min-h-32 rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 break-words text-2xl font-bold leading-tight text-foreground tabular-nums">{value}</p>
          <p className="mt-2 text-xs leading-4 text-muted-foreground">{detail}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass[tone]}`}>
          {icon}
        </span>
      </div>
    </article>
  )
}

export default KpisSection

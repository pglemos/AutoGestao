import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { eachDayOfInterval, endOfMonth, format, isWeekend, parseISO } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { Activity, Building2, CalendarClock, CheckCircle2, Gauge, MessageSquarePlus, MoreVertical, RefreshCw, ShoppingCart, Target, TrendingUp, UserCircle, Wrench, X, Zap } from 'lucide-react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDiasInfo } from '@/lib/calculations'
import type { Store } from '@/types/database'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { SellerGoalsEditor } from '@/features/lojas/components/SellerGoalsEditor'
import { VendasFechadasLoja } from '@/features/vendas-loja/VendasFechadasLoja'
import { chartTokens } from '@/lib/charts/tokens'
import { supabase } from '@/lib/supabase'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { useDashboardLojaData } from '@/features/dashboard-loja/hooks/useDashboardLojaData'
import { ManagerHomeReturnLink } from '@/features/manager/home/ManagerHomeReturnLink'
import { useAuth } from '@/hooks/useAuth'
import { buildStoreGoalChannelRows, buildStoreGoalClosingRows, buildStoreGoalTeamRows, calculateStoreGoalMetrics, calculateSustainabilityPlan, formatStoreGoalMetric, operationalDayPredicate, type SustainabilityPlan } from './manager-store-goal'

type DashboardData = ReturnType<typeof useDashboardLojaData>
type Horizon = 'hoje' | 'semana' | 'dezena' | 'mes'
type PersistedHorizon = 'hoje' | 'esta_semana' | 'esta_dezena' | 'este_mes'

type PersistedTargetPlan = {
  id: string
  horizon: PersistedHorizon
  version: number
  monthly_goal: number | string | null
  realized: number | string
  proportional_goal: number | string | null
  monthly_gap: number | string | null
  projected_sales: number | string | null
  required_sales: number | string | null
  required_pace: number | string | null
  pace_label: string | null
  appointments_per_sale: number | string | null
  operational_need: number | string | null
  operational_basis: string | null
  focus_message: string | null
  source_hash: string | null
}

const Base44DropdownContent = DropdownMenuContent as unknown as ComponentType<{ children: ReactNode; align?: 'end'; className?: string }>
const Base44DropdownItem = DropdownMenuItem as unknown as ComponentType<{ children: ReactNode; className?: string; role?: 'menuitem'; onSelect: () => void }>

const persistedHorizonByView: Record<Horizon, PersistedHorizon> = {
  hoje: 'hoje',
  semana: 'esta_semana',
  dezena: 'esta_dezena',
  mes: 'este_mes',
}

export function ManagerStoreGoalReference({
  data,
  selectableStores = [],
  onStoreChange,
}: {
  data: DashboardData
  selectableStores?: Store[]
  onStoreChange?: (storeId: string) => void
}) {
  const navigate = useNavigate()
  const { baseRole } = useAuth()
  const [month, setMonth] = useState(data.referenceDate.slice(0, 7))
  const [horizon, setHorizon] = useState<Horizon>('semana')
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [persistedPlans, setPersistedPlans] = useState<Partial<Record<PersistedHorizon, PersistedTargetPlan>>>({})
  const [targetPlanRefreshing, setTargetPlanRefreshing] = useState(false)

  useEffect(() => {
    data.setViewMode('month')
    const monthStart = `${data.referenceDate.slice(0, 7)}-01`
    data.setStartDate(monthStart)
    data.setEndDate(format(endOfMonth(parseISO(monthStart)), 'yyyy-MM-dd'))
    return () => data.setViewMode('day')
  }, [data.referenceDate, data.setEndDate, data.setStartDate, data.setViewMode])

  const projectionMode = data.operationalMetaRules?.projection_mode || 'calendar'
  const activeReferenceDate = data.referenceDate < data.startDate
    ? data.startDate
    : data.referenceDate > data.endDate
      ? data.endDate
      : data.referenceDate

  const refreshTargetPlans = useCallback(async () => {
    if (!data.selectedStoreId) {
      setPersistedPlans({})
      return
    }

    setTargetPlanRefreshing(true)
    try {
      if (baseRole !== 'consultor_mx') {
        const consolidated = await supabase.rpc('consolidate_store_target_plan', {
          p_store_id: data.selectedStoreId,
          p_reference_date: activeReferenceDate,
        })
        if (consolidated.error) throw consolidated.error
      }

      const { data: rows, error } = await supabase
        .from('store_target_plans')
        .select('id,horizon,version,monthly_goal,realized,proportional_goal,monthly_gap,projected_sales,required_sales,required_pace,pace_label,appointments_per_sale,operational_need,operational_basis,focus_message,source_hash')
        .eq('store_id', data.selectedStoreId)
        .eq('reference_date', activeReferenceDate)
        .order('version', { ascending: false })
      if (error) throw error

      const latest: Partial<Record<PersistedHorizon, PersistedTargetPlan>> = {}
      for (const row of (rows || []) as PersistedTargetPlan[]) {
        if (!latest[row.horizon]) latest[row.horizon] = row
      }
      setPersistedPlans(latest)
    } catch (error) {
      console.error('Audit Error [ManagerStoreGoalReference]: target plan persistence failed ->', error)
      setPersistedPlans({})
    } finally {
      setTargetPlanRefreshing(false)
    }
  }, [activeReferenceDate, baseRole, data.selectedStoreId])

  useEffect(() => {
    void refreshTargetPlans()
  }, [refreshTargetPlans])

  const days = getDiasInfo(activeReferenceDate, projectionMode)
  const persistedMonth = persistedPlans.este_mes
  const fallbackGoal = data.metrics.goalValue || 0
  const fallbackSales = data.metrics.totalSales || 0
  const fallbackMetrics = calculateStoreGoalMetrics(fallbackGoal, fallbackSales, {
    elapsed: days.decorridos,
    total: days.total,
    remaining: days.restantes,
  })
  const goal = numberOrFallback(persistedMonth?.monthly_goal, fallbackGoal)
  const sales = numberOrFallback(persistedMonth?.realized, fallbackSales)
  const proportionalGoal = numberOrFallback(persistedMonth?.proportional_goal, fallbackMetrics.proportionalGoal)
  const gap = numberOrFallback(persistedMonth?.monthly_gap, fallbackMetrics.gap)
  /**
   * Delta assinado contra a meta proporcional, como no Base44: positivo mostra
   * quanto a loja está adiantada, negativo quanto está atrás. `paceGap` (só a
   * parte negativa) segue alimentando o Plano de Sustentação.
   */
  const paceDelta = sales - Math.round(proportionalGoal)
  const projection = numberOrFallback(persistedMonth?.projected_sales, fallbackMetrics.projection)
  const dailyPace = numberOrFallback(persistedMonth?.required_pace, fallbackMetrics.dailyPace)
  const attainment = goal > 0 ? Math.round((sales / goal) * 100) : 0
  const projectedPct = goal > 0 ? Math.round((projection / goal) * 100) : 0

  const chartData = useMemo(() => {
    const salesByDate = new Map<string, number>()
    for (const checkin of data.checkins) {
      const value = (checkin.vnd_porta_prev_day || 0) + (checkin.vnd_cart_prev_day || 0) + (checkin.vnd_net_prev_day || 0)
      salesByDate.set(checkin.reference_date, (salesByDate.get(checkin.reference_date) || 0) + value)
    }
    const chartStart = parseISO(data.startDate)
    const chartEnd = parseISO(data.endDate)
    const chartReference = parseISO(activeReferenceDate)
    const dates = eachDayOfInterval({ start: chartStart, end: chartEnd })
      .filter((date) => projectionMode === 'calendar' || !isWeekend(date))
    let realized = 0
    const realizedToReference = dates
      .filter((date) => date <= chartReference)
      .reduce((total, date) => total + (salesByDate.get(format(date, 'yyyy-MM-dd')) || 0), 0)
    const dailyAverage = days.decorridos > 0 ? realizedToReference / days.decorridos : 0
    let projected = realizedToReference

    return dates.map((date, index) => {
      const dateKey = format(date, 'yyyy-MM-dd')
      const isFuture = date > chartReference
      if (!isFuture) realized += salesByDate.get(dateKey) || 0
      if (isFuture) projected += dailyAverage
      return {
        date: format(date, 'dd/MM'),
        realizado: isFuture ? null : realized,
        meta: days.total > 0 ? Number(((goal / days.total) * (index + 1)).toFixed(1)) : 0,
        projecao: isFuture || date.getTime() === chartReference.getTime() ? Number(projected.toFixed(1)) : null,
      }
    })
  }, [activeReferenceDate, data.checkins, data.endDate, data.startDate, days.decorridos, days.total, goal, projectionMode])

  const closingRows = useMemo(() => buildStoreGoalClosingRows(data.checkins), [data.checkins])
  const teamRows = useMemo(
    () => buildStoreGoalTeamRows(data.metrics.ranking, { elapsed: days.decorridos, total: days.total }),
    [data.metrics.ranking, days.decorridos, days.total],
  )
  const channelRows = useMemo(
    () => buildStoreGoalChannelRows(data.checkins, sales),
    [data.checkins, sales],
  )

  const operationalStats = useMemo(() => {
    const salesInBase = closingRows.reduce((total, row) => total + row.sales, 0)
    const appointmentsInBase = closingRows.reduce((total, row) => total + row.appointments, 0)
    const visitsInBase = closingRows.reduce((total, row) => total + row.visits, 0)
    return {
      agendaPerSale: salesInBase > 0 ? appointmentsInBase / salesInBase : 0,
      visitsPerSale: salesInBase > 0 ? visitsInBase / salesInBase : 0,
    }
  }, [closingRows])

  const fallbackSustainabilityPlan = useMemo(() => calculateSustainabilityPlan({
    horizon,
    goal,
    realized: sales,
    referenceDate: activeReferenceDate,
    monthDays: { total: days.total, elapsed: days.decorridos, remaining: days.restantes },
    closings: closingRows,
    agendaPerSale: operationalStats.agendaPerSale,
    visitsPerSale: operationalStats.visitsPerSale,
    isOperationalDay: operationalDayPredicate(projectionMode),
  }), [activeReferenceDate, closingRows, days.decorridos, days.restantes, days.total, goal, horizon, operationalStats.agendaPerSale, operationalStats.visitsPerSale, projectionMode, sales])

  const selectedPersistedPlan = persistedPlans[persistedHorizonByView[horizon]]
  const sustainabilityPlan = useMemo<SustainabilityPlan>(() => {
    if (!selectedPersistedPlan) return fallbackSustainabilityPlan
    const requiredSales = numberOrFallback(selectedPersistedPlan.required_sales, 0)
    const requiredPace = numberOrFallback(selectedPersistedPlan.required_pace, 0)
    const operationalNeed = nullableNumber(selectedPersistedPlan.operational_need)
    const basis = selectedPersistedPlan.operational_basis || ''
    return {
      horizonte: horizon,
      faltam: requiredSales,
      ritmo: requiredPace,
      ritmoLabel: selectedPersistedPlan.pace_label || fallbackSustainabilityPlan.ritmoLabel,
      necessidadeOperacional: operationalNeed,
      tipoOperacional: basis.includes('atendimentos') ? 'atendimentos' : operationalNeed === null ? null : 'agendamentos',
      objectiveReached: requiredSales <= 0,
      mensagemFoco: selectedPersistedPlan.focus_message || fallbackSustainabilityPlan.mensagemFoco,
      hasStatisticalBase: selectedPersistedPlan.appointments_per_sale !== null,
    }
  }, [fallbackSustainabilityPlan, horizon, selectedPersistedPlan])

  const changeMonth = (value: string) => {
    if (!/^\d{4}-\d{2}$/.test(value)) return
    setMonth(value)
    const start = `${value}-01`
    data.setStartDate(start)
    data.setEndDate(format(endOfMonth(parseISO(start)), 'yyyy-MM-dd'))
  }

  const handleRefresh = async () => {
    await Promise.all([data.handleRefresh(), refreshTargetPlans()])
  }

  const handleSellerAction = (action: 'perfil' | 'rotina' | 'orientacao', sellerId: string, sellerName: string) => {
    sessionStorage.setItem('mx_contexto_navegacao', JSON.stringify({
      origemNavegacao: 'META_LOJA', vendedorIdOrigem: sellerId, vendedorNomeOrigem: sellerName,
      mesOrigem: month, dataHora: new Date().toISOString(),
    }))
    if (action === 'perfil') navigate('/minha-equipe')
    if (action === 'rotina') navigate(`/rotina-equipe?busca=${encodeURIComponent(sellerName)}`)
    if (action === 'orientacao') navigate(`/feedbacks-pdis?novoFeedback=${encodeURIComponent(sellerName)}`)
  }

  return (
    <section className="min-h-full bg-gray-50" aria-labelledby="manager-store-goal-title">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-24">
        <ManagerHomeReturnLink />
        <header className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 id="manager-store-goal-title" className="text-xl font-bold text-gray-800">Meta da Loja</h1>
              <p className="mt-0.5 text-sm text-gray-500">Acompanhe o resultado da loja e saiba o que fazer para alcançar a meta.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-gray-500">Período
                <input type="month" value={month} onChange={(event) => changeMonth(event.target.value)} className="mt-1 block rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </label>
              {selectableStores.length > 1 && onStoreChange ? (
                <label className="text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Building2 size={12} /> Unidade</span>
                  <select
                    aria-label="Unidade da meta"
                    value={data.selectedStoreId || ''}
                    onChange={(event) => onStoreChange(event.target.value)}
                    className="mt-1 block min-w-[140px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {selectableStores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                  </select>
                </label>
              ) : null}
              <button type="button" onClick={() => void handleRefresh()} disabled={data.isRefetching || targetPlanRefreshing} className="inline-flex h-[36px] items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60">
                <RefreshCw size={15} className={data.isRefetching || targetPlanRefreshing ? 'animate-spin' : ''} /> Atualizar
              </button>
              <button type="button" data-tour="metas-individuais" onClick={() => setGoalsOpen(true)} className="inline-flex h-[36px] items-center gap-1 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700">
                <Target size={15} /> Editar Metas
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <GoalCard icon={Target} label="Progresso da meta" tone="emerald" help="Vendas realizadas no mês divididas pela meta mensal. Verde ≥ 100%, amarelo ≥ 50%, vermelho abaixo.">{goal > 0 ? <><strong className="text-2xl text-gray-800">{sales} <span className="text-base font-medium text-gray-400">de {goal}</span></strong><Progress value={attainment} /><CardFooter left={`${attainment}%`} right="atingido" tone={attainment >= 100 ? 'emerald' : attainment >= 50 ? 'amber' : 'red'} /></> : <EmptyGoalState />}</GoalCard>
          <GoalCard icon={Gauge} label="Meta proporcional até hoje" tone="blue" help="Quanto a loja deveria ter vendido até hoje, considerando a meta mensal dividida pelos dias úteis. Comparado ao realizado mostra se o ritmo está acima ou abaixo.">{goal > 0 ? <><p className="text-sm text-gray-500">Meta proporcional: <b className="text-gray-700">{formatStoreGoalMetric(proportionalGoal)} vendas</b></p><p className="mt-1 text-sm text-gray-500">Realizado: <b className="text-gray-700">{sales}</b></p><p className={`mt-2 text-lg font-bold ${paceDelta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{paceDelta >= 0 ? `+${paceDelta} acima do ritmo` : `${paceDelta} abaixo do ritmo`}</p></> : <EmptyGoalState />}</GoalCard>
          <GoalCard icon={ShoppingCart} label="Faltam vender" tone="orange" help="Quantidade de vendas que ainda faltam para alcançar a meta mensal da loja.">{goal > 0 ? <><strong className="text-3xl text-gray-800">{formatStoreGoalMetric(gap)}</strong><p className="mt-1 text-sm text-gray-400">{gap === 1 ? 'venda' : 'vendas'}</p><p className="mt-2 text-xs text-gray-400">Para atingir a meta mensal</p></> : <EmptyGoalState />}</GoalCard>
          <GoalCard icon={TrendingUp} label="Projeção e ritmo necessário" tone="violet" help="Projeção de fechamento do mês com base na média diária atual. O ritmo necessário indica quantas vendas/dia faltam para bater a meta.">{goal > 0 ? <><strong className="text-2xl text-gray-800">{formatStoreGoalMetric(projection)} <span className="text-sm font-medium text-gray-400">vendas</span></strong><p className="text-sm font-medium text-violet-600">{projectedPct}% da meta</p><div className="mt-2 border-t border-gray-50 pt-2"><p className="mb-0.5 text-xs text-gray-400">Ritmo necessário:</p><p className="text-sm font-semibold text-gray-700">{persistedMonth?.pace_label || `${formatStoreGoalMetric(dailyPace)} ${dailyPace === 1 ? 'venda' : 'vendas'} por dia útil`}</p></div></> : <EmptyGoalState />}</GoalCard>
        </div>

        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800">Evolução da Meta</h2>
          <div className="mt-4 h-72 min-h-[288px] min-w-0">
            {goal <= 0 ? <div className="grid h-full place-items-center rounded-xl bg-gray-50 text-sm text-gray-500">Meta ainda não cadastrada.</div> : chartData.length ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={288}><LineChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke={chartTokens.grid()} /><XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTokens.axisTick() }} interval="preserveStartEnd" /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartTokens.axisTick() }} /><Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${chartTokens.grid()}`, fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="meta" name="Meta acumulada" stroke={chartTokens.managerStoreGoal()} strokeDasharray="4 4" dot={false} connectNulls /><Line type="monotone" dataKey="realizado" name="Realizado" stroke={chartTokens.success()} strokeWidth={2.5} dot={false} connectNulls /><Line type="monotone" dataKey="projecao" name="Projeção" stroke={chartTokens.managerStoreProjection()} strokeDasharray="6 4" strokeWidth={2} dot={false} connectNulls /></LineChart></ResponsiveContainer> : <div className="grid h-full place-items-center rounded-xl bg-gray-50 text-sm text-gray-500">A evolução aparecerá quando houver lançamentos oficiais no período.</div>}
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-100"><Activity size={16} className="text-emerald-600" /></span><h2 className="font-semibold text-gray-800">Plano de Sustentação</h2>{selectedPersistedPlan ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-caption font-semibold uppercase tracking-wide text-emerald-700">Oficial v{selectedPersistedPlan.version}</span> : null}</div>
          <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">{([['hoje', 'Hoje'], ['semana', 'Esta semana'], ['dezena', 'Esta dezena'], ['mes', 'Este mês']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setHorizon(key)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all ${horizon === key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>{label}</button>)}</div>
          {goal <= 0 ? <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">Meta ainda não cadastrada.</p> : <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SustainabilityBlock icon={Zap} label="Faltam" tone="orange">
                {sustainabilityPlan.objectiveReached ? <div className="flex items-center gap-1.5"><CheckCircle2 size={20} className="text-emerald-500" /><p className="text-sm font-semibold text-emerald-600">Objetivo atingido</p></div> : <><p className="text-2xl font-bold text-gray-800">{formatStoreGoalMetric(sustainabilityPlan.faltam)} <span className="text-base font-medium text-gray-400">{sustainabilityPlan.faltam === 1 ? 'venda' : 'vendas'}</span></p><p className="mt-1 text-xs text-gray-400">{horizon === 'hoje' ? 'para hoje' : horizon === 'semana' ? 'nesta semana' : horizon === 'dezena' ? 'nesta dezena' : 'neste mês'}</p></>}
              </SustainabilityBlock>
              <SustainabilityBlock icon={Activity} label="Ritmo necessário" tone="blue">
                {sustainabilityPlan.objectiveReached ? <p className="text-sm font-semibold text-emerald-600">Ritmo suficiente</p> : <p className="text-base font-semibold leading-snug text-gray-700">{sustainabilityPlan.ritmoLabel}</p>}
              </SustainabilityBlock>
              <SustainabilityBlock icon={Wrench} label="Necessidade operacional" tone="purple">
                {sustainabilityPlan.objectiveReached ? <p className="text-sm font-semibold text-emerald-600">Necessidade atendida</p> : sustainabilityPlan.necessidadeOperacional === null ? <p className="text-sm font-semibold text-amber-700">Base estatística insuficiente</p> : <><p className="text-lg font-bold text-gray-800">{formatStoreGoalMetric(sustainabilityPlan.necessidadeOperacional)} <span className="text-sm font-medium text-gray-400">{sustainabilityPlan.tipoOperacional}</span></p><p className="mt-1 text-xs text-gray-400">para gerar {formatStoreGoalMetric(sustainabilityPlan.faltam)} {sustainabilityPlan.faltam === 1 ? 'venda' : 'vendas'}</p></>}
              </SustainabilityBlock>
            </div>
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-sm font-medium leading-snug text-emerald-700">{sustainabilityPlan.mensagemFoco}</p></div>
            {!sustainabilityPlan.hasStatisticalBase ? <p className="mt-3 text-xs text-gray-400">Sem histórico suficiente — configure uma base oficial de agendamentos ou atendimentos por venda.</p> : null}
          </>}
        </article>

        <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4"><h2 className="font-semibold text-gray-800">Contribuição da Equipe</h2><p className="mt-0.5 text-xs text-gray-400">Ordenado por prioridade de atuação gerencial.</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="border-b border-gray-100 bg-gray-50"><tr>{[
            { label: 'Vendedor', tooltip: 'Integrante da equipe com vínculo ativo na loja.' },
            { label: 'Realizado', tooltip: 'Vendas confirmadas e faturadas acumuladas no período.' },
            { label: 'Meta prop.', tooltip: 'Meta proporcional prevista até o dia útil atual.' },
            { label: 'Resultado', tooltip: 'Faixa e percentual de atingimento da meta esperada.' },
            { label: 'Faltam', tooltip: 'Vendas restantes para atingir 100% da meta mensal.' },
            { label: 'Projeção', tooltip: 'Projeção matemática de vendas para o fim do mês baseada no ritmo diário atual.' },
            { label: 'Consistência', tooltip: 'Índice de assiduidade e disciplina nos fechamentos diários.' },
            { label: 'Ação', tooltip: 'Menu de ações gerenciais (perfil, rotina, orientação).' },
          ].map((col) => <th key={col.label} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"><span className="inline-flex items-center gap-1">{col.label}<HelpTooltip text={col.tooltip} /></span></th>)}</tr></thead><tbody className="divide-y divide-gray-50">{teamRows.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Nenhum vendedor vinculado.</td></tr> : teamRows.map((seller) => <tr key={seller.sellerId} className="hover:bg-gray-50"><td className="whitespace-nowrap px-4 py-3 font-medium text-gray-800">{seller.sellerName}</td><td className="px-4 py-3 font-medium text-emerald-600">{seller.realized}</td><td className="px-4 py-3 text-gray-700">{seller.proportionalGoal ?? '—'}</td><td className="px-4 py-3"><MetricPill value={seller.result} /></td><td className="px-4 py-3 text-orange-600">{seller.gap ?? '—'}</td><td className="px-4 py-3 text-gray-700">{seller.projection ?? '—'}</td><td className="px-4 py-3"><MetricPill value={seller.consistency} /></td><td className="px-4 py-3"><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`Ações para ${seller.sellerName}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" title="Ações"><MoreVertical size={15} /></button></DropdownMenuTrigger><Base44DropdownContent align="end" className="w-48"><Base44DropdownItem role="menuitem" onSelect={() => handleSellerAction('perfil', seller.sellerId, seller.sellerName)} className="gap-2 text-xs"><UserCircle size={14} />Ver perfil</Base44DropdownItem><Base44DropdownItem role="menuitem" onSelect={() => handleSellerAction('rotina', seller.sellerId, seller.sellerName)} className="gap-2 text-xs"><CalendarClock size={14} />Ver rotina</Base44DropdownItem><Base44DropdownItem role="menuitem" onSelect={() => handleSellerAction('orientacao', seller.sellerId, seller.sellerName)} className="gap-2 text-xs"><MessageSquarePlus size={14} />Registrar orientação</Base44DropdownItem></Base44DropdownContent></DropdownMenu></td></tr>)}</tbody></table></div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"><div className="border-b border-gray-100 px-5 py-4"><h2 className="font-semibold text-gray-800">Resultado por Canal</h2><p className="mt-0.5 text-xs text-gray-400">Conciliação: {sales} vendas totais da loja.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="border-b border-gray-100 bg-gray-50"><tr>{['Canal', 'Oportunidades', 'Vendas', 'Conversão', 'Participação', 'Para 1 venda', 'Situação'].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{channelRows.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sem dados de canal no período.</td></tr> : channelRows.map((channel) => <tr key={channel.name} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium text-gray-800">{channel.name}</td><td className="px-4 py-3 text-gray-700">{channel.opportunities ?? '—'}</td><td className="px-4 py-3 font-medium text-emerald-600">{channel.sales}</td><td className="px-4 py-3 text-gray-700">{channel.conversion === null ? '—' : `${channel.conversion}%`}</td><td className="px-4 py-3 text-gray-700">{channel.participation}%</td><td className="px-4 py-3 text-gray-700">{channel.perSale ?? '—'}</td><td className={`px-4 py-3 font-medium ${channel.situation === 'Bom' ? 'text-emerald-600' : channel.situation === 'Regular' ? 'text-amber-600' : channel.situation === 'Ruim' ? 'text-red-600' : 'text-gray-400'}`}>{channel.situation ?? '—'}</td></tr>)}</tbody></table></div></article>
        {/*
          Vendas fechadas moraram numa rota própria (`/vendas`) até 2026-08-05.
          O lugar delas é aqui: são a evidência granular do realizado que os
          cards acima resumem, e cancelar uma venda muda a meta na mesma tela.
        */}
        <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-800">Vendas Fechadas</h2>
            <p className="mt-0.5 text-xs text-gray-400">Vendas registradas pela equipe, com opção de cancelamento.</p>
          </div>
          <VendasFechadasLoja storeId={data.selectedStoreId} />
        </article>
      </div>

      {goalsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          role="presentation"
          onMouseDown={() => setGoalsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-goal-seller-goals-title"
            className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100"><UserCircle size={18} className="text-emerald-600" /></span>
                <div>
                  <h2 id="store-goal-seller-goals-title" className="font-semibold text-gray-800">Metas Individuais dos Vendedores</h2>
                  <p className="text-sm text-gray-500">Ajuste a meta de cada vendedor para o ciclo mensal atual e acompanhe o percentual atingido em tempo real.</p>
                </div>
              </div>
              <button type="button" aria-label="Fechar metas individuais" onClick={() => setGoalsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <SellerGoalsEditor storeId={data.selectedStoreId} storeName={data.metrics.storeName} embedded />
          </div>
        </div>
      )}
    </section>
  )
}

function numberOrFallback(value: number | string | null | undefined, fallback: number): number {
  if (value === null || value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function nullableNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function GoalCard({ icon: Icon, label, tone, help, children }: { icon: typeof Target; label: string; tone: 'emerald' | 'blue' | 'orange' | 'violet'; help?: string; children: ReactNode }) {
  const tones = { emerald: 'bg-emerald-100 text-emerald-600', blue: 'bg-blue-100 text-blue-600', orange: 'bg-orange-100 text-orange-600', violet: 'bg-purple-100 text-purple-600' }
  return <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}><Icon size={16} /></span><p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}<HelpTooltip text={help} /></p></div>{children}</article>
}
function Progress({ value }: { value: number }) { return <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className={`h-full rounded-full ${value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div> }
function CardFooter({ left, right, tone }: { left: string; right: string; tone: 'emerald' | 'amber' | 'red' }) { const colors = { emerald: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' }; return <div className="mt-2 flex justify-between text-xs text-gray-400"><span>{right}</span><b className={colors[tone]}>{left}</b></div> }
function MetricPill({ value }: { value: number | null }) { if (value === null) return <span className="text-gray-400">—</span>; const tone = value >= 100 ? 'bg-emerald-100 text-emerald-700' : value >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'; return <span className={`rounded-lg px-2 py-1 text-xs font-medium ${tone}`}>{value}%</span> }
function EmptyGoalState() { return <p className="text-sm font-medium text-gray-500">Meta ainda não cadastrada.</p> }
function SustainabilityBlock({ icon: Icon, label, tone, children }: { icon: typeof Activity; label: string; tone: 'orange' | 'blue' | 'purple'; children: ReactNode }) {
  const tones = { orange: 'text-orange-500', blue: 'text-blue-500', purple: 'text-purple-500' }
  return <div className="rounded-xl border border-gray-100 bg-gray-50 p-4"><div className="mb-2 flex items-center gap-1.5"><Icon size={16} className={tones[tone]} /><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p></div>{children}</div>
}

export default ManagerStoreGoalReference

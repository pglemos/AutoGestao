import type { ReactNode } from 'react'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Lightbulb,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  type BarRectangleItem,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { resolveIndividualGoal } from '@/lib/storeSalesRules'
import { chartTokens } from '@/lib/charts/tokens'
import {
  AGENDAMENTOS_POR_VENDA,
  buildSuggestedAction,
  buildTodayReading,
  calculateAppointmentGap,
  calculateAppointmentTarget,
  calculateForecastCoverage,
  calculateSellerFinancialStatus,
  formatSales,
  saleSuffix,
  sortTeamFocus,
  type ManagerTeamFocusItem,
} from '@/features/manager/home/manager-home-parity'
import { useManagerHomeOfficialSources } from '@/features/manager/home/useManagerHomeOfficialSources'
import type { Store } from '@/types/database'
import type { useDashboardLojaData } from '../hooks/useDashboardLojaData'
import type { OwnerPerformanceAlert } from './PerformanceAlerts'

type DashboardData = ReturnType<typeof useDashboardLojaData>

type Props = {
  data: DashboardData
  alerts: OwnerPerformanceAlert[]
  selectableStores?: Store[]
  onStoreChange?: (storeId: string) => void
}

type AppointmentChartItem = {
  sellerId: string
  firstName: string
  fullName: string
  appointments: number
}

export function ManagerSellerParityHomeCanonical({
  data,
  selectableStores = [],
  onStoreChange,
}: Props) {
  const navigate = useNavigate()
  const officialSources = useManagerHomeOfficialSources({
    storeId: data.selectedStoreId || null,
    referenceDate: data.referenceDate,
  })

  if (!data.selectedStoreId) {
    return (
      <ManagerHomeState
        title="Bem-vindo ao MX Performance"
        description="Cadastre sua loja e a meta mensal no módulo do Dono para ativar o Dashboard de Previsibilidade Comercial."
      />
    )
  }

  const activeSellers = data.sellers.filter(seller => seller.active && !seller.is_venda_loja)
  const monthlySalesBySeller = new Map(
    (data.officialMonthlyPerformance || []).map(row => [
      row.seller_user_id,
      Number(row.vendas_realizadas || 0),
    ]),
  )
  const plan = officialSources.plan
  const monthlyGoal = plan?.monthly_goal
    ?? Number(data.effectiveMonthlyGoal || data.metrics.goalValue || 0)
  const appointmentsToday = officialSources.totalAppointments
  const appointmentsPerSale = plan?.appointments_per_sale && plan.appointments_per_sale > 0
    ? plan.appointments_per_sale
    : AGENDAMENTOS_POR_VENDA
  const salesNeededToday = plan?.required_sales ?? null
  const salesForecastToday = appointmentsToday / appointmentsPerSale
  const appointmentTarget = plan?.operational_need
    ?? calculateAppointmentTarget(salesNeededToday, appointmentsPerSale)
  const appointmentGap = calculateAppointmentGap(appointmentsToday, appointmentTarget)
  const forecastCoverage = calculateForecastCoverage(salesForecastToday, salesNeededToday)
  const todayReading = salesNeededToday === null
    ? 'Meta ainda não cadastrada. A previsão existe, mas não há necessidade oficial para comparar.'
    : buildTodayReading(salesForecastToday, salesNeededToday)
  const suggestedAction = plan?.focus_message
    ?? buildSuggestedAction(appointmentGap, salesForecastToday, salesNeededToday)

  const businessDaysTotal = plan?.business_days_total ?? 0
  const businessDaysElapsed = plan?.business_days_elapsed ?? 0
  const individualGoal = resolveIndividualGoal({
    mode: data.operationalMetaRules?.individual_goal_mode,
    storeMonthlyGoal: monthlyGoal,
    activeSellersCount: activeSellers.length,
  })

  const team = sortTeamFocus(activeSellers.map((seller): ManagerTeamFocusItem => {
    const sellerAppointments = officialSources.appointmentsBySeller.get(seller.id) || 0
    const sellerForecast = sellerAppointments / appointmentsPerSale
    const sellerMonthlySales = monthlySalesBySeller.get(seller.id) || 0
    const proportionalGoal = individualGoal && businessDaysTotal > 0
      ? (individualGoal / businessDaysTotal) * businessDaysElapsed
      : 0
    const resultPercentage = proportionalGoal > 0
      ? (sellerMonthlySales / proportionalGoal) * 100
      : null

    return {
      sellerId: seller.id,
      sellerName: seller.name,
      appointmentsToday: sellerAppointments,
      salesForecastToday: sellerForecast,
      salesThisMonth: sellerMonthlySales,
      nextCommissionBand: null,
      missingCarsToNextBand: null,
      projectedAward: null,
      resultPercentage,
      financialStatus: calculateSellerFinancialStatus(
        null,
        sellerForecast,
        sellerAppointments,
        resultPercentage,
      ),
    }
  }))

  const chartData: AppointmentChartItem[] = activeSellers
    .map(seller => ({
      sellerId: seller.id,
      firstName: firstName(seller.name),
      fullName: seller.name,
      appointments: officialSources.appointmentsBySeller.get(seller.id) || 0,
    }))
    .sort((left, right) => right.appointments - left.appointments)

  const persistNavigationContext = () => {
    sessionStorage.setItem('mx_contexto_navegacao', JSON.stringify({
      origemNavegacao: 'DASHBOARD_GERENCIAL',
      data: data.referenceDate,
      unidade: data.selectedStoreId,
      planoVersao: plan?.version ?? null,
      dataHora: new Date().toISOString(),
    }))
  }

  const navigateFromDashboard = (path: string) => {
    persistNavigationContext()
    navigate(path)
  }

  const refresh = async () => {
    await Promise.all([data.handleRefresh(), officialSources.refresh()])
  }

  if (data.error || data.managerMonthlyError || officialSources.error) {
    return (
      <ManagerHomeState
        title="Não foi possível carregar o Início"
        description="As fontes oficiais da unidade não foram sincronizadas. Atualize antes de tomar uma decisão operacional."
        action={(
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Tentar novamente
          </button>
        )}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-24">
        <ManagerHeader
          referenceDate={data.referenceDate}
          stores={selectableStores}
          selectedStoreId={data.selectedStoreId}
          planVersion={plan?.version ?? null}
          onStoreChange={onStoreChange}
          onViewGoal={() => navigateFromDashboard('/meta-loja')}
          onViewRoutine={() => navigateFromDashboard('/rotina')}
          onRefresh={() => void refresh()}
          refreshing={data.isRefetching || officialSources.loading}
        />

        <section
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          data-tour="previsibilidade-dia"
          aria-label="Previsibilidade do dia"
        >
          <MetricCard icon={TrendingUp} label="Previsão de Vendas Hoje" tone="emerald">
            <MetricValue value={formatSales(salesForecastToday)} suffix={saleSuffix(salesForecastToday)} />
            <p className="mt-2 text-xs text-emerald-700">
              {appointmentsToday} agendamento{appointmentsToday === 1 ? '' : 's'} confirmado{appointmentsToday === 1 ? '' : 's'} válido{appointmentsToday === 1 ? '' : 's'}
            </p>
            <p className="mt-1 text-[11px] text-emerald-600">
              Razão oficial: 1 venda a cada {formatSales(appointmentsPerSale)} agendamentos
            </p>
          </MetricCard>

          <MetricCard icon={Target} label="Necessidade de Vendas no Dia" tone="blue">
            {salesNeededToday === null ? (
              <UnavailableValue text="Sem meta cadastrada" />
            ) : (
              <>
                <MetricValue value={formatSales(salesNeededToday)} suffix={saleSuffix(salesNeededToday)} />
                <p className="mt-2 text-xs text-gray-500">Plano de Sustentação oficial de hoje</p>
              </>
            )}
          </MetricCard>

          <MetricCard icon={CalendarClock} label="Meta de Agendamentos para Hoje" tone="violet">
            {appointmentTarget === null ? (
              <UnavailableValue text="Sem meta cadastrada" />
            ) : (
              <>
                <MetricValue value={formatSales(appointmentTarget)} suffix="agendamentos" />
                <p className="mt-2 text-xs text-gray-500">Necessidade × razão operacional</p>
              </>
            )}
          </MetricCard>

          <MetricCard
            icon={AlertTriangle}
            label="Gap de Agendamentos"
            tone={appointmentGap !== null && appointmentGap < 0 ? 'amber' : 'emerald'}
          >
            {appointmentGap === null ? (
              <UnavailableValue text="Sem meta cadastrada" />
            ) : (
              <>
                <MetricValue value={formatSigned(appointmentGap)} suffix="agendamentos" />
                <p className="mt-2 text-xs text-gray-500">
                  {appointmentGap < 0
                    ? `Faltam ${formatSales(Math.abs(appointmentGap))}`
                    : appointmentGap > 0
                      ? `Sobra de ${formatSales(appointmentGap)}`
                      : 'Agenda na meta'}
                </p>
              </>
            )}
          </MetricCard>
        </section>

        <section className="grid gap-4 lg:grid-cols-[3fr_2fr]">
          <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-600" />
              <h2 className="font-semibold">Leitura do Dia</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ReadingValue
                label="Previsão"
                value={`${formatSales(salesForecastToday)} ${saleSuffix(salesForecastToday)}`}
              />
              <ReadingValue
                label="Necessidade"
                value={salesNeededToday === null
                  ? 'Sem meta'
                  : `${formatSales(salesNeededToday)} ${saleSuffix(salesNeededToday)}`}
              />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${forecastCoverage !== null && forecastCoverage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(Math.max(forecastCoverage ?? 0, 0), 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-gray-600">{todayReading}</p>
          </article>

          <article className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-emerald-700" />
              <h2 className="font-semibold text-emerald-900">Ação sugerida</h2>
            </div>
            <p className="text-sm leading-6 text-emerald-800">{suggestedAction}</p>
          </article>
        </section>

        <TeamFocus
          team={team.slice(0, 5)}
          onViewAll={() => navigateFromDashboard('/minha-equipe')}
          onSellerClick={() => navigateFromDashboard('/minha-equipe')}
        />

        <section className="grid gap-4 lg:grid-cols-[9fr_11fr]">
          <FinancialRadar team={team} />
          <AppointmentsChart
            data={chartData}
            onBarClick={item => navigateFromDashboard(`/rotina-equipe?busca=${encodeURIComponent(item.fullName)}`)}
          />
        </section>

        <p className="text-center text-[11px] text-gray-400">
          Fontes oficiais: Plano de Sustentação v{plan?.version ?? '—'} e agenda confirmada da unidade.
        </p>
      </div>
    </div>
  )
}

function ManagerHeader({
  referenceDate,
  stores,
  selectedStoreId,
  planVersion,
  onStoreChange,
  onViewGoal,
  onViewRoutine,
  onRefresh,
  refreshing,
}: {
  referenceDate: string
  stores: Store[]
  selectedStoreId: string
  planVersion: number | null
  onStoreChange?: (storeId: string) => void
  onViewGoal: () => void
  onViewRoutine: () => void
  onRefresh: () => void
  refreshing: boolean
}) {
  return (
    <header className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">Início</h1>
            {planVersion ? (
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Plano oficial v{planVersion}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-gray-500">Previsibilidade comercial para conduzir o resultado do dia.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Building2
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <select
              aria-label="Unidade"
              value={selectedStoreId}
              onChange={event => onStoreChange?.(event.target.value)}
              disabled={!onStoreChange || stores.length <= 1}
              className="h-10 rounded-xl border border-gray-200 bg-white pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-50"
            >
              {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>

          <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 px-3 text-sm text-gray-600">
            <Calendar size={14} />
            {formatReferenceDate(referenceDate)}
          </span>

          <button
            type="button"
            onClick={onViewGoal}
            className="h-10 rounded-xl border border-emerald-200 px-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Ver Meta da Loja
          </button>
          <button
            type="button"
            onClick={onViewRoutine}
            className="h-10 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Ver Rotina do Dia
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Atualizar Dashboard"
            className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  )
}

function MetricCard({
  icon: Icon,
  label,
  tone,
  children,
}: {
  icon: LucideIcon
  label: string
  tone: 'emerald' | 'blue' | 'violet' | 'amber'
  children: ReactNode
}) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600',
  }[tone]

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>
          <Icon size={17} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      {children}
    </article>
  )
}

function MetricValue({ value, suffix }: { value: string; suffix: string }) {
  return (
    <p>
      <strong className="text-3xl text-gray-800">{value}</strong>{' '}
      <span className="text-sm font-medium text-gray-400">{suffix}</span>
    </p>
  )
}

function UnavailableValue({ text }: { text: string }) {
  return <div className="rounded-xl bg-gray-50 p-3 text-sm font-medium text-gray-500">{text}</div>
}

function ReadingValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-800">{value}</p>
    </div>
  )
}

function TeamFocus({
  team,
  onViewAll,
  onSellerClick,
}: {
  team: ManagerTeamFocusItem[]
  onViewAll: () => void
  onSellerClick: () => void
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-emerald-600" />
          <div>
            <h2 className="font-semibold">Equipe em foco</h2>
            <p className="text-xs text-gray-400">Agenda confirmada, projeção e ritmo por vendedor.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-emerald-700 hover:underline"
        >
          Ver equipe completa
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Vendedor', 'Agend. hoje', 'Projeção de vendas', 'Realizado no mês', 'Próxima faixa', 'Faltam carros', 'Situação'].map(label => (
                <th
                  key={label}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {team.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Nenhum vendedor vinculado a este gerente.
                </td>
              </tr>
            ) : team.map(item => (
              <tr
                key={item.sellerId}
                onClick={onSellerClick}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-medium text-gray-800">{item.sellerName}</td>
                <td className="px-4 py-3">{item.appointmentsToday}</td>
                <td className="px-4 py-3">{formatSales(item.salesForecastToday)}</td>
                <td className="px-4 py-3">{item.salesThisMonth}</td>
                <td className="px-4 py-3 text-gray-400">Sem regra configurada</td>
                <td className="px-4 py-3 text-gray-400">—</td>
                <td className="px-4 py-3">
                  <span className={`rounded-lg px-2 py-1 text-xs font-medium ${item.financialStatus.className}`}>
                    {item.financialStatus.label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function FinancialRadar({ team }: { team: ManagerTeamFocusItem[] }) {
  const active = team.filter(item => item.appointmentsToday > 0).length

  return (
    <article className="min-w-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <DollarSign size={18} className="text-emerald-600" />
        <div>
          <h2 className="font-semibold">Radar Financeiro da Equipe</h2>
          <p className="text-xs text-gray-400">Motor financeiro compartilhado com o Vendedor.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <RadarItem value={active} label="vendedores com agenda" />
        <RadarItem value="—" label="premiação projetada" />
        <RadarItem value="—" label="podem subir de faixa" />
      </div>
      <p className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
        Sem regra financeira configurada. Nenhum valor foi inventado.
      </p>
    </article>
  )
}

function RadarItem({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-emerald-700">{value}</p>
      <p className="mt-1 text-[11px] leading-4 text-gray-400">{label}</p>
    </div>
  )
}

function AppointmentsChart({
  data,
  onBarClick,
}: {
  data: AppointmentChartItem[]
  onBarClick: (item: AppointmentChartItem) => void
}) {
  const handleBarClick = (rectangle: BarRectangleItem) => {
    const item = rectangle.payload as AppointmentChartItem | undefined
    if (item) onBarClick(item)
  }

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-semibold">Agendamentos por Vendedor</h2>
        <p className="text-xs text-gray-400">
          Somatório conciliado: {data.reduce((sum, item) => sum + item.appointments, 0)} confirmados.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="grid h-56 place-items-center rounded-xl bg-gray-50 text-sm text-gray-500">
          Nenhum agendamento confirmado válido hoje.
        </div>
      ) : (
        <div className="h-64 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={256}
            initialDimension={{ width: 320, height: 256 }}
          >
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, left: 20, bottom: 0 }}>
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 10, fill: chartTokens.axisTick() }}
              />
              <YAxis
                type="category"
                dataKey="firstName"
                width={80}
                tick={{ fontSize: 11, fill: chartTokens.managerAxisTick() }}
              />
              <Bar
                dataKey="appointments"
                radius={[0, 6, 6, 0]}
                cursor="pointer"
                onClick={handleBarClick}
              >
                {data.map(item => (
                  <Cell
                    key={item.sellerId}
                    fill={item.appointments >= 2
                      ? chartTokens.success()
                      : item.appointments === 1
                        ? chartTokens.warning()
                        : chartTokens.axisTickMuted()}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </article>
  )
}

function ManagerHomeState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="grid min-h-[60vh] place-items-center bg-gray-50 p-6">
      <div className="max-w-lg rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-4 text-emerald-600" size={36} />
        <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  )
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name
}

function formatSigned(value: number) {
  return `${value > 0 ? '+' : ''}${formatSales(value)}`
}

function formatReferenceDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export default ManagerSellerParityHomeCanonical

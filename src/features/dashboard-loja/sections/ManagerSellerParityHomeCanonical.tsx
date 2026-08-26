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
import { resolveCanonicalIndividualGoal } from '@/lib/storeSalesRules'
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
  const officialMonthlyGoalsBySeller = new Map(
    (data.officialMonthlyPerformance || [])
      .filter(row => row.meta !== null && row.meta !== undefined)
      .map(row => [row.seller_user_id, Number(row.meta)]),
  )
  const plan = officialSources.plan
  const monthlyGoal = plan?.monthly_goal
    ?? Number(data.effectiveMonthlyGoal ?? data.metrics.goalValue ?? 0)
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
  const activeIndividualSellerCount = activeSellers.length

  const team = sortTeamFocus(activeSellers.map((seller): ManagerTeamFocusItem => {
    const sellerAppointments = officialSources.appointmentsBySeller.get(seller.id) || 0
    const sellerForecast = sellerAppointments / appointmentsPerSale
    const sellerMonthlySales = monthlySalesBySeller.get(seller.id) || 0
    const sellerGoal = resolveCanonicalIndividualGoal({
      officialGoal: officialMonthlyGoalsBySeller.get(seller.id),
      storeMonthlyGoal: monthlyGoal,
      activeSellersCount: activeIndividualSellerCount,
      isVendaLoja: seller.is_venda_loja,
    })
    const proportionalGoal = sellerGoal > 0 && businessDaysTotal > 0
      ? (sellerGoal / businessDaysTotal) * businessDaysElapsed
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
            className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Tentar novamente
          </button>
        )}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5 text-foreground">
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
            <p className="mt-2 text-xs text-status-success-text">
              {appointmentsToday} agendamento{appointmentsToday === 1 ? '' : 's'} confirmado{appointmentsToday === 1 ? '' : 's'} válido{appointmentsToday === 1 ? '' : 's'}
            </p>
            <p className="mt-1 text-caption text-status-success-text">
              Razão oficial: 1 venda a cada {formatSales(appointmentsPerSale)} agendamentos
            </p>
          </MetricCard>

          <MetricCard icon={Target} label="Necessidade de Vendas no Dia" tone="blue">
            {salesNeededToday === null ? (
              <UnavailableValue text="Sem meta cadastrada" />
            ) : (
              <>
                <MetricValue value={formatSales(salesNeededToday)} suffix={saleSuffix(salesNeededToday)} />
                <p className="mt-2 text-xs text-muted-foreground">Plano de Sustentação oficial de hoje</p>
              </>
            )}
          </MetricCard>

          <MetricCard icon={CalendarClock} label="Meta de Agendamentos para Hoje" tone="violet">
            {appointmentTarget === null ? (
              <UnavailableValue text="Sem meta cadastrada" />
            ) : (
              <>
                <MetricValue value={formatSales(appointmentTarget)} suffix="agendamentos" />
                <p className="mt-2 text-xs text-muted-foreground">Necessidade × razão operacional</p>
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
                <p className="mt-2 text-xs text-muted-foreground">
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
          <article className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 size={18} className="text-status-success-text" />
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
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${forecastCoverage !== null && forecastCoverage >= 100 ? 'bg-status-success' : 'bg-status-warning'}`}
                style={{ width: `${Math.min(Math.max(forecastCoverage ?? 0, 0), 100)}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{todayReading}</p>
          </article>

          <article className="rounded-2xl border border-status-success/20 bg-status-success-surface p-5">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-status-success-text" />
              <h2 className="font-semibold text-status-success-text">Ação sugerida</h2>
            </div>
            <p className="text-sm leading-6 text-status-success-text">{suggestedAction}</p>
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

        <p className="text-center text-caption text-muted-foreground">
          Fontes oficiais: Plano de Sustentação v{plan?.version ?? '—'} e agenda confirmada da unidade.
        </p>
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
    <header className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">Início</h1>
            {planVersion ? (
              <span className="rounded-full bg-status-success-surface px-2 py-1 text-caption font-semibold uppercase tracking-wide text-status-success-text">
                Plano oficial v{planVersion}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Previsibilidade comercial para conduzir o resultado do dia.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Building2
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <select
              aria-label="Unidade"
              value={selectedStoreId}
              onChange={event => onStoreChange?.(event.target.value)}
              disabled={!onStoreChange || stores.length <= 1}
              className="h-10 rounded-xl border border-border bg-white pl-9 pr-8 text-sm outline-none focus:ring-2 focus:ring-status-success disabled:cursor-not-allowed disabled:bg-surface-alt"
            >
              {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </label>

          <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground">
            <Calendar size={14} />
            {formatReferenceDate(referenceDate)}
          </span>

          <button
            type="button"
            onClick={onViewGoal}
            className="h-10 rounded-xl border border-status-success/30 px-3 text-sm font-semibold text-status-success-text hover:bg-status-success-surface"
          >
            Ver Meta da Loja
          </button>
          <button
            type="button"
            onClick={onViewRoutine}
            className="h-10 rounded-xl bg-brand-primary px-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
          >
            Ver Rotina do Dia
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Atualizar Dashboard"
            className="grid h-10 w-10 place-items-center rounded-xl border border-border text-muted-foreground hover:bg-surface-alt disabled:opacity-50"
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
    emerald: 'bg-status-success-surface text-status-success-text',
    blue: 'bg-status-info-surface text-status-info-text',
    violet: 'bg-status-info-surface text-status-info-text',
    amber: 'bg-status-warning-surface text-status-warning-text',
  }[tone]

  return (
    <article className="rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${toneClass}`}>
          <Icon size={17} />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      {children}
    </article>
  )
}

function MetricValue({ value, suffix }: { value: string; suffix: string }) {
  return (
    <p>
      <strong className="text-3xl text-foreground">{value}</strong>{' '}
      <span className="text-sm font-medium text-muted-foreground">{suffix}</span>
    </p>
  )
}

function UnavailableValue({ text }: { text: string }) {
  return <div className="rounded-xl bg-surface-alt p-3 text-sm font-medium text-muted-foreground">{text}</div>
}

function ReadingValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
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
    <article className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-status-success-text" />
          <div>
            <h2 className="font-semibold">Equipe em foco</h2>
            <p className="text-xs text-muted-foreground">Agenda confirmada, projeção e ritmo por vendedor.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-status-success-text hover:underline"
        >
          Ver equipe completa
        </button>
      </div>

      <div className="overflow-x-auto" role="region" aria-label="Tabela da equipe em foco" tabIndex={0}>
        <table className="w-full min-w-[848px] text-sm">
          <thead className="bg-surface-alt">
            <tr>
              {['Vendedor', 'Agend. hoje', 'Projeção de vendas', 'Realizado no mês', 'Próxima faixa', 'Faltam carros', 'Situação'].map(label => (
                <th
                  key={label}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {team.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum vendedor vinculado a este gerente.
                </td>
              </tr>
            ) : team.map(item => (
              <tr
                key={item.sellerId}
                onClick={onSellerClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSellerClick()
                  }
                }}
                tabIndex={0}
                className="cursor-pointer hover:bg-surface-alt"
              >
                <td className="px-4 py-3 font-medium text-foreground">{item.sellerName}</td>
                <td className="px-4 py-3">{item.appointmentsToday}</td>
                <td className="px-4 py-3">{formatSales(item.salesForecastToday)}</td>
                <td className="px-4 py-3">{item.salesThisMonth}</td>
                <td className="px-4 py-3 text-muted-foreground">Sem regra configurada</td>
                <td className="px-4 py-3 text-muted-foreground">—</td>
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
    <article className="min-w-0 rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <DollarSign size={18} className="text-status-success-text" />
        <div>
          <h2 className="font-semibold">Radar Financeiro da Equipe</h2>
          <p className="text-xs text-muted-foreground">Motor financeiro compartilhado com o Vendedor.</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <RadarItem value={active} label="vendedores com agenda" />
        <RadarItem value="—" label="premiação projetada" />
        <RadarItem value="—" label="podem subir de faixa" />
      </div>
      <p className="mt-4 rounded-xl bg-surface-alt p-3 text-xs text-muted-foreground">
        Sem regra financeira configurada. Nenhum valor foi inventado.
      </p>
    </article>
  )
}

function RadarItem({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-status-success-text">{value}</p>
      <p className="mt-1 text-caption leading-4 text-muted-foreground">{label}</p>
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
    <article className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-semibold">Agendamentos por Vendedor</h2>
        <p className="text-xs text-muted-foreground">
          Somatório conciliado: {data.reduce((sum, item) => sum + item.appointments, 0)} confirmados.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="grid h-56 place-items-center rounded-xl bg-surface-alt text-sm text-muted-foreground">
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
    <div className="grid min-h-[60vh] place-items-center bg-surface-alt p-6">
      <div className="max-w-lg rounded-2xl border border-border-subtle bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto mb-4 text-status-success-text" size={36} />
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
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

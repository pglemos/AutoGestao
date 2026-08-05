import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle,
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
import { somarVendas } from '@/lib/calculations'
import { chartTokens } from '@/lib/charts/tokens'
import { resolveIndividualGoal } from '@/lib/storeSalesRules'
import {
  buildSuggestedAction,
  buildTodayReading,
  DIAS_UTEIS_MES_PADRAO,
  AGENDAMENTOS_POR_VENDA,
  calculateAppointmentGap,
  calculateForecastCoverage,
  calculateSalesForecast,
  calculateSalesNeededToday,
  countElapsedBusinessDays,
  calculateAppointmentTarget,
  calculateSellerFinancialStatus,
  formatSales,
  saleSuffix,
  sortTeamFocus,
  type ManagerTeamFocusItem,
} from '@/features/manager/home/manager-home-parity'
import type { DailyCheckin, Store } from '@/types/database'
import type { useDashboardLojaData } from '../hooks/useDashboardLojaData'
import type { OwnerPerformanceAlert } from './PerformanceAlerts'

type DashboardData = ReturnType<typeof useDashboardLojaData>

type ManagerSellerParityHomeProps = {
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

export function ManagerSellerParityHome({
  data,
  selectableStores = [],
  onStoreChange,
}: ManagerSellerParityHomeProps) {
  const navigate = useNavigate()

  if (!data.selectedStoreId) {
    return (
      <ManagerHomeState
        title="Bem-vindo ao MX Performance"
        description="Cadastre sua loja e a meta mensal no módulo do Dono para ativar o Dashboard de Previsibilidade Comercial."
      />
    )
  }

  // `is_venda_loja` não exclui vendedor da equipe — ver useRanking.
  const activeSellers = data.sellers.filter(seller => seller.active)
  const activeSellerIds = new Set(activeSellers.map(seller => seller.id))
  const dailyCheckins = data.checkins.filter(checkin => activeSellerIds.has(checkin.seller_user_id))
  const monthlyCheckins = data.managerMonthlyCheckins.filter(checkin => activeSellerIds.has(checkin.seller_user_id))
  const dailyBySeller = groupCheckinsBySeller(dailyCheckins)
  const monthlyBySeller = groupCheckinsBySeller(monthlyCheckins)
  const officialMonthlySalesBySeller = new Map(
    (data.officialMonthlyPerformance || []).map(row => [row.seller_user_id, row.vendas_realizadas]),
  )

  const appointmentsToday = sumAppointments(dailyCheckins)
  const monthlyGoal = Number(data.effectiveMonthlyGoal || data.metrics.goalValue || 0)
  const salesToday = somarVendas(dailyCheckins)
  const salesForecastToday = calculateSalesForecast(appointmentsToday)
  const elapsedBusinessDays = countElapsedBusinessDays(data.referenceDate)
  const salesNeededToday = calculateSalesNeededToday(monthlyGoal, DIAS_UTEIS_MES_PADRAO, salesToday)
  const appointmentTarget = calculateAppointmentTarget(salesNeededToday)
  const appointmentGap = calculateAppointmentGap(appointmentsToday, appointmentTarget)
  const forecastCoverage = calculateForecastCoverage(salesForecastToday, salesNeededToday)
  const todayReading = buildTodayReading(salesForecastToday, salesNeededToday)
  const suggestedAction = buildSuggestedAction(appointmentGap, salesForecastToday, salesNeededToday)
  const individualGoal = resolveIndividualGoal({
    mode: data.operationalMetaRules?.individual_goal_mode,
    storeMonthlyGoal: monthlyGoal,
    activeSellersCount: activeSellers.length,
  })

  const team = sortTeamFocus(activeSellers.map((seller): ManagerTeamFocusItem => {
    const sellerDailyCheckins = dailyBySeller.get(seller.id) || []
    const sellerMonthlyCheckins = monthlyBySeller.get(seller.id) || []
    const sellerAppointments = sumAppointments(sellerDailyCheckins)
    const sellerForecast = calculateSalesForecast(sellerAppointments)
    const sellerMonthlySales = officialMonthlySalesBySeller.get(seller.id) ?? somarVendas(sellerMonthlyCheckins)
    const proportionalGoal = individualGoal && DIAS_UTEIS_MES_PADRAO > 0
      ? (individualGoal / DIAS_UTEIS_MES_PADRAO) * elapsedBusinessDays
      : 0
    const resultPercentage = proportionalGoal > 0 ? (sellerMonthlySales / proportionalGoal) * 100 : null

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
  const focusedTeam = team.slice(0, 5)
  const chartData = activeSellers
    .map((seller): AppointmentChartItem => ({
      sellerId: seller.id,
      firstName: firstName(seller.name),
      fullName: seller.name,
      appointments: sumAppointments(dailyBySeller.get(seller.id) || []),
    }))
    .sort((left, right) => right.appointments - left.appointments)

  const persistNavigationContext = () => {
    sessionStorage.setItem('mx_contexto_navegacao', JSON.stringify({
      origemNavegacao: 'DASHBOARD_GERENCIAL',
      data: data.referenceDate,
      unidade: data.selectedStoreId,
      dataHora: new Date().toISOString(),
    }))
  }
  const navigateFromDashboard = (path: string) => {
    persistNavigationContext()
    navigate(path)
  }

  if (data.error || data.managerMonthlyError) {
    return (
      <ManagerHomeState
        title="Não foi possível carregar o Início"
        description="Os dados da unidade não foram sincronizados. Atualize antes de tomar uma decisão operacional."
        action={<button type="button" onClick={() => void data.handleRefresh()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Tentar novamente</button>}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-24">
        <ManagerHomeHeader
          referenceDate={data.referenceDate}
          stores={selectableStores}
          selectedStoreId={data.selectedStoreId}
          onStoreChange={onStoreChange}
          onViewGoal={() => navigateFromDashboard('/meta-loja')}
          onViewRoutine={() => navigateFromDashboard('/rotina')}
          onRefresh={() => void data.handleRefresh()}
          refreshing={data.isRefetching}
        />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Previsibilidade do dia">
          <SalesForecastCard salesForecast={salesForecastToday} appointments={appointmentsToday} appointmentsPerSale={AGENDAMENTOS_POR_VENDA} />
          <SalesNeededCard salesNeeded={salesNeededToday} />
          <AppointmentTargetCard appointmentTarget={appointmentTarget} salesNeeded={salesNeededToday} />
          <AppointmentGapCard appointmentGap={appointmentGap} />
        </section>

        <section className="flex flex-col gap-4 lg:flex-row">
          <div className="lg:w-[60%]">
            <TodayReading
              salesForecast={salesForecastToday}
              salesNeeded={salesNeededToday}
              coverage={forecastCoverage}
              message={todayReading}
            />
          </div>
          <div className="lg:w-[40%]">
            <SuggestedAction message={suggestedAction} />
          </div>
        </section>

        <TeamFocus
          team={focusedTeam}
          showAll={activeSellers.length > 0}
          onSellerClick={() => navigateFromDashboard('/minha-equipe')}
          onViewAll={() => navigateFromDashboard('/minha-equipe')}
        />

        <section className="flex flex-col gap-4 lg:flex-row">
          <div className="lg:w-[45%]">
            <FinancialRadar team={team} rulesConfigured={false} />
          </div>
          <div className="lg:w-[55%]">
            <AppointmentsChart
              data={chartData}
              onBarClick={item => navigateFromDashboard(`/rotina-equipe?busca=${encodeURIComponent(item.fullName)}`)}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function ManagerHomeHeader({
  referenceDate,
  stores,
  selectedStoreId,
  onStoreChange,
  onViewGoal,
  onViewRoutine,
  onRefresh,
  refreshing,
}: {
  referenceDate: string
  stores: Store[]
  selectedStoreId: string | null
  onStoreChange?: (storeId: string) => void
  onViewGoal: () => void
  onViewRoutine: () => void
  onRefresh: () => void
  refreshing: boolean
}) {
  const date = new Date(`${referenceDate}T12:00:00-03:00`)
  const weekday = capitalize(new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(date))
  const longDate = new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date)

  return (
    <header className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Início</h1>
          <p className="mt-0.5 text-sm text-gray-500">Previsibilidade comercial para conduzir o resultado do dia.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-gray-700">{weekday}</p>
            <p className="text-xs text-gray-500">{longDate}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600">
              {formatNumericDate(referenceDate)}
            </div>
            {stores.length > 1 && onStoreChange ? (
              <label className="relative">
                <span className="sr-only">Unidade</span>
                <Building2 size={14} className="pointer-events-none absolute left-2.5 top-2.5 text-gray-400" />
                <select
                  aria-label="Unidade"
                  value={selectedStoreId || ''}
                  onChange={event => onStoreChange(event.target.value)}
                  className="min-w-[120px] rounded-xl border border-gray-200 py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
                </select>
              </label>
            ) : null}
            <HeaderAction icon={Target} label="Ver Meta da Loja" onClick={onViewGoal} tone="emerald" />
            <HeaderAction icon={CalendarClock} label="Ver Rotina do Dia" onClick={onViewRoutine} tone="dark" />
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Atualizar início"
              className="grid h-[38px] w-10 place-items-center rounded-xl text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function HeaderAction({ icon: Icon, label, onClick, tone }: {
  icon: LucideIcon
  label: string
  onClick: () => void
  tone: 'emerald' | 'dark'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[38px] items-center gap-1 rounded-xl border px-3 text-sm font-semibold shadow-sm transition-colors ${tone === 'emerald' ? 'border-emerald-600 text-emerald-700 hover:bg-emerald-50' : 'border-gray-800 text-gray-800 hover:bg-gray-100'}`}
    >
      <Icon size={14} /> {label}
    </button>
  )
}

function SalesForecastCard({ salesForecast, appointments, appointmentsPerSale }: { salesForecast: number | null; appointments: number; appointmentsPerSale: number | null }) {
  return (
    <article className="flex min-h-[140px] flex-col justify-between rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-md">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-emerald-100">Previsão de Vendas Hoje</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20"><TrendingUp size={18} /></span>
      </div>
      <div>
        <p className="text-3xl font-bold leading-tight">{salesForecast === null ? '—' : `${formatSales(salesForecast)} ${saleSuffix(salesForecast)}`}</p>
        <p className="mt-1 text-sm text-emerald-100">
          {appointmentsPerSale === null
            ? 'Base estatística insuficiente para projetar vendas.'
            : appointments === 0
            ? 'Nenhum agendamento confirmado para hoje.'
            : `${appointments} agendamento${appointments === 1 ? '' : 's'} confirmado${appointments === 1 ? '' : 's'} hoje`}
        </p>
      </div>
      <p className="mt-2 text-xs text-emerald-200">{appointmentsPerSale === null ? 'Regra oficial indisponível' : `Regra atual: 1 venda a cada ${formatSales(appointmentsPerSale)} agendamentos`}</p>
    </article>
  )
}

function SalesNeededCard({ salesNeeded }: { salesNeeded: number | null }) {
  const missingGoal = salesNeeded === null
  const fulfilled = salesNeeded === 0
  return (
    <article className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Necessidade de Vendas no Dia</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gray-100"><Target size={18} className="text-gray-500" /></span>
      </div>
      <div>
        {missingGoal ? (
          <><p className="text-2xl font-bold text-gray-400">Meta não cadastrada</p><p className="mt-1 text-sm text-gray-400">Cadastre a meta da loja para ativar a previsibilidade.</p></>
        ) : fulfilled ? (
          <><p className="text-3xl font-bold text-emerald-600">0 vendas adicionais</p><p className="mt-1 text-sm text-gray-500">Necessidade do dia atendida</p></>
        ) : (
          <><p className="text-3xl font-bold text-gray-800">{salesNeeded} {salesNeeded === 1 ? 'venda' : 'vendas'}</p><p className="mt-1 text-sm text-gray-500">Para sustentar a meta da loja hoje</p></>
        )}
      </div>
    </article>
  )
}

function AppointmentTargetCard({ appointmentTarget, salesNeeded }: { appointmentTarget: number | null; salesNeeded: number | null }) {
  const missingGoal = appointmentTarget === null
  const fulfilled = salesNeeded === 0
  return (
    <article className="flex min-h-[140px] flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Meta de Agendamentos para Hoje</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gray-100"><Calendar size={18} className="text-gray-500" /></span>
      </div>
      <div>
        {missingGoal ? (
          <><p className="text-2xl font-bold text-gray-400">Não calculada</p><p className="mt-1 text-sm text-gray-400">Cadastre a meta da loja.</p></>
        ) : (
          <>
            <p className="text-3xl font-bold text-gray-800">{fulfilled ? '0 obrigatórios' : `${appointmentTarget} agendamentos`}</p>
            <p className="mt-1 text-sm text-gray-500">{fulfilled ? 'Para a necessidade atual do dia' : `Baseado na necessidade de ${salesNeeded} vendas`}</p>
          </>
        )}
      </div>
    </article>
  )
}

function AppointmentGapCard({ appointmentGap }: { appointmentGap: number | null }) {
  const missingGoal = appointmentGap === null
  const negative = appointmentGap !== null && appointmentGap < 0
  const zero = appointmentGap === 0
  const positive = appointmentGap !== null && appointmentGap > 0
  const absoluteGap = Math.abs(appointmentGap || 0)
  return (
    <article className={`flex min-h-[140px] flex-col justify-between rounded-2xl border bg-white p-5 shadow-sm ${negative ? 'border-orange-200' : zero || positive ? 'border-emerald-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Gap de Agendamentos</p>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gray-100">
          {missingGoal || negative
            ? <AlertTriangle size={18} className={negative ? 'text-orange-500' : 'text-gray-400'} />
            : <CheckCircle size={18} className="text-emerald-500" />}
        </span>
      </div>
      <div>
        {missingGoal ? (
          <><p className="text-2xl font-bold text-gray-400">Não calculado</p><p className="mt-1 text-sm text-gray-400">Cadastre a meta da loja.</p></>
        ) : negative ? (
          <><p className="text-3xl font-bold text-orange-500">{appointmentGap}</p><p className="mt-1 text-sm text-gray-500">Faltam {absoluteGap} agendamento{absoluteGap === 1 ? '' : 's'} para sustentar o volume de vendas necessário</p></>
        ) : zero ? (
          <><p className="text-3xl font-bold text-emerald-600">0</p><p className="mt-1 text-sm text-gray-500">Meta de agendamentos atendida</p></>
        ) : (
          <><p className="text-3xl font-bold text-emerald-600">+{appointmentGap}</p><p className="mt-1 text-sm text-gray-500">{appointmentGap} agendamento{appointmentGap === 1 ? '' : 's'} acima da necessidade</p></>
        )}
      </div>
    </article>
  )
}

function TodayReading({ salesForecast, salesNeeded, coverage, message }: {
  salesForecast: number | null
  salesNeeded: number | null
  coverage: number | null
  message: string
}) {
  const missingGoal = salesNeeded === null
  const fulfilled = salesNeeded === 0
  const missingBase = salesForecast === null
  const deficit = !missingGoal && !fulfilled && !missingBase && salesForecast < salesNeeded
  const fill = missingGoal || fulfilled ? 100 : missingBase ? 0 : Math.min((salesForecast / salesNeeded) * 100, 100)
  return (
    <article className="h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold text-gray-800">Leitura do Dia</h2>
      <div className="mb-3 flex items-center justify-between">
        <div><p className="text-xs text-gray-500">Previsão</p><p className="text-xl font-bold text-gray-800">{missingBase ? '—' : `${formatSales(salesForecast)} ${saleSuffix(salesForecast)}`}</p></div>
        <div className="text-right"><p className="text-xs text-gray-500">Necessidade</p><p className="text-xl font-bold text-gray-800">{missingGoal ? '—' : fulfilled ? '0' : `${salesNeeded} vendas`}</p></div>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full transition-all ${deficit ? 'bg-orange-400' : 'bg-emerald-500'}`} style={{ width: `${fill}%` }} />
        <div className="absolute left-full top-0 h-full w-0.5 bg-gray-700" />
      </div>
      {coverage !== null ? <p className="mt-1.5 text-xs text-gray-400">Cobertura: {Math.round(coverage)}%</p> : null}
      <p className={`mt-3 text-sm font-medium ${deficit ? 'text-orange-600' : 'text-gray-600'}`}>{message}</p>
    </article>
  )
}

function SuggestedAction({ message }: { message: string }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50"><Lightbulb size={16} className="text-amber-500" /></span><h2 className="text-sm font-bold text-gray-800">Ação sugerida</h2></div>
      <p className="flex-1 text-sm leading-relaxed text-gray-600">{message}</p>
    </article>
  )
}

function TeamFocus({ team, showAll, onSellerClick, onViewAll }: {
  team: ManagerTeamFocusItem[]
  showAll: boolean
  onSellerClick: (seller: ManagerTeamFocusItem) => void
  onViewAll: () => void
}) {
  if (team.length === 0) {
    return (
      <section aria-label="Equipe em foco" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-gray-800">Equipe em foco</h2>
        <p className="py-6 text-center text-sm text-gray-400">Nenhum vendedor vinculado a este gerente.</p>
      </section>
    )
  }

  return (
    <section aria-label="Equipe em foco" className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-800">Equipe em foco</h2>
        {showAll ? <button type="button" onClick={onViewAll} className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 hover:text-emerald-700">Ver toda a equipe <span aria-hidden>›</span></button> : null}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">{['Vendedor', 'Agend. Hoje', 'Projeção', 'Realizado mês', 'Próx. faixa', 'Faltam carros', 'Status'].map((label, index) => <th key={label} className={`${index === 0 ? 'text-left' : 'text-center'} pb-2 font-medium`}>{label}</th>)}</tr></thead>
          <tbody>{team.map(seller => <TeamFocusRow key={seller.sellerId} seller={seller} onClick={() => onSellerClick(seller)} />)}</tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {team.map(seller => (
          <button key={seller.sellerId} type="button" onClick={() => onSellerClick(seller)} className="w-full rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50">
            <div className="mb-2 flex items-center justify-between gap-2"><SellerIdentity seller={seller} /><StatusBadge status={seller.financialStatus} /></div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <MobileMetric label="Agend. hoje" value={seller.appointmentsToday} />
              <MobileMetric label="Projeção" value={formatSales(seller.salesForecastToday)} />
              <MobileMetric label="Realizado mês" value={seller.salesThisMonth} />
              <MobileMetric label="Faltam carros" value={seller.missingCarsToNextBand ?? '—'} />
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}

function TeamFocusRow({ seller, onClick }: { seller: ManagerTeamFocusItem; onClick: () => void }) {
  return (
    <tr onClick={onClick} className="cursor-pointer border-b border-gray-50 transition-colors hover:bg-gray-50">
      <td className="py-2.5 pr-3"><SellerIdentity seller={seller} /></td>
      <td className="px-2 text-center text-gray-700">{seller.appointmentsToday}</td>
      <td className="px-2 text-center text-gray-700">{formatSales(seller.salesForecastToday)}</td>
      <td className="px-2 text-center text-gray-700">{seller.salesThisMonth}</td>
      <td className="px-2 text-center text-xs text-gray-500">{seller.nextCommissionBand ?? 'Sem regra configurada'}</td>
      <td className="px-2 text-center text-xs text-gray-500">{seller.missingCarsToNextBand ?? '—'}</td>
      <td className="pl-2 text-center"><StatusBadge status={seller.financialStatus} /></td>
    </tr>
  )
}

function SellerIdentity({ seller }: { seller: ManagerTeamFocusItem }) {
  return <div className="flex min-w-0 items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{initials(seller.sellerName)}</span><span className="truncate text-sm font-medium text-gray-700">{seller.sellerName}</span></div>
}

function StatusBadge({ status }: { status: ManagerTeamFocusItem['financialStatus'] }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
}

function MobileMetric({ label, value }: { label: string; value: ReactNode }) {
  return <div><span className="text-gray-400">{label}:</span> <span className="font-medium text-gray-700">{value}</span></div>
}

function FinancialRadar({ team, rulesConfigured }: { team: ManagerTeamFocusItem[]; rulesConfigured: boolean }) {
  const closeToBand = rulesConfigured ? team.filter(seller => (seller.missingCarsToNextBand || 0) > 0 && (seller.missingCarsToNextBand || 0) <= 2).length : 0
  const projectedAward = rulesConfigured ? team.reduce((sum, seller) => sum + (seller.projectedAward || 0), 0) : null
  const canMoveUp = rulesConfigured ? team.filter(seller => (seller.missingCarsToNextBand || 0) > 0 && seller.salesForecastToday !== null && seller.salesForecastToday >= (seller.missingCarsToNextBand || 0)).length : 0
  return (
    <article className="h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold text-gray-800">Radar Financeiro da Equipe</h2>
      <div className="space-y-3">
        <RadarRow icon={Users} label="Vendedores próximos da próxima faixa" value={rulesConfigured ? `${closeToBand} vendedor${closeToBand === 1 ? '' : 'es'}` : 'Regras não configuradas'} tone="emerald" />
        <RadarRow icon={DollarSign} label="Premiação projetada da equipe" value={rulesConfigured ? formatCurrency(projectedAward) : 'Regras não configuradas'} tone="amber" />
        <RadarRow icon={TrendingUp} label="Vendedores podem subir de faixa hoje" value={rulesConfigured ? `${canMoveUp} vendedor${canMoveUp === 1 ? '' : 'es'}` : 'Regras não configuradas'} tone="emerald" />
      </div>
    </article>
  )
}

function RadarRow({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: 'emerald' | 'amber' }) {
  return <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}><Icon size={18} /></span><div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-bold text-gray-800">{value}</p></div></div>
}

function AppointmentsChart({ data, onBarClick }: { data: AppointmentChartItem[]; onBarClick: (item: AppointmentChartItem) => void }) {
  const maxValue = Math.max(...data.map(item => item.appointments), 1)
  const handleBarClick = (rectangle: BarRectangleItem) => {
    const item = rectangle.payload as AppointmentChartItem | undefined
    if (item) onBarClick(item)
  }
  return (
    <article className="h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-bold text-gray-800">Agendamentos por Vendedor</h2>
      {data.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">Nenhum agendamento confirmado para hoje.</p> : (
        <ResponsiveContainer width="100%" height={Math.max(data.length * 38 + 10, 120)}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, maxValue]} hide />
            <YAxis type="category" dataKey="firstName" width={100} tick={{ fontSize: 12, fill: chartTokens.managerAxisTick() }} axisLine={false} tickLine={false} />
            <Bar dataKey="appointments" radius={[0, 4, 4, 0]} cursor="pointer" onClick={handleBarClick}>
              {data.map(item => <Cell key={item.sellerId} fill={item.appointments > 0 ? chartTokens.managerPositive() : '#d1d5db'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </article>
  )
}

function ManagerHomeState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-full items-center justify-center bg-gray-50 px-4 py-12"><div className="max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm"><h2 className="font-semibold text-gray-700">{title}</h2><p className="mt-2 text-sm text-gray-500">{description}</p>{action ? <div className="mt-5">{action}</div> : null}</div></div>
}

function groupCheckinsBySeller(checkins: DailyCheckin[]) {
  const grouped = new Map<string, DailyCheckin[]>()
  for (const checkin of checkins) {
    const current = grouped.get(checkin.seller_user_id)
    if (current) current.push(checkin)
    else grouped.set(checkin.seller_user_id, [checkin])
  }
  return grouped
}

function sumAppointments(checkins: DailyCheckin[]) {
  return checkins.reduce((total, checkin) => total + (checkin.agd_cart_today || 0) + (checkin.agd_net_today || 0), 0)
}

function formatNumericDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function formatCurrency(value: number | null) {
  if (value === null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return `${parts[0]?.[0] || '?'}${parts.length > 1 ? parts[parts.length - 1][0] : ''}`.toUpperCase()
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || '—'
}

function capitalize(value: string) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value
}

export default ManagerSellerParityHome

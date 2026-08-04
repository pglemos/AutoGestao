import { Box, CalendarCheck2, DollarSign, ShoppingCart } from 'lucide-react'
import type { OwnerPerformanceAlert } from '../PerformanceAlerts'
import type { ActionRow, DashboardData, DepartmentScore } from './types'
import { formatCurrency, formatInteger, formatPercent } from './format'
import { MXScoreCompact, OwnerKpiCard } from './primitives'
import { CommercialManagementNotice } from '@/features/owner/CommercialManagementNotice'
import {
  ConsultantMxCard,
  NextActionsCard,
  OwnerAlertList,
  OwnerDepartmentScoreGrid,
  PriorityIntervention,
  SalesGoalCard,
} from './OwnerHomeWidgets'

export function OwnerHome({
  data,
  alerts,
  actions,
  departments,
  mxScore,
  marginPercent,
  onOpenConsultant,
}: {
  data: DashboardData
  alerts: OwnerPerformanceAlert[]
  actions: ActionRow[]
  departments: DepartmentScore[]
  mxScore: number | null
  marginPercent: number | null
  onOpenConsultant: () => void
}) {
  const grossProfit = data.latestDRE?.gross_profit
  const confirmedAppointments = data.metrics.totalAgd
  const periodStart = new Date(`${data.periodStartDate || data.referenceDate}T12:00:00`)
  const selectedEnd = new Date(`${data.periodEndDate || data.referenceDate}T12:00:00`)
  const horizonEnd = data.period === 'month'
    ? new Date(selectedEnd.getFullYear(), selectedEnd.getMonth() + 1, 0, 12)
    : data.period === 'quarter'
      ? new Date(selectedEnd.getFullYear(), selectedEnd.getMonth() - (selectedEnd.getMonth() % 3) + 3, 0, 12)
      : data.period === 'year'
        ? new Date(selectedEnd.getFullYear(), 11, 31, 12)
        : selectedEnd
  const elapsedDays = Math.max(1, Math.floor((selectedEnd.getTime() - periodStart.getTime()) / 86400000) + 1)
  const periodDays = Math.max(elapsedDays, Math.floor((horizonEnd.getTime() - periodStart.getTime()) / 86400000) + 1)
  const salesForecast = data.metrics.totalSales > 0 ? (data.metrics.totalSales / elapsedDays) * periodDays : 0
  const salesRunRate = data.metrics.totalSales / elapsedDays
  const dailyNeed = data.metrics.goalValue > 0 ? data.metrics.goalValue / periodDays : 0
  const forecastIsHealthy = dailyNeed <= 0 || salesRunRate >= dailyNeed
  const forecastLabel = salesForecast.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(salesForecast) ? 0 : 1,
    maximumFractionDigits: 1,
  })
  const dailyNeedLabel = dailyNeed.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  const priorityAlert = alerts.find(alert => alert.variant === 'danger') || alerts[0] || null

  return (
    <>
      <CommercialManagementNotice />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <OwnerKpiCard
          title="Previsão de Vendas"
          value={`${forecastLabel} ${salesForecast === 1 ? 'venda' : 'vendas'}`}
          detail={`${formatInteger(confirmedAppointments)} agendamentos no período · necessidade ${dailyNeedLabel}`}
          trend={{
            label: forecastIsHealthy ? 'Acima da necessidade diária' : 'Abaixo da necessidade diária',
            tone: forecastIsHealthy ? 'success' : 'warning',
          }}
          icon={<CalendarCheck2 size={20} />}
          tone={forecastIsHealthy ? 'success' : 'warning'}
          chart="bars"
          seed={5}
        />
        <OwnerKpiCard
          title="Lucro Bruto"
          value={formatCurrency(grossProfit)}
          detail={grossProfit === undefined ? 'DRE pendente' : marginPercent === null ? 'Margem pendente' : `Margem ${formatPercent(marginPercent)}`}
          icon={<DollarSign size={20} />}
          tone={grossProfit === undefined ? 'muted' : 'success'}
          chart="line"
          seed={1}
          showStatusDot={grossProfit !== undefined}
        />
        <OwnerKpiCard
          title="Volume de Vendas"
          value={`${formatInteger(data.metrics.totalSales)} ${data.metrics.totalSales === 1 ? 'veículo' : 'veículos'}`}
          detail={data.metrics.goalValue > 0 ? `${data.metrics.attainment}% da meta` : 'Meta não configurada'}
          icon={<ShoppingCart size={20} />}
          tone="purple"
          statusTone={data.metrics.attainment >= 100 ? 'success' : data.metrics.attainment >= 60 ? 'warning' : 'danger'}
          chart="bars"
          seed={3}
        />
        <OwnerKpiCard
          title="Estoque"
          value={`${formatInteger(data.inventory?.total ?? 0)} ${(data.inventory?.total ?? 0) === 1 ? 'veículo' : 'veículos'}`}
          detail={`${formatInteger(data.inventory?.agingOver90 ?? 0)} acima de 90 dias`}
          icon={<Box size={20} />}
          tone={(data.inventory?.agingOver90 ?? 0) > 0 ? 'warning' : 'success'}
          chart="line"
          seed={4}
          showStatusDot
        />
        <MXScoreCompact score={mxScore} />
      </div>

      <PriorityIntervention alert={priorityAlert} onOpenConsultant={onOpenConsultant} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SalesGoalCard data={data} />
        <OwnerAlertList alerts={alerts} />
        <NextActionsCard actions={actions} />
      </div>

      <OwnerDepartmentScoreGrid departments={departments} />

      <ConsultantMxCard onOpenConsultant={onOpenConsultant} />
    </>
  )
}

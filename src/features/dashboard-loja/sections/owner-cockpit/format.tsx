import { DollarSign, Gauge, Megaphone, Package, Users } from 'lucide-react'
import {
  buildCentralMxEngine,
  statusLabel,
  DEPARTMENT_NAMES,
  type CentralMxActionPlanItem,
  type CentralMxDepartmentModule,
  type CentralMxIndicatorUnit,
  type CentralMxIndicatorValue,
} from '@/lib/central-mx-engine'
import { classifyMxScore, type ExecutiveAlert, type MxDepartmentCode } from '@/lib/mx-executive-foundation'
import type { OwnerPerformanceAlert } from '../PerformanceAlerts'
import { resolveOwnerDepartmentFromPath, resolveOwnerLocation } from './ownerBase44Config'
import { toneClasses, type ActionRow, type DashboardData, type DepartmentScore, type OwnerSection } from './types'

export function currentPeriodLabel(referenceDate: string) {
  const date = new Date(`${referenceDate}T12:00:00`)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1).replace(' de ', '/')
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function formatInteger(value: number) {
  return Math.round(value || 0).toLocaleString('pt-BR')
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || typeof value === 'undefined') return 'Pendente'
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  if (value === null || typeof value === 'undefined' || Number.isNaN(value)) return 'Pendente'
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: digits })}%`
}

/**
 * Única fonte de verdade pro band de score: delega pro mesmo `classifyMxScore`
 * usado pelo central-mx-engine (departamentos), evitando dois sistemas de corte
 * divergentes entre o MX Score da loja e os scores por departamento.
 */
export function scoreTone(score: number | null): DepartmentScore['tone'] {
  if (score === null) return 'muted'
  const band = classifyMxScore(score)
  if (band === 'elite' || band === 'excellent') return 'success'
  if (band === 'good') return 'info'
  if (band === 'attention') return 'warning'
  return 'danger'
}

export function scoreStatus(score: number | null) {
  if (score === null) return 'Pendente'
  return statusLabel(score)
}

export function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function ownerPath(section: string) {
  const params = new URLSearchParams(window.location.search)
  params.delete('id')
  params.delete('ownerSection')
  const basePath = window.location.pathname.replace(/\/consultor-ia$/, '')
  if (section === 'consultor') {
    const query = params.toString()
    return `${basePath}/consultor-ia${query ? `?${query}` : ''}`
  }
  params.set('ownerSection', section)
  return `${basePath}?${params.toString()}`
}

export function buildPanoramaData(data: DashboardData) {
  const byDate = new Map<string, number>()
  for (const checkin of data.checkins || []) {
    const current = byDate.get(checkin.reference_date) || 0
    const sales =
      (checkin.vnd_porta_prev_day || 0) +
      (checkin.vnd_cart_prev_day || 0) +
      (checkin.vnd_net_prev_day || 0)
    byDate.set(checkin.reference_date, current + sales)
  }

  const dates = Array.from(byDate.keys()).sort()
  if (dates.length === 0) return []

  let cumulative = 0
  const plannedStep = data.metrics.goalValue > 0 ? data.metrics.goalValue / dates.length : 0

  return dates.map((date, index) => {
    cumulative += byDate.get(date) || 0
    const day = Number(date.slice(-2))
    return {
      label: `${day}`,
      planejado: Math.round(plannedStep * (index + 1)),
      realizado: cumulative,
    }
  })
}

export function departmentIcon(code: MxDepartmentCode) {
  if (code === 'marketing') return <Megaphone size={20} />
  if (code === 'produto') return <Package size={20} />
  if (code === 'financeiro') return <DollarSign size={20} />
  if (code === 'operacional') return <Gauge size={20} />
  return <Users size={20} />
}

export function departmentDetail(department: CentralMxDepartmentModule) {
  if (!department.hasData) return 'Sem indicadores registrados no período.'
  const complete = department.indicators.filter(item => item.status === 'completo').length
  const partial = department.indicators.filter(item => item.status === 'parcial').length
  return `${complete} completos, ${partial} parciais, ${department.alertCount} críticos`
}

export function buildCentralMx(
  data: DashboardData,
  marginPercent: number | null,
  strategicParameters: Record<string, number | null> | null = null,
  salesByChannel: { internet: number | null; doorFlow: number | null } | null = null,
  headcount: number | null = null,
) {
  return buildCentralMxEngine({
    strategicParameters,
    inventory: data.inventory ?? null,
    salesByChannel,
    headcount,
    storeId: data.operationalStore?.id || data.metrics.storeName || 'loja-mx',
    storeName: data.metrics.storeName,
    period: data.referenceDate.slice(0, 7),
    metrics: {
      totalSales: data.metrics.totalSales,
      totalLeads: data.metrics.totalLeads,
      totalAgd: data.metrics.totalAgd,
      totalVis: data.metrics.totalVis,
      attainment: data.metrics.attainment,
      goalValue: data.metrics.goalValue,
      checkedInCount: data.metrics.checkedInCount,
      sellerCount: data.sellers?.length || 0,
    },
    // Denominador zerado não vira 0%: vira ausência. Ver a nota em
    // `CentralMxEngineInput.funnel`.
    funnel: {
      leadToSchedule: data.funilData.leads > 0 ? data.funilData.tx_lead_agd : null,
      scheduleToVisit: data.funilData.agd_total > 0 ? data.funilData.tx_agd_visita : null,
      visitToSale: data.funilData.visitas > 0 ? data.funilData.tx_visita_vnd : null,
    },
    benchmarks: {
      leadToSchedule: data.funnelBenchmarks.leadAgd,
      scheduleToVisit: data.funnelBenchmarks.agdVisita,
      visitToSale: data.funnelBenchmarks.visitaVnd,
    },
    financial: data.latestDRE
      ? {
        grossProfit: data.latestDRE.gross_profit,
        grossMarginPct: marginPercent,
        netProfit: data.latestDRE.net_profit,
        costPerSale: data.latestDRE.cac,
      }
      : null,
    ranking: data.metrics.ranking.map(row => ({
      userId: row.user_id,
      name: row.user_name,
      attainment: row.atingimento,
      sales: row.vnd_total,
      goal: row.meta,
      checkedIn: row.checked_in,
    })),
  })
}

export function departmentFromEngine(department: CentralMxDepartmentModule): DepartmentScore {
  return {
    code: department.code,
    name: department.name,
    icon: departmentIcon(department.code),
    score: department.hasData ? department.score : null,
    status: department.status,
    detail: departmentDetail(department),
    tone: department.hasData ? scoreTone(department.score) : 'muted',
    path: ownerPath(`departamentos-${department.code}`),
    indicators: department.indicators,
    dashboardCards: department.dashboardCards,
    checklist: department.checklist,
    playbook: department.playbook,
    strategicAgenda: department.strategicAgenda,
    alertCount: department.alertCount,
  }
}

export function alertFromEngine(alert: ExecutiveAlert): OwnerPerformanceAlert {
  const variant: OwnerPerformanceAlert['variant'] =
    alert.type === 'critical' ? 'danger' : alert.type === 'warning' ? 'warning' : alert.type === 'positive' ? 'success' : 'outline'
  return {
    title: alert.problem,
    description: alert.impact,
    recommendation: alert.recommendation,
    action: alert.quickActionLabel,
    variant,
    impact: alert.type === 'critical' ? 'Alto' : alert.type === 'warning' ? 'Médio' : 'Baixo',
    ctaLabel: alert.quickActionLabel,
    ctaTo: ownerPath('plano-acao'),
    department: DEPARTMENT_NAMES[alert.scopeId.split(':').pop() as MxDepartmentCode],
    // Preserva a origem para a deduplicação da Central de Decisões.
    sourceIndicator: (alert.metadata as { sourceIndicator?: string } | null)?.sourceIndicator,
  }
}

export function actionPriorityLabel(priority: CentralMxActionPlanItem['priority']): ActionRow['priority'] {
  if (priority === 'critica') return 'Crítica'
  if (priority === 'alta') return 'Atenção'
  return 'Positiva'
}

export function actionStatusLabel(status: CentralMxActionPlanItem['status']) {
  const labels: Record<CentralMxActionPlanItem['status'], string> = {
    pendente: 'Pendente',
    em_andamento: 'Em andamento',
    atrasado: 'Atrasada',
    concluido: 'Concluída',
    validando_eficacia: 'Validando eficácia',
  }
  return labels[status]
}

export function actionOriginLabel(origin: CentralMxActionPlanItem['origin']) {
  const labels: Record<CentralMxActionPlanItem['origin'], string> = {
    alertas: 'Alerta',
    score: 'Score',
    consultor: 'Consultor MX',
    manual: 'Manual',
  }
  return labels[origin]
}

export function actionFromEngine(action: CentralMxActionPlanItem): ActionRow {
  return {
    id: action.id,
    priority: actionPriorityLabel(action.priority),
    department: departmentLabel(action.department),
    indicator: action.indicator,
    problem: action.problem,
    recommendation: action.how,
    action: action.action,
    how: action.how,
    owner: action.responsibleLabel,
    origin: actionOriginLabel(action.origin),
    due: action.dueLabel,
    dueDate: action.dueDate,
    statusCode: action.status,
    status: actionStatusLabel(action.status),
    efficacy: action.efficacyScore == null ? 'Pendente' : `${action.efficacyScore}%`,
    evidence: action.evidenceLabel,
    tone: action.priority === 'critica' ? 'danger' : action.priority === 'alta' ? 'warning' : action.status === 'validando_eficacia' ? 'success' : 'info',
  }
}

export function departmentLabel(code: MxDepartmentCode) {
  const labels: Record<MxDepartmentCode, string> = {
    comercial: 'Comercial',
    marketing: 'Marketing',
    produto: 'Produto e Estoque',
    financeiro: 'Financeiro',
    rh: 'Pessoas — RH',
    operacional: 'Operações',
  }
  return labels[code]
}

export function getOwnerSection(pathname: string, search: string): OwnerSection {
  return resolveOwnerLocation(pathname, search)
}

export function getOwnerDepartmentCode(pathname: string, search: string): MxDepartmentCode | null {
  const pathCode = resolveOwnerDepartmentFromPath(pathname)
  if (pathCode && pathCode !== 'visao-geral') return pathCode
  const value = new URLSearchParams(search).get('ownerSection')
  const code = value?.startsWith('departamentos-') ? value.replace('departamentos-', '') : null
  if (
    code === 'comercial' ||
    code === 'marketing' ||
    code === 'produto' ||
    code === 'rh' ||
    code === 'financeiro' ||
    code === 'operacional'
  ) {
    return code
  }
  return null
}

export function planningStatusTone(status: CentralMxIndicatorValue['status']) {
  if (status === 'completo') return toneClasses.success.soft
  if (status === 'parcial') return toneClasses.warning.soft
  return toneClasses.muted.soft
}

export function formatPlanningValue(value: number | null | undefined, unit?: CentralMxIndicatorUnit) {
  if (value === null || typeof value === 'undefined' || Number.isNaN(value)) return '--'
  if (unit === 'currency') return formatCurrency(value)
  if (unit === 'percent') return formatPercent(value)
  if (unit === 'days') return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`
  if (Math.abs(value) >= 1000) return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

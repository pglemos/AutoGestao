export const AGENDAMENTOS_POR_VENDA = 3
export const DIAS_UTEIS_MES_PADRAO = 22
export const MANAGER_TIMEZONE = 'America/Sao_Paulo'

export type ManagerFinancialStatus = {
  status: 'pode_subir' | 'proximo' | 'atingida' | 'abaixo_ritmo' | 'evolucao' | 'sem_regra'
  label: string
  className: string
}

export type ManagerTeamFocusItem = {
  sellerId: string
  sellerName: string
  appointmentsToday: number
  salesForecastToday: number | null
  salesThisMonth: number
  nextCommissionBand: string | null
  missingCarsToNextBand: number | null
  projectedAward: number | null
  resultPercentage: number | null
  financialStatus: ManagerFinancialStatus
}

export function getManagerCalendarDate(baseDate = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANAGER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(baseDate)
  const values = new Map(parts.map(part => [part.type, part.value]))
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`
}

export function countElapsedBusinessDays(referenceDate: string) {
  const [year, month, day] = referenceDate.split('-').map(Number)
  if (!year || !month || !day) return 0

  let total = 0
  for (let currentDay = 1; currentDay <= day; currentDay += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, currentDay)).getUTCDay()
    if (weekday !== 0 && weekday !== 6) total += 1
  }
  return total
}

export function getManagerMonthRange(referenceDate: string) {
  const [year, month] = referenceDate.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthText = String(month).padStart(2, '0')
  return {
    start: `${year}-${monthText}-01`,
    end: `${year}-${monthText}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function getManagerTeamSearch(search: string) {
  return new URLSearchParams(search).get('busca')?.trim() || ''
}

export function formatSales(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  const rounded = Math.round(value * 10) / 10
  if (Number.isInteger(rounded)) return String(rounded)
  return String(rounded).replace('.', ',')
}

export function saleSuffix(value: number) {
  return Math.round(value * 10) / 10 === 1 ? 'venda' : 'vendas'
}

export function calculateSalesForecast(appointmentsToday: number) {
  return (appointmentsToday || 0) / AGENDAMENTOS_POR_VENDA
}

export function calculateSalesNeededToday(monthlyGoal: number, businessDays: number, salesToday: number): number | null {
  if (!monthlyGoal || monthlyGoal <= 0) return null
  const dailyGoal = businessDays > 0 ? monthlyGoal / businessDays : 0
  return Math.max(Math.ceil(dailyGoal) - (salesToday || 0), 0)
}

export function calculateAppointmentTarget(
  salesNeededToday: number | null,
  appointmentsPerSale = AGENDAMENTOS_POR_VENDA,
): number | null {
  if (salesNeededToday === null) return null
  const validRatio = Number.isFinite(appointmentsPerSale) && appointmentsPerSale > 0
    ? appointmentsPerSale
    : AGENDAMENTOS_POR_VENDA
  return Math.ceil(salesNeededToday * validRatio)
}

export function calculateAppointmentGap(appointmentsToday: number, appointmentTarget: number | null): number | null {
  if (appointmentTarget === null) return null
  return (appointmentsToday || 0) - appointmentTarget
}

export function calculateForecastCoverage(salesForecastToday: number | null, salesNeededToday: number | null): number | null {
  if (salesForecastToday === null || !salesNeededToday || salesNeededToday <= 0) return null
  return (salesForecastToday / salesNeededToday) * 100
}

export function buildTodayReading(salesForecastToday: number | null, salesNeededToday: number | null) {
  if (salesNeededToday === null) return 'Cadastre a meta da loja para ativar a previsibilidade.'
  if (salesNeededToday === 0) return 'A necessidade de vendas do dia já foi atendida.'
  if (salesForecastToday === null) return 'Base estatística insuficiente para projetar vendas.'
  const difference = Math.round((salesNeededToday - salesForecastToday) * 10) / 10
  if (difference > 0) {
    return `A projeção ainda está ${formatSales(difference)} ${difference === 1 ? 'venda' : 'vendas'} abaixo do necessário.`
  }
  if (difference === 0) return 'A projeção está alinhada à necessidade do dia.'
  const excess = Math.round((salesForecastToday - salesNeededToday) * 10) / 10
  return `A projeção está ${formatSales(excess)} ${excess === 1 ? 'venda' : 'vendas'} acima da necessidade do dia.`
}

export function buildSuggestedAction(appointmentGap: number | null, salesForecastToday: number | null, salesNeededToday: number | null) {
  if (salesNeededToday === null) return 'Cadastre a meta da loja para ativar a previsibilidade.'
  if (salesNeededToday === 0) return 'Prioridade do gerente: manter a agenda ativa e antecipar o próximo objetivo da loja.'
  if (salesForecastToday === null) return 'Base estatística insuficiente para projetar vendas; valide os agendamentos e vendas oficiais.'
  if (appointmentGap !== null && appointmentGap < 0) return 'Prioridade do gerente: elevar a agenda do dia e acompanhar negociações com maior chance de fechamento.'
  if (appointmentGap !== null && appointmentGap >= 0 && salesForecastToday < salesNeededToday) return 'Prioridade do gerente: proteger o comparecimento dos agendamentos e atuar nas negociações prioritárias.'
  if (salesForecastToday === salesNeededToday) return 'Prioridade do gerente: confirmar a agenda e acompanhar a execução para sustentar o resultado previsto.'
  if (salesForecastToday > salesNeededToday) return 'Prioridade do gerente: proteger a agenda confirmada e aproveitar o excedente para antecipar a meta.'
  return 'Prioridade do gerente: acompanhar a execução do dia.'
}

export function calculateSellerFinancialStatus(
  missingCars: number | null,
  salesForecastToday: number | null,
  appointmentsToday: number,
  resultPercentage: number | null,
): ManagerFinancialStatus {
  if (missingCars !== null) {
    if (missingCars > 0 && salesForecastToday !== null && salesForecastToday >= missingCars) {
      return { status: 'pode_subir', label: 'Pode subir de faixa hoje', className: 'bg-brand-primary text-white' }
    }
    if (missingCars === 1) {
      return { status: 'proximo', label: 'Próximo da faixa', className: 'bg-status-success-surface text-status-success-text' }
    }
    if (missingCars === 0) {
      return { status: 'atingida', label: 'Faixa atingida', className: 'bg-status-success text-white' }
    }
  }
  if (appointmentsToday === 0 && resultPercentage !== null && resultPercentage < 80) {
    return { status: 'abaixo_ritmo', label: 'Abaixo do ritmo', className: 'bg-status-warning-surface text-status-warning-text' }
  }
  return { status: 'evolucao', label: 'Em evolução', className: 'bg-status-info-surface text-status-info-text' }
}

const TEAM_FOCUS_STATUS_ORDER: Record<ManagerFinancialStatus['status'], number> = {
  pode_subir: 0,
  proximo: 1,
  abaixo_ritmo: 2,
  evolucao: 3,
  atingida: 4,
  sem_regra: 5,
}

export function sortTeamFocus(items: ManagerTeamFocusItem[]) {
  return [...items].sort((left, right) => {
    const statusDifference = TEAM_FOCUS_STATUS_ORDER[left.financialStatus.status]
      - TEAM_FOCUS_STATUS_ORDER[right.financialStatus.status]
    if (statusDifference !== 0) return statusDifference
    if ((right.salesForecastToday ?? -Infinity) !== (left.salesForecastToday ?? -Infinity)) {
      return (right.salesForecastToday ?? -Infinity) - (left.salesForecastToday ?? -Infinity)
    }
    return (left.missingCarsToNextBand ?? 999) - (right.missingCarsToNextBand ?? 999)
  })
}

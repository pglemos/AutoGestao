export const CLIENT_SALES_TIME_ZONE = 'America/Sao_Paulo'

export type ClientSalesPeriod = 'today' | 'week' | 'last15days' | 'month' | 'custom'

export type ClientSalesPeriodRange = {
  period: ClientSalesPeriod
  label: string
  startDate: string
  endDate: string
}

export type ClientSalesPeriodResolution = {
  range: ClientSalesPeriodRange | null
  error: string | null
}

export type ClientSalesRollup = {
  sales: number
  revenue: number
  monthlyGoal: number
  attainment: number | null
  gap: number | null
  storesWithSales: number
  configuredGoalStores: number
  lastSaleDate: string | null
}

export type ClientSalesStoreMetric = {
  storeId: string
  sales: number
  revenue: number
  monthlyGoal: number
  lastSaleDate: string | null
}

export type OfficialStoreSalesRow = {
  store_id: string | null
  competencia: string | null
  vendas: number | string | null
  faturamento: number | string | null
}

export type AggregatedStoreSales = {
  sales: number
  revenue: number
  lastSaleDate: string | null
}

export type ClientSalesEvidence = 'recorded' | 'zero_confirmed' | 'no_record'

/** Diferencia zero devolvido pela fonte oficial de ausência de linha no período. */
export function resolveClientSalesEvidence(sales: number, hasRecord: boolean): ClientSalesEvidence {
  if (sales > 0) return 'recorded'
  return hasRecord ? 'zero_confirmed' : 'no_record'
}

const PERIOD_LABELS: Record<ClientSalesPeriod, string> = {
  today: 'Hoje',
  week: 'Esta semana',
  last15days: 'Últimos 15 dias',
  month: 'Este mês',
  custom: 'Data personalizada',
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function dateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Data civil atual no fuso do negócio, sem depender do fuso do navegador. */
export function getClientSalesTodayKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLIENT_SALES_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = new Map(parts.map(part => [part.type, Number(part.value)]))
  return dateKeyFromParts(values.get('year') ?? 0, values.get('month') ?? 0, values.get('day') ?? 0)
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

export function shiftClientSalesDate(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day))
  shifted.setUTCDate(shifted.getUTCDate() + amount)
  return dateKeyFromParts(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate())
}

function getClientSalesTimeZoneOffsetMinutes(date: Date): number {
  const timeZoneName = new Intl.DateTimeFormat('en-US', {
    timeZone: CLIENT_SALES_TIME_ZONE,
    hour: '2-digit',
    timeZoneName: 'longOffset',
  }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = timeZoneName.match(/^GMT([+-])(\d{2}):(\d{2})$/)
  if (!match) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '+' ? minutes : -minutes
}

/** Milissegundos até o próximo início de dia no fuso do negócio. */
export function getClientSalesNextMidnightDelay(now = new Date()): number {
  const tomorrow = shiftClientSalesDate(getClientSalesTodayKey(now), 1)
  const [year, month, day] = tomorrow.split('-').map(Number)
  const offsetMinutes = getClientSalesTimeZoneOffsetMinutes(new Date(Date.UTC(year, month - 1, day, 12)))
  const nextMidnight = Date.UTC(year, month - 1, day) - offsetMinutes * 60 * 1000
  return Math.max(1000, nextMidnight - now.getTime() + 1000)
}

function buildRange(period: ClientSalesPeriod, startDate: string, endDate: string): ClientSalesPeriodResolution {
  return { range: { period, label: PERIOD_LABELS[period], startDate, endDate }, error: null }
}

export function resolveClientSalesPeriod(
  period: ClientSalesPeriod,
  customStartDate = '',
  customEndDate = '',
  now = new Date(),
): ClientSalesPeriodResolution {
  const today = getClientSalesTodayKey(now)
  if (period === 'today') return buildRange(period, today, today)
  if (period === 'week') {
    const dayOfWeek = new Date(`${today}T00:00:00Z`).getUTCDay()
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    return buildRange(period, shiftClientSalesDate(today, -daysSinceMonday), today)
  }
  if (period === 'last15days') return buildRange(period, shiftClientSalesDate(today, -14), today)
  if (period === 'month') return buildRange(period, `${today.slice(0, 7)}-01`, today)
  if (!customStartDate || !customEndDate) return { range: null, error: 'Informe a data inicial e a data final.' }
  if (!isValidDateKey(customStartDate) || !isValidDateKey(customEndDate)) {
    return { range: null, error: 'Informe datas válidas para o período.' }
  }
  if (customStartDate > customEndDate) {
    return { range: null, error: 'A data inicial não pode ser posterior à data final.' }
  }
  return buildRange(period, customStartDate, customEndDate)
}

function numericValue(value: number | string | null): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function aggregateOfficialStoreSales(rows: readonly OfficialStoreSalesRow[]): Map<string, AggregatedStoreSales> {
  const totals = new Map<string, AggregatedStoreSales>()
  for (const row of rows) {
    if (!row.store_id) continue
    const current = totals.get(row.store_id) ?? { sales: 0, revenue: 0, lastSaleDate: null }
    current.sales += numericValue(row.vendas)
    current.revenue += numericValue(row.faturamento)
    if (row.competencia && (!current.lastSaleDate || row.competencia > current.lastSaleDate)) current.lastSaleDate = row.competencia
    totals.set(row.store_id, current)
  }
  return totals
}

export function calculateClientSalesAttainment(sales: number, monthlyGoal: number): number | null {
  return monthlyGoal > 0 ? (sales / monthlyGoal) * 100 : null
}

/** Consolida a matriz e as filiais sem misturar o resultado com a jornada consultiva. */
export function aggregateClientSalesForStores(
  storeIds: readonly string[],
  rows: readonly ClientSalesStoreMetric[],
): ClientSalesRollup {
  const includedStoreIds = new Set(storeIds)
  let sales = 0
  let revenue = 0
  let monthlyGoal = 0
  let storesWithSales = 0
  let configuredGoalStores = 0
  let lastSaleDate: string | null = null

  for (const row of rows) {
    if (!includedStoreIds.has(row.storeId)) continue
    sales += row.sales
    revenue += row.revenue
    monthlyGoal += row.monthlyGoal
    if (row.sales > 0) storesWithSales += 1
    if (row.monthlyGoal > 0) configuredGoalStores += 1
    if (row.lastSaleDate && (!lastSaleDate || row.lastSaleDate > lastSaleDate)) lastSaleDate = row.lastSaleDate
  }

  return {
    sales,
    revenue,
    monthlyGoal,
    attainment: calculateClientSalesAttainment(sales, monthlyGoal),
    gap: monthlyGoal > 0 ? Math.max(monthlyGoal - sales, 0) : null,
    storesWithSales,
    configuredGoalStores,
    lastSaleDate,
  }
}

import {
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns'
import type { NetworkDateRange, NetworkTimeframe, StoreDiagnostic } from '../types'

export const MAX_NETWORK_RANGE_DAYS = 366

export function resolveNetworkDateRange(
  timeframe: NetworkTimeframe,
  custom: NetworkDateRange,
  now = new Date(),
): NetworkDateRange {
  switch (timeframe) {
    case 'hoje':
      return { start: format(startOfDay(now), 'yyyy-MM-dd'), end: format(endOfDay(now), 'yyyy-MM-dd') }
    case 'ontem': {
      const yesterday = subDays(now, 1)
      return { start: format(startOfDay(yesterday), 'yyyy-MM-dd'), end: format(endOfDay(yesterday), 'yyyy-MM-dd') }
    }
    case 'semanal':
      return {
        start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      }
    case 'mensal':
      return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') }
    case 'personalizada':
      return custom
  }
}

export function validateNetworkDateRange(range: NetworkDateRange): string | null {
  const start = parseISO(range.start)
  const end = parseISO(range.end)
  if (!range.start || !range.end || !isValid(start) || !isValid(end)) return 'Informe datas válidas para início e fim.'
  if (end < start) return 'A data final não pode ser anterior à data inicial.'
  if (differenceInCalendarDays(end, start) > MAX_NETWORK_RANGE_DAYS) {
    return `O período personalizado pode ter no máximo ${MAX_NETWORK_RANGE_DAYS} dias.`
  }
  return null
}

export function buildStoreDiagnostic(input: {
  id: string
  name: string
  leads: number
  agd: number
  vis: number
  sales: number
  goal: number
  sellers: number
  checkedInToday: number
  elapsedDays: number
  totalDays: number
}): StoreDiagnostic {
  const goal = Math.max(0, input.goal)
  const elapsedDays = Math.max(1, input.elapsedDays)
  const totalDays = Math.max(elapsedDays, input.totalDays)
  const proj = Math.round((input.sales / elapsedDays) * totalDays)
  const gap = Math.max(0, goal - input.sales)
  const ritmo = goal > 0 ? (input.sales / goal) * 100 : 0
  const efficiency = input.leads > 0 ? (input.sales / input.leads) * 100 : 0
  const disciplinePct = input.sellers > 0 ? (input.checkedInToday / input.sellers) * 100 : 0

  return {
    id: input.id,
    name: input.name,
    leads: input.leads,
    agd: input.agd,
    vis: input.vis,
    sales: input.sales,
    goal,
    gap,
    proj,
    ritmo,
    efficiency,
    sellers: input.sellers,
    checkedInToday: input.checkedInToday,
    disciplinePct,
  }
}

export type OwnerPeriod = 'month' | 'quarter' | 'year' | 'custom'

export type OwnerPeriodRange = {
  start: string
  end: string
}

export type OwnerDateRange = {
  start: Date
  end: Date
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

export function toOwnerDateOnly(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Builds the date-only range used by every Dono query.
 * Date parts are formatted in the browser's business timezone instead of UTC
 * so the first day of a month cannot roll back to the previous calendar day.
 */
export function resolveOwnerPeriodRange(
  period: OwnerPeriod = 'month',
  now = new Date(),
  customStart = '',
  customEnd = '',
): OwnerPeriodRange {
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = toOwnerDateOnly(now)

  if (period === 'custom' && customStart && customEnd && customStart <= customEnd) {
    return { start: customStart, end: customEnd }
  }

  if (period === 'quarter') {
    return {
      start: toOwnerDateOnly(new Date(year, month - (month % 3), 1, 12)),
      end: today,
    }
  }

  if (period === 'year') {
    return {
      start: toOwnerDateOnly(new Date(year, 0, 1, 12)),
      end: today,
    }
  }

  return {
    start: toOwnerDateOnly(new Date(year, month, 1, 12)),
    end: today,
  }
}

// Compatibility API for the legacy Dono data hook. The canonical period
// contract above is date-only for Supabase queries; this API intentionally
// preserves Date values for consumers that only need an in-memory interval.
const startOfMonth = (value: Date) => {
  const date = new Date(value)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

const startOfQuarter = (value: Date) => {
  const date = new Date(value)
  date.setDate(1)
  const month = date.getMonth()
  date.setMonth(month - (month % 3))
  date.setHours(0, 0, 0, 0)
  return date
}

const startOfYear = (value: Date) => {
  const date = new Date(value)
  date.setMonth(0)
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

export function computePeriodRange(
  period: OwnerPeriod = 'month',
  reference = new Date(),
): OwnerDateRange {
  const end = new Date(reference)
  if (period === 'month') return { start: startOfMonth(reference), end }
  if (period === 'quarter') return { start: startOfQuarter(reference), end }
  if (period === 'year') return { start: startOfYear(reference), end }
  return { start: startOfYear(reference), end }
}

export const PERIOD_LABELS: Record<OwnerPeriod, string> = {
  month: 'Mês atual',
  quarter: 'Trimestre atual',
  year: 'Ano atual',
  custom: 'Período personalizado',
}

export function periodLabel(
  period: OwnerPeriod,
  range?: OwnerDateRange,
): string {
  const format = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${day}/${month}/${date.getFullYear()}`
  }
  if (!range) return PERIOD_LABELS[period] || ''
  if (period === 'custom') return `${format(range.start)} — ${format(range.end)}`
  if (period === 'month' || period === 'quarter' || period === 'year') {
    return `${format(range.start)} — hoje`
  }
  return ''
}

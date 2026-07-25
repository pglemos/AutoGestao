import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import type { ReportDateRange } from './types'

export function validateReportDateRange(range: ReportDateRange, maxDays = 366): string | null {
  if (!range.start || !range.end) return 'Informe as datas inicial e final.'
  const start = parseISO(range.start)
  const end = parseISO(range.end)
  if (!isValid(start) || !isValid(end)) return 'Informe datas válidas.'
  if (end < start) return 'A data final não pode ser anterior à data inicial.'
  if (differenceInCalendarDays(end, start) > maxDays) return `O período pode ter no máximo ${maxDays} dias.`
  return null
}

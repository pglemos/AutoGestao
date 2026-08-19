import {
  endOfMonth,
  endOfQuarter,
  format,
  startOfMonth,
  startOfQuarter,
  subMonths,
  subQuarters,
} from 'date-fns'

export type VisitAnalysisPeriodPreset =
  | 'current_month'
  | 'previous_month'
  | 'current_quarter'
  | 'previous_quarter'
  | 'custom'

export const VISIT_ANALYSIS_PERIOD_PRESETS: Array<{
  value: VisitAnalysisPeriodPreset
  label: string
}> = [
  { value: 'current_month', label: 'Mês atual' },
  { value: 'previous_month', label: 'Mês anterior' },
  { value: 'current_quarter', label: 'Trimestre atual' },
  { value: 'previous_quarter', label: 'Trimestre anterior' },
  { value: 'custom', label: 'Personalizado' },
]

function toDateInputValue(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

export function getVisitAnalysisPeriodFromPreset(
  preset: VisitAnalysisPeriodPreset,
  referenceDate = new Date(),
) {
  switch (preset) {
    case 'current_month':
      return {
        start: toDateInputValue(startOfMonth(referenceDate)),
        end: toDateInputValue(endOfMonth(referenceDate)),
      }
    case 'previous_month': {
      const date = subMonths(referenceDate, 1)
      return {
        start: toDateInputValue(startOfMonth(date)),
        end: toDateInputValue(endOfMonth(date)),
      }
    }
    case 'current_quarter':
      return {
        start: toDateInputValue(startOfQuarter(referenceDate)),
        end: toDateInputValue(endOfQuarter(referenceDate)),
      }
    case 'previous_quarter': {
      const date = subQuarters(referenceDate, 1)
      return {
        start: toDateInputValue(startOfQuarter(date)),
        end: toDateInputValue(endOfQuarter(date)),
      }
    }
    case 'custom':
      return { start: '', end: '' }
  }
}

export function getVisitAnalysisPeriodPresetLabel(preset?: string | null) {
  return VISIT_ANALYSIS_PERIOD_PRESETS.find((item) => item.value === preset)?.label || 'Período manual'
}

export function formatVisitAnalysisPeriodLabel(input: {
  preset?: string | null
  start?: string | null
  end?: string | null
}) {
  if (!input.start || !input.end) return 'Período não informado'
  return `${getVisitAnalysisPeriodPresetLabel(input.preset)}: ${input.start} a ${input.end}`
}

export function isValidVisitAnalysisPeriod(start?: string | null, end?: string | null) {
  if (!start && !end) return true
  if (!start || !end) return false
  return end >= start
}

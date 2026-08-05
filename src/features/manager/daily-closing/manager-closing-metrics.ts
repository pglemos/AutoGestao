import { eachDayOfInterval, format, parseISO } from 'date-fns'
import type { CheckinWithTotals } from '@/types/database'
import { isDraftClosing } from '@/features/checkin/lib/closing-operational-state'

/**
 * Rascunho não entra em métrica oficial. O filtro fica aqui, e não só em quem
 * chama, porque estas funções são o ponto onde o número vira indicador de
 * liderança — deixar a responsabilidade no chamador foi exatamente o que
 * permitiu o rascunho vazar para a Central de Fechamento.
 */
export function onlyOfficialClosings(checkins: CheckinWithTotals[]): CheckinWithTotals[] {
  return checkins.filter(checkin => !isDraftClosing(checkin))
}

export function averageDiscipline(values: number[]) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null
}

export function formatClosingMetric(value: number | null | undefined, available: boolean) {
  if (!available || value === null || value === undefined || !Number.isFinite(value)) return '—'
  return String(value)
}

export function numericMetric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export function sumNumericMetrics(...values: unknown[]): number {
  return values.reduce<number>((sum, value) => sum + numericMetric(value), 0)
}

export function buildDisciplineTrend(checkins: CheckinWithTotals[], start: string, end: string) {
  const official = onlyOfficialClosings(checkins)
  return eachDayOfInterval({ start: parseISO(start), end: parseISO(end) }).map(day => {
    const key = format(day, 'yyyy-MM-dd')
    const values = official
      .filter(checkin => checkin.reference_date === key)
      .map(checkin => checkin.pontuacao_disciplina_final)
      .filter((value): value is number => typeof value === 'number')
    return { date: key, label: format(day, 'dd/MM'), value: averageDiscipline(values) }
  })
}

export function buildClosingSummary(checkins: CheckinWithTotals[]) {
  const official = onlyOfficialClosings(checkins)
  const sumField = (field: keyof CheckinWithTotals) => {
    const values = official
      .map((checkin) => checkin[field])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    return values.length ? values.reduce((sum, value) => sum + value, 0) : null
  }

  const sumSales = [
    sumField('vnd_porta_prev_day'),
    sumField('vnd_cart_prev_day'),
    sumField('vnd_net_prev_day'),
  ]
  const sales = sumSales.some((value) => value !== null)
    ? sumSales.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null

  return {
    showroomVisits: sumField('visitas_porta_prev_day'),
    carteiraLeads: sumField('leads_prev_day'),
    carteiraVisits: sumField('visitas_cart_prev_day'),
    internetLeads: sumField('leads_net_prev_day'),
    internetVisits: sumField('visitas_net_prev_day'),
    sales,
  }
}

import type { DailyCheckin } from '@/types/database'

export type PreviousClosingCard =
  | { type: 'previous_done'; date: string; checkin: DailyCheckin }
  | { type: 'previous_pending'; date: string; checkin: null }

export interface ActiveClosingContext {
  now: Date
  today: string
  yesterday: string
  mainDate: string
  mainLabel: 'Hoje' | 'Ontem'
  mainCheckin: DailyCheckin | null
  isMainDateSubmitted: boolean
  canEditMainForm: boolean
  canSubmitMainForm: boolean
  mode:
    | 'previous_pending_before_noon'
    | 'today_open_after_previous_done'
    | 'today_open_after_noon_previous_done'
    | 'today_open_after_noon_previous_pending'
    | 'today_in_progress'
    | 'today_submitted'
  previousCard: PreviousClosingCard | null
}

interface ResolveActiveClosingContextArgs {
  today: string
  yesterday: string
  now: Date
  yesterdayClosing: DailyCheckin | null
  todayClosing: DailyCheckin | null
}

export function isSubmittedClosing(checkin: DailyCheckin | null) {
  if (!checkin?.submitted_at) return false
  const hasDeclaredMovement = [
    checkin.leads_prev_day,
    checkin.leads_net_prev_day,
    checkin.agd_cart_prev_day,
    checkin.agd_net_prev_day,
    checkin.agd_cart_today,
    checkin.agd_net_today,
    checkin.vnd_porta_prev_day,
    checkin.vnd_cart_prev_day,
    checkin.vnd_net_prev_day,
    checkin.visit_prev_day,
    checkin.visitas_porta_prev_day,
    checkin.visitas_cart_prev_day,
    checkin.visitas_net_prev_day,
  ].some(value => Number(value || 0) > 0)
  const hasZeroJustification = Boolean(checkin.zero_reason?.trim())
  if (!hasDeclaredMovement && !hasZeroJustification) return false
  return String(checkin.submission_status || '') !== 'draft'
}

function getSaoPauloMinutes(now: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(now)
  const byType = new Map(parts.map(part => [part.type, part.value]))
  return Number(byType.get('hour') || 0) * 60 + Number(byType.get('minute') || 0)
}

function getDateInSaoPaulo(now: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

function subtractOneDay(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(Date.UTC(year, month - 1, day))
  value.setUTCDate(value.getUTCDate() - 1)
  return value.toISOString().slice(0, 10)
}

export function resolveActiveClosingContext({
  today,
  yesterday,
  now,
  yesterdayClosing,
  todayClosing,
}: ResolveActiveClosingContextArgs): ActiveClosingContext {
  const afterNoon = getSaoPauloMinutes(now) >= 12 * 60
  const yesterdaySubmitted = isSubmittedClosing(yesterdayClosing)
  const todaySubmitted = isSubmittedClosing(todayClosing)

  if (!afterNoon && !yesterdaySubmitted) {
    return {
      now,
      today,
      yesterday,
      mainDate: yesterday,
      mainLabel: 'Ontem',
      mainCheckin: yesterdayClosing,
      isMainDateSubmitted: false,
      canEditMainForm: true,
      canSubmitMainForm: true,
      mode: 'previous_pending_before_noon',
      previousCard: null,
    }
  }

  const previousCard: PreviousClosingCard | null = yesterdaySubmitted && yesterdayClosing
    ? { type: 'previous_done', date: yesterday, checkin: yesterdayClosing }
    : afterNoon
      ? { type: 'previous_pending', date: yesterday, checkin: null }
      : null

  return {
    now,
    today,
    yesterday,
    mainDate: today,
    mainLabel: 'Hoje',
    mainCheckin: todayClosing,
    isMainDateSubmitted: todaySubmitted,
    canEditMainForm: !todaySubmitted,
    canSubmitMainForm: !todaySubmitted,
    mode: todaySubmitted
      ? 'today_submitted'
      : todayClosing
        ? afterNoon
          ? yesterdaySubmitted ? 'today_in_progress' : 'today_open_after_noon_previous_pending'
          : 'today_in_progress'
        : afterNoon
          ? yesterdaySubmitted ? 'today_open_after_noon_previous_done' : 'today_open_after_noon_previous_pending'
          : 'today_open_after_previous_done',
    previousCard,
  }
}

/**
 * Nome público alinhado ao spec v2.0.
 *
 * A implementação legada continua exportada porque o hook e consumidores
 * existentes já dependem dela; a fachada preserva a assinatura validada sem
 * duplicar a regra de data operacional.
 */
export function getActiveClosingContext(
  now: Date,
  closingsByDate: Record<string, DailyCheckin | null | undefined>,
): ActiveClosingContext
export function getActiveClosingContext(args: ResolveActiveClosingContextArgs): ActiveClosingContext
export function getActiveClosingContext(
  nowOrArgs: Date | ResolveActiveClosingContextArgs,
  closingsByDate: Record<string, DailyCheckin | null | undefined> = {},
): ActiveClosingContext {
  if (nowOrArgs instanceof Date) {
    const today = getDateInSaoPaulo(nowOrArgs)
    const yesterday = subtractOneDay(today)
    return resolveActiveClosingContext({
      today,
      yesterday,
      now: nowOrArgs,
      yesterdayClosing: closingsByDate[yesterday] ?? null,
      todayClosing: closingsByDate[today] ?? null,
    })
  }

  return resolveActiveClosingContext(nowOrArgs)
}

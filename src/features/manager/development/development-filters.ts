import { endOfMonth, isWithinInterval, parseISO, startOfMonth, subDays, subMonths } from 'date-fns'
import type { FeedbackListItem } from '@/features/gerente-feedback/lib/helpers'

export type DevelopmentPeriodFilter = 'current' | 'previous' | 'last30'
export type DevelopmentKindFilter = 'all' | 'positive' | 'development'
export type DevelopmentFeedbackStatusFilter = 'all' | 'pending' | 'acknowledged'
export type DevelopmentPdiStatusFilter = 'all' | 'none' | 'active' | 'overdue' | 'completed'

export function getFeedbackCompetency(item: FeedbackListItem): string {
  const diagnostic = item.diagnostic_json as Record<string, unknown> | null | undefined
  const value = diagnostic?.competency ?? diagnostic?.competencia ?? diagnostic?.gargalo ?? diagnostic?.principal_metric ?? diagnostic?.skill
  return typeof value === 'string' ? value.trim() : ''
}

function isInPeriod(value: string | null | undefined, period: DevelopmentPeriodFilter, now: Date): boolean {
  if (!value) return false
  try {
    const date = parseISO(value)
    if (period === 'last30') return isWithinInterval(date, { start: subDays(now, 29), end: now })
    const reference = period === 'previous' ? subMonths(now, 1) : now
    return isWithinInterval(date, { start: startOfMonth(reference), end: endOfMonth(reference) })
  } catch {
    return false
  }
}

export function filterDevelopmentFeedbacks({
  feedbacks,
  period,
  sellerId,
  kind,
  competency,
  status,
  now = new Date(),
}: {
  feedbacks: FeedbackListItem[]
  period: DevelopmentPeriodFilter
  sellerId: string
  kind: DevelopmentKindFilter
  competency: string
  status: DevelopmentFeedbackStatusFilter
  now?: Date
}): FeedbackListItem[] {
  return feedbacks.filter((item) => {
    if (!isInPeriod(item.created_at, period, now)) return false
    if (sellerId && item.seller_id !== sellerId) return false
    if (kind === 'positive' && !item.positives?.trim()) return false
    if (kind === 'development' && !item.attention_points?.trim()) return false
    if (competency && getFeedbackCompetency(item) !== competency) return false
    if (status === 'pending' && item.acknowledged) return false
    if (status === 'acknowledged' && !item.acknowledged) return false
    return true
  })
}

export function filterDevelopmentPdiRows<T extends {
  seller: { id: string }
  status: { key: Exclude<DevelopmentPdiStatusFilter, 'all'>; rank: number }
}>(rows: T[], sellerId: string, status: DevelopmentPdiStatusFilter): T[] {
  return rows
    .filter((row) => (!sellerId || row.seller.id === sellerId) && (status === 'all' || row.status.key === status))
    .sort((left, right) => left.status.rank - right.status.rank)
}

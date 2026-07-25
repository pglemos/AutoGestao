import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type ReportDateRange = { start: string; end: string }
export type ReportPageState<T> = {
  data: T
  loading: boolean
  refreshing: boolean
  exporting: boolean
  error: string | null
  lastUpdatedAt: Date | null
}

export type ReportMetric = {
  key: string
  title: string
  value: string | number
  detail: string
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'neutral'
  icon: LucideIcon
}

export type ReportTableColumn<Row> = {
  key: string
  label: string
  render: (row: Row) => ReactNode
  align?: 'left' | 'center' | 'right'
}

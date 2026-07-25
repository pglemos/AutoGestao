import type { ReactNode } from 'react'

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
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
}

export type ReportTableColumn<Row> = {
  key: string
  label: string
  render: (row: Row) => ReactNode
  align?: 'left' | 'center' | 'right'
}

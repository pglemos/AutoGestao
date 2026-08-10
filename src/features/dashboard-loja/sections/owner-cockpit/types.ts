import type { ReactNode } from 'react'
import { chartTokens } from '@/lib/charts/tokens'
import type {
  CentralMxDepartmentModule,
  CentralMxIndicatorValue,
} from '@/lib/central-mx-engine'
import type { MxDepartmentCode } from '@/lib/mx-executive-foundation'
import type { useDashboardLojaData } from '../../hooks/useDashboardLojaData'
import type { OwnerResolvedSection } from './ownerBase44Config'

export type DashboardData = ReturnType<typeof useDashboardLojaData>

/**
 * A seção canônica do Dono segue a arquitetura do Base44, preservando também
 * query strings legadas para não quebrar favoritos, links e integrações.
 */
export type OwnerSection = OwnerResolvedSection

export type KpiTone = 'success' | 'info' | 'warning' | 'danger' | 'muted' | 'brand' | 'purple'

export type DepartmentScore = {
  code: MxDepartmentCode
  name: string
  icon: ReactNode
  score: number | null
  status: string
  detail: string
  tone: KpiTone
  path: string
  indicators: CentralMxIndicatorValue[]
  dashboardCards: CentralMxDepartmentModule['dashboardCards']
  checklist: string[]
  playbook: string[]
  strategicAgenda: string[]
  alertCount: number
}

export type ActionRow = {
  id: string
  priority: 'Crítica' | 'Atenção' | 'Positiva'
  department: string
  indicator: string
  problem: string
  recommendation: string
  action: string
  how: string
  owner: string
  origin: string
  due: string
  status: string
  efficacy: string
  evidence: string
  tone: KpiTone
}

export const toneClasses: Record<KpiTone, { bg: string; text: string; soft: string; bar: string; border: string }> = {
  success: {
    bg: 'bg-status-success-surface text-status-success border border-status-success/20',
    text: 'text-status-success',
    soft: 'bg-status-success-surface text-status-success border-status-success/20',
    bar: 'bg-status-success',
    border: 'border-status-success/20',
  },
  info: {
    bg: 'bg-status-info-surface text-status-info border border-status-info/20',
    text: 'text-status-info',
    soft: 'bg-status-info-surface text-status-info border-status-info/20',
    bar: 'bg-status-info',
    border: 'border-status-info/20',
  },
  warning: {
    bg: 'bg-status-warning-surface text-status-warning-text border border-status-warning/20',
    text: 'text-status-warning-text',
    soft: 'bg-status-warning-surface text-status-warning-text border-status-warning/20',
    bar: 'bg-status-warning',
    border: 'border-status-warning/20',
  },
  danger: {
    bg: 'bg-status-error-surface text-status-error-text border border-status-error/20',
    text: 'text-status-error-text',
    soft: 'bg-status-error-surface text-status-error-text border-status-error/20',
    bar: 'bg-status-error',
    border: 'border-status-error/20',
  },
  muted: {
    bg: 'bg-surface-alt text-text-tertiary border border-border-default',
    text: 'text-text-tertiary',
    soft: 'bg-surface-alt text-text-tertiary border-border-default',
    bar: 'bg-border-default',
    border: 'border-border-default',
  },
  brand: {
    bg: 'bg-mx-indigo-50 text-brand-primary border border-mx-indigo-100',
    text: 'text-brand-primary',
    soft: 'bg-mx-indigo-50 text-brand-primary border-mx-indigo-100',
    bar: 'bg-brand-primary',
    border: 'border-mx-indigo-100',
  },
  purple: {
    bg: 'bg-[var(--color-accent-purple-soft)] text-[var(--color-accent-purple)] border border-[var(--color-accent-purple)]/20',
    text: 'text-[var(--color-accent-purple)]',
    soft: 'bg-[var(--color-accent-purple-soft)] text-[var(--color-accent-purple)] border-[var(--color-accent-purple)]/20',
    bar: 'bg-[var(--color-accent-purple)]',
    border: 'border-[var(--color-accent-purple)]/20',
  },
}

/** Vivid solid backgrounds for KPI icon bubbles (mockup mode). */
export const vividIconClasses: Record<KpiTone, string> = {
  success: 'bg-status-success text-white',
  info: 'bg-status-info text-white',
  warning: 'bg-status-warning text-white',
  danger: 'bg-status-error text-white',
  muted: 'bg-surface-alt text-text-tertiary',
  brand: 'bg-brand-primary text-white',
  purple: 'bg-[var(--color-accent-purple)] text-white',
}

/** Token per tone for SVG stroke/fill in sparklines. */
export const toneHex: Record<KpiTone, () => string> = {
  success: chartTokens.success,
  info: chartTokens.info,
  warning: chartTokens.warning,
  danger: chartTokens.danger,
  muted: chartTokens.axisTickMuted,
  brand: chartTokens.accent,
  purple: chartTokens.series.s6,
}

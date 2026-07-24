import { describe, expect, test } from 'bun:test'
import {
  getClosingPresentation,
  isClosingCompleted,
  summarizeLiveOverview,
  type StoreLiveOverviewRow,
} from './admin-live-overview'

const row = (overrides: Partial<StoreLiveOverviewRow>): StoreLiveOverviewRow => ({
  seller_user_id: 'seller-1',
  seller_name: 'Vendedor',
  reference_date: '2026-07-24',
  closing_status: 'not_started',
  submission_status: null,
  submitted_at: null,
  submitted_late: false,
  discipline_score: null,
  live_leads: 0,
  live_appointments: 0,
  live_attendances: 0,
  live_sales: 0,
  declared_leads: 0,
  declared_appointments: 0,
  declared_attendances: 0,
  declared_sales: 0,
  has_divergence: false,
  last_activity_at: null,
  ...overrides,
})

describe('admin live store overview', () => {
  test('only submitted statuses count as completed', () => {
    expect(isClosingCompleted('submitted_on_time')).toBe(true)
    expect(isClosingCompleted('submitted_late')).toBe(true)
    expect(isClosingCompleted('draft')).toBe(false)
    expect(isClosingCompleted('not_started')).toBe(false)
  })

  test('keeps draft distinct from a completed closing', () => {
    expect(getClosingPresentation('draft')).toEqual({
      label: 'Rascunho aberto',
      variant: 'warning',
    })
  })

  test('summarizes real CRM totals independently from declared numbers', () => {
    const summary = summarizeLiveOverview([
      row({
        closing_status: 'submitted_on_time',
        live_leads: 2,
        live_appointments: 1,
        live_attendances: 3,
        live_sales: 1,
        declared_leads: 9,
        has_divergence: true,
      }),
      row({ seller_user_id: 'seller-2', closing_status: 'draft', live_leads: 1 }),
    ])

    expect(summary).toEqual({
      completed: 1,
      pending: 1,
      divergences: 1,
      leads: 3,
      appointments: 1,
      attendances: 3,
      sales: 1,
    })
  })
})

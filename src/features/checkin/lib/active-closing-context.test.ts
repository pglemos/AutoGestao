import { describe, expect, test } from 'bun:test'
import type { DailyCheckin } from '@/types/database'
import { getActiveClosingContext, resolveActiveClosingContext } from './active-closing-context'

const closing = (date: string) => ({
  id: `checkin-${date}`,
  reference_date: date,
  metric_scope: 'daily',
  submitted_at: `${date}T11:00:00.000Z`,
  submission_status: 'on_time',
  visit_prev_day: 1,
}) as DailyCheckin

const draftClosing = (date: string) => ({
  ...closing(date),
  submitted_at: null,
  submission_status: 'draft',
}) as DailyCheckin

const emptySubmittedClosing = (date: string) => ({
  ...closing(date),
  leads_prev_day: 0,
  agd_cart_prev_day: 0,
  agd_net_prev_day: 0,
  agd_cart_today: 0,
  agd_net_today: 0,
  vnd_porta_prev_day: 0,
  vnd_cart_prev_day: 0,
  vnd_net_prev_day: 0,
  visit_prev_day: 0,
  zero_reason: null,
}) as DailyCheckin

const justifiedZeroClosing = (date: string) => ({
  ...emptySubmittedClosing(date),
  zero_reason: 'Folga',
}) as DailyCheckin

describe('resolveActiveClosingContext', () => {
  test('before noon keeps D-1 main date when previous closing is pending', () => {
    const ctx = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T11:15:00.000Z'),
      yesterdayClosing: null,
      todayClosing: null,
    })

    expect(ctx.mainDate).toBe('2026-07-08')
    expect(ctx.mainLabel).toBe('Ontem')
    expect(ctx.previousCard).toBeNull()
    expect(ctx.canEditMainForm).toBe(true)
  })

  test('before noon releases D0 immediately when D-1 was submitted', () => {
    const ctx = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T11:15:00.000Z'),
      yesterdayClosing: closing('2026-07-08'),
      todayClosing: null,
    })

    expect(ctx.mainDate).toBe('2026-07-09')
    expect(ctx.mainLabel).toBe('Hoje')
    expect(ctx.previousCard?.type).toBe('previous_done')
    expect(ctx.isMainDateSubmitted).toBe(false)
  })

  test('before noon treats D-1 draft as pending and keeps D-1 editable', () => {
    const ctx = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T11:15:00.000Z'),
      yesterdayClosing: draftClosing('2026-07-08'),
      todayClosing: null,
    })

    expect(ctx.mainDate).toBe('2026-07-08')
    expect(ctx.mainCheckin?.reference_date).toBe('2026-07-08')
    expect(ctx.previousCard).toBeNull()
    expect(ctx.canEditMainForm).toBe(true)
  })

  test('after noon always uses D0 and shows pending previous card', () => {
    const ctx = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T15:01:00.000Z'),
      yesterdayClosing: null,
      todayClosing: null,
    })

    expect(ctx.mainDate).toBe('2026-07-09')
    expect(ctx.mainLabel).toBe('Hoje')
    expect(ctx.previousCard?.type).toBe('previous_pending')
    expect(ctx.canEditMainForm).toBe(true)
  })

  test('after noon treats D-1 draft as previous pending alert', () => {
    const ctx = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T15:01:00.000Z'),
      yesterdayClosing: draftClosing('2026-07-08'),
      todayClosing: null,
    })

    expect(ctx.mainDate).toBe('2026-07-09')
    expect(ctx.previousCard?.type).toBe('previous_pending')
    expect(ctx.canEditMainForm).toBe(true)
  })

  test('after noon keeps D0 open when only D-1 was submitted', () => {
    const ctx = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T15:01:00.000Z'),
      yesterdayClosing: closing('2026-07-08'),
      todayClosing: null,
    })

    expect(ctx.mainDate).toBe('2026-07-09')
    expect(ctx.isMainDateSubmitted).toBe(false)
    expect(ctx.canEditMainForm).toBe(true)
    expect(ctx.previousCard?.type).toBe('previous_done')
  })

  test('after noon blocks only D0 when D0 was submitted', () => {
    const ctx = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T15:01:00.000Z'),
      yesterdayClosing: closing('2026-07-08'),
      todayClosing: closing('2026-07-09'),
    })

    expect(ctx.mainDate).toBe('2026-07-09')
    expect(ctx.mainCheckin?.reference_date).toBe('2026-07-09')
    expect(ctx.isMainDateSubmitted).toBe(true)
    expect(ctx.canEditMainForm).toBe(false)
    expect(ctx.mode).toBe('today_submitted')
    expect(ctx.previousCard?.type).toBe('previous_done')
  })

  test('after noon reopens D0 when submitted row is empty and has no zero justification', () => {
    const ctx = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T15:01:00.000Z'),
      yesterdayClosing: closing('2026-07-08'),
      todayClosing: emptySubmittedClosing('2026-07-09'),
    })

    expect(ctx.mainDate).toBe('2026-07-09')
    expect(ctx.isMainDateSubmitted).toBe(false)
    expect(ctx.canEditMainForm).toBe(true)
    expect(ctx.mode).toBe('today_in_progress')
  })

  test('after noon keeps justified zero D0 closed', () => {
    const ctx = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T15:01:00.000Z'),
      yesterdayClosing: closing('2026-07-08'),
      todayClosing: justifiedZeroClosing('2026-07-09'),
    })

    expect(ctx.isMainDateSubmitted).toBe(true)
    expect(ctx.canEditMainForm).toBe(false)
    expect(ctx.mode).toBe('today_submitted')
  })

  test('uses the Sao Paulo noon boundary at 11:59, 12:00 and 12:01', () => {
    const base = {
      today: '2026-07-09',
      yesterday: '2026-07-08',
      yesterdayClosing: null,
      todayClosing: null,
    }

    const beforeNoon = resolveActiveClosingContext({
      ...base,
      now: new Date('2026-07-09T14:59:00.000Z'), // 11:59 SP
    })
    const atNoon = resolveActiveClosingContext({
      ...base,
      now: new Date('2026-07-09T15:00:00.000Z'), // 12:00 SP
    })
    const afterNoon = resolveActiveClosingContext({
      ...base,
      now: new Date('2026-07-09T15:01:00.000Z'), // 12:01 SP
    })

    expect(beforeNoon.mainDate).toBe('2026-07-08')
    expect(atNoon.mainDate).toBe('2026-07-09')
    expect(afterNoon.mainDate).toBe('2026-07-09')
    expect(atNoon.previousCard?.type).toBe('previous_pending')
  })

  test('uses Sao Paulo time around midnight, independently of the UTC date', () => {
    const beforeMidnight = resolveActiveClosingContext({
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-10T02:59:59.999Z'), // 23:59:59 SP on 09/07
      yesterdayClosing: null,
      todayClosing: null,
    })
    const afterMidnight = resolveActiveClosingContext({
      today: '2026-07-10',
      yesterday: '2026-07-09',
      now: new Date('2026-07-10T03:00:00.000Z'), // 00:00 SP on 10/07
      yesterdayClosing: null,
      todayClosing: null,
    })

    expect(beforeMidnight.mainDate).toBe('2026-07-09')
    expect(afterMidnight.mainDate).toBe('2026-07-09')
  })

  test('exposes the spec-facing alias without changing the resolved context', () => {
    const args = {
      today: '2026-07-09',
      yesterday: '2026-07-08',
      now: new Date('2026-07-09T15:01:00.000Z'),
      yesterdayClosing: closing('2026-07-08'),
      todayClosing: null,
    }

    expect(getActiveClosingContext(args)).toEqual(resolveActiveClosingContext(args))
  })

  test('public facade derives D0/D-1 from Sao Paulo and accepts a date map', () => {
    const now = new Date('2026-07-09T15:01:00.000Z')
    const context = getActiveClosingContext(now, {
      '2026-07-08': closing('2026-07-08'),
      '2026-07-09': null,
    })

    expect(context.mainDate).toBe('2026-07-09')
    expect(context.previousCard?.date).toBe('2026-07-08')
  })

  test('reconhece fechamento submetido quando vendedor teve apenas leads de internet (leads_net_prev_day > 0)', () => {
    const internetOnlyClosing = {
      ...emptySubmittedClosing('2026-08-14'),
      leads_net_prev_day: 14,
    } as DailyCheckin

    const ctx = resolveActiveClosingContext({
      today: '2026-08-15',
      yesterday: '2026-08-14',
      now: new Date('2026-08-15T11:00:00.000Z'),
      yesterdayClosing: internetOnlyClosing,
      todayClosing: null,
    })

    expect(ctx.mainDate).toBe('2026-08-15')
    expect(ctx.mainLabel).toBe('Hoje')
    expect(ctx.previousCard?.type).toBe('previous_done')
  })

  test('reconhece fechamento submetido quando vendedor teve visitas por canal (visitas_net/cart/porta > 0)', () => {
    const visitChannelClosing = {
      ...emptySubmittedClosing('2026-08-14'),
      visitas_net_prev_day: 3,
    } as DailyCheckin

    const ctx = resolveActiveClosingContext({
      today: '2026-08-15',
      yesterday: '2026-08-14',
      now: new Date('2026-08-15T11:00:00.000Z'),
      yesterdayClosing: visitChannelClosing,
      todayClosing: null,
    })

    expect(ctx.mainDate).toBe('2026-08-15')
    expect(ctx.mainLabel).toBe('Hoje')
    expect(ctx.previousCard?.type).toBe('previous_done')
  })
})


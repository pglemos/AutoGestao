import { describe, expect, test } from 'bun:test'
import { validateReportDateRange } from './reportDateRange'
describe('report date range', () => { test('validates required, inverted and maximum periods', () => { expect(validateReportDateRange({ start: '', end: '' })).toContain('Informe'); expect(validateReportDateRange({ start: '2026-08-01', end: '2026-07-01' })).toContain('anterior'); expect(validateReportDateRange({ start: '2025-01-01', end: '2026-07-25' }, 30)).toContain('30'); expect(validateReportDateRange({ start: '2026-07-01', end: '2026-07-25' }, 30)).toBeNull() }) })

import { describe, expect, test } from 'bun:test'

import { applyStatusColorRules } from '../../scripts/migrate-status-colors.mjs'

describe('07.006 status color migration', () => {
  test('preserves explicit opacity when a semantic border mapping has a default opacity', () => {
    const result = applyStatusColorRules(
      'border-blue-400/30 bg-blue-50/60 text-red-600 bg-emerald-600 hover:bg-emerald-700',
    )

    expect(result.next).toBe(
      'border-status-info/30 bg-status-info-surface/60 text-status-error-text bg-brand-primary hover:bg-brand-primary-hover',
    )
    expect(result.next).not.toMatch(/status-[^\s]+\/\d+\/\d+/)
  })

  test('is idempotent and does not remigrate semantic utilities', () => {
    const first = applyStatusColorRules('border-blue-400 bg-status-success-surface text-status-error-text')
    const second = applyStatusColorRules(first.next)

    expect(first.next).toBe('border-status-info/50 bg-status-success-surface text-status-error-text')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })

  test('does not partially match surface shades inside solid 500 utilities', () => {
    const result = applyStatusColorRules('bg-red-500 bg-amber-500 bg-blue-500 bg-emerald-500')

    expect(result.next).toBe(
      'bg-status-error bg-status-warning bg-status-info bg-status-success',
    )
    expect(result.next).not.toContain('surface0')
  })
})

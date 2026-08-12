import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

import { applyStatusComplementRules } from '../../scripts/migrate-status-complement.mjs'

describe('07.015 status color complement migration', () => {
  test('runtime has no residual 500+/950 status utilities outside exceptions', () => {
    let matches = ''
    try {
      matches = execFileSync(
        'rg',
        [
          '-l',
          '(text|bg|border|ring|from|to|fill|stroke|hover|active|focus)-(emerald|amber|red|blue|orange)-(500|600|700|800|900|950)',
          'src',
          '--glob',
          '*.{css,ts,tsx,js,jsx,mjs}',
          '--glob',
          '!**/base44-reference/**',
          '--glob',
          '!**/*.test.*',
          '--glob',
          '!**/*.spec.*',
          '--glob',
          '!**/*.playwright.*',
          '--glob',
          '!**/_stories/**',
          '--glob',
          '!**/design-system/tokens/**',
          '--glob',
          '!**/index.css',
          '--glob',
          '!**/WhatsApp*',
          '--glob',
          '!**/RetornoWhatsApp*',
        ],
        { encoding: 'utf8' },
      ).trim()
    } catch (error) {
      if (error?.status !== 1) throw error
    }

    expect(matches).toBe('')
  })

  test('maps 950/900/800 text shades to status-*-text', () => {
    const result = applyStatusComplementRules('text-amber-950 text-blue-950 text-emerald-950 text-red-800')

    expect(result.next).toBe(
      'text-status-warning-text text-status-info-text text-status-success-text text-status-error-text',
    )
  })

  test('maps dark bg shades and gradient destinations to status solids', () => {
    const result = applyStatusComplementRules('bg-blue-950 to-blue-600 bg-amber-950 to-red-500 bg-emerald-600')

    expect(result.next).toBe(
      'bg-status-info to-status-info bg-status-warning to-status-error bg-brand-primary',
    )
  })

  test('maps ring 600/900 and hover/active variants', () => {
    const result = applyStatusComplementRules(
      'ring-blue-600 ring-blue-900 hover:text-orange-800 hover:bg-blue-600 active:bg-blue-950 focus:ring-blue-900',
    )

    expect(result.next).toBe(
      'ring-status-info ring-status-info hover:text-status-warning-text hover:bg-status-info active:bg-status-info focus:ring-status-info',
    )
  })

  test('maps dark solid borders to status solids', () => {
    const result = applyStatusComplementRules('border-amber-700 border-emerald-900')

    expect(result.next).toBe('border-status-warning border-status-success')
  })

  test('is idempotent and does not remigrate semantic utilities', () => {
    const first = applyStatusComplementRules('text-amber-950 bg-status-info-surface text-status-info-text')
    const second = applyStatusComplementRules(first.next)

    expect(first.next).toBe('text-status-warning-text bg-status-info-surface text-status-info-text')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })
})

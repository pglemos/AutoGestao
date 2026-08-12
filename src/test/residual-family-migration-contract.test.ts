import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

import { applyResidualFamilyRules } from '../../scripts/migrate-residual-families.mjs'

describe('07.010 residual color family migration', () => {
  test('runtime has no legacy green/indigo/sky/cyan/teal/yellow utilities outside whatsapp', () => {
    let matches = ''
    try {
      matches = execFileSync(
        'rg',
        [
          '-l',
          '(text|bg|border|ring|from|to|fill|stroke)-(green|indigo|sky|cyan|teal|yellow)-[0-9]+',
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

  test('maps green to the brand-primary family', () => {
    const result = applyResidualFamilyRules(
      'bg-green-600 text-green-700 border-green-200 bg-green-50 text-green-800 bg-green-500',
    )

    expect(result.next).toBe(
      'bg-brand-primary text-brand-primary-hover border-brand-primary/30 bg-brand-primary-subtle text-brand-primary-active bg-brand-primary',
    )
  })

  test('maps indigo/sky/cyan to status-info', () => {
    const result = applyResidualFamilyRules(
      'bg-indigo-50 text-indigo-700 border-indigo-200 bg-sky-500 text-sky-600 bg-cyan-50',
    )

    expect(result.next).toBe(
      'bg-status-info-surface text-status-info-text border-status-info/30 bg-status-info text-status-info-text bg-status-info-surface',
    )
  })

  test('maps yellow to status-warning', () => {
    const result = applyResidualFamilyRules('bg-yellow-50 text-yellow-700 border-yellow-400 bg-yellow-400')

    expect(result.next).toBe(
      'bg-status-warning-surface text-status-warning-text border-status-warning/50 bg-status-warning/50',
    )
  })

  test('maps teal to brand-primary (alias da marca)', () => {
    const result = applyResidualFamilyRules('bg-teal-50 bg-teal-500 text-teal-700 border-teal-300')

    expect(result.next).toBe(
      'bg-brand-primary-subtle bg-brand-primary text-brand-primary border-brand-primary/40',
    )
  })

  test('preserves explicit opacity when a border mapping has a default opacity', () => {
    const result = applyResidualFamilyRules('border-yellow-400/30 border-green-200/60 bg-teal-50/40')

    expect(result.next).toBe(
      'border-status-warning/30 border-brand-primary/60 bg-brand-primary-subtle/40',
    )
    expect(result.next).not.toMatch(/[a-z-]+\/\d+\/\d+/)
  })

  test('is idempotent and does not remigrate semantic utilities', () => {
    const first = applyResidualFamilyRules('bg-green-600 bg-brand-primary text-brand-primary border-green-200')
    const second = applyResidualFamilyRules(first.next)

    expect(first.next).toBe('bg-brand-primary bg-brand-primary text-brand-primary border-brand-primary/30')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })

  test('does not partially match soft shades inside solid 500 utilities', () => {
    const result = applyResidualFamilyRules('bg-green-500 bg-teal-500 bg-indigo-500')

    expect(result.next).toBe('bg-brand-primary bg-brand-primary bg-status-info')
    expect(result.next).not.toContain('subtle0')
  })
})

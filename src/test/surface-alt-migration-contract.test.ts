import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

import { applySurfaceAltRules } from '../../scripts/migrate-surface-alt.mjs'

describe('07.019 surface-alt migration', () => {
  test('runtime has no bg-gray/slate-50/100 utilities outside exceptions', () => {
    let matches = ''
    try {
      matches = execFileSync(
        'rg',
        [
          '-P',
          '-l',
          'bg-(gray|slate)-(50|100)(?!\\d)',
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

  test('maps 50 shades to bg-surface-alt and 100 shades to bg-muted', () => {
    const result = applySurfaceAltRules('bg-gray-50 bg-slate-50 bg-gray-100 bg-slate-100')

    expect(result.next).toBe('bg-surface-alt bg-surface-alt bg-muted bg-muted')
  })

  test('preserves hover/group-hover/focus variants', () => {
    const result = applySurfaceAltRules('hover:bg-gray-50 group-hover:bg-gray-100 focus:bg-slate-50')

    expect(result.next).toBe('hover:bg-surface-alt group-hover:bg-muted focus:bg-surface-alt')
  })

  test('maps opacity modifiers', () => {
    const result = applySurfaceAltRules('bg-gray-50/30 bg-gray-50/50 bg-gray-50/80')

    expect(result.next).toBe('bg-surface-alt/30 bg-surface-alt/50 bg-surface-alt/80')
  })

  test('is idempotent', () => {
    const first = applySurfaceAltRules('bg-gray-50 bg-surface-alt bg-muted')
    const second = applySurfaceAltRules(first.next)

    expect(first.next).toBe('bg-surface-alt bg-surface-alt bg-muted')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })
})

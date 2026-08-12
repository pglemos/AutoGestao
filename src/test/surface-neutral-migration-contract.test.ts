import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

import { applySurfaceNeutralRules } from '../../scripts/migrate-surface-neutral.mjs'

describe('07.017 surface-neutral migration', () => {
  test('runtime has no bg-gray/slate-200/300 utilities outside exceptions', () => {
    let matches = ''
    try {
      matches = execFileSync(
        'rg',
        [
          '-l',
          'bg-(gray|slate)-(200|300)',
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

  test('maps all neutral surface shades to bg-muted', () => {
    const result = applySurfaceNeutralRules('bg-gray-200 bg-gray-300 bg-slate-200 bg-slate-300')

    expect(result.next).toBe('bg-muted bg-muted bg-muted bg-muted')
  })

  test('does not touch darker neutral backgrounds (dark-surface scope)', () => {
    const result = applySurfaceNeutralRules('bg-gray-900 bg-slate-800')

    expect(result.next).toBe('bg-gray-900 bg-slate-800')
    expect(result.replacements).toBe(0)
  })

  test('is idempotent', () => {
    const first = applySurfaceNeutralRules('bg-gray-200 bg-muted')
    const second = applySurfaceNeutralRules(first.next)

    expect(first.next).toBe('bg-muted bg-muted')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })
})

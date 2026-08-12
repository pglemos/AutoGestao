import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

import { applyMxLegacyAliasRules } from '../../scripts/migrate-mx-legacy-aliases.mjs'

describe('07.016 mx legacy aliases migration (bug B1)', () => {
  test('runtime has no mx-green/mx-indigo/mx-teal legacy utilities outside token definitions', () => {
    let matches = ''
    try {
      matches = execFileSync(
        'rg',
        [
          '-l',
          '(text|bg|border|ring|from|to|via|fill|stroke)-mx-(green|indigo|teal)[a-z0-9-]*',
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

  test('maps surface aliases to bg-brand-primary-subtle', () => {
    const result = applyMxLegacyAliasRules(
      'bg-mx-green-50 bg-mx-indigo-50 bg-mx-green-light bg-mx-green',
    )

    expect(result.next).toBe(
      'bg-brand-primary-subtle bg-brand-primary-subtle bg-brand-primary-subtle bg-brand-primary-subtle',
    )
  })

  test('maps solid and dark shades to bg-brand-primary', () => {
    const result = applyMxLegacyAliasRules('bg-mx-green-500 bg-mx-green-600 bg-mx-green-900 bg-mx-green-950')

    expect(result.next).toBe('bg-brand-primary bg-brand-primary bg-brand-primary bg-brand-primary')
  })

  test('maps border and text aliases', () => {
    const result = applyMxLegacyAliasRules(
      'border-mx-green-200 border-mx-indigo-100 border-mx-green text-mx-green text-mx-green-800 text-mx-green-900',
    )

    expect(result.next).toBe(
      'border-brand-primary/20 border-brand-primary/20 border-brand-primary text-brand-primary text-brand-primary-active text-brand-primary-active',
    )
  })

  test('does not partially match the bare alias inside hyphenated utilities', () => {
    const result = applyMxLegacyAliasRules('bg-mx-green-50 bg-mx-green-600 text-mx-green-800')

    expect(result.next).toBe('bg-brand-primary-subtle bg-brand-primary text-brand-primary-active')
    expect(result.next).not.toMatch(/mx-green(?:-[a-z0-9]+)?\b/)
  })

  test('is idempotent and does not remigrate semantic utilities', () => {
    const first = applyMxLegacyAliasRules('bg-mx-green-50 bg-brand-primary-subtle text-mx-green')
    const second = applyMxLegacyAliasRules(first.next)

    expect(first.next).toBe('bg-brand-primary-subtle bg-brand-primary-subtle text-brand-primary')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })
})

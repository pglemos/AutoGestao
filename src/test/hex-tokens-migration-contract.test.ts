import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

import { applyHexTokenRules } from '../../scripts/migrate-hex-tokens.mjs'

describe('07.021 hex tokens migration (COMP-hex-tokens)', () => {
  test('runtime has no arbitrary hex utilities outside exceptions', () => {
    let matches = ''
    try {
      matches = execFileSync(
        'rg',
        [
          '-l',
          '(bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|divide|decoration|accent|caret|placeholder|!bg|hover:bg|focus-visible:ring)-\\[#[0-9A-Fa-f]{6}\\]',
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

  test('maps the info-consultive hex to status-info', () => {
    const result = applyHexTokenRules(
      'bg-[#005BFF] text-[#005BFF] border-[#005BFF] ring-[#005BFF] from-[#005BFF] to-[#005BFF] hover:bg-[#005BFF]',
    )

    expect(result.next).toBe(
      'bg-status-info text-status-info-text border-status-info ring-status-info from-status-info to-status-info hover:bg-status-info',
    )
  })

  test('maps navy, muted and border hexes', () => {
    const result = applyHexTokenRules(
      'text-[#031B3D] text-[#0F172A] text-[#526B7A] text-[#64748B] border-[#DFE0E1] border-[#E5E7EB] bg-[#F7F8F8]',
    )

    expect(result.next).toBe(
      'text-mx-navy text-mx-navy text-muted-foreground text-muted-foreground border-border border-border bg-surface-alt',
    )
  })

  test('maps success/warning/error hexes', () => {
    const result = applyHexTokenRules(
      'text-[#00A89D] bg-[#22C55E] text-[#F59E0B] bg-[#EF4444] text-[#EF4343] text-[#92400E]',
    )

    expect(result.next).toBe(
      'text-status-success bg-status-success text-status-warning-text bg-status-error text-status-error text-status-warning-text',
    )
  })

  test('is idempotent and does not remigrate semantic utilities', () => {
    const first = applyHexTokenRules('bg-[#005BFF] bg-status-info text-mx-navy')
    const second = applyHexTokenRules(first.next)

    expect(first.next).toBe('bg-status-info bg-status-info text-mx-navy')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })
})

import { describe, expect, test } from 'bun:test'

import { applyPurpleLegacyRules } from '../../scripts/migrate-purple-legacy.mjs'
import { runtimeFilesWith } from './lib/scanSourceFiles'

describe('07.007 purple/violet color migration', () => {
  test('runtime has no legacy purple style utilities or purple button hex', () => {
    // C8: varredura 100% fs — um `rg --pcre2 -i` aqui retornaria vazio sob bun test.
    expect(
      runtimeFilesWith(
        /#6d28d9|#7c3aed|shadow-(?:purple|violet)-|(?:bg|text|border|ring|from|to|fill|stroke|divide|accent)-(?:purple|violet)(?:-|\/)/i,
      ),
    ).toEqual([])
  })

  test('runtime has no temporary accent-purple token references', () => {
    expect(runtimeFilesWith(/accent-purple/)).toEqual([])
  })

  test('converges legacy and temporary accent aliases to the canonical info family', () => {
    const result = applyPurpleLegacyRules(
      'bg-purple-50 text-purple-700 border-violet-200 bg-accent-purple-soft text-accent-purple-strong hover:bg-accent-purple-strong border-accent-purple/40',
    )

    expect(result.next).toBe(
      'bg-status-info-surface text-status-info-text border-status-info/30 bg-status-info-surface text-status-info-text hover:bg-status-info border-status-info/40',
    )
    expect(result.next).not.toContain('accent-purple')
  })

  test('preserves explicit opacity when a semantic border mapping has a default opacity', () => {
    const result = applyPurpleLegacyRules('border-violet-200/60 bg-purple-50/40 text-violet-700 bg-rose-50 border-rose-200 text-rose-700')

    expect(result.next).toBe(
      'border-status-info/60 bg-status-info-surface/40 text-status-info-text bg-status-error-surface border-status-error/30 text-status-error-text',
    )
    expect(result.next).not.toMatch(/(?:status-info(?:-surface|-text)?|status-error(?:-surface|-text)?)\/\d+\/\d+/)
  })

  test('is idempotent and does not remigrate semantic utilities', () => {
    const first = applyPurpleLegacyRules('border-purple-200 bg-status-info-surface text-status-info-text')
    const second = applyPurpleLegacyRules(first.next)

    expect(first.next).toBe('border-status-info/30 bg-status-info-surface text-status-info-text')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })

  test('does not partially match soft shades inside solid utilities', () => {
    const result = applyPurpleLegacyRules('bg-purple-500 bg-violet-500 border-violet-500 border-violet-600')

    expect(result.next).toBe('bg-status-info bg-status-info border-status-info border-status-info')
    expect(result.next).not.toContain('soft0')
  })

  test('never maps legacy foreground shades to a surface-only token', () => {
    const result = applyPurpleLegacyRules('text-purple-300 text-purple-400 text-violet-300 text-violet-400')

    expect(result.next).toBe(
      'text-status-info-text text-status-info-text text-status-info-text text-status-info-text',
    )
    expect(result.next).not.toContain('text-status-info-surface')
  })
})

import { describe, expect, test } from 'bun:test'

import { applySurfaceNeutralRules } from '../../scripts/migrate-surface-neutral.mjs'
import { scanSourceFiles } from './lib/scanSourceFiles'

const SRC_EXCLUDED = [
  '**/base44-reference/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.playwright.*',
  '**/_stories/**',
  '**/design-system/tokens/**',
  '**/index.css',
  '**/WhatsApp*',
  '**/RetornoWhatsApp*',
]

describe('07.017 surface-neutral migration', () => {
  test('runtime has no bg-gray/slate-200/300 utilities outside exceptions', () => {
    // C8: varredura 100% fs — um `rg` aqui retornaria vazio sob bun test
    // (stdout de subprocesso engolido), fazendo o teste passar vacuamente.
    const matches: string[] = []
    for (const { rel, lines } of scanSourceFiles({ extraExcluded: SRC_EXCLUDED })) {
      if (lines.some((line) => /bg-(gray|slate)-(200|300)/.test(line))) matches.push(rel)
    }

    expect(matches).toEqual([])
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

import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

import { applyNeutralComplementRules } from '../../scripts/migrate-neutral-complement.mjs'

describe('07.020 neutral complement migration', () => {
  test('runtime has no migratable gray/slate text-border utilities outside exceptions', () => {
    let matches = ''
    try {
      matches = execFileSync(
        'rg',
        [
          '-l',
          '(text|border|divide|ring|hover:border|hover:text|focus:border|focus:text)-(gray|slate)-(100|200|300|400|500|600|700|800)',
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

  test('text-slate-50 on dark tooltip is a documented on-dark exception', () => {
    const source = execFileSync('rg', ['-l', 'text-slate-50', 'src', '--glob', '*.{css,ts,tsx,js,jsx,mjs}', '--glob', '!**/base44-reference/**', '--glob', '!**/*.test.*', '--glob', '!**/design-system/tokens/**', '--glob', '!**/index.css'], { encoding: 'utf8' }).trim()
    // text-on-dark (papel 07.002): texto claro sobre bg-slate-800 em tooltip
    // dark — mesma categoria do text-white, excecao de contexto documentada.
    expect(source).toBe('src/components/ui/HelpTooltip.tsx')
  })

  test('maps text neutrals by semantic role', () => {
    const result = applyNeutralComplementRules(
      'text-slate-400 text-slate-600 text-slate-300 text-slate-200 text-slate-700 text-gray-500',
    )

    expect(result.next).toBe(
      'text-muted-foreground text-muted-foreground text-text-disabled text-text-disabled text-foreground text-muted-foreground',
    )
  })

  test('maps borders and divides', () => {
    const result = applyNeutralComplementRules(
      'divide-gray-50 border-slate-50 border-slate-200 border-slate-800 hover:border-slate-200',
    )

    expect(result.next).toBe(
      'divide-border-subtle border-border-subtle border-border border-border-strong hover:border-border',
    )
  })

  test('does not touch dark-surface backgrounds and gradients', () => {
    const result = applyNeutralComplementRules('bg-gray-900 bg-slate-800 to-slate-900 from-slate-900 bg-slate-400')

    expect(result.next).toBe('bg-gray-900 bg-slate-800 to-slate-900 from-slate-900 bg-slate-400')
    expect(result.replacements).toBe(0)
  })

  test('is idempotent', () => {
    const first = applyNeutralComplementRules('text-slate-400 text-muted-foreground border-slate-200')
    const second = applyNeutralComplementRules(first.next)

    expect(first.next).toBe('text-muted-foreground text-muted-foreground border-border')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })
})

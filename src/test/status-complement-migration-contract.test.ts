import { describe, expect, test } from 'bun:test'

import { applyStatusComplementRules } from '../../scripts/migrate-status-complement.mjs'
import { runtimeFilesWith } from './lib/scanSourceFiles'

describe('07.015 status color complement migration', () => {
  test('runtime has no residual 500+/950 status utilities outside exceptions', () => {
    // C8: varredura 100% fs — um `rg` aqui retornaria vazio sob bun test
    // (stdout de subprocesso engolido), passando vacuamente.
    // Exceção documentada: PlanoAtaqueTab (carteira) está sob paridade DOM
    // com base44-reference — a migração de status exige a fatia dedicada de
    // paridade (runtime+referência juntos), não uma troca isolada.
    const matches = runtimeFilesWith(
      /(text|bg|border|ring|from|to|fill|stroke|hover|active|focus)-(emerald|amber|red|blue|orange)-(500|600|700|800|900|950)/,
    ).filter((file) => !file.includes('/carteira/PlanoAtaqueTab.jsx'))

    expect(matches).toEqual([])
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

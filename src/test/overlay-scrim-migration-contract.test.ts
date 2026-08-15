import { describe, expect, test } from 'bun:test'

import { applyOverlayScrimRules } from '../../scripts/migrate-overlay-scrim.mjs'
import { runtimeFilesWith } from './lib/scanSourceFiles'

describe('07.018 overlay-scrim migration', () => {
  test('runtime has no bg-black utilities outside exceptions', () => {
    // C8: varredura 100% fs — um `rg` aqui retornaria vazio sob bun test.
    expect(runtimeFilesWith(/bg-black/)).toEqual([])
  })

  test('maps solid and opacity scrims to bg-surface-overlay', () => {
    const result = applyOverlayScrimRules('bg-black bg-black/50 bg-black/30 bg-black/80')

    expect(result.next).toBe(
      'bg-surface-overlay bg-surface-overlay/50 bg-surface-overlay/30 bg-surface-overlay/80',
    )
  })

  test('does not partially match bg-black inside other utilities', () => {
    const result = applyOverlayScrimRules('bg-black/40 text-black')

    expect(result.next).toBe('bg-surface-overlay/40 text-black')
    expect(result.replacements).toBe(1)
  })

  test('is idempotent', () => {
    const first = applyOverlayScrimRules('bg-black/40 bg-surface-overlay/40')
    const second = applyOverlayScrimRules(first.next)

    expect(first.next).toBe('bg-surface-overlay/40 bg-surface-overlay/40')
    expect(second.next).toBe(first.next)
    expect(second.replacements).toBe(0)
  })
})

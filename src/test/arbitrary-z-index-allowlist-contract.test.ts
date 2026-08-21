import { describe, expect, test } from 'bun:test'

import {
  ALLOWLIST,
  inspectArbitraryZIndex,
  runArbitraryZIndexGate,
} from '../../scripts/lint-arbitrary-z-index.mjs'

describe('contrato AC-29.013 — z-index arbitrário fora de allowlist', () => {
  test('RED: z-[N] arbitrário é flagrado', () => {
    const source = `export const X = () => <div className="z-[60]">x</div>`
    expect(inspectArbitraryZIndex(source, 'pages/P.tsx')).toEqual([
      expect.objectContaining({ file: 'pages/P.tsx', rule: 'z-arbitrary', line: 1 }),
    ])
  })

  test('RED: z-N numérico é flagrado', () => {
    const source = `export const X = () => <div className="z-50">x</div>`
    expect(inspectArbitraryZIndex(source, 'pages/P.tsx')).toEqual([
      expect.objectContaining({ file: 'pages/P.tsx', rule: 'z-numeric', line: 1 }),
    ])
  })

  test('RED: z-index CSS literal e zIndex inline são flagrados', () => {
    const source = `const a = "z-index: 999"; const b = { zIndex: 5 }`
    const violations = inspectArbitraryZIndex(source, 'pages/P.tsx')
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: 'z-index-numeric' }),
        expect.objectContaining({ rule: 'z-index-inline' }),
      ]),
    )
  })

  test('GREEN: token semântico via var(--mx-z-*) não é flagrado', () => {
    const source = `export const X = () => <div style={{ zIndex: 'var(--mx-z-modal)' }} className="z-[var(--mx-z-modal)]">x</div>`
    expect(inspectArbitraryZIndex(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: z-[60] e z-50 juntos geram ambos os casos, sem falso negativo', () => {
    const source = `export const X = () => <div className="z-[60] z-50">x</div>`
    const rules = inspectArbitraryZIndex(source, 'pages/P.tsx').map((v) => v.rule)
    expect(rules).toContain('z-arbitrary')
    expect(rules).toContain('z-numeric')
  })

  test('integração: árvore viva sem z-index arbitrário fora da allowlist', () => {
    const violations = runArbitraryZIndexGate()
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  }, 15_000)

  test('allowlist é orçamento explícito (documentada ou vazia)', () => {
    expect(ALLOWLIST).toBeInstanceOf(Map)
  })
})

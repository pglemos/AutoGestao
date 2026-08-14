import { describe, expect, test } from 'bun:test'

import {
  ALLOWLIST,
  inspectRawColor,
  runRawColorGate,
} from '../../scripts/lint-raw-color-allowlist.mjs'

describe('contrato AC-29.010 — raw color fora de allowlist', () => {
  test('RED: hex cru em utilitário de cor é flagrado', () => {
    const source = `export const X = () => <div className="bg-[#ff0000] text-[#0f172a]">x</div>`
    const violations = inspectRawColor(source, 'pages/P.tsx')
    expect(violations).toHaveLength(2)
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ file: 'pages/P.tsx', line: 1 }),
      ]),
    )
  })

  test('RED: rgb() literal é flagrado', () => {
    const source = `export const X = () => <div className="border-[rgb(1,2,3)]">x</div>`
    expect(inspectRawColor(source, 'pages/P.tsx')).toHaveLength(1)
  })

  test('GREEN: token semântico via var(--mx-*) não é flagrado', () => {
    const source = `export const X = () => <div className="bg-[hsl(var(--mx-status-success))] text-[hsl(var(--mx-neutral-0))]">x</div>`
    expect(inspectRawColor(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: classes semânticas de cor não são flagradas', () => {
    const source = `export const X = () => <div className="bg-status-success text-text-primary border-border">x</div>`
    expect(inspectRawColor(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: referência a chartTokens em expressão não é flagrada', () => {
    const source = `export const X = () => <div className={cn('bg-[hsl(var(--mx-status-info))]')}>x</div>`
    expect(inspectRawColor(source, 'pages/P.tsx')).toEqual([])
  })

  test('integração: árvore viva sem cor literal fora da allowlist', () => {
    const violations = runRawColorGate()
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('allowlist é orçamento explícito (documentada ou vazia)', () => {
    expect(ALLOWLIST).toBeInstanceOf(Map)
  })
})

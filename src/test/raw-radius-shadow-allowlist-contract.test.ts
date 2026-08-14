import { describe, expect, test } from 'bun:test'

import {
  ALLOWLIST,
  inspectRawRadiusShadow,
  runRawRadiusShadowGate,
} from '../../scripts/lint-raw-radius-shadow-allowlist.mjs'

describe('contrato AC-29.011 — raw radius/shadow fora de allowlist', () => {
  test('RED: raio fora da escala canônica é flagrado', () => {
    const source = `export const X = () => <div className="rounded-[13px]">x</div>`
    expect(inspectRawRadiusShadow(source, 'pages/P.tsx')).toEqual([
      expect.objectContaining({ file: 'pages/P.tsx', rule: 'raw-radius', line: 1 }),
    ])
  })

  test('GREEN: raio na escala canônica não é flagrado', () => {
    const source = `export const X = () => <div className="rounded-[16px]">x</div>`
    expect(inspectRawRadiusShadow(source, 'pages/P.tsx')).toEqual([])
  })

  test('RED: sombra arbitrária sem token é flagrada', () => {
    const source = `export const X = () => <div className="shadow-[0_2px_4px_#000000]">x</div>`
    expect(inspectRawRadiusShadow(source, 'pages/P.tsx')).toEqual([
      expect.objectContaining({ file: 'pages/P.tsx', rule: 'raw-shadow', line: 1 }),
    ])
  })

  test('GREEN: sombra tokenizada via var(--mx-*) não é flagrada', () => {
    const source = `export const X = () => <div className="shadow-[var(--mx-shadow-focus-info)]">x</div>`
    expect(inspectRawRadiusShadow(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: classe semântica de sombra/raio não é flagrada', () => {
    const source = `export const X = () => <div className="shadow-mx-lg rounded-mx-xl">x</div>`
    expect(inspectRawRadiusShadow(source, 'pages/P.tsx')).toEqual([])
  })

  test('integração: árvore viva sem raio/sombra literal fora da allowlist', () => {
    const violations = runRawRadiusShadowGate()
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('allowlist é orçamento explícito (glows de paridade Base44 documentados)', () => {
    expect(ALLOWLIST).toBeInstanceOf(Map)
    expect(ALLOWLIST.has('src/features/checkin/sections/CheckinForm.tsx')).toBe(true)
    expect(ALLOWLIST.has('src/features/ranking/components/StoreBattleView.tsx')).toBe(true)
  })
})

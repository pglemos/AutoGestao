import { describe, expect, test } from 'bun:test'

import { inspectNoCssRoleGating } from '../../scripts/lint-no-css-role-gating.mjs'

describe('contrato FASE Z 26.013 — controle de acesso por código, não por CSS', () => {
  test('RED: className condicionado a role com classe de ocultação é flagrado', () => {
    const source = `export const X = () => <div className={role === 'gerente' ? 'block' : 'hidden'}>x</div>`
    expect(inspectNoCssRoleGating(source)).toEqual([
      expect.objectContaining({ rule: 'css-role-gating', line: 1 }),
    ])
  })

  test('RED: style inline display:none condicionado a role é flagrado', () => {
    const source = `export const X = () => <div style={canEdit ? {} : { display: 'none' }}>x</div>`
    expect(inspectNoCssRoleGating(source)).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'css-role-gating' })]),
    )
  })

  test('RED: invisibility condicionada a capability é flagrada', () => {
    const source = `export const X = () => <span className={hasAccess ? '' : 'invisible'}>x</span>`
    expect(inspectNoCssRoleGating(source)).toEqual(
      expect.arrayContaining([expect.objectContaining({ rule: 'css-role-gating' })]),
    )
  })

  test('GREEN: className dinâmico sem ocultação por role não é flagrado', () => {
    const source = `export const X = () => <div className={active ? 'bg-primary' : 'bg-muted'}>x</div>`
    expect(inspectNoCssRoleGating(source)).toEqual([])
  })

  test('GREEN: hidden de input file (ARIA, sem role) não é flagrado', () => {
    const source = `export const X = () => <input type="file" className="hidden" aria-label="Upload" />`
    expect(inspectNoCssRoleGating(source)).toEqual([])
  })

  test('GREEN: role="dialog" (ARIA) com overflow-hidden não é flagrado', () => {
    const source = `export const X = () => <div role="dialog" className="overflow-hidden">x</div>`
    expect(inspectNoCssRoleGating(source)).toEqual([])
  })

  test('GREEN: sr-only legítimo sem condição de role não é flagrado', () => {
    const source = `export const X = () => <span className="sr-only">Acessível</span>`
    expect(inspectNoCssRoleGating(source)).toEqual([])
  })
})

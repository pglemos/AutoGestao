import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  ALLOWLIST,
  countIconSizeDebt,
  inspectIconSemantics,
  runIconSemanticsGate,
} from '../../scripts/lint-icon-semantics.mjs'

const root = resolve(import.meta.dir, '..', '..')

describe('FASE U 21.003-21.006 — tamanhos, stroke, gap e containers de ícones', () => {
  test('21.004 — stroke fora do canônico {1.8, 2, 3} é flagrado', () => {
    const src = `
      import { Bell } from 'lucide-react'
      export const X = () => <Bell size={16} strokeWidth={2.25} />
    `
    expect(inspectIconSemantics(src, 'pages/P.tsx')).toEqual([
      expect.objectContaining({ prop: 'strokeWidth', value: 2.25 }),
    ])
  })

  test('21.004 — stroke canônico 2/1.8/3 não é flagrado', () => {
    const src = `
      import { Bell } from 'lucide-react'
      export const X = () => <>
        <Bell size={16} strokeWidth={2} />
        <Bell size={20} strokeWidth={1.8} />
        <Bell size={12} strokeWidth={3} />
      </>
    `
    expect(inspectIconSemantics(src, 'pages/P.tsx')).toEqual([])
  })

  test('21.003 — size fora da escala {12, 14, 16, 20, 24} e sem orçamento é flagrado', () => {
    const src = `
      import { Bell } from 'lucide-react'
      export const X = () => <Bell size={22} />
    `
    expect(inspectIconSemantics(src, 'pages/Novo.tsx')).toEqual([
      expect.objectContaining({ prop: 'size', value: 22, budgeted: false }),
    ])
  })

  test('21.003 — size fora da escala em arquivo orçado vira dívida (não bloqueia)', () => {
    const src = `
      import { Bell } from 'lucide-react'
      export const X = () => <Bell size={22} />
    `
    // Layout.tsx está no orçamento de dívida 21.003.
    const result = inspectIconSemantics(src, 'src/components/Layout.tsx')
    expect(result[0]).toMatchObject({ prop: 'size', budgeted: true })
    expect(countIconSizeDebt()).toBeGreaterThan(0)
  })

  test('21.003/21.004 — integração: árvore viva sem stroke fora do canônico e sem size novo fora do orçamento', () => {
    const violations = runIconSemanticsGate()
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('21.005 — gap canônico icon+label é gap-mx-xs (8px) no Button', () => {
    const button = readFileSync(resolve(root, 'src/components/atoms/Button.tsx'), 'utf8')
    expect(button).toContain('gap-mx-xs')
  })

  test('21.006 — containers canônicos de ícone existem (IconButton e IconBadge)', () => {
    const iconButton = readFileSync(resolve(root, 'src/components/atoms/IconButton.tsx'), 'utf8')
    const iconBadge = readFileSync(resolve(root, 'src/components/atoms/IconBadge.tsx'), 'utf8')
    expect(iconButton).toContain('label')
    expect(iconButton).toContain('aria-hidden')
    expect(iconBadge).toContain('size')
    expect(iconBadge).toContain('variant')
  })

  test('21.003 — escala semântica documentada nos tokens (2xs/xs/sm/md/lg)', () => {
    const css = readFileSync(resolve(root, 'src/design-system/tokens/components.css'), 'utf8')
    for (const token of [
      '--mx-icon-size-2xs',
      '--mx-icon-size-xs',
      '--mx-icon-size-sm',
      '--mx-icon-size-md',
      '--mx-icon-size-lg',
    ]) {
      expect(css).toContain(token)
    }
  })

  test('orçamento de dívida 21.003 é explícito e documentado', () => {
    const debt = JSON.parse(
      readFileSync(resolve(root, 'scripts/data/icon-size-debt.json'), 'utf8'),
    )
    expect(debt.description).toContain('21.003')
    expect(Object.keys(debt.files).length).toBeGreaterThan(100)
    expect(ALLOWLIST.size).toBeGreaterThan(0)
  })
})

import { describe, expect, test } from 'bun:test'

import {
  ALLOWLIST,
  inspectIconOnlyAction,
  runIconOnlyActionGate,
} from '../../scripts/lint-icon-only-action.mjs'

describe('contrato AC-29.014 — icon-only action sem nome acessível', () => {
  test('RED: button icon-only (Lucide) sem nome é flagrado', () => {
    const source = `
      import { Trash2 } from 'lucide-react'
      export const X = () => <button type="button" onClick={f}><Trash2 className="h-4 w-4" /></button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([
      expect.objectContaining({ file: 'pages/P.tsx', tag: 'button' }),
    ])
  })

  test('RED: link icon-only sem nome é flagrado', () => {
    const source = `
      import { ExternalLink } from 'lucide-react'
      export const X = () => <a href="https://x.dev"><ExternalLink size={20} /></a>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([
      expect.objectContaining({ file: 'pages/P.tsx', tag: 'a' }),
    ])
  })

  test('RED: button com svg direto sem nome é flagrado', () => {
    const source = `
      export const X = () => <button type="button" onClick={f}><svg width="16" height="16"><circle cx="8" cy="8" r="7" /></svg></button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toHaveLength(1)
  })

  test('GREEN: aria-label dá nome acessível', () => {
    const source = `
      import { Trash2 } from 'lucide-react'
      export const X = () => <button type="button" aria-label="Excluir" onClick={f}><Trash2 className="h-4 w-4" /></button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: VisuallyHidden com texto dá nome acessível', () => {
    const source = `
      import { Trash2 } from 'lucide-react'
      export const X = () => <button type="button" onClick={f}><Trash2 /><VisuallyHidden>Excluir</VisuallyHidden></button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: botão com texto visível não é icon-only', () => {
    const source = `
      import { Trash2 } from 'lucide-react'
      export const X = () => <button type="button" onClick={f}><Trash2 /> Excluir</button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: expressão filha (texto dinâmico) não é icon-only', () => {
    const source = `
      import { Trash2 } from 'lucide-react'
      export const X = () => <button type="button" onClick={f}><Trash2 /><span>{label}</span></button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: Spinner com label dá nome acessível', () => {
    const source = `
      import { X } from 'lucide-react'
      export const X = () => <button type="button" onClick={f}><X /><Spinner label="Carregando" /></button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([])
  })

  test('RED: Spinner sem label não nomeia o controle icon-only', () => {
    const source = `
      import { X } from 'lucide-react'
      export const X = () => <button type="button" onClick={f}><X /><Spinner /></button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toHaveLength(1)
  })

  test('GREEN: título em link dá nome acessível', () => {
    const source = `
      import { FileText } from 'lucide-react'
      export const X = () => <a href="#" title="Ver relatório"><FileText className="h-4 w-4" /></a>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: aria-hidden (decorativo) é ignorado', () => {
    const source = `
      import { X } from 'lucide-react'
      export const X = () => <button type="button" aria-hidden onClick={f}><X /></button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([])
  })

  test('GREEN: componente não-ícone como filho torna o controle não icon-only', () => {
    const source = `
      import { Trash2 } from 'lucide-react'
      export const X = () => <button type="button" onClick={f}><Trash2 /><Badge>3</Badge></button>
    `
    expect(inspectIconOnlyAction(source, 'pages/P.tsx')).toEqual([])
  })

  test('integração: árvore viva sem icon-only fora da allowlist', () => {
    const violations = runIconOnlyActionGate()
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([])
  })

  test('allowlist é orçamento explícito de debt documentado', () => {
    expect(ALLOWLIST).toBeInstanceOf(Map)
    expect(ALLOWLIST.size).toBeGreaterThan(0)
    expect(ALLOWLIST.has('src/components/ui/toast.jsx')).toBe(true)
  })
})

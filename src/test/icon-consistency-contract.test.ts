import { describe, expect, test } from 'bun:test'

import {
  ALLOWLIST,
  inspectIconConsistency,
  runIconConsistencyGate,
} from '../../scripts/lint-icon-consistency.mjs'

describe('FASE U 21.009 — ícones consistentes para a mesma ação', () => {
  test('RED: ícone alternativo de editar é flagrado', () => {
    const source = `import { Edit } from 'lucide-react'\nexport const B = () => <button><Edit /></button>`
    expect(inspectIconConsistency(source, 'x/B.tsx')).toEqual([
      expect.objectContaining({ rule: 'icon-inconsistent-editar', canonical: 'Pencil', used: 'Edit' }),
    ])
  })

  test('RED: Edit2 e Edit3 também são flagrados como editar', () => {
    expect(inspectIconConsistency(`import { Edit2 } from 'lucide-react'\nexport const B = () => <button><Edit2 /></button>`, 'x/B.tsx')).toHaveLength(1)
    expect(inspectIconConsistency(`import { Edit3 } from 'lucide-react'\nexport const B = () => <button><Edit3 /></button>`, 'x/B.tsx')).toHaveLength(1)
  })

  test('RED: RefreshCcw é flagrado como recarregar (canônico RefreshCw)', () => {
    const source = `import { RefreshCcw } from 'lucide-react'\nexport const B = () => <button><RefreshCcw /></button>`
    expect(inspectIconConsistency(source, 'x/B.tsx')).toEqual([
      expect.objectContaining({ rule: 'icon-inconsistent-recarregar', canonical: 'RefreshCw', used: 'RefreshCcw' }),
    ])
  })

  test('RED: PlusCircle é flagrado como adicionar (canônico Plus)', () => {
    const source = `import { PlusCircle } from 'lucide-react'\nexport const B = () => <button><PlusCircle /></button>`
    expect(inspectIconConsistency(source, 'x/B.tsx')).toEqual([
      expect.objectContaining({ rule: 'icon-inconsistent-adicionar', canonical: 'Plus', used: 'PlusCircle' }),
    ])
  })

  test('GREEN: canônicos Pencil/RefreshCw/Plus não são flagrados', () => {
    const source = `import { Pencil, RefreshCw, Plus } from 'lucide-react'\nexport const B = () => <><button><Pencil /></button><button><RefreshCw /></button><button><Plus /></button></>`
    expect(inspectIconConsistency(source, 'x/B.tsx')).toEqual([])
  })

  test('GREEN: RotateCcw (rewind/reset) e XCircle (status erro) NÃO são flagrados', () => {
    // Razão funcional distinta: RotateCcw é rewind/replay/reset, XCircle é erro.
    const source = `import { RotateCcw, XCircle } from 'lucide-react'\nexport const B = () => <><button><RotateCcw /></button><span><XCircle /></span></>`
    expect(inspectIconConsistency(source, 'x/B.tsx')).toEqual([])
  })

  test('GREEN: ícone não-lucide ou não-importado não é flagrado', () => {
    const source = `export const B = () => <button><CustomIcon /></button>`
    expect(inspectIconConsistency(source, 'x/B.tsx')).toEqual([])
  })

  test('integração: árvore viva sem ícones inconsistentes (21.009)', () => {
    const findings = runIconConsistencyGate()
    expect(findings, `ícones inconsistentes:\n${JSON.stringify(findings, null, 2)}`).toEqual([])
  })

  test('allowlist é orçamento explícito', () => {
    expect(ALLOWLIST).toBeInstanceOf(Map)
  })
})

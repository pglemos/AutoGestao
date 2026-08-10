import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'bun:test'

const root = resolve(import.meta.dir, '..', '..')
const readSource = (relativePath: string) => readFileSync(resolve(root, relativePath), 'utf8')

describe('contrato de contraste dos estados semânticos', () => {
  test('o cockpit do Dono usa tokens de texto escurecidos em estados sobre superfícies claras', () => {
    const types = readSource('src/features/dashboard-loja/sections/owner-cockpit/types.ts')
    const primitives = readSource('src/features/dashboard-loja/sections/owner-cockpit/primitives.tsx')
    const widgets = readSource('src/features/dashboard-loja/sections/owner-cockpit/OwnerHomeWidgets.tsx')

    expect(types).toContain("text: 'text-status-warning-text'")
    expect(types).toContain("text: 'text-status-error-text'")
    expect(types).not.toContain('text-status-warning\'')
    expect(types).not.toContain('text-status-error\'')

    expect(primitives).not.toMatch(/bg-amber-50 text-amber-600/)
    expect(primitives).not.toMatch(/bg-red-50 text-red-600/)
    expect(primitives).not.toMatch(/bg-emerald-50 text-emerald-600/)
    expect(widgets).not.toMatch(/text-(red|amber|emerald)-600/)
    expect(widgets).not.toContain('mt-0.5 text-gray-500 text-sm')
    expect(widgets).not.toContain('gap-2 text-xs text-gray-500')
  })

  test('o funil do Vendedor usa tokens semânticos nos indicadores sobre slate-50', () => {
    const funnel = readSource('src/pages/FunilVendedor.tsx')

    expect(funnel).toContain('text-status-warning-text')
    expect(funnel).toContain('text-status-error-text')
    expect(funnel).not.toMatch(/text-(red-500|amber-600)/)
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE K/N — fechamento 11.014 (migração consumidores) + 14.015 (DataGrid 320px/teclado).
 *
 * - 11.014: overrides de Button migrados; dívida rastreada em allowlist que só
 *   encolhe (lint-dangerous-overrides roda OK, 11.012 já commitado pelo DS6).
 * - 14.015: DataGrid tem tabIndex + focus-visible + mobileOnly/desktopOnly
 *   (fallback mobile em 320px) + overflow local (ScrollableRegion).
 */
describe('FASE K 11.014 — consumidores de Button migrados', () => {
  test('lint-dangerous-overrides roda OK (dívida só na allowlist)', () => {
    const lint = read('scripts/lint-dangerous-overrides.mjs')
    expect(lint).toContain('DANGEROUS_OVERRIDE_ALLOWLIST')
    // dívida documentada com justificativa
    expect(lint).toContain('PerfilTab')
    expect(lint).toContain('LiberacaoFechamento')
  })

  test('Button usa variantes canônicas sem overrides legados', () => {
    const btn = read('src/components/atoms/Button.tsx')
    expect(btn).toContain('bg-brand-primary')
    expect(btn).toContain('variant:')
    expect(btn).not.toContain('tracking-mx-wide')
  })
})

describe('FASE N 14.015 — DataGrid 320px e teclado', () => {
  const grid = () => read('src/components/organisms/DataGrid.tsx')

  test('DataGrid é navegável por teclado (tabIndex + focus-visible)', () => {
    const src = grid()
    expect(src).toContain('tabIndex')
    expect(src).toContain('focus-visible:ring-2')
  })

  test('DataGrid tem fallback mobile (mobileOnly/desktopOnly)', () => {
    const src = grid()
    expect(src).toContain('mobileOnly')
    expect(src).toContain('desktopOnly')
    // fallback em Card para viewport estreito (320px)
    expect(src).toContain('<Card')
  })

  test('DataGrid usa overflow local via ScrollableRegion (sem overflow global)', () => {
    const src = grid()
    expect(src).toContain('ScrollableRegion')
    expect(src).toContain("from '@/design-system/page/ScrollableRegion'")
    // o contrato cobre o sticky header
    const contract = read('src/components/organisms/DataGrid.contract.test.tsx')
    expect(contract).toContain('overflow horizontal local')
  })
})

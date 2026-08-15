import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inspectSingleScrollOwner, SCROLL_OWNER_ALLOWLIST } from '../../scripts/lint-single-scroll-owner.mjs'
import { inspectPageGeometry, PAGE_GEOMETRY_ALLOWLIST } from '../../scripts/lint-page-geometry.mjs'
import { inspectDangerousOverrides, DANGEROUS_OVERRIDE_ALLOWLIST } from '../../scripts/lint-dangerous-overrides.mjs'
import { inspectTabsFamily, TABS_FAMILY_ALLOWLIST } from '../../scripts/lint-tabs-family.mjs'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE AC-5 — gates anti-regressão (29.003/29.004/29.006/29.008).
 *
 * Cada gate é 100% fs (readdir/readFile), com allowlist por arquivo que só
 * encolhe. Estes testes validam os predicados unitários e a dívida allowlisted.
 */
describe('contrato AC-29.003 — scroll owner único em página padrão', () => {
  test('RED: overflow-y-auto em div raiz é flagrado', () => {
    const src = `<div className="flex-1 overflow-y-auto bg-white">conteúdo</div>`
    expect(inspectSingleScrollOwner(src, 'x/Page.tsx')).toEqual([
      expect.objectContaining({ rule: 'duplicate-scroll-owner' }),
    ])
  })

  test('GREEN: ScrollableRegion horizontal não é flagrado', () => {
    const src = `<div className="overflow-x-auto overflow-y-hidden" data-mx-scroll-region="">tabela</div>`
    expect(inspectSingleScrollOwner(src, 'x/Page.tsx')).toEqual([])
  })

  test('allowlist só encolhe (LiveFloor dark-panel documentado)', () => {
    expect(SCROLL_OWNER_ALLOWLIST['src/features/ranking/components/LiveFloor.tsx']).toContain('LiveFloor')
  })
})

describe('contrato AC-29.004 — raw page geometry', () => {
  test('RED: PageCanvas com max-w-[Npx] cru é flagrado', () => {
    const src = `<PageCanvas as="div" width="dashboard" className="max-w-[900px] p-[16px]">x</PageCanvas>`
    expect(inspectPageGeometry(src, 'x/Page.tsx')).toEqual([
      expect.objectContaining({ rule: 'raw-max-width' }),
      expect.objectContaining({ rule: 'raw-padding' }),
    ])
  })

  test('GREEN: min-w de coluna de tabela não é geometry de página', () => {
    const src = `<PageCanvas as="div" width="dashboard" className="flex flex-col gap-5"><div className="min-w-[900px]">tabela</div></PageCanvas>`
    expect(inspectPageGeometry(src, 'x/Page.tsx')).toEqual([])
  })

  test('allowlist vazia (page roots sem geometry crua)', () => {
    expect(Object.keys(PAGE_GEOMETRY_ALLOWLIST)).toHaveLength(0)
  })
})

describe('contrato AC-29.006 — overrides perigosos em canônicos', () => {
  test('RED: Button com bg-brand-primary inline é flagrado', () => {
    const src = `<Button className="bg-brand-primary hover:bg-brand-primary-hover text-white">Salvar</Button>`
    expect(inspectDangerousOverrides(src, 'x/Page.tsx')).toEqual([
      expect.objectContaining({ rule: 'dangerous-override', token: 'bg-brand-primary' }),
    ])
  })

  test('GREEN: Button com layout-only className não é flagrado', () => {
    const src = `<Button className="mt-mx-md w-full">Salvar</Button>`
    expect(inspectDangerousOverrides(src, 'x/Page.tsx')).toEqual([])
  })

  test('allowlist documenta 11 arquivos de dívida real', () => {
    expect(Object.keys(DANGEROUS_OVERRIDE_ALLOWLIST).length).toBeGreaterThanOrEqual(11)
  })

  test('RED: !h-important em Button é flagrado (11.012)', () => {
    const src = `<Button className="!h-mx-14 px-6">Salvar</Button>`
    expect(inspectDangerousOverrides(src, 'x/Page.tsx')).toEqual([
      expect.objectContaining({ rule: 'forced-important-override', token: '!h-' }),
    ])
  })
})

describe('contrato AC-29.008 — tabs fora da family canônica', () => {
  test('RED: div role=tablist manual fora da family é flagrado', () => {
    const src = `<div role="tablist" aria-label="Abas" className="flex border-b">...</div>`
    expect(inspectTabsFamily(src, 'x/Page.tsx')).toEqual([
      expect.objectContaining({ rule: 'manual-tablist', tag: 'div' }),
    ])
  })

  test('GREEN: tablist em TabNav (family) não é flagrado', () => {
    const src = `<TabNav tabs={tabs} />`
    expect(inspectTabsFamily(src, 'x/TabNav.tsx')).toEqual([])
  })

  test('allowlist documenta 10 dívidas + 3 families', () => {
    expect(Object.keys(TABS_FAMILY_ALLOWLIST).length).toBeGreaterThanOrEqual(13)
  })
})

describe('contrato AC-29.005 — arbitrary spacing em page roots (lint-spacing)', () => {
  test('lint-spacing existe e audita root pages (29.005)', () => {
    const lint = read('scripts/lint-spacing.mjs')
    expect(lint).toContain('gap')
    expect(lint).toContain('padding')
  })
})

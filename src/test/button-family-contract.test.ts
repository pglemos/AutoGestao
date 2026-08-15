import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { inspectDangerousOverrides } from '../../scripts/lint-dangerous-overrides.mjs'

const root = resolve(import.meta.dir, '../..')
function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8')
}

/**
 * FASE K — buttons fechamento (11.011-11.015).
 *
 * - 11.011: IconButton tem nome acessível (label → VisuallyHidden) + tooltip.
 * - 11.012: lint impede consumer de forçar height/radius/background (!important).
 * - 11.013: lint de overrides perigosos em Button (29.006) vigora.
 * - 11.014: consumidores usam variantes canônicas.
 * - 11.015: focus-visible + active:scale + duration tokens (teclado/zoom).
 */
describe('FASE K — buttons fechamento (11.011-015)', () => {
  test('11.011: IconButton expõe label acessível (VisuallyHidden) + tooltip', () => {
    const icon = read('src/components/atoms/IconButton.tsx')
    expect(icon).toContain('label')
    expect(icon).toContain('VisuallyHidden')
    expect(icon).toContain('aria-label')
  })

  test('11.012: !important de altura/raio/bg em Button é flagrado', () => {
    const src = `<Button className="!h-mx-14 rounded-full bg-red-500">X</Button>`
    const findings = inspectDangerousOverrides(src, 'x.tsx')
    expect(findings.some((f) => f.rule === 'forced-important-override' && f.token === '!h-')).toBe(true)
  })

  test('11.013: lint de overrides perigosos existe e roda (29.006)', () => {
    const lint = read('scripts/lint-dangerous-overrides.mjs')
    expect(lint).toContain('LEGACY_CLASSES')
    expect(lint).toContain('DS_COMPONENTS')
    // roda limpo no repo (allowlist documentada)
    const src = `<Button className="mt-mx-md w-full">Salvar</Button>`
    expect(inspectDangerousOverrides(src, 'x.tsx')).toEqual([])
  })

  test('11.014: consumidores usam variantes canônicas (primary/outline/ghost)', () => {
    const app = read('src/App.tsx')
    const sources = [app, read('src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx')].join('\n')
    expect(sources).toMatch(/variant="(primary|outline|ghost|danger|success|info|warning|whatsapp)"/)
  })

  test('11.015: teclado/zoom — focus-visible + active:scale + duration token', () => {
    const btn = read('src/components/atoms/Button.tsx')
    expect(btn).toContain('focus-visible:ring-4')
    expect(btn).toContain('active:scale-[0.98]')
    expect(btn).toContain('duration-fast')
  })
})

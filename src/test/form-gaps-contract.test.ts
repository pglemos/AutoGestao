import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * FASE L — 12.014/12.015/12.016
 *
 * A escala de gaps de formulário é canônica: `--mx-gap-inline` (2),
 * `--mx-gap-control` (3), `--mx-gap-form` (4), `--mx-gap-section` (6),
 * `--mx-gap-section-large` (8), `--mx-gap-page-region` (12). Os wrappers de
 * campo e as composições de formulário devem consumir esses tokens — nunca
 * `gap-2`/`space-y-4` cru nem valores arbitrários.
 *
 * 12.014: campo = label → controle → helper com `--mx-gap-form`.
 * 12.015: seções do formulário com `--mx-gap-section`/`-large`.
 * 12.016: inline fields (linha) vs stacked (coluna) via variantes MD3.
 */
const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

const FIELD_WRAPPERS = [
  'src/components/molecules/Field.tsx',
  'src/components/molecules/FormField.tsx',
  'src/components/module/MxModuleVisualPrimitives.tsx',
]

describe('FASE L — gaps de formulário', () => {
  test('tokens de gap de form existem na escala canônica', () => {
    const semantic = read('src/design-system/tokens/semantic.css')
    for (const token of [
      '--mx-gap-inline',
      '--mx-gap-control',
      '--mx-gap-form',
      '--mx-gap-section',
      '--mx-gap-section-large',
      '--mx-gap-page-region',
    ]) {
      expect(semantic, `${token} ausente`).toContain(token)
    }
  })

  test('wrappers de campo consomem --mx-gap-form entre label/control/helper', () => {
    const field = read('src/components/molecules/Field.tsx')
    expect(field).toContain('--mx-gap-form')
    expect(field).not.toContain('space-y-mx-xs')
    const mxField = read('src/components/module/MxModuleVisualPrimitives.tsx')
    // O MxField usa o token de gap; o regex é limitado à linha do label.
    expect(mxField).toMatch(/flex min-w-0 flex-col gap-\[var\(--mx-gap-form\)\]/)
    expect(mxField).not.toMatch(/<label className=\{cn\('flex min-w-0 flex-col gap-2/)
  })

  test('composições de form usam --mx-gap-section, não espaço cru', () => {
    // O MxModulePage (primitivo de composição canônico) agrupa seções com o token.
    const module = read('src/components/module/MxModuleVisualPrimitives.tsx')
    expect(module).toContain('space-y-[var(--mx-gap-section)]')
  })
})

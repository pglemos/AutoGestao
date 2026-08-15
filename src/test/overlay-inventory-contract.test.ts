import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { scanSourceFiles } from './lib/scanSourceFiles'

/**
 * FASE O — 15.001 / 15.021
 *
 * Inventário de overlays: três primitives canônicos existem (`ui/dialog`,
 * `ui/alert-dialog`, `organisms/Modal` adapter) e apenas eles usam Radix
 * direto. 15.021: os consumidores NÃO podem redefinir geometria de overlay
 * (width/padding/radius/close) via className — a geometria vive nos tokens
 * `--mx-overlay-*`; salvo variant API explícita.
 *
 * C8: varredura 100% fs — `rg` aqui retornaria vazio sob bun test.
 */
const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

/** Arquivos de runtime que contêm a substring. */
function runtimeFilesWith(substring: string | RegExp): string[] {
  const files: string[] = []
  for (const { rel, lines } of scanSourceFiles({
    extraExcluded: ['**/base44-reference/**', '**/*.test.*', '**/*.spec.*'],
  })) {
    const re = typeof substring === 'string' ? new RegExp(substring) : substring
    if (lines.some((line) => re.test(line))) files.push(rel)
  }
  return files.sort()
}

describe('FASE O — inventário e anti-pattern de overlays', () => {
  test('apenas os primitives canônicos usam Radix direto (sem engine duplicado)', () => {
    const allowed = [
      'src/components/ui/dialog.jsx',
      'src/components/ui/alert-dialog.jsx',
      'src/components/organisms/Modal.tsx',
      'src/components/ui/sheet.jsx',
    ]
    const direct = runtimeFilesWith('@radix-ui/react-dialog')
    const outliers = direct.filter((f) => !allowed.includes(f))
    // 15.020: WizardPDI (→ DialogContent) e FichaClienteSheet (→ Sheet) migrados.
    expect(outliers).toEqual([])
  })

  test('consumidores não redefinem geometria de overlay por className', () => {
    const contentConsumers = runtimeFilesWith('DialogContent').filter((f) => f !== 'src/components/ui/dialog.jsx')

    const violating: string[] = []
    for (const file of contentConsumers) {
      const source = read(file)
      // Exceção documentada: StoreFeedbackModal é um bottom-sheet mobile legítimo
      // (geometria de apresentação, não tamanho) — migra para ui/sheet na 15.020.
      if (file.includes('StoreFeedbackModal')) continue
      // className passado ao DialogContent redefinindo geometria crua. Tokens
      // canônicos (`var(--mx-*)`) são permitidos — a proibição é só do cru.
      if (/<DialogContent[\s\S]{0,400}(max-w-\[(?!var\(--mx-)|w-\[(?!var\(--mx-)|p-\[(?!var\(--mx-)|rounded-\[)/.test(source)) {
        violating.push(file)
      }
    }
    expect(violating).toEqual([])
  })
})

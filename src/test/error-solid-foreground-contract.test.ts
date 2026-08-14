import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

/**
 * FASE V — texto sobre o PREENCHIMENTO SÓLIDO de danger.
 *
 * O fill `--color-status-error` (#ef4343) é claro demais para carregar texto
 * branco em 12px (3.78:1, reprova AA). O produto resolve isso com um foreground
 * semântico escuro para superfícies SÓLIDAS (`--color-status-error-foreground`,
 * derivado de `--mx-color-danger-foreground`), mantendo `-error-text` para
 * texto sobre superfície clara.
 *
 * Este contrato trava a classe inteira no runtime: nenhum par
 * `bg-status-error` sólido + `text-white` pode existir fora de exceções
 * documentadas. É o complemento do par de contraste de
 * `semantic-contrast-matrix-contract.test.ts`.
 *
 * Revisado em 2026-08-14 (coorte FASE V, single-writer). A varredura de runtime
 * é feita com readdir/readFile (Bun/Node), sem child_process: o preload
 * happy-dom do bun test intercepta o spawn e o resultado varia por contexto.
 */
const root = resolve(import.meta.dir, '..', '..')

async function scanRuntimeSources(dir: string): Promise<string[]> {
  const sources: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'base44-reference') continue
      sources.push(...await scanRuntimeSources(path))
      continue
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) continue
    if (/\.(test|spec)\.|\.playwright\./.test(entry.name)) continue
    sources.push(path)
  }
  return sources
}

describe('FASE V foreground sobre fill sólido de erro', () => {
  test('semantic.css mapeia --mx-color-danger-foreground para o ink escuro, não branco', () => {
    const semantic = readFileSync(resolve(root, 'src/design-system/tokens/semantic.css'), 'utf8')
    expect(semantic).toMatch(/--mx-color-danger-foreground:\s*var\(--mx-neutral-950\)/)
  })

  test('index.css expõe --color-status-error-foreground derivado do foreground semântico', () => {
    const indexCss = readFileSync(resolve(root, 'src/index.css'), 'utf8')
    expect(indexCss).toMatch(/--color-status-error-foreground:\s*hsl\(var\(--mx-color-danger-foreground\)\)/)
  })

  test('runtime não combina bg-status-error sólido com text-white fora de exceções', async () => {
    const sources = await scanRuntimeSources(resolve(root, 'src'))
    const offenders: Array<{ file: string; snippet: string }> = []
    for (const file of sources) {
      const content = await readFile(file, 'utf8')
      for (const line of content.split('\n')) {
        if (/bg-status-error[^"'\`]*text-white|text-white[^"'\`]*bg-status-error/.test(line)) {
          offenders.push({ file: relative(root, file), snippet: line.trim() })
        }
      }
    }
    expect(offenders).toEqual([])
  })
})

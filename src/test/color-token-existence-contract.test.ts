import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { scanSourceFiles } from './lib/scanSourceFiles'

/**
 * Token de cor fantasma — guard de CLASSE.
 *
 * `--color-pure-white` nunca foi declarado. As 11 telas que usavam
 * `text-pure-white` e os dois gráficos com `fill: var(--color-pure-white)`
 * renderizavam a cor herdada — preto. Texto preto sobre o verde da marca
 * (4.31:1) e pontos pretos onde deviam ser brancos, sem nenhum erro em lugar
 * nenhum: CSS resolve variável ausente em silêncio.
 *
 * Este contrato exige que todo `var(--color-*)` referenciado pelo runtime
 * tenha declaração. É barato e pega a família inteira de uma vez.
 */
const root = path.resolve(import.meta.dir, '../..')

function declaredColorTokens(): Set<string> {
  const files = ['src/index.css', 'src/design-system/tokens/semantic.css', 'src/design-system/tokens/primitives.css', 'src/design-system/tokens/components.css']
  const declared = new Set<string>()
  for (const file of files) {
    const source = readFileSync(path.join(root, file), 'utf8')
    for (const match of source.matchAll(/(--color-[a-z0-9-]+)\s*:/g)) declared.add(match[1])
  }
  return declared
}

function referencedColorTokens(): Map<string, string> {
  // C8: varredura 100% fs — um `git grep -o` aqui retornaria vazio sob bun test
  // (stdout de subprocesso engolido), fazendo o guard passar vacuamente.
  const referenced = new Map<string, string>()
  for (const { rel, lines } of scanSourceFiles({
    extraExcluded: ['**/base44-reference/**', '**/*.test.*'],
  })) {
    lines.forEach((line, idx) => {
      for (const match of line.matchAll(/var\((--color-[a-z0-9-]+)\)/g)) {
        const token = match[1]
        if (!referenced.has(token)) referenced.set(token, `${rel}:${idx + 1}`)
      }
    })
  }
  return referenced
}

describe('tokens de cor referenciados existem', () => {
  test('nenhum var(--color-*) do runtime aponta para token inexistente', () => {
    const declared = declaredColorTokens()
    const orphans = [...referencedColorTokens().entries()]
      .filter(([token]) => !declared.has(token))
      .map(([token, where]) => `${token} (${where})`)

    expect(orphans).toEqual([])
  })

  test('o par branco/preto está declarado', () => {
    const declared = declaredColorTokens()
    expect(declared.has('--color-pure-white')).toBe(true)
    expect(declared.has('--color-pure-black')).toBe(true)
  })
})

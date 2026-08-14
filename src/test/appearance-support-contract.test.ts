import { describe, expect, test } from 'bun:test'

import { scanSourceFiles } from './lib/scanSourceFiles'

/**
 * FASE G — 07.013
 *
 * O produto NÃO tem tema escuro: nenhum arquivo de token declara um escopo
 * `.dark`, então marcar `documentElement.classList.add('dark')` não muda cor
 * nenhuma. Este contrato fixa esse fato em vez de inventar um tema novo.
 *
 * Se algum dia o dark for construído de verdade, este teste falha e obriga a
 * decisão a passar pela camada de tokens (e não por `dark:` avulso em telas).
 *
 * C8: varredura 100% fs via `scanSourceFiles` — um `git grep` aqui retornaria
 * vazio sob bun test (stdout engolido), fazendo o teste 2 falhar falso-RED e o
 * teste 1 passar vacuamente.
 */
function filesWith(pattern: RegExp, roots: string[]): string[] {
  const matches: string[] = []
  for (const { rel, lines } of scanSourceFiles({ roots })) {
    if (lines.some((line) => pattern.test(line))) matches.push(rel)
  }
  return matches.sort()
}

describe('07.013 suporte a aparência', () => {
  test('nenhuma camada de token declara escopo .dark', () => {
    expect(filesWith(/^\s*\.dark[\s,{]/, ['src/index.css', 'src/design-system', 'src/styles'])).toEqual([])
  })

  test('a densidade, essa sim, é suportada por data-attribute', () => {
    expect(filesWith(/data-mx-density|dataset\.mxDensity/, ['src']).length).toBeGreaterThan(0)
  })
})

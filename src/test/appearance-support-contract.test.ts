import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

/**
 * FASE G — 07.013
 *
 * O produto NÃO tem tema escuro: nenhum arquivo de token declara um escopo
 * `.dark`, então marcar `documentElement.classList.add('dark')` não muda cor
 * nenhuma. Este contrato fixa esse fato em vez de inventar um tema novo.
 *
 * Se algum dia o dark for construído de verdade, este teste falha e obriga a
 * decisão a passar pela camada de tokens (e não por `dark:` avulso em telas).
 */
function gitGrep(pattern: string, paths: string[]): string[] {
  try {
    return execFileSync('git', ['grep', '--untracked', '-n', '-E', pattern, '--', ...paths], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean)
  } catch (error) {
    if ((error as { status?: number }).status === 1) return []
    throw error
  }
}

describe('07.013 suporte a aparência', () => {
  test('nenhuma camada de token declara escopo .dark', () => {
    expect(gitGrep(String.raw`^\s*\.dark[\s,{]`, ['src/index.css', 'src/design-system', 'src/styles'])).toEqual([])
  })

  test('a densidade, essa sim, é suportada por data-attribute', () => {
    expect(gitGrep('data-mx-density|dataset.mxDensity', ['src']).length).toBeGreaterThan(0)
  })
})

import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

/**
 * FASE G — 07.009
 *
 * Nenhum arquivo de runtime pode declarar raio arbitrário em pixel
 * (`rounded-[12px]`). Todo raio precisa vir da escala canônica
 * (`rounded-mx-*` / `rounded-*` mapeados no @theme) ou de um token de
 * componente (`rounded-[var(--mx-*-radius)]`).
 *
 * Exceções: `src/base44-reference/**` (congelado para paridade visual) e
 * arquivos de teste/spec/story.
 */
const EXCLUDED = [
  ':!src/base44-reference/**',
  ':!src/**/*.test.*',
  ':!src/**/*.spec.*',
  ':!src/**/*.stories.*',
]

function grepArbitraryPixelRadius(): string[] {
  try {
    const output = execFileSync(
      'git',
      ['grep', '-n', '-E', String.raw`rounded(-[a-z]+)?-\[[0-9]+px\]`, '--', 'src', ...EXCLUDED],
      { encoding: 'utf8' },
    )
    return output.trim().split('\n').filter(Boolean)
  } catch (error) {
    // git grep sai com 1 quando não há match — esse é o estado desejado.
    const status = (error as { status?: number }).status
    if (status === 1) return []
    throw error
  }
}

describe('07.009 radius arbitrário em pixel', () => {
  test('runtime não usa rounded-[Npx]', () => {
    expect(grepArbitraryPixelRadius()).toEqual([])
  })
})

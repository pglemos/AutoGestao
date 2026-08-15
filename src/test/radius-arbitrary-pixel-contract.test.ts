import { describe, expect, test } from 'bun:test'

import { scanSourceFiles } from './lib/scanSourceFiles'

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
  '**/base44-reference/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/*.stories.*',
]

function grepArbitraryPixelRadius(): string[] {
  // C8: varredura 100% fs — um `git grep` aqui retornaria vazio sob bun test
  // (stdout de subprocesso engolido), fazendo o guard passar vacuamente.
  const hits: string[] = []
  for (const { rel, lines } of scanSourceFiles({ extraExcluded: EXCLUDED })) {
    lines.forEach((line, idx) => {
      if (/rounded(-[a-z]+)?-\[[0-9]+px\]/.test(line)) hits.push(`${rel}:${idx + 1}:${line.trim()}`)
    })
  }
  return hits
}

describe('07.009 radius arbitrário em pixel', () => {
  test('runtime não usa rounded-[Npx]', () => {
    expect(grepArbitraryPixelRadius()).toEqual([])
  })
})

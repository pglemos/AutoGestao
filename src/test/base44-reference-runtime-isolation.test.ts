import { describe, expect, test } from 'bun:test'

import { scanSourceFiles } from './lib/scanSourceFiles'

/**
 * `src/base44-reference/**` é REFERÊNCIA congelada: serve para comparar
 * comportamento e aparência, não para ser executada em produção. Quando uma
 * rota monta o protótipo direto, dois problemas aparecem juntos — correções do
 * Foundation Zero passam a ser feitas dentro do congelado (destruindo a
 * referência), e defeitos do protótipo viram defeitos de produção.
 *
 * Este guard proíbe import de runtime. A allowlist existe só para o que ainda
 * não foi portado, e cada linha é dívida declarada — não um padrão aceito.
 *
 * C8: a varredura é 100% fs (readdir/readFile) via `scanSourceFiles` — nenhum
 * subprocesso, então o bun test 1.3.5 (que engole o stdout de subprocessos sob
 * o project root) não afeta este contrato. Um `git grep` aqui retornaria vazio
 * e a allowlist pareceria morta (falso RED).
 */
const ALLOWLIST = new Map([
  [
    'src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx',
    '/carteira-clientes ainda monta o protótipo. Port pendente.',
  ],
])

const IMPORT_RE = /(?:from|import)\s*\(?\s*['"](@\/base44-reference|\.\.\/base44-reference)/

function runtimeImports(): string[] {
  const hits: string[] = []
  for (const { rel, lines } of scanSourceFiles({
    extraExcluded: [
      'src/base44-reference/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.stories.*',
    ],
  })) {
    lines.forEach((line, idx) => {
      if (IMPORT_RE.test(line)) hits.push(`${rel}:${idx + 1}:${line.trim()}`)
    })
  }
  return hits
}

describe('isolamento do base44-reference', () => {
  test('nenhum arquivo de runtime importa a referência congelada fora da allowlist', () => {
    const offenders = runtimeImports()
      .map(hit => hit.slice(0, hit.indexOf(':')))
      .filter(file => !ALLOWLIST.has(file))

    expect([...new Set(offenders)]).toEqual([])
  })

  test('a allowlist não guarda entrada morta', () => {
    const importing = new Set(runtimeImports().map(hit => hit.slice(0, hit.indexOf(':'))))
    const stale = [...ALLOWLIST.keys()].filter(file => !importing.has(file))

    // Entrada que já não importa nada precisa sair da allowlist junto com o
    // port, senão a dívida some do radar sem ter sido paga.
    expect(stale).toEqual([])
  })
})

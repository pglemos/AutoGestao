import { describe, expect, test } from 'bun:test'
import { execFileSync } from 'node:child_process'

/**
 * `src/base44-reference/**` é REFERÊNCIA congelada: serve para comparar
 * comportamento e aparência, não para ser executada em produção. Quando uma
 * rota monta o protótipo direto, dois problemas aparecem juntos — correções do
 * Foundation Zero passam a ser feitas dentro do congelado (destruindo a
 * referência), e defeitos do protótipo viram defeitos de produção.
 *
 * Este guard proíbe import de runtime. A allowlist existe só para o que ainda
 * não foi portado, e cada linha é dívida declarada — não um padrão aceito.
 */
const ALLOWLIST = new Map([
  [
    'src/pages/VendedorDesenvolvimento.tsx',
    'Rotas /desenvolvimento e /devolutivas (vendedor) ainda montam o protótipo. Port para implementação própria pendente.',
  ],
  [
    'src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx',
    '/carteira-clientes ainda monta o protótipo. Port pendente.',
  ],
])

function runtimeImports(): string[] {
  try {
    const output = execFileSync(
      'git',
      [
        'grep',
        '--untracked',
        '-n',
        '-E',
        // POSIX ERE: `git grep -E` não conhece `\s`.
        String.raw`(from|import)[[:space:]]*\(?[[:space:]]*['"](@/base44-reference|\.\./base44-reference)`,
        '--',
        'src',
        ':!src/base44-reference/**',
        ':!src/**/*.test.*',
        ':!src/**/*.spec.*',
        ':!src/**/*.stories.*',
      ],
      { encoding: 'utf8' },
    )
    return output.trim().split('\n').filter(Boolean)
  } catch (error) {
    if ((error as { status?: number }).status === 1) return []
    throw error
  }
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

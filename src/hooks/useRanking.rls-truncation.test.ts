import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * Sob RLS, um vendedor lê 4 linhas de `vendedores_loja` mas apenas 1 de
 * `vinculos_loja` — a própria. Verificado em produção na MX CONSULTORIA:
 * VENDEDOR vê vendedores_loja=4 / vinculos_loja=1; GERENTE vê 4 / 4.
 *
 * Como o cruzamento das duas listas era feito no cliente, a equipe colapsava
 * para uma pessoa. E a posição exibida em `VendedorHome` é o índice do array
 * (`findIndex(...) + 1`), então TODO vendedor via "#1 posição na loja",
 * independentemente do resultado — inclusive com 0 vendas enquanto um colega
 * tinha 1. O gerente via o ranking correto, o que escondeu o defeito.
 *
 * A regra de elegibilidade não mudou: `vendedor_performance_oficial` é
 * SECURITY DEFINER e exige o mesmo par (vendedores_loja + vinculos_loja com
 * role 'vendedor' ativa). Só a fonte da confirmação mudou, para uma que a RLS
 * não trunca.
 */
const source = readFileSync(new URL('./useRanking.ts', import.meta.url), 'utf8')

describe('ranking não colapsa sob RLS do vendedor', () => {
  test('a elegibilidade vem das linhas da RPC, não do join no cliente', () => {
    expect(source).toContain('const officialSellerIds = new Set(officialRows.map((row) => row.seller_user_id))')
    expect(source).toContain('activeMembershipIds = officialSellerIds.size > 0')
  })

  test('o cruzamento com vendedores_loja continua existindo', () => {
    // A elegibilidade segue exigindo vínculo operacional ativo; o que mudou é
    // de onde vem a confirmação da membership.
    expect(source).toContain('activeMembershipIds.has(item.seller_user_id)')
    expect(source).toContain("item.users?.active === true")
  })

  test('há fallback quando a RPC não devolve linha alguma', () => {
    expect(source).toContain('membershipIdsVisiveis')
  })

  test('o motivo fica registrado no arquivo', () => {
    expect(source).toContain('limitada por RLS')
    expect(source).toContain('SECURITY DEFINER')
  })
})

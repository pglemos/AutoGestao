import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { isSamePerson, personNameKey } from '../../supabase/functions/_shared/person-name'

const edgeFunction = readFileSync(
  new URL('../../supabase/functions/register-user/index.ts', import.meta.url),
  'utf8',
)

describe('detecção de cadastro duplicado da mesma pessoa', () => {
  test('pega as duplicatas reais encontradas em produção', () => {
    // TREND AUTO: dois logins, vendas do mesmo vendedor divididas entre eles.
    expect(isSamePerson('GUSTAVO OLIVEIRA', 'GUSTAVO OLIVEIRA GOMES')).toBe(true)
    // AG AUTOMÓVEIS e PROMAC JPA: nome idêntico, e-mails diferentes.
    expect(isSamePerson('ANDERSON DE SOUSA TUPY', 'Anderson de Sousa Tupy')).toBe(true)
    expect(isSamePerson('EDIER ARRUDA DE SOUZA', 'edier arruda de souza')).toBe(true)
  })

  test('ignora acento, caixa e espaço extra', () => {
    expect(isSamePerson('José Álvaro', 'JOSE  ALVARO')).toBe(true)
    expect(personNameKey('  maria   das   dores  ')).toBe('MARIA DAS')
  })

  test('não confunde pessoas diferentes', () => {
    expect(isSamePerson('GUSTAVO OLIVEIRA', 'GUSTAVO PEREIRA')).toBe(false)
    expect(isSamePerson('ANA SOUZA', 'BRUNO SOUZA')).toBe(false)
  })

  test('nome vazio nunca casa com ninguém', () => {
    expect(isSamePerson('', '')).toBe(false)
    expect(isSamePerson('   ', 'GUSTAVO OLIVEIRA')).toBe(false)
  })
})

describe('contrato da edge function register-user', () => {
  test('a checagem roda antes de criar o usuário na autenticação', () => {
    const checagem = edgeFunction.indexOf('NAME_EXISTS_IN_STORE')
    const criacao = edgeFunction.indexOf('auth.admin.createUser')
    expect(checagem).toBeGreaterThan(-1)
    expect(criacao).toBeGreaterThan(checagem)
  })

  test('o aviso pode ser confirmado para homônimo legítimo', () => {
    expect(edgeFunction).toContain('confirm_duplicate_name: z.boolean().optional()')
    expect(edgeFunction).toContain('!payload.confirm_duplicate_name')
  })

  test('só compara dentro da loja de destino e entre cadastros ativos', () => {
    expect(edgeFunction).toContain(".eq('store_id', payload.store_id)")
    expect(edgeFunction).toContain(".eq('is_active', true)")
    expect(edgeFunction).toContain('.filter(member => member?.active)')
  })
})

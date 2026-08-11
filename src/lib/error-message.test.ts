import { describe, expect, test } from 'bun:test'

import { getErrorMessage } from './error-message'

describe('getErrorMessage', () => {
  test('preserva a mensagem de objetos de erro do PostgREST', () => {
    expect(
      getErrorMessage(
        {
          code: '22P02',
          details: null,
          hint: null,
          message: 'invalid input syntax for type uuid',
        },
        'Falha desconhecida',
      ),
    ).toBe('invalid input syntax for type uuid')
  })

  test('lê uma mensagem de negócio aninhada sem converter o objeto em texto', () => {
    expect(
      getErrorMessage(
        { error: { message: 'Solicitação não encontrada.' } },
        'Falha desconhecida',
      ),
    ).toBe('Solicitação não encontrada.')
  })

  test('usa o fallback para valores sem mensagem legível', () => {
    expect(getErrorMessage({ code: 'UNKNOWN' }, 'Falha desconhecida')).toBe('Falha desconhecida')
  })
})

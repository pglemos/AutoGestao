import { describe, expect, test } from 'bun:test'

import { getSafeUserFacingDataError } from './user-facing-error'

describe('getSafeUserFacingDataError', () => {
  test('traduz permissão negada mesmo quando o erro foi encapsulado em Error', () => {
    expect(getSafeUserFacingDataError(
      new Error('permission denied for function get_internal_mx_network_cockpit'),
      'Falha',
    )).toContain('não tem permissão')
  })

  test('traduz código PostgREST de permissão', () => {
    expect(getSafeUserFacingDataError({ code: '42501', message: 'permission denied' }, 'Falha'))
      .toContain('Confirme seu papel interno MX')
  })

  test('mantém fallback para falhas sem classificação segura', () => {
    expect(getSafeUserFacingDataError(new Error('timeout'), 'Falha ao atualizar')).toBe('Falha ao atualizar')
  })
})

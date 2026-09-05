import { describe, expect, test } from 'bun:test'
import { mapPersonProfilesToOperationalRole } from './personMutations'

describe('mapPersonProfilesToOperationalRole', () => {
  test('mapeia DONO para dono', () => {
    expect(mapPersonProfilesToOperationalRole(['DONO'])).toBe('dono')
    expect(mapPersonProfilesToOperationalRole(['DONO', 'GERENTE_COMERCIAL'])).toBe('dono')
  })

  test('mapeia GERENTE_COMERCIAL para gerente', () => {
    expect(mapPersonProfilesToOperationalRole(['GERENTE_COMERCIAL'])).toBe('gerente')
    expect(mapPersonProfilesToOperationalRole(['GERENTE_COMERCIAL', 'VENDEDOR'])).toBe('gerente')
  })

  test('mapeia DIRETOR para gerente', () => {
    expect(mapPersonProfilesToOperationalRole(['DIRETOR'])).toBe('gerente')
  })

  test('mapeia VENDEDOR para vendedor quando exclusivo', () => {
    expect(mapPersonProfilesToOperationalRole(['VENDEDOR'])).toBe('vendedor')
  })

  test('mapeia papéis departamentais para gerente operacional', () => {
    expect(mapPersonProfilesToOperationalRole(['MARKETING'])).toBe('gerente')
    expect(mapPersonProfilesToOperationalRole(['FINANCEIRO_ADMINISTRATIVO'])).toBe('gerente')
    expect(mapPersonProfilesToOperationalRole(['RH'])).toBe('gerente')
    expect(mapPersonProfilesToOperationalRole(['OPERACOES'])).toBe('gerente')
  })

  test('fallback para vendedor quando lista vazia', () => {
    expect(mapPersonProfilesToOperationalRole([])).toBe('vendedor')
  })
})

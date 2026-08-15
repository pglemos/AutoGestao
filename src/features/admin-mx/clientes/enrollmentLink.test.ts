import { describe, expect, test } from 'bun:test'
import {
  buildEnrollmentUrl,
  emptyEnrollmentLinkDraft,
  enrollmentLinkRemainingUses,
  generateEnrollmentToken,
  resolveEnrollmentLinkStatus,
  validateEnrollmentLinkDraft,
} from './enrollmentLink'

describe('link de autocadastro — lógica pura', () => {
  test('valida perfil, validade e limite', () => {
    const draft = emptyEnrollmentLinkDraft()
    expect(validateEnrollmentLinkDraft(draft)).toBeNull()
    expect(validateEnrollmentLinkDraft({ ...draft, validade_dias: 0 })).toContain('Validade')
    expect(validateEnrollmentLinkDraft({ ...draft, limite_usos: 0 })).toContain('Limite')
    expect(validateEnrollmentLinkDraft({ ...draft, perfil_acesso: 'X' as never })).toContain('perfil')
  })

  test('gera token com tamanho estável', () => {
    const token = generateEnrollmentToken()
    expect(token.length).toBeGreaterThanOrEqual(8)
  })

  test('monta URL pública com slug e token', () => {
    const url = buildEnrollmentUrl('https://mxperformance.com.br/', 'cliente-alfa', 'abc123xyz')
    expect(url).toBe('https://mxperformance.com.br/cadastro/cliente-alfa/abc123xyz')
  })

  test('resolve expirado, limite atingido e cancelado', () => {
    const now = new Date('2026-08-15T12:00:00Z')
    expect(resolveEnrollmentLinkStatus({ createdAt: '2026-08-01T12:00:00Z', validadeDias: 7, limiteUsos: 10, usosConsumidos: 0, status: 'ativo', now })).toBe('expirado')
    expect(resolveEnrollmentLinkStatus({ createdAt: '2026-08-10T12:00:00Z', validadeDias: 7, limiteUsos: 3, usosConsumidos: 3, status: 'ativo', now })).toBe('limite_atingido')
    expect(resolveEnrollmentLinkStatus({ createdAt: '2026-08-10T12:00:00Z', validadeDias: 7, limiteUsos: 10, usosConsumidos: 0, status: 'cancelado', now })).toBe('cancelado')
  })

  test('remaining uses zera fora do ativo', () => {
    const now = new Date('2026-08-15T12:00:00Z')
    expect(enrollmentLinkRemainingUses({ createdAt: '2026-08-10T12:00:00Z', validadeDias: 7, limiteUsos: 10, usosConsumidos: 2, now })).toBe(8)
    expect(enrollmentLinkRemainingUses({ createdAt: '2026-08-01T12:00:00Z', validadeDias: 7, limiteUsos: 10, usosConsumidos: 2, now })).toBe(0)
  })
})

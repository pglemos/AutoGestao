import { describe, expect, test } from 'bun:test'
import { emptyMemberCreate, requiresConsultantProfile, validateMemberCreate, type MemberCreateDraft } from './memberCreate'

function draft(overrides: Partial<MemberCreateDraft> = {}): MemberCreateDraft {
  return { ...emptyMemberCreate(), name: 'Ana Souza', email: 'ana@mx.com.br', ...overrides }
}

describe('criação de membro da equipe MX', () => {
  test('aceita cadastro completo', () => {
    expect(validateMemberCreate(draft())).toEqual([])
  })

  test('cobra nome, e-mail válido e papéis/situação conhecidos', () => {
    const errors = validateMemberCreate(draft({ name: '  ', email: 'ana@mx', role: 'vendedor', situation: 'desligado' }))
    expect(errors).toContain('Nome é obrigatório.')
    expect(errors).toContain('E-mail inválido.')
    expect(errors).toContain('Selecione um papel interno MX válido.')
    expect(errors).toContain('Selecione uma situação válida.')
  })

  test('e-mail vazio vira mensagem de obrigatório', () => {
    const errors = validateMemberCreate(draft({ email: '' }))
    expect(errors).toContain('E-mail é obrigatório.')
  })

  test('aceita os três papéis internos MX', () => {
    for (const role of ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const) {
      expect(validateMemberCreate(draft({ role }))).toEqual([])
    }
  })

  test('consultor_mx exige perfil; admins não', () => {
    expect(requiresConsultantProfile('consultor_mx')).toBe(true)
    expect(requiresConsultantProfile('administrador_mx')).toBe(false)
    expect(requiresConsultantProfile('administrador_geral')).toBe(false)
  })
})

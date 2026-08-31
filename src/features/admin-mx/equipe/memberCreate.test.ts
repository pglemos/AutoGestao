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

  test('aceita papéis Base44 mapeados para auth canônica', () => {
    for (const role of ['consultor_mx', 'consultor_especialista', 'administrador_principal', 'suporte_mx'] as const) {
      expect(validateMemberCreate(draft({ role }))).toEqual([])
    }
  })

  test('consultores e coordenadores exigem perfil; admins não', () => {
    expect(requiresConsultantProfile('consultor_mx')).toBe(true)
    expect(requiresConsultantProfile('consultor_especialista')).toBe(true)
    expect(requiresConsultantProfile('coordenador_consultoria')).toBe(true)
    expect(requiresConsultantProfile('administrador_implantacao')).toBe(false)
    expect(requiresConsultantProfile('administrador_principal')).toBe(false)
  })
})

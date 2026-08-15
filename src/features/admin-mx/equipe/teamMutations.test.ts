import { describe, expect, test } from 'bun:test'
import { planAssignmentSync, validateTeamMemberDraft, type TeamMemberDraft } from './teamMutations'

function draft(overrides: Partial<TeamMemberDraft> = {}): TeamMemberDraft {
  return { id: 'user-1', name: 'Ana Souza', email: 'ana@mx.com.br', phone: '', role: 'consultor_mx', active: true, ...overrides }
}

describe('edição de membro da equipe MX', () => {
  test('aceita cadastro completo', () => {
    expect(validateTeamMemberDraft(draft())).toEqual([])
  })

  test('cobra nome e e-mail válido', () => {
    expect(validateTeamMemberDraft(draft({ name: '  ' }))).toContain('Informe o nome.')
    expect(validateTeamMemberDraft(draft({ email: '' }))).toContain('Informe o e-mail.')
    expect(validateTeamMemberDraft(draft({ email: 'ana@mx' }))).toContain('E-mail inválido.')
  })

  test('recusa papel fora do conjunto interno MX', () => {
    expect(validateTeamMemberDraft(draft({ role: 'vendedor' }))).toContain('Selecione um papel interno MX válido.')
  })
})

describe('sincronização da carteira do consultor', () => {
  test('cria o que falta, reativa o inativo e desativa o que saiu', () => {
    const current = [
      { id: 'a1', client_id: 'cliente-1', active: true },
      { id: 'a2', client_id: 'cliente-2', active: false },
      { id: 'a3', client_id: 'cliente-3', active: true },
    ]
    const plan = planAssignmentSync(current, ['cliente-1', 'cliente-2', 'cliente-4'])
    expect(plan.reactivate).toEqual(['a2'])
    expect(plan.deactivate).toEqual(['a3'])
    expect(plan.create).toEqual(['cliente-4'])
  })

  test('carteira vazia desativa tudo sem criar nada', () => {
    const plan = planAssignmentSync([{ id: 'a1', client_id: 'cliente-1', active: true }], [])
    expect(plan.deactivate).toEqual(['a1'])
    expect(plan.create).toEqual([])
    expect(plan.reactivate).toEqual([])
  })

  test('nada muda quando a carteira já está sincronizada', () => {
    const plan = planAssignmentSync([{ id: 'a1', client_id: 'cliente-1', active: true }], ['cliente-1'])
    expect(plan).toEqual({ reactivate: [], deactivate: [], create: [] })
  })
})

import { describe, expect, test } from 'bun:test'
import { emptyPersonAccessDraft, personToAccessDraft, resolveOwnerMaster, validatePersonAccessDraft } from './personAccess'

describe('pessoas e acessos — lógica pura', () => {
  test('valida nome, e-mail e ao menos um perfil', () => {
    const draft = emptyPersonAccessDraft()
    expect(validatePersonAccessDraft(draft)).toContain('Informe o nome.')
    draft.nome = 'Ana'
    draft.email = 'ana@'
    expect(validatePersonAccessDraft(draft)).toContain('E-mail inválido.')
    draft.email = 'ana@alfa.com'
    expect(validatePersonAccessDraft(draft)).toContain('Selecione ao menos um perfil de acesso.')
    draft.papeis = ['DONO']
    expect(validatePersonAccessDraft(draft)).toEqual([])
  })

  test('Dono Master exige o perfil Dono', () => {
    const draft = emptyPersonAccessDraft()
    draft.nome = 'Ana'
    draft.email = 'ana@alfa.com'
    draft.is_dono_master = true
    expect(validatePersonAccessDraft(draft)).toContain('Dono Master exige o perfil Dono.')
    draft.papeis = ['DONO']
    expect(validatePersonAccessDraft(draft)).toEqual([])
  })

  test('resolveOwnerMaster: não configurado, válido, duplicado e inativo', () => {
    expect(resolveOwnerMaster([]).status).toBe('NOT_CONFIGURED')

    const valid = resolveOwnerMaster([{
      id: 'p1', nome: 'Ana', email: 'ana@alfa.com', telefone: null, funcao_declarada: 'SOCIO',
      is_dono_master: true, status: 'ativo', papeis: ['DONO'],
    }])
    expect(valid.status).toBe('VALID')
    expect(valid.person?.nome).toBe('Ana')

    const dup = resolveOwnerMaster([
      { id: 'p1', nome: 'Ana', email: 'a@b.com', telefone: null, funcao_declarada: null, is_dono_master: true, status: 'ativo', papeis: ['DONO'] },
      { id: 'p2', nome: 'Bob', email: 'b@b.com', telefone: null, funcao_declarada: null, is_dono_master: true, status: 'ativo', papeis: ['DONO'] },
    ])
    expect(dup.status).toBe('DUPLICATE_MASTER')
    expect(dup.count).toBe(2)

    const inactive = resolveOwnerMaster([{
      id: 'p1', nome: 'Ana', email: 'a@b.com', telefone: null, funcao_declarada: null,
      is_dono_master: true, status: 'inativo', papeis: ['DONO'],
    }])
    expect(inactive.status).toBe('INACTIVE')

    const invited = resolveOwnerMaster([{
      id: 'p1', nome: 'Ana', email: 'a@b.com', telefone: null, funcao_declarada: null,
      is_dono_master: true, status: 'em_preparacao', papeis: ['DONO'],
    }])
    expect(invited.status).toBe('VALID')

    const donoSemMaster = resolveOwnerMaster([{
      id: 'p1', nome: 'Ana', email: 'a@b.com', telefone: null, funcao_declarada: null,
      is_dono_master: false, status: 'ativo', papeis: ['DONO'],
    }])
    expect(donoSemMaster.status).toBe('OWNER_WITHOUT_MASTER')
  })

  test('personToAccessDraft reabre o cadastro existente sem criar outro', () => {
    const draft = personToAccessDraft({
      nome: 'Ana',
      email: 'ana@alfa.com',
      telefone: '1199',
      funcao_declarada: 'SOCIO',
      papeis: ['DONO', 'DIRETOR'],
      lojas_autorizadas: ['loja-1'],
      is_dono_master: true,
      visao_padrao: 'DONO',
    })
    expect(draft.nome).toBe('Ana')
    expect(draft.papeis).toEqual(['DONO', 'DIRETOR'])
    expect(draft.is_dono_master).toBe(true)
    expect(draft.visao_padrao).toBe('DONO')
  })
})

import { describe, expect, test } from 'bun:test'
import {
  canRemoveRoleGrant,
  canRemoveStoreAssignment,
  compatibleViews,
  emptyUserPersonal,
  isDelegationActive,
  planDeactivation,
  planPrimaryAssignment,
  validateDelegation,
  validateRoleGrantAdd,
  validateStoreAssignmentAdd,
  validateUserPersonal,
  type RoleGrantDraft,
  type StoreAssignmentDraft,
} from './userEdit'

function personal(overrides: Partial<ReturnType<typeof emptyUserPersonal>> = {}) {
  return { ...emptyUserPersonal(), full_name: 'Ana Souza', email: 'ana@mx.com.br', birth_date: '1990-01-01', ...overrides }
}

function grant(overrides: Partial<RoleGrantDraft> = {}): RoleGrantDraft {
  return { role: 'VENDEDOR', is_primary: false, valid_from: '', valid_until: '', status: 'ATIVO', change_reason: '', ...overrides }
}

function assignment(overrides: Partial<StoreAssignmentDraft> = {}): StoreAssignmentDraft {
  return {
    store_id: 'loja-1',
    store_name: 'Matriz',
    assignment_type: 'USUARIO_OPERACIONAL',
    is_primary: false,
    valid_from: '',
    valid_until: '',
    status: 'ATIVO',
    ...overrides,
  }
}

describe('dados pessoais', () => {
  test('aceita cadastro completo', () => {
    expect(validateUserPersonal(personal())).toEqual([])
  })

  test('cobra nome e e-mail', () => {
    const errors = validateUserPersonal(personal({ full_name: '  ', email: '' }))
    expect(errors).toContain('Nome completo é obrigatório.')
    expect(errors).toContain('E-mail é obrigatório.')
  })

  test('cobra a data de nascimento quando o cadastro já tinha uma e ela foi apagada', () => {
    const errors = validateUserPersonal(personal({ birth_date: '' }), { birthDateAlreadyOnRecord: true })
    expect(errors).toContain('Data de nascimento é obrigatória.')
  })

  test('não cobra data de nascimento de cadastro que nunca teve uma', () => {
    // Os 489 usuários da base vieram de importação sem o campo; cobrá-lo aqui
    // desabilitava o salvar para todos eles.
    expect(validateUserPersonal(personal({ birth_date: '' }))).toEqual([])
  })

  test('recusa e-mail malformado', () => {
    expect(validateUserPersonal(personal({ email: 'ana@mx' }))).toContain('E-mail inválido.')
  })
})

describe('concessão de papel', () => {
  test('não permite duplicar papel ativo', () => {
    const errors = validateRoleGrantAdd(grant({ role: 'VENDEDOR' }), [grant({ role: 'VENDEDOR' })])
    expect(errors).toContain('Este papel já está atribuído.')
  })

  test('aceita papel novo', () => {
    expect(validateRoleGrantAdd(grant({ role: 'GERENTE_COMERCIAL' }), [grant({ role: 'VENDEDOR' })])).toEqual([])
  })

  test('bloqueia remoção do último Dono Master ativo', () => {
    const onlyOwner = [grant({ role: 'DONO_MASTER' })]
    expect(canRemoveRoleGrant(onlyOwner[0], onlyOwner)).toContain('Dono Master')
  })

  test('permite remover Dono Master quando há outro ativo', () => {
    const owners = [grant({ role: 'DONO_MASTER' }), grant({ role: 'DONO_MASTER', id: 'outro' })]
    expect(canRemoveRoleGrant(owners[0], owners)).toBeNull()
  })
})

describe('visões compatíveis', () => {
  test('Dono vê as visões Dono, Gerencial e Vendedor', () => {
    const views = compatibleViews(['DONO_MASTER'])
    expect(views.map(v => v.value)).toContain('DONO')
    expect(views.map(v => v.value)).toContain('GERENCIAL')
    expect(views.map(v => v.value)).toContain('VENDEDOR')
    expect(views.map(v => v.value)).not.toContain('DEPARTAMENTAL')
  })

  test('Vendedor vê apenas a visão de vendedor', () => {
    const views = compatibleViews(['VENDEDOR'])
    expect(views.map(v => v.value)).toEqual(['VENDEDOR'])
  })
})

describe('vínculo de loja', () => {
  test('vendedor com vínculo ativo não recebe nova loja', () => {
    const errors = validateStoreAssignmentAdd(assignment(), [assignment()], true)
    expect(errors[0]).toContain('uma Loja operacional principal')
  })

  test('não-vendedor pode ter várias lojas', () => {
    expect(validateStoreAssignmentAdd(assignment(), [assignment()], false)).toEqual([])
  })

  test('bloqueia remoção do último gerente da loja', () => {
    const gerente = assignment({ assignment_type: 'gerente' })
    expect(canRemoveStoreAssignment(gerente, [gerente], 'Matriz')).toContain('não pode ficar sem responsável')
  })

  test('libera remoção quando a loja ainda fica com outro gerente', () => {
    const a = assignment({ id: 'a', assignment_type: 'gerente' })
    const b = assignment({ id: 'b', assignment_type: 'gerente' })
    expect(canRemoveStoreAssignment(a, [a, b], 'Matriz')).toBeNull()
  })

  test('vendedor não segura a loja: removê-lo nunca é bloqueado', () => {
    const vendedor = assignment({ assignment_type: 'vendedor' })
    expect(canRemoveStoreAssignment(vendedor, [vendedor], 'Matriz')).toBeNull()
  })

  test('planPrimaryAssignment marca apenas o alvo como principal', () => {
    const list = [assignment({ id: 'a', is_primary: true }), assignment({ id: 'b' })]
    const plan = planPrimaryAssignment(list, 'b')
    expect(plan.find(a => a.id === 'b')?.is_primary).toBe(true)
    expect(plan.find(a => a.id === 'a')?.is_primary).toBe(false)
  })
})

describe('delegação gerencial', () => {
  test('exige loja, data final e autorizador', () => {
    const errors = validateDelegation({ store_id: '', store_name: '', access_level: '', valid_from: '', valid_until: '', reason: '', authorized_by: '', status: 'ATIVO' })
    expect(errors).toContain('Loja é obrigatória.')
    expect(errors).toContain('Data final é obrigatória.')
    expect(errors).toContain('Autorizador é obrigatório.')
  })

  test('recusa vigência invertida', () => {
    const errors = validateDelegation({ store_id: 's', store_name: 'x', access_level: 'gerente', valid_from: '2026-09-01', valid_until: '2026-08-01', reason: '', authorized_by: 'Admin', status: 'ATIVO' })
    expect(errors[0]).toContain('não pode ser anterior')
  })

  test('aceita delegação válida', () => {
    const errors = validateDelegation({ store_id: 's', store_name: 'x', access_level: 'gerente', valid_from: '', valid_until: '2026-12-31', reason: 'Férias', authorized_by: 'Admin', status: 'ATIVO' })
    expect(errors).toEqual([])
  })

  test('isDelegationActive respeita status e vigência', () => {
    expect(isDelegationActive({ status: 'ATIVO', valid_until: '2026-12-31', valid_from: '2026-01-01' }, '2026-08-15')).toBe(true)
    expect(isDelegationActive({ status: 'ENCERRADO', valid_until: '2026-12-31', valid_from: '' }, '2026-08-15')).toBe(false)
    expect(isDelegationActive({ status: 'ATIVO', valid_until: '2026-08-01', valid_from: '' }, '2026-08-15')).toBe(false)
    expect(isDelegationActive({ status: 'ATIVO', valid_until: '2026-12-31', valid_from: '2026-09-01' }, '2026-08-15')).toBe(false)
  })
})

describe('desativação', () => {
  test('suspende acesso ativo e encerra concessões', () => {
    expect(planDeactivation('ATIVO')).toEqual({ suspend: true, closeRoleGrants: true, closeStoreAssignments: true })
  })

  test('usuário já desativado não precisa suspender de novo', () => {
    expect(planDeactivation('DESATIVADO').suspend).toBe(false)
  })
})

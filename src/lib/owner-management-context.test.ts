import { describe, expect, it } from 'bun:test'
import { resolveOwnerManagementContext } from './owner-management-context'

describe('resolveOwnerManagementContext', () => {
  it('reconhece gerente ativo somente pelo vínculo canônico', () => {
    expect(resolveOwnerManagementContext({
      activeManagerCount: 2,
      declaredManagerEmail: null,
    })).toEqual({
      status: 'active_manager',
      hasActiveManager: true,
      activeManagerCount: 2,
      ownerAssumesManagement: false,
      managerRegistrationPending: false,
      declaredManagerEmail: null,
      accessMode: 'oversight',
      queryFailed: false,
    })
  })

  it('trata e-mail sem vínculo como gerente pendente e mantém o dono responsável', () => {
    expect(resolveOwnerManagementContext({
      activeManagerCount: 0,
      declaredManagerEmail: '  GERENTE@LOJA.COM.BR ',
    })).toEqual({
      status: 'manager_pending',
      hasActiveManager: false,
      activeManagerCount: 0,
      ownerAssumesManagement: true,
      managerRegistrationPending: true,
      declaredManagerEmail: 'gerente@loja.com.br',
      accessMode: 'full_management',
      queryFailed: false,
    })
  })

  it('faz o dono assumir a gestão quando não existe gerente nem e-mail pendente', () => {
    expect(resolveOwnerManagementContext({
      activeManagerCount: 0,
      declaredManagerEmail: '   ',
    })).toEqual({
      status: 'owner_managed',
      hasActiveManager: false,
      activeManagerCount: 0,
      ownerAssumesManagement: true,
      managerRegistrationPending: false,
      declaredManagerEmail: null,
      accessMode: 'full_management',
      queryFailed: false,
    })
  })

  it('não amplia responsabilidade quando a consulta do vínculo falha', () => {
    const context = resolveOwnerManagementContext({
      activeManagerCount: null,
      declaredManagerEmail: null,
      queryFailed: true,
    })

    expect(context.queryFailed).toBe(true)
    expect(context.ownerAssumesManagement).toBe(false)
    expect(context.accessMode).toBe('oversight')
  })
})

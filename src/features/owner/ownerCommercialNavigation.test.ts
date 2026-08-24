import { describe, expect, it } from 'bun:test'
import { buildOwnerCommercialNavigation } from './ownerCommercialNavigation'
import type { OwnerManagementContext } from '@/lib/owner-management-context'

const baseContext: OwnerManagementContext = {
  status: 'owner_managed',
  hasActiveManager: false,
  activeManagerCount: 0,
  ownerAssumesManagement: true,
  managerRegistrationPending: false,
  declaredManagerEmail: null,
  accessMode: 'full_management',
  queryFailed: false,
}

describe('buildOwnerCommercialNavigation', () => {
  it('entrega todas as funções comerciais necessárias ao dono responsável', () => {
    const navigation = buildOwnerCommercialNavigation(baseContext)

    expect(navigation.label).toBe('GESTÃO COMERCIAL')
    expect(navigation.badge).toBe('RESPONSÁVEL')
    expect(navigation.items.map(item => item.path)).toEqual([
      '/gerente/minha-equipe',
      '/gerente/rotina-equipe',
      '/fechamento-diario',
      '/gerente/meta-loja',
      '/vendas',
      '/gerente/mentor',
      '/gerente/feedbacks-pdis',
      '/gerente/ranking',
      '/gerente/universidade-mx',
    ])
  })

  it('mantém o acesso de acompanhamento quando existe gerente ativo', () => {
    const navigation = buildOwnerCommercialNavigation({
      ...baseContext,
      status: 'active_manager',
      hasActiveManager: true,
      activeManagerCount: 1,
      ownerAssumesManagement: false,
      accessMode: 'oversight',
    })

    expect(navigation.badge).toBe('ACOMPANHAR')
    expect(navigation.badgeTone).toBe('default')
  })

  it('marca gerente pendente sem retirar a responsabilidade do dono', () => {
    const navigation = buildOwnerCommercialNavigation({
      ...baseContext,
      status: 'manager_pending',
      managerRegistrationPending: true,
      declaredManagerEmail: 'gerente@loja.com.br',
    })

    expect(navigation.badge).toBe('RESPONSÁVEL')
    expect(navigation.description).toContain('cadastro do gerente está pendente')
  })
})

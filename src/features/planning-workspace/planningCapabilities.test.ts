import { describe, expect, test } from 'bun:test'
import { resolvePlanningCapabilities } from './planningCapabilities'

const internalRoles = ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const

describe('resolvePlanningCapabilities', () => {
  test.each(internalRoles)('%s recebe administração global', role => {
    expect(resolvePlanningCapabilities(role)).toEqual({
      scope: 'global',
      canEditTargets: true,
      canCreateActions: true,
      canDeleteActions: true,
      canReviewActions: true,
      canManageConsulting: true,
      canReviewAnticipation: true,
      canViewStrategicPpa: true,
    })
  })

  test('dono permanece na própria loja sem exclusão definitiva', () => {
    expect(resolvePlanningCapabilities('dono')).toMatchObject({
      scope: 'store',
      canDeleteActions: false,
      canReviewAnticipation: false,
      canViewStrategicPpa: true,
    })
  })

  test('gerente e vendedor não recebem administração global', () => {
    expect(resolvePlanningCapabilities('gerente')).toMatchObject({ scope: 'store', canDeleteActions: false, canViewStrategicPpa: false })
    expect(resolvePlanningCapabilities('vendedor')).toMatchObject({ scope: 'self', canCreateActions: false, canDeleteActions: false })
  })
})

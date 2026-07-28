import { describe, expect, test } from 'bun:test'
import { getActionPlanPermissions, resolveActionTransition } from './actionPlanPolicy'

describe('actionPlanPolicy', () => {
  test('perfis internos possuem administração global e exclusão definitiva', () => {
    for (const role of ['administrador_geral', 'administrador_mx', 'consultor_mx'] as const) {
      expect(getActionPlanPermissions(role)).toMatchObject({
        scope: 'global',
        canCreate: true,
        canEdit: true,
        canDeletePermanently: true,
        canValidate: true,
      })
    }
  })

  test('dono governa sua loja sem exclusão definitiva', () => {
    expect(getActionPlanPermissions('dono')).toMatchObject({
      scope: 'store',
      canCreate: true,
      canEdit: true,
      canDeletePermanently: false,
      canValidate: true,
    })
  })

  test('drag and drop e mover para resolvem a mesma transição', () => {
    expect(resolveActionTransition('not_started', 'in_progress')).toEqual({ kind: 'direct', operation: 'start' })
    expect(resolveActionTransition('in_progress', 'blocked')).toEqual({ kind: 'modal', operation: 'block' })
    expect(resolveActionTransition('awaiting_validation', 'completed')).toEqual({ kind: 'modal', operation: 'validate' })
    expect(resolveActionTransition('completed', 'in_progress')).toEqual({ kind: 'modal', operation: 'reopen' })
  })

  test('rejeita transição inexistente', () => {
    expect(resolveActionTransition('not_started', 'completed')).toEqual({ kind: 'forbidden' })
  })
})

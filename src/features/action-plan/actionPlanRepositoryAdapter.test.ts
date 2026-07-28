import { describe, expect, test } from 'bun:test'
import { createActionPlanRepositoryAdapter } from './actionPlanRepositoryAdapter'

const repository = {
  getActions: async () => [],
  getResponsiblePeople: async () => ['Pessoa'],
  createAction: async () => ({ id: 'a1' }),
  updateActionById: async () => ({ id: 'a1' }),
  approveAction: async () => ({ id: 'a1' }),
  delegateAction: async () => ({ id: 'a1' }),
  startAction: async () => ({ id: 'a1' }),
  updateProgress: async () => ({ id: 'a1' }),
  blockAction: async () => ({ id: 'a1' }),
  unblockAction: async () => ({ id: 'a1' }),
  submitForValidation: async () => ({ error: false }),
  validateAction: async () => ({ id: 'a1' }),
  returnToExecution: async () => ({ id: 'a1' }),
  reopenAction: async () => ({ id: 'a1' }),
  cancelAction: async () => ({ id: 'a1' }),
  deleteAction: async () => undefined,
  updateDueDate: async () => ({ id: 'a1' }),
  duplicateAction: async () => ({ id: 'a2' }),
}

describe('actionPlanRepositoryAdapter', () => {
  test('expõe o ciclo canônico no mesmo contrato', async () => {
    const adapter = createActionPlanRepositoryAdapter(repository)
    await expect(adapter.getActions({ storeId: 'store-1' })).resolves.toEqual([])
    await expect(adapter.createAction({ title: 'Ação' }, { storeId: 'store-1' })).resolves.toEqual({ id: 'a1' })
    await expect(adapter.submitForValidation('a1', {})).resolves.toEqual({ error: false })
    await expect(adapter.deleteAction('a1')).resolves.toBeUndefined()
  })

  test('rejeita fonte incompleta no bootstrap', () => {
    expect(() => createActionPlanRepositoryAdapter({ getActions: async () => [] })).toThrow('Contrato incompleto')
  })
})

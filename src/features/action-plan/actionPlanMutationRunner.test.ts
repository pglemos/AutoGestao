import { describe, expect, test } from 'bun:test'
import { executeActionPlanMutation, validationResultOrThrow } from './actionPlanMutationRunner'

describe('executeActionPlanMutation', () => {
  test('executa operação, recarrega e encerra estado pendente', async () => {
    const events: string[] = []
    const result = await executeActionPlanMutation({
      operation: async () => { events.push('operation'); return 'ok' },
      reload: async () => { events.push('reload') },
      setPending: value => events.push(`pending:${value}`),
    })
    expect(result).toBe('ok')
    expect(events).toEqual(['pending:true', 'operation', 'reload', 'pending:false'])
  })

  test('não recarrega quando a operação falha', async () => {
    const events: string[] = []
    await expect(executeActionPlanMutation({
      operation: async () => { events.push('operation'); throw new Error('falhou') },
      reload: async () => { events.push('reload') },
      setPending: value => events.push(`pending:${value}`),
    })).rejects.toThrow('falhou')
    expect(events).toEqual(['pending:true', 'operation', 'pending:false'])
  })

  test('transforma erros de validação em mensagem única', () => {
    expect(() => validationResultOrThrow({ error: true, errors: ['Checklist pendente', 'Sem evidência'] }))
      .toThrow('Checklist pendente; Sem evidência')
    expect(validationResultOrThrow({ error: false })).toEqual({ error: false })
  })
})

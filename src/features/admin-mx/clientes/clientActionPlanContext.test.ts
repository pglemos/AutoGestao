import { describe, expect, test } from 'bun:test'
import { actionPlanStatusLabel, summarizeClientActionPlans } from './clientActionPlanContext'

describe('resumo de planos de ação do cliente', () => {
  test('consolida status e progresso das unidades', () => {
    expect(summarizeClientActionPlans([
      { status: 'pendente', progresso: 0 },
      { status: 'em_andamento', progresso: 50 },
      { status: 'concluida', progresso: 100 },
      { status: 'bloqueada', progresso: 30 },
    ])).toEqual({ total: 4, open: 2, completed: 1, blocked: 1, cancelled: 0, averageProgress: 45 })
  })

  test('traduz estados conhecidos sem esconder estado desconhecido', () => {
    expect(actionPlanStatusLabel('em_andamento')).toBe('Em andamento')
    expect(actionPlanStatusLabel('novo_estado')).toBe('novo_estado')
  })
})

import { describe, expect, test } from 'bun:test'
import {
  allowedPlanTransitions,
  boardMetrics,
  groupPlansByColumn,
  resolveBoardColumn,
  validateCompletion,
  validateDueDateChange,
  type BoardPlan,
} from './actionPlanBoard'

const HOJE = new Date('2026-08-15T12:00:00Z')

function plan(overrides: Partial<BoardPlan> = {}): BoardPlan {
  return {
    id: 'plan-1', codigo: 'PA-1', problema: 'Ruptura', acao: 'Comprar', status: 'pendente',
    prioridade: 'media', prazo: null, progresso: 0, departamento: 'Estoque', indicador: 'Cobertura',
    responsavel_id: null, concluido_at: null, scope_id: 'loja-1', ...overrides,
  }
}

describe('coluna do kanban', () => {
  test('prazo vencido em plano aberto vira Atrasada', () => {
    expect(resolveBoardColumn(plan({ status: 'em_andamento', prazo: '2026-08-01' }), HOJE)).toBe('atrasado')
    expect(resolveBoardColumn(plan({ status: 'pendente', prazo: '2026-08-14' }), HOJE)).toBe('atrasado')
  })

  test('prazo futuro mantém o status gravado', () => {
    expect(resolveBoardColumn(plan({ status: 'em_andamento', prazo: '2026-09-01' }), HOJE)).toBe('em_andamento')
  })

  test('plano concluído não é puxado para atrasada mesmo com prazo vencido', () => {
    expect(resolveBoardColumn(plan({ status: 'concluido', prazo: '2026-01-01' }), HOJE)).toBe('concluido')
  })

  test('plano do próprio dia ainda não está atrasado', () => {
    expect(resolveBoardColumn(plan({ status: 'pendente', prazo: '2026-08-15' }), HOJE)).toBe('pendente')
  })
})

describe('agrupamento e métricas', () => {
  const plans = [
    plan({ id: '1', status: 'pendente' }),
    plan({ id: '2', status: 'em_andamento', prazo: '2026-09-30' }),
    plan({ id: '3', status: 'em_andamento', prazo: '2026-07-01' }),
    plan({ id: '4', status: 'concluido' }),
    plan({ id: '5', status: 'cancelada' }),
  ]

  test('cada plano cai em uma coluna, cancelada fica fora do board', () => {
    const groups = groupPlansByColumn(plans, HOJE)
    expect(groups.pendente.map(p => p.id)).toEqual(['1'])
    expect(groups.em_andamento.map(p => p.id)).toEqual(['2'])
    expect(groups.atrasado.map(p => p.id)).toEqual(['3'])
    expect(groups.concluido.map(p => p.id)).toEqual(['4'])
  })

  test('métricas somam o board', () => {
    expect(boardMetrics(plans, HOJE)).toEqual({ total: 5, naoIniciadas: 1, emAndamento: 1, atrasadas: 1, concluidas: 1 })
  })
})

describe('transições e validações', () => {
  test('transições dependem do status atual', () => {
    expect(allowedPlanTransitions('pendente')).toEqual(['em_andamento', 'cancelada'])
    expect(allowedPlanTransitions('em_andamento')).toEqual(['concluido', 'bloqueada', 'cancelada'])
    expect(allowedPlanTransitions('atrasado')).toEqual(['concluido', 'bloqueada', 'cancelada'])
    expect(allowedPlanTransitions('bloqueada')).toEqual(['em_andamento', 'cancelada'])
    expect(allowedPlanTransitions('concluido')).toEqual(['em_andamento'])
    expect(allowedPlanTransitions(null)).toEqual(['em_andamento', 'cancelada'])
  })

  test('conclusão exige data efetiva e recusa futuro', () => {
    expect(validateCompletion('')).toBe('Informe a data efetiva de conclusão.')
    expect(validateCompletion('2090-01-01')).toBe('A conclusão não pode ser no futuro.')
    expect(validateCompletion('2026-08-10')).toBeNull()
  })

  test('reagendamento exige data e justificativa', () => {
    expect(validateDueDateChange('', 'motivo')).toBe('Informe a nova data prevista.')
    expect(validateDueDateChange('2026-09-01', '  ')).toBe('Justifique a alteração do prazo.')
    expect(validateDueDateChange('2026-09-01', 'Fornecedor atrasou')).toBeNull()
  })
})

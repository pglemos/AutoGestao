import { describe, expect, test } from 'bun:test'
import {
  allowedPlanTransitions,
  boardMetrics,
  buildStatusTransitionPatch,
  buildCompletionDateCorrectionPatch,
  buildChecklistProgressPatch,
  countPendingChecklistItems,
  groupPlansByColumn,
  planDaysLate,
  deriveKanbanColumn,
  resolveBoardColumn,
  formatActionPlanCodigo,
  validateCompletion,
  validateChecklistCompletion,
  validateCompletionDateCorrection,
  validateDueDateChange,
  validateStatusTransition,
  type BoardPlan,
} from './actionPlanBoard'

const HOJE = new Date('2026-08-15T12:00:00Z')

function plan(overrides: Partial<BoardPlan> = {}): BoardPlan {
  return {
    id: 'plan-1', codigo: 'PA-1', problema: 'Ruptura', acao: 'Comprar', status: 'pendente',
    prioridade: 'media', prazo: null, progresso: 0, departamento: 'Estoque', indicador: 'Cobertura',
    responsavel_id: null, concluido_at: null, scope_id: 'loja-1', checklist: [], ...overrides,
  }
}

describe('coluna do kanban', () => {
  test('prazo vencido em plano aberto vira Atrasada', () => {
    expect(deriveKanbanColumn(plan({ status: 'em_andamento', prazo: '2026-08-01' }), HOJE)).toBe('atrasado')
    expect(resolveBoardColumn(plan({ status: 'em_andamento', prazo: '2026-08-01' }), HOJE)).toBe('atrasado')
    expect(resolveBoardColumn(plan({ status: 'pendente', prazo: '2026-08-14' }), HOJE)).toBe('atrasado')
  })

  test('prazo futuro mantém o status gravado', () => {
    expect(resolveBoardColumn(plan({ status: 'em_andamento', prazo: '2026-09-01' }), HOJE)).toBe('em_andamento')
  })

  test('plano concluído não é puxado para atrasada mesmo com prazo vencido', () => {
    expect(resolveBoardColumn(plan({ status: 'concluido', prazo: '2026-01-01' }), HOJE)).toBe('concluido')
  })

  test('alias concluida do banco cai na coluna Concluída', () => {
    expect(resolveBoardColumn(plan({ status: 'concluida' as BoardPlan['status'], prazo: '2026-01-01' }), HOJE)).toBe('concluido')
  })

  test('código PA com UUID inteiro encolhe para 8 hex', () => {
    expect(formatActionPlanCodigo('PA-4312F82B320944BABA5F2BB885B346F9')).toBe('PA-4312F82B')
    expect(formatActionPlanCodigo('PA-001')).toBe('PA-001')
    expect(formatActionPlanCodigo(null, '83ac0666-aaaa-bbbb-cccc-ddddeeeeffff')).toBe('PA-83AC0666')
  })

  test('plano do próprio dia ainda não está atrasado', () => {
    expect(resolveBoardColumn(plan({ status: 'pendente', prazo: '2026-08-15' }), HOJE)).toBe('pendente')
  })
})

describe('atraso da tabela', () => {
  test('conta dias só em plano aberto com prazo vencido', () => {
    expect(planDaysLate('em_andamento', '2026-08-01', HOJE)).toBe(14)
    expect(planDaysLate('concluido', '2026-08-01', HOJE)).toBe(0)
    expect(planDaysLate('pendente', '2026-08-20', HOJE)).toBe(0)
    expect(planDaysLate('pendente', null, HOJE)).toBe(0)
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
  test('conclusão exige checklist resolvido e override administrativo justificado', () => {
    const checklist = [
      { titulo: 'Concluído', como: null, peso_bp: 5000, peso_pct: '50%', status: 'concluido' },
      { titulo: 'Pendente', como: null, peso_bp: 5000, peso_pct: '50%', status: 'pendente' },
    ]
    expect(countPendingChecklistItems(checklist)).toBe(1)
    expect(validateChecklistCompletion({ checklist, overrideRequested: false, overrideReason: '', canOverride: true }))
      .toBe('Este plano possui 1 item(ns) pendente(s). Conclua ou cancele os itens antes de finalizar.')
    expect(validateChecklistCompletion({ checklist, overrideRequested: true, overrideReason: '', canOverride: true }))
      .toBe('Justifique a conclusão administrativa com itens pendentes.')
    expect(validateChecklistCompletion({ checklist, overrideRequested: true, overrideReason: 'Encerramento executivo', canOverride: false }))
      .toBe('Somente Administrador Geral ou Administrador MX pode concluir com itens pendentes.')
    expect(validateChecklistCompletion({ checklist, overrideRequested: true, overrideReason: 'Encerramento executivo', canOverride: true })).toBeNull()
  })

  test('itens cancelados não bloqueiam conclusão e override desnecessário é rejeitado', () => {
    const checklist = [
      { titulo: 'Concluído', como: null, peso_bp: 5000, peso_pct: '50%', status: 'realizado' },
      { titulo: 'Cancelado', como: null, peso_bp: 5000, peso_pct: '50%', status: 'cancelada' },
    ]
    expect(countPendingChecklistItems(checklist)).toBe(0)
    expect(validateChecklistCompletion({ checklist, overrideRequested: false, overrideReason: '', canOverride: false })).toBeNull()
    expect(validateChecklistCompletion({ checklist, overrideRequested: true, overrideReason: 'Sem necessidade', canOverride: true }))
      .toBe('O override não é necessário: não existem itens pendentes.')
  })

  test('patch de override inclui intenção e justificativa para validação server-side', () => {
    expect(buildStatusTransitionPatch('concluido', {
      from: 'em_andamento',
      completionOverride: true,
      completionOverrideReason: 'Decisão administrativa registrada',
    }, HOJE)).toMatchObject({
      transition_metadata: {
        eventType: 'completed',
        completionOverride: true,
        completionOverrideReason: 'Decisão administrativa registrada',
      },
    })
  })

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

  test('reabertura de plano concluído exige justificativa', () => {
    expect(validateStatusTransition('concluido', 'em_andamento', '')).toBe('Justifique a reabertura do plano.')
    expect(validateStatusTransition('concluido', 'em_andamento', 'Meta reaberta')).toBeNull()
    expect(validateStatusTransition('pendente', 'em_andamento', '')).toBeNull()
  })

  test('bloqueio, cancelamento e desbloqueio exigem justificativa', () => {
    expect(validateStatusTransition('em_andamento', 'bloqueada', '')).toBe('Justifique o bloqueio do plano.')
    expect(validateStatusTransition('pendente', 'cancelada', '  ')).toBe('Justifique o cancelamento do plano.')
    expect(validateStatusTransition('bloqueada', 'em_andamento', '')).toBe('Justifique o desbloqueio do plano.')
    expect(validateStatusTransition('em_andamento', 'bloqueada', 'Dependência externa')).toBeNull()
  })

  test('patch de conclusão registra data, progresso e auditoria', () => {
    expect(buildStatusTransitionPatch('concluido', { concluido_at: '2026-08-15T12:00:00Z', note: 'Entrega validada' }, HOJE)).toEqual({
      status: 'concluido',
      concluido_at: '2026-08-15T12:00:00Z',
      progresso: 100,
      progress_note: 'Entrega validada',
      transition_metadata: { eventType: 'completed', note: 'Entrega validada', changedAt: HOJE.toISOString() },
    })
  })

  test('reabertura limpa conclusão, preserva início e deriva progresso do checklist', () => {
    expect(buildStatusTransitionPatch('em_andamento', {
      from: 'concluido',
      note: 'Indicador reaberto',
      checklist: [
        { titulo: 'A', como: null, peso_bp: 6000, peso_pct: '60%', status: 'concluido' },
        { titulo: 'B', como: null, peso_bp: 4000, peso_pct: '40%', status: 'pendente' },
      ],
    }, HOJE)).toEqual({
      status: 'em_andamento',
      concluido_at: null,
      progresso: 60,
      reopen_reason: 'Indicador reaberto',
      reopen_note: 'Indicador reaberto',
      progress_note: 'Indicador reaberto',
      transition_metadata: { eventType: 'reopened', note: 'Indicador reaberto', changedAt: HOJE.toISOString() },
    })
  })

  test('bloqueio, cancelamento e desbloqueio usam campos auditáveis próprios', () => {
    expect(buildStatusTransitionPatch('bloqueada', { from: 'em_andamento', note: 'Aguardando fornecedor' }, HOJE)).toMatchObject({
      status: 'bloqueada',
      blocked_reason: 'Aguardando fornecedor',
      block_note: 'Aguardando fornecedor',
      transition_metadata: { eventType: 'blocked' },
    })
    expect(buildStatusTransitionPatch('cancelada', { from: 'pendente', note: 'Estratégia substituída' }, HOJE)).toMatchObject({
      status: 'cancelada',
      cancel_reason: 'Estratégia substituída',
      cancel_note: 'Estratégia substituída',
      transition_metadata: { eventType: 'cancelled' },
    })
    expect(buildStatusTransitionPatch('em_andamento', { from: 'bloqueada', note: 'Fornecedor liberou' }, HOJE)).toMatchObject({
      status: 'em_andamento',
      unblock_note: 'Fornecedor liberou',
      transition_metadata: { eventType: 'unblocked' },
    })
  })

  test('correção da data efetiva exige motivo e gera patch específico', () => {
    expect(validateCompletionDateCorrection('', 'motivo')).toBe('Informe a nova data efetiva de conclusão.')
    expect(validateCompletionDateCorrection('2026-08-14', '')).toBe('Justifique a correção da data de conclusão.')
    expect(validateCompletionDateCorrection('2090-01-01', 'motivo')).toBe('A conclusão não pode ser no futuro.')
    expect(buildCompletionDateCorrectionPatch('2026-08-14', 'Ata corrigida', HOJE)).toEqual({
      concluido_at: '2026-08-14T12:00:00.000Z',
      progress_note: 'Ata corrigida',
      transition_metadata: {
        eventType: 'completion_date_corrected',
        note: 'Ata corrigida',
        changedAt: HOJE.toISOString(),
      },
    })
  })

  test('checklist ponderado recalcula progresso e inicia plano pendente', () => {
    const patch = buildChecklistProgressPatch([
      { titulo: 'Diagnosticar', como: null, peso_bp: 6000, peso_pct: '60%', status: 'pendente' },
      { titulo: 'Executar', como: null, peso_bp: 4000, peso_pct: '40%', status: 'pendente' },
    ], 0, true, 'pendente', HOJE)

    expect(patch?.progresso).toBe(60)
    expect(patch?.status).toBe('em_andamento')
    expect(patch?.iniciado_at).toBe(HOJE.toISOString())
    expect(patch?.checklist[0].status).toBe('concluido')
  })

  test('checklist sem pesos usa proporção simples e não conclui plano automaticamente', () => {
    const patch = buildChecklistProgressPatch([
      { titulo: 'A', como: null, peso_bp: 0, peso_pct: '0%', status: 'concluido' },
      { titulo: 'B', como: null, peso_bp: 0, peso_pct: '0%', status: 'pendente' },
    ], 1, true, 'em_andamento', HOJE)

    expect(patch?.progresso).toBe(100)
    expect(patch?.status).toBeUndefined()
  })

  test('índice inválido não produz patch', () => {
    expect(buildChecklistProgressPatch([], 0, true, 'pendente', HOJE)).toBeNull()
  })
})

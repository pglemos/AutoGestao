import { describe, expect, test } from 'bun:test'

describe('manager day routine Supabase adapter', () => {
  test('converte uma execution_action gerencial em tarefa manual e item de histórico', async () => {
    const module = await import('./manager-day-routine-adapter').catch(() => ({})) as Record<string, unknown>
    const executionActionToManualSource = module.executionActionToManualSource
    const executionActionToHistoryTask = module.executionActionToHistoryTask

    expect(typeof executionActionToManualSource).toBe('function')
    expect(typeof executionActionToHistoryTask).toBe('function')
    if (typeof executionActionToManualSource !== 'function' || typeof executionActionToHistoryTask !== 'function') return

    const row = actionRow({
      metadata: {
        manager_daily: true,
        category: 'operacao',
        related_seller_id: 'seller-1',
        related_seller_name: 'Ana',
        manager_result: 'concluida_parcial',
      },
      status: 'justificada',
      justificativa: 'Fornecedor respondeu parcialmente.',
    })

    expect(executionActionToManualSource(row)).toMatchObject({
      id: 'row-1',
      rowId: 'row-1',
      dueDate: '2026-07-13',
      dueTime: '12:00',
      category: 'operacao',
      status: 'concluida_parcial',
      relatedSellerName: 'Ana',
    })
    expect(executionActionToHistoryTask(row)).toMatchObject({
      id: 'row-1',
      status: 'concluida_parcial',
      observation: 'Fornecedor respondeu parcialmente.',
      origin: 'manual',
      automatic: false,
    })
  })

  test('atividade manual pendente oferece o botão de concluir; concluída não', async () => {
    const module = await import('./manager-day-routine-adapter') as Record<string, unknown>
    const executionActionToHistoryTask = module.executionActionToHistoryTask
    if (typeof executionActionToHistoryTask !== 'function') throw new Error('adaptador ausente')

    // Sem esta ação o card renderiza sem botão nenhum: a atividade criada pelo
    // "Nova atividade" fica impossível de concluir pela tela que a criou.
    const pendente = executionActionToHistoryTask(actionRow()) as { actions: Array<{ label: string; action?: string }> }
    expect(pendente.actions).toEqual([{ label: 'Concluir', kind: 'acao', action: 'concluir_manual' }])

    const concluida = executionActionToHistoryTask(actionRow({
      status: 'concluida',
      completed_at: '2026-07-13T15:00:00.000Z',
    })) as { actions: unknown[] }
    expect(concluida.actions).toEqual([])
  })

  test('gera payload de criação único e escopado ao gerente e à loja', async () => {
    const module = await import('./manager-day-routine-adapter').catch(() => ({})) as Record<string, unknown>
    const buildManagerRoutineCreatePayload = module.buildManagerRoutineCreatePayload

    expect(typeof buildManagerRoutineCreatePayload).toBe('function')
    if (typeof buildManagerRoutineCreatePayload !== 'function') return

    expect(buildManagerRoutineCreatePayload({
      title: 'Reunião com vendedor',
      date: '2026-07-13',
      time: '12:00',
      category: 'equipe',
      priority: 'atencao',
      relatedSellerId: 'seller-1',
      notes: 'Revisar oportunidades.',
    }, {
      managerId: 'manager-1',
      storeId: 'store-1',
      relatedSellerName: 'Ana',
    })).toEqual({
      store_id: 'store-1',
      seller_id: 'manager-1',
      source_type: 'manual',
      title: 'Reunião com vendedor',
      description: 'Revisar oportunidades.',
      due_at: '2026-07-13T12:00:00-03:00',
      status: 'pendente',
      priority: 'high',
      alert_tone: 'warning',
      created_by: 'manager-1',
      metadata: {
        manager_daily: true,
        category: 'equipe',
        related_seller_id: 'seller-1',
        related_seller_name: 'Ana',
        selected_priority: 'atencao',
      },
    })
  })

  test('mapeia os quatro resultados Base44 em update sem perder metadata existente', async () => {
    const module = await import('./manager-day-routine-adapter').catch(() => ({})) as Record<string, unknown>
    const buildManagerRoutineCompletionUpdate = module.buildManagerRoutineCompletionUpdate

    expect(typeof buildManagerRoutineCompletionUpdate).toBe('function')
    if (typeof buildManagerRoutineCompletionUpdate !== 'function') return

    const expectedStatus = {
      concluida: 'concluida',
      concluida_parcial: 'justificada',
      reagendada: 'em_andamento',
      nao_realizada: 'cancelada',
    }
    for (const [result, status] of Object.entries(expectedStatus)) {
      expect(buildManagerRoutineCompletionUpdate({
        result,
        observation: 'Registro do gerente',
        managerId: 'manager-1',
        completedAt: '2026-07-13T15:00:00.000Z',
        metadata: { manager_daily: true, category: 'operacao' },
      })).toMatchObject({
        status,
        completed_at: '2026-07-13T15:00:00.000Z',
        completed_by: 'manager-1',
        justificativa: 'Registro do gerente',
        metadata: {
          manager_daily: true,
          category: 'operacao',
          manager_result: result,
        },
      })
    }
  })

  test('extrai somente chaves automáticas já encerradas', async () => {
    const module = await import('./manager-day-routine-adapter').catch(() => ({})) as Record<string, unknown>
    const extractResolvedAutomaticTaskIds = module.extractResolvedAutomaticTaskIds

    expect(typeof extractResolvedAutomaticTaskIds).toBe('function')
    if (typeof extractResolvedAutomaticTaskIds !== 'function') return

    expect(extractResolvedAutomaticTaskIds([
      actionRow({ id: 'one', status: 'concluida', metadata: { manager_daily: true, automatic_key: 'task-one', manager_result: 'concluida' } }),
      actionRow({ id: 'two', status: 'pendente', metadata: { manager_daily: true, automatic_key: 'task-two' } }),
      actionRow({ id: 'three', status: 'cancelada', metadata: { manager_daily: true, automatic_key: 'task-three', manager_result: 'nao_realizada' } }),
      actionRow({ id: 'four', status: 'concluida', metadata: { manager_daily: true } }),
    ])).toEqual(['task-one', 'task-three'])
  })

  test('gera conclusão automática com chave idempotente e contrato completo de histórico', async () => {
    const module = await import('./manager-day-routine-adapter').catch(() => ({})) as Record<string, unknown>
    const buildManagerRoutineAutomaticCompletionPayload = module.buildManagerRoutineAutomaticCompletionPayload

    expect(typeof buildManagerRoutineAutomaticCompletionPayload).toBe('function')
    if (typeof buildManagerRoutineAutomaticCompletionPayload !== 'function') return

    expect(buildManagerRoutineAutomaticCompletionPayload({
      task: {
        id: 'agenda-meeting-2026-07-13',
        title: 'Reunião comercial',
        description: 'Com Ana',
        category: 'equipe',
        block: 'pessoas_processos',
        origin: 'carteira_clientes',
        originRecordId: 'meeting-1',
        relatedSellerId: 'seller-1',
        relatedSellerName: 'Ana',
        dueDate: '2026-07-13',
        dueTime: '14:30',
        automatic: true,
        icon: 'Calendar',
        actions: [],
        priority: 'atencao',
        daysLate: 0,
        status: 'pendente',
        countsForScore: true,
      },
      result: 'reagendada',
      observation: 'Remarcada com a equipe.',
      managerId: 'manager-1',
      storeId: 'store-1',
      completedAt: '2026-07-13T15:00:00.000Z',
    })).toEqual({
      store_id: 'store-1',
      seller_id: 'manager-1',
      source_type: 'manual',
      title: 'Reunião comercial',
      description: 'Com Ana',
      due_at: '2026-07-13T14:30:00-03:00',
      status: 'em_andamento',
      priority: 'high',
      alert_tone: 'warning',
      created_by: 'manager-1',
      completed_at: '2026-07-13T15:00:00.000Z',
      completed_by: 'manager-1',
      justificativa: 'Remarcada com a equipe.',
      metadata: {
        manager_daily: true,
        automatic_key: 'agenda-meeting-2026-07-13',
        category: 'equipe',
        block: 'pessoas_processos',
        origin: 'carteira_clientes',
        origin_record_id: 'meeting-1',
        related_seller_id: 'seller-1',
        related_seller_name: 'Ana',
        icon: 'Calendar',
        manager_result: 'reagendada',
        observation: 'Remarcada com a equipe.',
      },
    })
  })
})

function actionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    title: 'Ligar para fornecedor',
    description: 'Confirmar disponibilidade',
    due_at: '2026-07-13T12:00:00-03:00',
    status: 'pendente',
    priority: 'medium',
    created_at: '2026-07-13T10:00:00.000Z',
    completed_at: null,
    justificativa: null,
    metadata: { manager_daily: true, category: 'operacao' },
    ...overrides,
  }
}

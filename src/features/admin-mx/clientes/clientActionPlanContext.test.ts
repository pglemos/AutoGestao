import { describe, expect, test } from 'bun:test'
import {
  actionPlanStatusLabel,
  collapseClientActionPlanRows,
  summarizeClientActionPlans,
} from './clientActionPlanContext'

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

  test('colapsa 7 linhas legado (1 item cada) em 1 card com checklist', () => {
    const rows = Array.from({ length: 7 }, (_, index) => ({
      id: `p${index}`,
      acao: `Ação ${index + 1}`,
      status: index < 2 ? 'concluida' : 'pendente',
      progresso: 0,
      scope_id: 'loja-1',
      origem_ref_id: 'version-1',
      checklist: null as unknown,
      updated_at: `2026-08-0${index + 1}`,
      transition_metadata: {
        template_application_request_id: 'req-1',
        template_item_id: `item-${index}`,
      },
    }))
    const collapsed = collapseClientActionPlanRows(rows)
    expect(collapsed).toHaveLength(1)
    expect(Array.isArray(collapsed[0].checklist) && collapsed[0].checklist).toHaveLength(7)
    expect(collapsed[0].progresso).toBe(29)
  })

  test('não colapsa linhas novas que já têm checklist', () => {
    const rows = [
      {
        id: 'a',
        acao: 'Plano',
        status: 'pendente',
        progresso: 10,
        scope_id: 'loja-1',
        origem_ref_id: 'v1',
        checklist: [{ titulo: '1' }, { titulo: '2' }],
        transition_metadata: { template_application_request_id: 'req-1' },
      },
      {
        id: 'b',
        acao: 'Plano',
        status: 'pendente',
        progresso: 10,
        scope_id: 'loja-2',
        origem_ref_id: 'v1',
        checklist: [{ titulo: '1' }, { titulo: '2' }],
        transition_metadata: { template_application_request_id: 'req-1' },
      },
    ]
    expect(collapseClientActionPlanRows(rows)).toHaveLength(2)
  })

  test('esconde duplicatas reconciliadas', () => {
    const rows = [
      {
        id: 'keep',
        acao: 'Plano',
        status: 'pendente',
        progresso: 0,
        scope_id: 'loja-1',
        checklist: [{ titulo: 'x' }],
        transition_metadata: { template_application_request_id: 'r1' },
      },
      {
        id: 'drop',
        acao: 'Plano',
        status: 'cancelada',
        progresso: 0,
        scope_id: 'loja-1',
        checklist: [{ titulo: 'x' }],
        transition_metadata: {
          template_application_request_id: 'r2',
          reconcile_status: 'DUPLICATE_RECONCILED',
        },
      },
    ]
    expect(collapseClientActionPlanRows(rows).map(row => row.id)).toEqual(['keep'])
  })
})

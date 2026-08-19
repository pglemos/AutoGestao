import { describe, expect, test } from 'bun:test'
import {
  deriveActionKanbanColumn,
  groupActionsByKanbanColumn,
  KANBAN_COLUMN_ORDER,
} from './actionPlanKanbanColumn'

const agora = new Date('2026-08-19T12:00:00')

describe('deriveActionKanbanColumn', () => {
  test('prazo vencido leva para Atrasada mesmo com status pendente gravado', () => {
    // É o caso que o gatilho do banco não cobre: o prazo venceu sozinho,
    // ninguém tocou na linha, e o status continua 'pendente'.
    expect(deriveActionKanbanColumn('pendente', '2026-08-10', agora)).toBe('ATRASADA')
  })

  test('prazo vencido com status em andamento também atrasa', () => {
    expect(deriveActionKanbanColumn('em_andamento', '2026-08-18', agora)).toBe('ATRASADA')
  })

  test('ação vence no fim do dia, não no começo', () => {
    expect(deriveActionKanbanColumn('pendente', '2026-08-19', agora)).toBe('PENDENTE')
    expect(deriveActionKanbanColumn('pendente', '2026-08-18', agora)).toBe('ATRASADA')
  })

  test('concluída nunca aparece como atrasada, mesmo fora do prazo', () => {
    expect(deriveActionKanbanColumn('concluido', '2026-01-01', agora)).toBe('CONCLUIDA')
  })

  test('validando eficácia não atrasa — a execução já terminou', () => {
    expect(deriveActionKanbanColumn('validando_eficacia', '2026-01-01', agora)).toBe('VALIDANDO_EFICACIA')
  })

  test('pausada e cancelada saem do kanban principal', () => {
    expect(deriveActionKanbanColumn('pausada', '2026-01-01', agora)).toBeNull()
    expect(deriveActionKanbanColumn('cancelada', null, agora)).toBeNull()
  })

  test('status atrasado gravado é respeitado mesmo sem prazo', () => {
    expect(deriveActionKanbanColumn('atrasado', null, agora)).toBe('ATRASADA')
  })

  test('sem prazo e sem status vai para Pendente', () => {
    expect(deriveActionKanbanColumn(null, null, agora)).toBe('PENDENTE')
    expect(deriveActionKanbanColumn(undefined, undefined, agora)).toBe('PENDENTE')
  })

  test('prazo com timestamp completo é aceito', () => {
    expect(deriveActionKanbanColumn('pendente', '2026-08-10T00:00:00Z', agora)).toBe('ATRASADA')
  })

  test('prazo inválido não derruba a derivação', () => {
    expect(deriveActionKanbanColumn('pendente', 'sem-data', agora)).toBe('PENDENTE')
  })

  test('status em maiúsculas ou com espaço é normalizado', () => {
    expect(deriveActionKanbanColumn(' CONCLUIDO ', null, agora)).toBe('CONCLUIDA')
  })
})

describe('groupActionsByKanbanColumn', () => {
  test('distribui as ações e omite as que saíram do kanban', () => {
    const groups = groupActionsByKanbanColumn(
      [
        { id: 1, status: 'pendente', prazo: '2026-08-30' },
        { id: 2, status: 'pendente', prazo: '2026-08-01' },
        { id: 3, status: 'concluido', prazo: '2026-01-01' },
        { id: 4, status: 'cancelada', prazo: '2026-08-01' },
        { id: 5, status: 'em_andamento', prazo: null },
      ],
      agora,
    )
    expect(groups.PENDENTE.map(a => a.id)).toEqual([1])
    expect(groups.ATRASADA.map(a => a.id)).toEqual([2])
    expect(groups.CONCLUIDA.map(a => a.id)).toEqual([3])
    expect(groups.EM_ANDAMENTO.map(a => a.id)).toEqual([5])
    const total = KANBAN_COLUMN_ORDER.reduce((sum, column) => sum + groups[column].length, 0)
    expect(total).toBe(4)
  })

  test('lista vazia devolve todas as colunas vazias', () => {
    const groups = groupActionsByKanbanColumn([], agora)
    expect(KANBAN_COLUMN_ORDER.every(column => groups[column].length === 0)).toBe(true)
  })
})

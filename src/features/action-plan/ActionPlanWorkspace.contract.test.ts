import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const workspace = readFileSync('src/features/action-plan/ActionPlanWorkspace.tsx', 'utf8')
const deleteDialog = readFileSync('src/features/action-plan/components/DeleteActionDialog.tsx', 'utf8')

describe('ActionPlanWorkspace contract', () => {
  test('usa controller compartilhado e somente duas abas principais', () => {
    expect(workspace).toContain('useActionPlanController')
    expect(workspace).toContain('ActionPlanTabs')
    expect(workspace).toContain("controller.tab === 'acoes'")
    expect(workspace).toContain("controller.tab === 'calendario'")
  })

  test('preserva Foco, Kanban, Lista e Calendário sem cards duplicados', () => {
    expect(workspace).toContain('FocusView')
    expect(workspace).toContain('BoardView')
    expect(workspace).toContain('CalendarView')
    expect(workspace).toContain('ActionExecutiveCards')
  })

  test('exclusão definitiva usa diálogo controlado e confirmação textual', () => {
    expect(workspace).not.toContain('window.confirm')
    expect(deleteDialog).toContain('Digite o código')
    expect(deleteDialog).toContain('confirmation === action.code')
  })
})

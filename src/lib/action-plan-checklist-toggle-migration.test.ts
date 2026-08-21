import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/migrations/20260820234000_action_plan_checklist_toggle_atomic.sql', 'utf8')

describe('alternância atômica do checklist do plano de ação', () => {
  test('trava o plano e altera somente o item solicitado no checklist persistido', () => {
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain("ARRAY[p_item_index::text, 'status']")
    expect(sql).toContain('jsonb_set(')
  })

  test('autoriza pelo escopo/responsável e recusa plano concluído', () => {
    expect(sql).toContain('can_manage_mx_action_scope')
    expect(sql).toContain('v_before.responsavel_id IS DISTINCT FROM auth.uid()')
    expect(sql).toContain('ACTION_PLAN_ALREADY_COMPLETED')
  })

  test('recalcula progresso no servidor e não expõe execução anônima', () => {
    expect(sql).toContain('jsonb_array_elements(v_checklist)')
    expect(sql).toContain('v_completed_weight / v_total_weight')
    expect(sql).toContain('REVOKE ALL ON FUNCTION')
    expect(sql).toContain('FROM PUBLIC, anon')
  })
})

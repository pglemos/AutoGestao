import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(
  resolve(import.meta.dir, '../../supabase/migrations/20260820220000_action_plan_completion_guard.sql'),
  'utf8',
)

describe('guarda transacional de conclusão do plano de ação', () => {
  test('trava o plano e avalia o checklist persistido', () => {
    expect(sql).toContain('WHERE id = p_plano_id FOR UPDATE')
    expect(sql).toContain('jsonb_array_elements')
    expect(sql).toContain("NOT IN ('concluido', 'concluida', 'realizado', 'cancelado', 'cancelada')")
    expect(sql).toContain('ACTION_PLAN_PENDING_ITEMS:')
  })

  test('não permite completar checklist e concluir no mesmo patch', () => {
    expect(sql).toContain('v_before.checklist')
    expect(sql).not.toContain("jsonb_array_elements(v_patch -> 'checklist')")
  })

  test('override exige administrador e justificativa', () => {
    expect(sql).toContain('public.eh_administrador_mx(auth.uid())')
    expect(sql).toContain('ACTION_PLAN_OVERRIDE_FORBIDDEN')
    expect(sql).toContain('ACTION_PLAN_OVERRIDE_REASON_REQUIRED')
    expect(sql).toContain("'completionOverriddenBy', auth.uid()")
    expect(sql).toContain("'completionPendingCount', v_pending_count")
  })

  test('não introduz exclusão física', () => {
    expect(sql).not.toMatch(/^\s*DELETE\s+FROM/im)
    expect(sql).not.toMatch(/^\s*TRUNCATE/im)
  })
})

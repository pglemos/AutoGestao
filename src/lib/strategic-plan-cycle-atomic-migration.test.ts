import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260820230000_strategic_plan_cycle_atomic.sql', import.meta.url),
  'utf8',
)

describe('porta transacional do ciclo estratégico', () => {
  test('autoriza no servidor e bloqueia a linha antes de mutar', () => {
    expect(sql).toContain('eh_area_interna_mx(auth.uid())')
    expect(sql).toContain('FOR UPDATE')
    expect(sql).toContain("ERRCODE = '40001'")
  })

  test('revisão fecha e cria a próxima versão dentro da mesma função', () => {
    expect(sql).toContain("IF v_operation = 'revise' THEN")
    expect(sql).toContain("SET status = 'revisado'")
    expect(sql).toContain('v_cycle.version_number + 1')
    expect(sql).toContain('revised_from_id')
  })

  test('não permite saltar etapas do ciclo', () => {
    expect(sql).toContain("v_cycle.status = 'rascunho' AND v_next_status = 'em_validacao'")
    expect(sql).toContain("v_cycle.status = 'em_validacao' AND v_next_status IN ('rascunho', 'publicado')")
    expect(sql).toContain("v_cycle.status = 'publicado' AND v_next_status = 'revisado'")
  })

  test('função não fica exposta a anon ou public', () => {
    expect(sql).toContain('FROM PUBLIC, anon')
    expect(sql).toContain('TO authenticated')
  })
})

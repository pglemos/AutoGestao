import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  'supabase/migrations/20260726120000_action_plan_department_scope_read.sql',
  'utf8',
)

describe('action plan department scope read migration', () => {
  test('derives department reads from the owning store scope', () => {
    expect(migration).toContain("p_scope_type = 'department'::public.score_scope_type")
    expect(migration).toContain('FROM public.departamentos_mx departamento')
    expect(migration).toContain("public.can_access_mx_scope('store'::public.score_scope_type, departamento.loja_id, uid)")
  })

  test('keeps internal MX access and process scopes explicit', () => {
    expect(migration).toContain("ARRAY['admin_mx', 'consultant']")
    expect(migration).toContain('RETURN false;')
    expect(migration).toContain('BEGIN;')
    expect(migration.trimEnd().endsWith('COMMIT;')).toBe(true)
  })
})

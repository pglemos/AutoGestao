import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sql = readFileSync(
  resolve(import.meta.dir, '../../supabase/migrations/20260820210000_action_plan_reconciliation_atomic.sql'),
  'utf8',
)

describe('reconciliação atômica de planos de ação', () => {
  test('as duas RPCs são dry-run por padrão e travam as seleções', () => {
    expect(sql).toContain('p_dry_run boolean DEFAULT true')
    expect(sql.match(/FOR UPDATE;/g)).toHaveLength(2)
    expect(sql).toContain("'dry_run', v_dry_run")
  })

  test('aplicações exigem canônico e duplicados explícitos por unidade', () => {
    expect(sql).toContain('p_canonical_request_id text')
    expect(sql).toContain('p_duplicate_request_ids text[]')
    expect(sql).toContain('CANONICAL_REQUEST_NOT_FOUND_FOR_STORE')
    expect(sql).toContain("'duplicate_of_request_id', BTRIM(p_canonical_request_id)")
  })

  test('rascunhos exigem versões explícitas do mesmo template', () => {
    expect(sql).toContain('p_canonical_version_id uuid')
    expect(sql).toContain('p_duplicate_version_ids uuid[]')
    expect(sql).toContain('DUPLICATE_DRAFT_NOT_FOUND')
    expect(sql).toContain("status = 'arquivada'")
  })

  test('autor vem da sessão, acesso é interno e histórico não é apagado', () => {
    expect(sql).toContain('v_actor uuid := auth.uid()')
    expect(sql).toContain('NOT public.eh_area_interna_mx(v_actor)')
    expect(sql).toContain('REVOKE ALL ON FUNCTION')
    expect(sql).toContain('TO authenticated')
    expect(sql).not.toMatch(/^\s*DELETE\s+FROM/im)
    expect(sql).not.toMatch(/^\s*TRUNCATE/im)
  })
})

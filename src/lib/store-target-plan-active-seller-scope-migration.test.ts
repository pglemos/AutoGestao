import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260817163000_fix_store_target_plan_active_seller_scope.sql', import.meta.url),
  'utf8',
)

describe('StoreTargetPlan active seller scope fix migration', () => {
  test('allows active sellers without strict started_at <= target_reference_date requirement', () => {
    expect(sql).toContain('coalesce(vl.is_active, true) = true')
    expect(sql).toContain('vl.started_at <= target_reference_date')
  })

  test('replaces the function and keeps explicit grants', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.consolidate_store_target_plan')
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.consolidate_store_target_plan(uuid,date) FROM anon')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.consolidate_store_target_plan(uuid,date) TO authenticated, service_role')
  })
})

import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(new URL('../../supabase/migrations/20260807200000_vendedor_performance_oficial_individual_goal_fix.sql', import.meta.url), 'utf8')

describe('vendedor performance oficial individual goal fix migration', () => {
  test('counts active sellers from all_store_sellers without seller_id filter restriction', () => {
    expect(sql).toContain('all_store_sellers AS')
    expect(sql).toContain('FROM all_store_sellers ax WHERE ax.store_id = rm.store_id')
  })

  test('supports custom individual goals from metas table when individual_goal_mode is custom', () => {
    expect(sql).toContain('custom_goals AS')
    expect(sql).toContain("sr.individual_goal_mode = 'custom'")
    expect(sql).toContain('cg.target IS NOT NULL')
  })

  test('revokes public and grants authenticated execute permissions', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.vendedor_performance_oficial')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.vendedor_performance_oficial')
  })
})

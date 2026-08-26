import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const sql = readFileSync(
  new URL('../../supabase/migrations/20260826103000_fix_vendedor_performance_goal_scope.sql', import.meta.url),
  'utf8',
)
const precedenceSql = readFileSync(
  new URL('../../supabase/migrations/20260826185929_individual_goal_precedence_and_eligible_seller_scope.sql', import.meta.url),
  'utf8',
)

describe('vendedor performance goal scope migration', () => {
  test('uses a complete active-store seller set for the divisor', () => {
    expect(sql).toContain('all_store_sellers AS')
    expect(sql).toContain('FROM all_store_sellers ax')
    expect(sql).toContain('WHERE ax.store_id = rm.store_id')
    expect(sql).toContain('ELSE coalesce(sr.monthly_goal / sr.seller_count, 0)')
    expect(sql).toContain('WHERE (p_store_id IS NULL OR rm.store_id = p_store_id)')
    expect(sql).toContain('FROM all_store_sellers ax')
    expect(sql).not.toContain('FROM sellers sx WHERE sx.store_id = rm.store_id')
  })

  test('requires both active seller assignments and active seller memberships', () => {
    expect(sql).toContain('FROM public.vendedores_loja vl')
    expect(sql).toContain('FROM public.vinculos_loja vm')
    expect(sql).toContain("vm.role = 'vendedor'")
    expect(sql).toContain('coalesce(vm.is_active, true)')
  })

  test('does not reintroduce seller_id as the goal divisor', () => {
    const start = sql.indexOf('all_store_sellers AS')
    const end = sql.indexOf('), sales AS')
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    const allSellerCte = sql
      .slice(start, end)
      .replace(/^\s*--.*$/gm, '')
    expect(allSellerCte).not.toContain('p_seller_id')
  })

  test('keeps the official RPC restricted to authenticated callers', () => {
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) FROM PUBLIC, anon')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.vendedor_performance_oficial(date, date, uuid, uuid) TO authenticated')
  })
})

describe('individual goal precedence migration', () => {
  test('uses explicit individual targets, including zero, before the fallback division', () => {
    expect(precedenceSql).toContain('WHEN saved.target IS NOT NULL THEN saved.target')
    expect(precedenceSql).toContain('THEN coalesce(sr.monthly_goal, 0) / sr.seller_count')
    expect(precedenceSql).toContain('WHEN coalesce(s.is_venda_loja, false) THEN 0::numeric')
    expect(precedenceSql).toContain('count(DISTINCT ax.seller_user_id)')
  })

  test('keeps the write contract open to manager, owner and Admin MX', () => {
    expect(precedenceSql).toContain("public.tem_papel_loja(store_id, ARRAY['dono', 'gerente'])")
    expect(precedenceSql).toContain('public.eh_administrador_mx()')
  })
})

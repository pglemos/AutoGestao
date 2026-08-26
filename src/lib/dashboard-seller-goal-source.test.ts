import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../features/dashboard-loja/hooks/useDashboardLojaData.ts', import.meta.url),
  'utf8',
)

describe('Dashboard Loja individual goal source', () => {
  test('maps the official individual goal into every seller row', () => {
    expect(source).toContain('officialGoal: officialRow?.meta')
    expect(source).toContain('resolveCanonicalIndividualGoal({')
    expect(source).not.toContain('meta: effectiveMonthlyGoal,')
  })

  test('counts only active non-Venda-Loja sellers for the local fallback', () => {
    expect(source).toContain('seller.active !== false && !seller.is_venda_loja')
    expect(source).toContain('activeSellersCount: activeIndividualSellerCount')
  })
})

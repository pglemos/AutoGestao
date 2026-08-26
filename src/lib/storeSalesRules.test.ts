import { describe, expect, test } from 'bun:test'
import { buildStoreSalesRules, resolveCanonicalIndividualGoal, resolveIndividualGoal } from './storeSalesRules'

describe('buildStoreSalesRules', () => {
  test('normalizes partial store meta rules with explicit monthly goal', () => {
    const rules = buildStoreSalesRules({
      storeId: 'store-1',
      monthlyGoal: 42,
      metaRules: {
        projection_mode: 'business',
        individual_goal_mode: 'weighted',
        bench_lead_agd: 25,
      },
    })

    expect(rules.store_id).toBe('store-1')
    expect(rules.monthly_goal).toBe(42)
    expect(rules.projection_mode).toBe('business')
    expect(rules.individual_goal_mode).toBe('weighted')
    expect(rules.bench_lead_agd).toBe(25)
    expect(rules.bench_agd_visita).toBe(60)
    expect(rules.bench_visita_vnd).toBe(33)
  })

  test('uses safe defaults when no persisted meta rules are available', () => {
    const rules = buildStoreSalesRules({ monthlyGoal: 0 })

    expect(rules.store_id).toBe('')
    expect(rules.monthly_goal).toBe(0)
    expect(rules.projection_mode).toBe('calendar')
    expect(rules.individual_goal_mode).toBe('even')
  })
})

describe('resolveIndividualGoal', () => {
  test('even mode: divides store goal equally by active sellers', () => {
    const value = resolveIndividualGoal({
      mode: 'even',
      storeMonthlyGoal: 100,
      activeSellersCount: 4,
    })
    expect(value).toBe(25)
  })

  test('does not leak the full store goal when the divisor is unavailable', () => {
    const value = resolveIndividualGoal({
      mode: 'even',
      storeMonthlyGoal: 100,
      activeSellersCount: null,
    })
    expect(value).toBeNull()
  })

  test('defaults to even mode when mode is missing (regra ausente)', () => {
    const value = resolveIndividualGoal({
      mode: undefined,
      storeMonthlyGoal: 90,
      activeSellersCount: 3,
    })
    expect(value).toBe(30)
  })

  test('custom mode: uses the seller-specific target when configured', () => {
    const value = resolveIndividualGoal({
      mode: 'custom',
      storeMonthlyGoal: 100,
      activeSellersCount: 4,
      customGoal: 18,
    })
    expect(value).toBe(18)
  })

  test('falls back to the eligible-seller division when no custom target is configured', () => {
    const value = resolveIndividualGoal({
      mode: 'custom',
      storeMonthlyGoal: 100,
      activeSellersCount: 4,
      customGoal: null,
    })
    expect(value).toBe(25)
  })

  test('custom mode: preserves an explicitly saved zero target', () => {
    const value = resolveIndividualGoal({
      mode: 'custom',
      storeMonthlyGoal: 100,
      customGoal: 0,
    })
    expect(value).toBe(0)
  })

  test('proportional mode: applies the configured share of the store goal', () => {
    const value = resolveIndividualGoal({
      mode: 'proportional',
      storeMonthlyGoal: 100,
      proportionalShare: 0.4,
    })
    expect(value).toBe(40)
  })

  test('proportional mode: falls back to the eligible-seller division without a configured share', () => {
    const value = resolveIndividualGoal({
      mode: 'proportional',
      storeMonthlyGoal: 100,
      activeSellersCount: 4,
      proportionalShare: null,
    })
    expect(value).toBe(25)
  })

  test('proportional mode: clamps a share above 1 to the full store goal', () => {
    const value = resolveIndividualGoal({
      mode: 'proportional',
      storeMonthlyGoal: 100,
      proportionalShare: 1.5,
    })
    expect(value).toBe(100)
  })

  test('returns explicit individual goals even when the store has no monthly goal configured', () => {
    expect(resolveIndividualGoal({ mode: 'even', storeMonthlyGoal: null, activeSellersCount: 3 })).toBeNull()
    expect(resolveIndividualGoal({ mode: 'custom', storeMonthlyGoal: 0, customGoal: 10 })).toBe(10)
    expect(resolveIndividualGoal({ mode: 'proportional', storeMonthlyGoal: undefined, proportionalShare: 0.5 })).toBeNull()
  })

  test('Venda Loja always receives zero and is not assigned a seller goal', () => {
    expect(resolveIndividualGoal({
      mode: 'custom',
      storeMonthlyGoal: 100,
      activeSellersCount: 4,
      customGoal: 25,
      isVendaLoja: true,
    })).toBe(0)
  })

  test('treats an unknown mode string coming from the database as even', () => {
    const value = resolveIndividualGoal({
      mode: 'algo-desconhecido',
      storeMonthlyGoal: 60,
      activeSellersCount: 2,
    })
    expect(value).toBe(30)
  })
})

describe('resolveCanonicalIndividualGoal', () => {
  test('preserves the official individual goal, including fractional division', () => {
    expect(resolveCanonicalIndividualGoal({
      officialGoal: 5.5,
      storeMonthlyGoal: 44,
      activeSellersCount: 8,
    })).toBe(5.5)
  })

  test('falls back to the store goal divided by active eligible sellers', () => {
    expect(resolveCanonicalIndividualGoal({
      storeMonthlyGoal: 44,
      activeSellersCount: 8,
    })).toBe(5.5)
  })

  test('does not assign a goal to the Venda Loja operational account', () => {
    expect(resolveCanonicalIndividualGoal({
      officialGoal: null,
      storeMonthlyGoal: 44,
      activeSellersCount: 8,
      isVendaLoja: true,
    })).toBe(0)
  })

  test('does not replace an official zero with the full store goal', () => {
    expect(resolveCanonicalIndividualGoal({
      officialGoal: 0,
      storeMonthlyGoal: 44,
      activeSellersCount: 8,
    })).toBe(0)
  })
})

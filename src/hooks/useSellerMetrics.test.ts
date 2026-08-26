import { describe, it, expect } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useSellerMetrics } from './useSellerMetrics'

const profile = { id: 'seller-1' } as any
const ranking = [
  { user_id: 'seller-1', user_name: 'Vendedor 1' },
  { user_id: 'seller-2', user_name: 'Vendedor 2' },
] as any

describe('useSellerMetrics', () => {
  it('retorna null quando nao ha profile', () => {
    const { result } = renderHook(() =>
      useSellerMetrics({
        checkins: [],
        todayCheckin: null,
        profile: null,
        sellerGoals: [],
        storeGoal: null,
        ranking: [],
      }),
    )
    expect(result.current).toBeNull()
  })

  it('usa a meta da sellerGoals do proprio vendedor', () => {
    const { result } = renderHook(() =>
      useSellerMetrics({
        checkins: [],
        todayCheckin: null,
        profile,
        sellerGoals: [{ user_id: 'seller-1', target: 30 }],
        storeGoal: null,
        ranking,
      }),
    )
    expect(result.current?.meta).toBe(30)
  })

  it('cai para rateio da meta da loja quando o vendedor nao tem goal proprio', () => {
    const { result } = renderHook(() =>
      useSellerMetrics({
        checkins: [],
        todayCheckin: null,
        profile,
        sellerGoals: [],
        storeGoal: { target: 100 },
        ranking, // 2 no ranking -> 100/2 = 50
      }),
    )
    expect(result.current?.meta).toBe(50)
  })

  it('preserva meta individual zero e usa a meta oficial do ranking quando existir', () => {
    const { result } = renderHook(() =>
      useSellerMetrics({
        checkins: [],
        todayCheckin: null,
        profile,
        sellerGoals: [{ user_id: 'seller-1', target: 0 }],
        storeGoal: { target: 100 },
        ranking: [
          { user_id: 'seller-1', user_name: 'Vendedor 1', is_venda_loja: false, meta: 30 },
          { user_id: 'seller-2', user_name: 'Vendedor 2', is_venda_loja: false, meta: 35 },
          { user_id: 'store', user_name: 'VENDA LOJA', is_venda_loja: true, meta: 0 },
        ] as any,
      }),
    )

    expect(result.current?.meta).toBe(0)
  })

  it('não conta VENDA LOJA no divisor do fallback', () => {
    const { result } = renderHook(() =>
      useSellerMetrics({
        checkins: [],
        todayCheckin: null,
        profile,
        sellerGoals: [],
        storeGoal: { target: 100 },
        ranking: [
          { user_id: 'seller-1', user_name: 'Vendedor 1', is_venda_loja: false },
          { user_id: 'seller-2', user_name: 'Vendedor 2', is_venda_loja: false },
          { user_id: 'store', user_name: 'VENDA LOJA', is_venda_loja: true },
        ] as any,
      }),
    )

    expect(result.current?.meta).toBe(50)
  })

  it('recalcula ao mudar projectionMode (guarda regressao do dep array)', () => {
    const props = {
      checkins: [],
      todayCheckin: null,
      profile,
      sellerGoals: [{ user_id: 'seller-1', target: 30 }],
      storeGoal: null,
      ranking,
      projectionMode: 'calendar' as const,
    }
    const { result, rerender } = renderHook((p) => useSellerMetrics(p), {
      initialProps: props,
    })
    const first = result.current
    rerender({ ...props, projectionMode: 'business' })
    // Com projectionMode no dep array, o useMemo recomputa -> nova referencia.
    expect(result.current).not.toBe(first)
  })
})

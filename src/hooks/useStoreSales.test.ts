import { describe, it, expect } from 'bun:test'
import { renderHook } from '@testing-library/react'
import { useStoreSales } from './useStoreSales'

describe('Elite Arena Integration Logic (useStoreSales)', () => {
  const mockCheckins = [
    { seller_user_id: '1', vnd_porta_prev_day: 1, vnd_cart_prev_day: 1, vnd_net_prev_day: 1, is_venda_loja: false },
    { seller_user_id: '2', vnd_porta_prev_day: 5, vnd_cart_prev_day: 0, vnd_net_prev_day: 0, is_venda_loja: true },
  ]

  const mockRanking = [
    { user_id: '1', user_name: 'Vendedor 1', is_venda_loja: false, vnd_total: 3, leads: 10, agd_total: 5, visitas: 3, meta: 10, atingimento: 0, projecao: 0, ritmo: 0, efficiency: 0, status: { label: '', color: '' }, gap: 0, position: 0 },
    { user_id: '2', user_name: 'VENDA LOJA', is_venda_loja: true, vnd_total: 5, leads: 0, agd_total: 0, visitas: 0, meta: 5, atingimento: 0, projecao: 0, ritmo: 0, efficiency: 0, status: { label: '', color: '' }, gap: 0, position: 0 },
  ]

  it('should include Venda Loja in store total when rule is enabled', () => {
    const { result } = renderHook(() => useStoreSales({
      checkins: mockCheckins as any,
      ranking: mockRanking as any,
      rules: { monthly_goal: 100, include_venda_loja_in_store_total: true } as any
    }))
    
    // 3 (seller) + 5 (venda loja) = 8
    expect(result.current.storeTotalVendas).toBe(8)
  })

  it('should exclude Venda Loja from store total when rule is disabled', () => {
    const { result } = renderHook(() => useStoreSales({
      checkins: mockCheckins as any,
      ranking: mockRanking as any,
      rules: { monthly_goal: 100, include_venda_loja_in_store_total: false } as any
    }))
    
    // Only 3 (seller)
    expect(result.current.storeTotalVendas).toBe(3)
  })

  it('keeps Venda Loja at zero even when the legacy individual-goal flag is enabled', () => {
    const { result } = renderHook(() => useStoreSales({
      checkins: mockCheckins as any,
      ranking: mockRanking as any,
      rules: { monthly_goal: 100, include_venda_loja_in_individual_goal: true } as any
    }))
    
    const vendaLojaEntry = result.current.processedRanking.find(r => r.is_venda_loja)
    expect(vendaLojaEntry?.meta).toBe(0)
    expect(vendaLojaEntry?.atingimento).toBe(0)
  })
})

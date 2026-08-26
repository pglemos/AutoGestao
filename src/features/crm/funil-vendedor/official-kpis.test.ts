import { describe, expect, it } from 'bun:test'
import { resolveOfficialSellerKpis } from './official-kpis'
import type { FunnelKpis } from '@/features/crm/lib/funil-vendas-diagnostico'

const dashboardKpis: FunnelKpis = {
  meta: 10,
  realizado: 1,
  faltam: 9,
  diasUteisRestantes: 12,
  necessarioPorDia: 0.75,
  probabilidade: 10,
  metaBatida: false,
}

describe('official seller kpis', () => {
  it('uses official performance for missing sales when local funnel data diverges', () => {
    const resolved = resolveOfficialSellerKpis(dashboardKpis, {
      meta: 10,
      vendas_realizadas: 7,
      vendas_projetadas: 8,
    })

    expect(dashboardKpis.faltam).toBe(9)
    expect(resolved.realizado).toBe(7)
    expect(resolved.faltam).toBe(3)
    expect(resolved.necessarioPorDia).toBe(0.25)
    expect(resolved.probabilidade).toBe(80)
  })

  it('returns the dashboard snapshot when official performance is unavailable', () => {
    expect(resolveOfficialSellerKpis(dashboardKpis, null)).toBe(dashboardKpis)
  })

  it('keeps goal-dependent values null when no goal is configured', () => {
    const resolved = resolveOfficialSellerKpis({ ...dashboardKpis, meta: null }, {
      meta: 0,
      vendas_realizadas: 3,
      vendas_projetadas: 5,
    })

    expect(resolved.meta).toBeNull()
    expect(resolved.faltam).toBeNull()
    expect(resolved.metaBatida).toBe(false)
    expect(resolved.necessarioPorDia).toBeNull()
    expect(resolved.probabilidade).toBeNull()
  })

  it('keeps an explicit official zero instead of restoring the local goal', () => {
    const resolved = resolveOfficialSellerKpis(dashboardKpis, {
      meta: 0,
      vendas_realizadas: 3,
      vendas_projetadas: 5,
    })

    expect(resolved.meta).toBe(0)
    expect(resolved.faltam).toBe(0)
    expect(resolved.metaBatida).toBe(false)
  })

  it('reports a completed goal and no daily pace when the official goal is met', () => {
    const resolved = resolveOfficialSellerKpis(dashboardKpis, {
      meta: 10,
      vendas_realizadas: 12,
      vendas_projetadas: 12,
    })

    expect(resolved.faltam).toBe(0)
    expect(resolved.metaBatida).toBe(true)
    expect(resolved.necessarioPorDia).toBeNull()
  })

  it('does not calculate daily pace after the working period ends', () => {
    const resolved = resolveOfficialSellerKpis({ ...dashboardKpis, diasUteisRestantes: 0 }, {
      meta: 10,
      vendas_realizadas: 7,
      vendas_projetadas: 8,
    })

    expect(resolved.faltam).toBe(3)
    expect(resolved.metaBatida).toBe(false)
    expect(resolved.necessarioPorDia).toBeNull()
  })
})

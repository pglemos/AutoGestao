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
})

import type { OfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import type { FunnelKpis } from '@/features/crm/lib/funil-vendas-diagnostico'

type OfficialPerformanceSnapshot = Pick<OfficialSellerPerformance, 'meta' | 'vendas_realizadas' | 'vendas_projetadas'>

export function resolveOfficialSellerKpis(
  dashboardKpis: FunnelKpis,
  officialPerformance: OfficialPerformanceSnapshot | null,
): FunnelKpis {
  if (!officialPerformance) return dashboardKpis

  const clientMeta = dashboardKpis.meta
  const officialMeta = officialPerformance.meta > 0 ? officialPerformance.meta : null
  const meta = clientMeta !== null && clientMeta > 0 ? clientMeta : officialMeta
  const realizado = officialPerformance.vendas_realizadas
  const faltam = meta !== null ? Math.max(meta - realizado, 0) : null
  const hasMeta = meta !== null && meta > 0
  const metaBatida = hasMeta && realizado >= meta
  const necessarioPorDia = faltam === null || metaBatida || dashboardKpis.diasUteisRestantes <= 0
    ? null
    : Math.round(((faltam ?? 0) / dashboardKpis.diasUteisRestantes) * 100) / 100

  return {
    ...dashboardKpis,
    meta,
    realizado,
    faltam,
    necessarioPorDia,
    metaBatida,
    probabilidade: hasMeta ? Math.min(100, (officialPerformance.vendas_projetadas / meta) * 100) : null,
  }
}

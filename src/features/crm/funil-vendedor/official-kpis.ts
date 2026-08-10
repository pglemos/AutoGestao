import type { OfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import type { FunnelKpis } from '@/features/crm/lib/funil-vendas-diagnostico'

type OfficialPerformanceSnapshot = Pick<OfficialSellerPerformance, 'meta' | 'vendas_realizadas' | 'vendas_projetadas'>

export function resolveOfficialSellerKpis(
  dashboardKpis: FunnelKpis,
  officialPerformance: OfficialPerformanceSnapshot | null,
): FunnelKpis {
  if (!officialPerformance) return dashboardKpis

  const clientMeta = dashboardKpis.meta
  const meta = clientMeta !== null && clientMeta > 0 ? clientMeta : officialPerformance.meta
  const realizado = officialPerformance.vendas_realizadas
  const faltam = Math.max(meta - realizado, 0)
  const metaBatida = meta > 0 && realizado >= meta
  const necessarioPorDia = metaBatida || dashboardKpis.diasUteisRestantes <= 0
    ? null
    : Math.round((faltam / dashboardKpis.diasUteisRestantes) * 100) / 100

  return {
    ...dashboardKpis,
    meta,
    realizado,
    faltam,
    necessarioPorDia,
    metaBatida,
    probabilidade: meta > 0 ? Math.min(100, (officialPerformance.vendas_projetadas / meta) * 100) : null,
  }
}

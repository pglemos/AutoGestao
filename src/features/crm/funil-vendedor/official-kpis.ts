import type { OfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import type { FunnelKpis } from '@/features/crm/lib/funil-vendas-diagnostico'

type OfficialPerformanceSnapshot = Pick<OfficialSellerPerformance, 'meta' | 'vendas_realizadas' | 'vendas_projetadas'>

export function resolveOfficialSellerKpis(
  dashboardKpis: FunnelKpis,
  officialPerformance: OfficialPerformanceSnapshot | null,
): FunnelKpis {
  if (!officialPerformance) return dashboardKpis

  // The official RPC resolves both explicit individual targets and the
  // eligible-seller fallback. Its value wins even when the saved target is 0.
  const officialMeta = Number.isFinite(officialPerformance.meta) && officialPerformance.meta >= 0
    ? officialPerformance.meta
    : null
  // A zero from the RPC also represents the absence of a store rule. Keep the
  // existing empty-state contract when the local dashboard has no configured
  // goal at all; an explicit individual zero is already represented locally as
  // `dashboardKpis.meta === 0` and remains visible as zero.
  const meta = officialMeta === 0 && dashboardKpis.meta === null
    ? null
    : officialMeta ?? dashboardKpis.meta
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

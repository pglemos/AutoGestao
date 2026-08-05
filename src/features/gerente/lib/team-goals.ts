/**
 * Leitura de metas da equipe a partir da RPC canônica
 * `vendedor_performance_oficial` — que já resolve meta individual
 * (monthly_goal rateado por vendedor ativo, ou `metas.target` quando o modo é
 * 'custom'), vendas realizadas e projeção do período no servidor.
 *
 * Aqui só classificamos e somamos. Nada de número inventado: vendedor de venda
 * da loja (`is_venda_loja`) volta com meta 0 e é tratado como "sem meta".
 */
import type { OfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'

export type TeamGoalStatus = 'excelente' | 'bom' | 'atencao' | 'critico' | 'sem_meta'

export type TeamGoalRow = {
  id: string
  name: string
  meta: number
  realizado: number
  projecao: number
  atingimento: number | null
  status: TeamGoalStatus
}

export type TeamGoalTotals = {
  meta: number
  realizado: number
  projecao: number
  atingimento: number | null
  projetado: number | null
  gap: number
  comMeta: number
}

/**
 * - excelente: já bateu a meta.
 * - bom: no ritmo atual, a projeção fecha a meta.
 * - atencao: projeção entre 70% e 100% da meta — recuperável no período.
 * - critico: projeção abaixo de 70%.
 */
export function classifySeller(meta: number, realizado: number, projecao: number): TeamGoalStatus {
  if (meta <= 0) return 'sem_meta'
  if (realizado >= meta) return 'excelente'
  if (projecao >= meta) return 'bom'
  if (projecao >= meta * 0.7) return 'atencao'
  return 'critico'
}

export function buildTeamGoalRows(rows: OfficialSellerPerformance[]): TeamGoalRow[] {
  return rows
    .map((row) => {
      const meta = Number(row.meta) || 0
      const realizado = Number(row.vendas_realizadas) || 0
      const projecao = Math.round(Number(row.vendas_projetadas) || 0)
      return {
        id: row.seller_user_id,
        name: row.seller_name || 'Vendedor sem cadastro',
        meta,
        realizado,
        projecao,
        atingimento: meta > 0 ? Math.round((realizado / meta) * 100) : null,
        status: classifySeller(meta, realizado, projecao),
      }
    })
    .sort((a, b) => b.realizado - a.realizado || a.name.localeCompare(b.name, 'pt-BR'))
}

export function buildTeamGoalTotals(rows: TeamGoalRow[]): TeamGoalTotals {
  const comMeta = rows.filter((row) => row.meta > 0)
  const meta = comMeta.reduce((acc, row) => acc + row.meta, 0)
  // Realizado soma todo mundo: venda de loja conta para o resultado, mesmo sem
  // meta individual atribuída.
  const realizado = rows.reduce((acc, row) => acc + row.realizado, 0)
  const projecao = rows.reduce((acc, row) => acc + row.projecao, 0)
  return {
    meta,
    realizado,
    projecao,
    atingimento: meta > 0 ? Math.round((realizado / meta) * 100) : null,
    projetado: meta > 0 ? Math.round((projecao / meta) * 100) : null,
    gap: Math.max(meta - realizado, 0),
    comMeta: comMeta.length,
  }
}

export function countByStatus(rows: TeamGoalRow[]): Record<TeamGoalStatus, number> {
  const counts: Record<TeamGoalStatus, number> = { excelente: 0, bom: 0, atencao: 0, critico: 0, sem_meta: 0 }
  for (const row of rows) counts[row.status] += 1
  return counts
}

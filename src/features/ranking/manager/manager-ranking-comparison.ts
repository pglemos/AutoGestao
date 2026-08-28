import type { RankedVendedor } from '@/features/ranking/hooks/useStoreRankingPageData'

/**
 * Lógica do Comparativo de Vendedores (porte do `ComparativoVendedores` do
 * Base44). Fica separada do componente para ser testável sem render.
 *
 * Article IV — No Invention: o Base44 comparava também vendas por canal
 * (showroom/internet/carteira) e clientes qualificados. O agregador de ranking
 * do MX (`useStoreRankingPageData`) não apura esses recortes, então essas linhas
 * não foram portadas — não há número real para colocar nelas.
 */

import { chartTokens } from '@/lib/charts/tokens'

export const COMPARISON_SIDE_A = chartTokens.success()
export const COMPARISON_SIDE_B = chartTokens.series.s6()

export type ComparisonRadarPoint = { metric: string; a: number; b: number }

function normalize(value: number, max: number): number {
  return max > 0 ? Math.round(Math.min((value / max) * 100, 100)) : 0
}

export function buildComparisonRadar(a: RankedVendedor, b: RankedVendedor): ComparisonRadarPoint[] {
  const maxScheduling = Math.max(a.agendamentos, b.agendamentos, 1)
  const maxServed = Math.max(a.visitas, b.visitas, 1)
  return [
    { metric: 'Meta', a: a.atingimento ?? 0, b: b.atingimento ?? 0 },
    { metric: 'Conversão', a: a.conversao ?? 0, b: b.conversao ?? 0 },
    { metric: 'Rotina', a: a.rotina ?? 0, b: b.rotina ?? 0 },
    { metric: 'Agendamentos', a: normalize(a.agendamentos, maxScheduling), b: normalize(b.agendamentos, maxScheduling) },
    { metric: 'Atendimentos', a: normalize(a.visitas, maxServed), b: normalize(b.visitas, maxServed) },
  ]
}

/** Vencedor por pontuação geral. `null` = empate ou pontuação não apurada. */
export function resolveComparisonWinner(a: RankedVendedor, b: RankedVendedor): RankedVendedor | null {
  if (a.pontuacao === null || b.pontuacao === null) return null
  if (a.pontuacao > b.pontuacao) return a
  if (b.pontuacao > a.pontuacao) return b
  return null
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name
}

export function buildComparisonInsights(a: RankedVendedor, b: RankedVendedor): string[] {
  const insights: string[] = []

  // Sem meta individual não há atingimento a comparar — mesma regra da rotina.
  if (a.atingimento !== null && b.atingimento !== null && a.atingimento !== b.atingimento) {
    const [best, other] = a.atingimento > b.atingimento ? [a, b] : [b, a]
    insights.push(`${best.nome} está com melhor atingimento de meta (${best.atingimento}% vs ${other.atingimento}%).`)
  }
  // Sem atendimento não há conversão a comparar — mesma regra do atingimento.
  if (a.conversao !== null && b.conversao !== null && a.conversao !== b.conversao) {
    const [best, other] = a.conversao > b.conversao ? [a, b] : [b, a]
    insights.push(`${best.nome} converte melhor (${best.conversao}% vs ${other.conversao}%) — repasse a abordagem para ${firstName(other.nome)}.`)
  }
  if (a.rotina !== null && b.rotina !== null && a.rotina !== b.rotina) {
    const [best, other] = a.rotina > b.rotina ? [a, b] : [b, a]
    insights.push(`${best.nome} tem rotina mais disciplinada (${best.rotina}% vs ${other.rotina}%) — reforço de rotina recomendado a ${firstName(other.nome)}.`)
  }
  if (a.agendamentos !== b.agendamentos) {
    const [best, other] = a.agendamentos > b.agendamentos ? [a, b] : [b, a]
    insights.push(`${best.nome} agendou mais (${best.agendamentos} vs ${other.agendamentos}) — base de pipeline maior.`)
  }
  if (a.visitas !== b.visitas) {
    const [best, other] = a.visitas > b.visitas ? [a, b] : [b, a]
    insights.push(`${best.nome} atendeu mais (${best.visitas} vs ${other.visitas}) — volume de oportunidades superior.`)
  }

  if (insights.length === 0) {
    insights.push('Os dois vendedores estão com indicadores muito próximos neste período.')
  }
  return insights
}

export function initials(name: string): string {
  if (!name?.trim()) return '?'
  return name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toLocaleUpperCase('pt-BR')
}

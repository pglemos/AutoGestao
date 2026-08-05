import type { RankingEntry } from '@/types/database'

/**
 * Motor de recomendações do Mentor Gerencial (porte da regra do Base44).
 *
 * Article IV — No Invention: cada recomendação nasce de um fato já apurado pelo
 * dashboard da loja (fechamento pendente, execução de rotina, meta proporcional).
 * Regras do Base44 que dependiam de campos inexistentes no MX — "dias sem venda"
 * (exige a data da última venda por vendedor) e "carteira sem contato há 48h"
 * (exige `ultimo_contato` no cliente) — ficaram de fora em vez de serem
 * aproximadas por um número parecido.
 */

export type MentorLevel = 'critico' | 'atencao'
export type MentorType = 'fechamento' | 'rotina' | 'meta'

export type MentorRecommendation = {
  level: MentorLevel
  type: MentorType
  message: string
  action: string
}

export type MentorSituation = 'controlada' | 'atencao' | 'critica'

/** Abaixo disso a rotina do vendedor é tratada como crítica — mesmo corte do Base44. */
export const MENTOR_CRITICAL_ROUTINE = 60

export type MentorRulesInput = {
  ranking: RankingEntry[]
  pendingDisciplineSellers: Array<{ name: string }>
  goalValue: number
  totalSales: number
  elapsedDays: number
  totalDays: number
}

export function buildMentorRecommendations({
  ranking,
  pendingDisciplineSellers,
  goalValue,
  totalSales,
  elapsedDays,
  totalDays,
}: MentorRulesInput): MentorRecommendation[] {
  const recommendations: MentorRecommendation[] = []

  for (const seller of pendingDisciplineSellers) {
    recommendations.push({
      level: 'atencao',
      type: 'fechamento',
      message: `${seller.name} ainda não realizou o fechamento diário.`,
      action: 'Cobre o registro até o prazo limite e confirme a inserção dos atendimentos.',
    })
  }

  for (const row of ranking) {
    const routine = row.routine_execution
    if (routine === null || routine === undefined) continue
    if (routine >= MENTOR_CRITICAL_ROUTINE) continue
    recommendations.push({
      level: 'critico',
      type: 'rotina',
      message: `${row.user_name} está com rotina crítica (${Math.round(routine)}%).`,
      action: 'Chame individualmente, identifique o bloco mais fraco e alinhe o foco do dia.',
    })
  }

  if (goalValue > 0 && totalDays > 0 && elapsedDays > 0) {
    const proportionalGoal = (goalValue / totalDays) * elapsedDays
    if (totalSales < proportionalGoal) {
      recommendations.push({
        level: 'critico',
        type: 'meta',
        message: `Loja abaixo da meta proporcional. Realizado: ${totalSales} / Necessário: ${Math.ceil(proportionalGoal)}.`,
        action: 'Distribua a meta restante entre os vendedores e realize reunião de alinhamento de urgência.',
      })
    }
  }

  return recommendations
}

export function resolveMentorSituation(recommendations: MentorRecommendation[]): MentorSituation {
  const critical = recommendations.filter(item => item.level === 'critico').length
  if (critical > 2) return 'critica'
  if (recommendations.length > 0) return 'atencao'
  return 'controlada'
}

export function countMentorLevels(recommendations: MentorRecommendation[]) {
  return {
    critical: recommendations.filter(item => item.level === 'critico').length,
    attention: recommendations.filter(item => item.level === 'atencao').length,
    total: recommendations.length,
  }
}

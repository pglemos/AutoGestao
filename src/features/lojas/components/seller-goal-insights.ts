/**
 * Insights da edição de metas individuais (porte do `EdicaoMetaVendedores` do
 * Base44): classificação por faixa de atingimento, contagem por status e a
 * recomendação automática exibida acima da tabela.
 *
 * Só depende do que já está na tela — meta editada e realizado oficial do
 * período. Nenhuma projeção nova é inventada aqui.
 */

export type SellerGoalStatus = 'acima' | 'no_ritmo' | 'risco' | 'critico' | 'sem_meta'

export type SellerGoalRow = {
  id: string
  name: string
  realized: number
  goal: number
}

export type SellerGoalRecommendation = {
  tone: 'positivo' | 'atencao' | 'risco'
  title: string
  text: string
}

export function attainmentOf(row: SellerGoalRow): number | null {
  if (row.goal <= 0) return null
  return Math.round((row.realized / row.goal) * 100)
}

export function classifySellerGoal(row: SellerGoalRow): SellerGoalStatus {
  const attainment = attainmentOf(row)
  if (attainment === null) return 'sem_meta'
  if (attainment >= 100) return 'acima'
  if (attainment >= 90) return 'no_ritmo'
  if (attainment >= 70) return 'risco'
  return 'critico'
}

export function countSellerGoalStatuses(rows: SellerGoalRow[]): Record<SellerGoalStatus, number> {
  const counts: Record<SellerGoalStatus, number> = { acima: 0, no_ritmo: 0, risco: 0, critico: 0, sem_meta: 0 }
  for (const row of rows) counts[classifySellerGoal(row)] += 1
  return counts
}

export function buildSellerGoalRecommendation(rows: SellerGoalRow[]): SellerGoalRecommendation | null {
  if (rows.length === 0) return null

  const counts = countSellerGoalStatuses(rows)
  if (counts.sem_meta > rows.length / 2) {
    return {
      tone: 'atencao',
      title: 'Metas não definidas',
      text: `${counts.sem_meta} de ${rows.length} vendedores estão sem meta individual. Defina metas para todos para acompanhar o desempenho da equipe.`,
    }
  }

  const behind = rows
    .filter(row => row.goal > 0 && (attainmentOf(row) as number) < 80)
    .sort((left, right) => (attainmentOf(left) as number) - (attainmentOf(right) as number))
    .slice(0, 2)

  if (behind.length > 0) {
    const second = behind[1] ? ` e ${behind[1].name} em ${attainmentOf(behind[1])}%` : ''
    return {
      tone: 'risco',
      title: 'Foco em vendedores com baixo desempenho',
      text: `${behind[0].name} está em ${attainmentOf(behind[0])}% da meta${second}. Considere um plano de ação individual.`,
    }
  }

  return {
    tone: 'positivo',
    title: 'Equipe no caminho certo',
    text: 'A maioria da equipe está acima de 80% da meta individual. Continue monitorando o ritmo diário.',
  }
}

export function sumSellerGoals(rows: SellerGoalRow[]) {
  const goal = rows.reduce((total, row) => total + row.goal, 0)
  const realized = rows.reduce((total, row) => total + row.realized, 0)
  return { goal, realized, attainment: goal > 0 ? Math.round((realized / goal) * 100) : null }
}

/**
 * Ordenação pura para a Carteira Ativa do Mentor Comercial (TASK 28 / TAREFA A04).
 *
 * Regra de Ordenação Padrão:
 * 1. Prioridade DESC (`priority_index` / `priorityIndex` maior primeiro)
 * 2. Próxima Ação ASC (`next_action_at` / `nextActionAt` data mais antiga/próxima primeiro)
 * 3. Potencial DESC (`potential` maior primeiro: 'Muito alto' > 'Alto' > 'Médio' > 'Baixo')
 * 4. Score ASC (`mentor_score` / `mentorScore` menor primeiro — menor qualidade exige atenção)
 */

export type CarteiraSortableItem = {
  priority_index?: number | null
  priorityIndex?: number | null
  next_action_at?: string | Date | null
  nextActionAt?: string | Date | null
  potential?: string | null
  mentor_score?: number | null
  mentorScore?: number | null
}

const POTENTIAL_WEIGHTS: Record<string, number> = {
  'Muito alto': 4,
  Alto: 3,
  Médio: 2,
  Baixo: 1,
}

export function getPriorityValue(item: CarteiraSortableItem): number {
  const val = item.priority_index ?? item.priorityIndex
  return typeof val === 'number' && !Number.isNaN(val) ? val : 0
}

export function getNextActionTimestamp(item: CarteiraSortableItem): number {
  const val = item.next_action_at ?? item.nextActionAt
  if (!val) return Infinity
  if (val instanceof Date) {
    const time = val.getTime()
    return Number.isNaN(time) ? Infinity : time
  }
  const parsed = new Date(val).getTime()
  return Number.isNaN(parsed) ? Infinity : parsed
}

export function getPotentialRank(item: CarteiraSortableItem): number {
  const pot = item.potential
  if (!pot) return 0
  const normalized = pot.trim()
  return POTENTIAL_WEIGHTS[normalized] ?? 0
}

export function getScoreValue(item: CarteiraSortableItem): number {
  const val = item.mentor_score ?? item.mentorScore
  return typeof val === 'number' && !Number.isNaN(val) ? val : 0
}

/**
 * Função pura para ordenação determinística de itens da Carteira Ativa.
 */
export function sortCarteiraAtiva<T extends CarteiraSortableItem>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    // 1. Prioridade DESC (maior primeiro)
    const prioA = getPriorityValue(a)
    const prioB = getPriorityValue(b)
    if (prioA !== prioB) {
      return prioB - prioA
    }

    // 2. NextAction ASC (data mais próxima/vencida primeiro, null por último)
    const dateA = getNextActionTimestamp(a)
    const dateB = getNextActionTimestamp(b)
    if (dateA !== dateB) {
      return dateA - dateB
    }

    // 3. Potencial DESC (maior potencial primeiro)
    const potA = getPotentialRank(a)
    const potB = getPotentialRank(b)
    if (potA !== potB) {
      return potB - potA
    }

    // 4. Score ASC (menor score primeiro — atenção prioritária)
    const scoreA = getScoreValue(a)
    const scoreB = getScoreValue(b)
    if (scoreA !== scoreB) {
      return scoreA - scoreB
    }

    return 0
  })
}

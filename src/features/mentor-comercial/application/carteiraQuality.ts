/**
 * Qualidade da Carteira — Mentor Comercial (TASK 20 / TAREFA B05).
 *
 * Função pura determinística para calcular a métrica de Qualidade da Carteira.
 *
 * Fórmula:
 *   Média do score das oportunidades ATIVAS, CLASSIFICADAS e ELEGÍVEIS.
 *
 * ENTRAM:
 *   - Negociação
 *   - Cadência
 *   - Visita
 *   - Proposta
 *   - Financiamento
 *   - Troca
 *   - Pós-venda ativo
 *   - Garantia ativa
 *   - Futuras já ativadas
 *
 * NÃO ENTRAM:
 *   - `needsMentorClassification = true` (ou `needs_mentor_classification = true`)
 *   - Venda encerrada sem ação (ex.: VEN-04, VEN-07)
 *   - Perda encerrada (ex.: PER-02, PER-04, INT-C05)
 *   - Cadência encerrada (ex.: INT-C06, PER-03)
 *   - Contato futuro ainda não ativado (ex.: INT-Q05, PER-05 sem ativação)
 */

import { classifyScore, type ScoreClassification } from '../engine/score'
import { type PotentialLevel } from '../engine/priority'

/**
 * Interface aceita para oportunidade na avaliação de qualidade da carteira.
 * Suporta formatos camelCase (domain/frontend) e snake_case (banco de dados/Supabase).
 */
export type CarteiraOpportunityInput = {
  id?: string
  opportunityId?: string
  opportunity_id?: string
  clientId?: string
  client_id?: string
  clientName?: string
  client_name?: string

  statusCode?: string | null
  status_code?: string | null
  currentStatusCode?: string | null
  current_status_code?: string | null

  statusFamily?: string | null
  status_family?: string | null
  family?: string | null

  activeInPortfolio?: boolean | string | null
  active_in_portfolio?: boolean | string | null

  needsMentorClassification?: boolean | null
  needs_mentor_classification?: boolean | null

  futureActivated?: boolean | null
  future_activated?: boolean | null

  mentorScore?: number | null
  mentor_score?: number | null
  score?: number | null

  potential?: PotentialLevel | string | null
}

/** Item retornado na lista de Alto Potencial em Risco */
export type HighPotentialAtRiskItem = {
  opportunityId: string
  clientId?: string
  clientName?: string
  statusCode: string
  potential: PotentialLevel | string
  score: number
  scoreClassification: ScoreClassification
}

/** Distribuição detalhada por classe de score */
export type CarteiraClassDistribution = Record<
  ScoreClassification,
  {
    count: number
    percentage: number
  }
>

/** Resultado completo da apuração de qualidade da carteira */
export type CarteiraQualityResult = {
  totalAnalyzed: number
  totalEligible: number
  totalExcluded: number
  averageScore: number // Percentual (0-100)
  overallClassification: ScoreClassification
  distribution: CarteiraClassDistribution
  distributionCounts: Record<ScoreClassification, number>
  highPotentialAtRisk: HighPotentialAtRiskItem[]
}

/** Status explicitamente encerrados ou não elegíveis */
const EXCLUDED_STATUS_CODES = new Set([
  // Venda encerrada sem ação
  'VEN-04',
  'VEN-07',
  // Perda encerrada
  'PER-02',
  'PER-04',
  'INT-C05',
  // Cadência encerrada
  'INT-C06',
  'PER-03',
])

/** Status de contato futuro (não ativado por padrão) */
const FUTURE_CONTACT_STATUS_CODES = new Set([
  'INT-Q05',
  'PER-05',
])

/**
 * Predicado puro que avalia se uma oportunidade é elegível para entrar no cálculo
 * de Qualidade da Carteira.
 */
export function isEligibleForCarteiraQuality(item: CarteiraOpportunityInput): boolean {
  // 1. Oportunidade não classificada NÃO entra (§ "needsMentorClassification = true")
  if (item.needsMentorClassification === true || item.needs_mentor_classification === true) {
    return false
  }

  // 2. Score precisa ser um número válido
  const score = item.mentorScore ?? item.mentor_score ?? item.score
  if (score === null || score === undefined || Number.isNaN(score)) {
    return false
  }

  const statusCode = (
    item.statusCode ??
    item.status_code ??
    item.currentStatusCode ??
    item.current_status_code ??
    ''
  )
    .trim()
    .toUpperCase()

  // 3. Status de encerramento / perda / cadência concluída não entram
  if (EXCLUDED_STATUS_CODES.has(statusCode)) {
    return false
  }

  // 4. Contato futuro ainda não ativado não entra
  if (FUTURE_CONTACT_STATUS_CODES.has(statusCode)) {
    const isActivated = item.futureActivated === true || item.future_activated === true
    if (!isActivated) {
      return false
    }
  }

  // 5. Verificação de activeInPortfolio quando fornecido (ex: 'Não' / false)
  const activeInPortfolio = item.activeInPortfolio ?? item.active_in_portfolio
  if (
    activeInPortfolio === false ||
    activeInPortfolio === 'Não' ||
    activeInPortfolio === 'Nao' ||
    activeInPortfolio === 'nao'
  ) {
    const isFutureActivated = item.futureActivated === true || item.future_activated === true
    if (!isFutureActivated && statusCode !== 'PER-06' && statusCode !== 'CAR-C07') {
      return false
    }
  }

  return true
}

/**
 * Calcula a Qualidade da Carteira com base no score das oportunidades ativas,
 * classificadas e elegíveis.
 *
 * @param opportunities Lista de oportunidades a serem avaliadas
 * @param options Opções adicionais (ex.: limiar de score baixo para alto potencial em risco)
 * @returns Resultado detalhado da qualidade da carteira
 */
export function computeCarteiraQuality(
  opportunities: CarteiraOpportunityInput[],
  options?: {
    /** Score limite considerado "baixo" para alto potencial em risco (padrão: 75) */
    riskScoreThreshold?: number
  },
): CarteiraQualityResult {
  const riskScoreThreshold = options?.riskScoreThreshold ?? 75

  let scoreSum = 0
  let eligibleCount = 0
  let excludedCount = 0

  const counts: Record<ScoreClassification, number> = {
    Excelente: 0,
    Boa: 0,
    Atenção: 0,
    Crítica: 0,
  }

  const highPotentialAtRisk: HighPotentialAtRiskItem[] = []

  for (const item of opportunities) {
    if (!isEligibleForCarteiraQuality(item)) {
      excludedCount++
      continue
    }

    eligibleCount++
    const score = item.mentorScore ?? item.mentor_score ?? item.score ?? 0
    scoreSum += score

    const classification = classifyScore(score)
    counts[classification]++

    // Identificar Oportunidade de "Alto potencial em risco"
    // (Potencial Alto ou Muito Alto com score baixo)
    const potRaw = (item.potential ?? '').trim()
    const potNormalized = potRaw.toLowerCase()
    const isHighPotential =
      potNormalized === 'alto' ||
      potNormalized === 'muito alto' ||
      potRaw === 'Alto' ||
      potRaw === 'Muito alto'

    if (isHighPotential && score < riskScoreThreshold) {
      const oppId =
        item.opportunityId ??
        item.opportunity_id ??
        item.id ??
        `opp_${eligibleCount}`

      const statusCode =
        item.statusCode ??
        item.status_code ??
        item.currentStatusCode ??
        item.current_status_code ??
        'N/A'

      highPotentialAtRisk.push({
        opportunityId: oppId,
        clientId: item.clientId ?? item.client_id,
        clientName: item.clientName ?? item.client_name,
        statusCode,
        potential: potRaw as PotentialLevel,
        score,
        scoreClassification: classification,
      })
    }
  }

  const averageScore =
    eligibleCount > 0 ? Math.round((scoreSum / eligibleCount) * 10) / 10 : 0
  const overallClassification = classifyScore(averageScore)

  const calcPercentage = (count: number): number => {
    if (eligibleCount === 0) return 0
    return Math.round((count / eligibleCount) * 1000) / 10
  }

  const distribution: CarteiraClassDistribution = {
    Excelente: {
      count: counts.Excelente,
      percentage: calcPercentage(counts.Excelente),
    },
    Boa: {
      count: counts.Boa,
      percentage: calcPercentage(counts.Boa),
    },
    Atenção: {
      count: counts.Atenção,
      percentage: calcPercentage(counts.Atenção),
    },
    Crítica: {
      count: counts.Crítica,
      percentage: calcPercentage(counts.Crítica),
    },
  }

  return {
    totalAnalyzed: opportunities.length,
    totalEligible: eligibleCount,
    totalExcluded: excludedCount,
    averageScore,
    overallClassification,
    distribution,
    distributionCounts: counts,
    highPotentialAtRisk,
  }
}

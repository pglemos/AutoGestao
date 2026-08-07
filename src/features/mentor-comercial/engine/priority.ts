/**
 * Prioridade oficial do Mentor Comercial (TASK 18).
 *
 * Fonte: aba `07 Score_Prioridade` (escala de potencial e faixas de prioridade)
 * e §32 do prompt mestre (fórmula 45/35/20, escala de urgência e overrides).
 *
 * Separação conceitual que o produto exige (§43):
 *   score     = QUALIDADE da condução
 *   priority  = URGÊNCIA da ação
 * São dimensões distintas e nunca devem ser fundidas.
 *
 * Determinístico e puro: sem IA, sem banco, sem relógio próprio.
 */

import { classifyScore } from './score'

/** Pontuação de potencial comercial. Fonte: planilha, linhas 23-26. */
export const POTENTIAL_POINTS = {
  'Muito alto': 100,
  Alto: 75,
  'Médio': 50,
  Baixo: 25,
} as const

export type PotentialLevel = keyof typeof POTENTIAL_POINTS

/** Pontuação de urgência. Fonte: §32. */
export const URGENCY_POINTS = {
  /** Cliente respondeu e aguarda o vendedor — maior urgência operacional. */
  clientRespondedAwaitingSeller: 100,
  actionOverdue: 95,
  actionToday: 90,
  actionTomorrow: 75,
  actionWithin3Days: 55,
  actionFuture: 25,
} as const

export type UrgencyLevel = keyof typeof URGENCY_POINTS

export type PriorityClassification = 'Máxima' | 'Alta' | 'Média' | 'Baixa'

/**
 * Overrides de piso. Nenhum deles rebaixa prioridade: só elevam.
 * `clientResponded` é o fato bruto; os dois derivados de SLA só podem ser
 * usados quando existe SLA configurado (§33 — nunca inventar SLA).
 */
export type PriorityOverrides = {
  clientResponded?: boolean
  clientRespondedWithinSla?: boolean
  clientRespondedSlaBreached?: boolean
  actionOverdueOver24h?: boolean
  visitToday?: boolean
  financingApproved?: boolean
  readyToClose?: boolean
}

export type PriorityInput = {
  urgency: UrgencyLevel
  potential: PotentialLevel
  /** Score de condução (0-100). Usado apenas para derivar o risco. */
  score: number
  overrides?: PriorityOverrides
  /**
   * SLA de resposta do vendedor, em minutos, vindo de StoreCommercialSettings.
   * `null` significa NÃO CONFIGURADO: não se presume valor e não se penaliza.
   */
  slaMinutes?: number | null
}

export type PriorityResult = {
  index: number
  classification: PriorityClassification
  urgencyPoints: number
  potentialPoints: number
  risk: number
  appliedOverrides: Array<keyof PriorityOverrides>
  slaConfigured: boolean
  /** Classe antes de qualquer override, para auditoria e explicação ao vendedor. */
  baseClassification: PriorityClassification
}

/** Pesos da fórmula oficial. */
const WEIGHT_URGENCY = 0.45
const WEIGHT_POTENTIAL = 0.35
const WEIGHT_RISK = 0.2

/** Faixas de prioridade (planilha, linhas 28-31). Limite inferior inclusivo. */
export function classifyPriority(index: number): PriorityClassification {
  if (index >= 85) return 'Máxima'
  if (index >= 70) return 'Alta'
  if (index >= 50) return 'Média'
  return 'Baixa'
}

const CLASS_RANK: Record<PriorityClassification, number> = {
  Baixa: 0,
  'Média': 1,
  Alta: 2,
  'Máxima': 3,
}

/** Overrides que garantem no mínimo `Alta`. */
const MIN_HIGH_OVERRIDES: Array<keyof PriorityOverrides> = [
  'clientResponded',
  'clientRespondedWithinSla',
  'actionOverdueOver24h',
  'visitToday',
  'financingApproved',
  'readyToClose',
]

/**
 * Arredondamento meio-para-cima explícito.
 * `Math.round` já se comporta assim para positivos, mas a intenção fica registrada
 * porque a fórmula precisa ser reproduzível fora do JavaScript (SQL, relatórios).
 */
function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5)
}

export function computePriority(input: PriorityInput): PriorityResult {
  const urgencyPoints = URGENCY_POINTS[input.urgency]
  const potentialPoints = POTENTIAL_POINTS[input.potential]
  const risk = 100 - input.score

  const index = roundHalfUp(
    urgencyPoints * WEIGHT_URGENCY + potentialPoints * WEIGHT_POTENTIAL + risk * WEIGHT_RISK,
  )

  const baseClassification = classifyPriority(index)
  const overrides = input.overrides ?? {}
  const slaConfigured = input.slaMinutes !== null && input.slaMinutes !== undefined

  const appliedOverrides: Array<keyof PriorityOverrides> = []
  let classification = baseClassification

  const raiseTo = (target: PriorityClassification, reason: keyof PriorityOverrides) => {
    appliedOverrides.push(reason)
    if (CLASS_RANK[target] > CLASS_RANK[classification]) classification = target
  }

  // `clientRespondedWithinSla` e `clientRespondedSlaBreached` são FATOS já apurados
  // pelo chamador: só é possível produzi-los quando existe SLA configurado. O motor
  // confia neles. O que o motor nunca faz é DERIVAR estouro de SLA a partir de um
  // `slaMinutes` ausente — é por isso que `clientResponded` (fato bruto, sem SLA)
  // existe separado, e `slaConfigured` é reportado para a UI avisar a ausência.
  if (overrides.clientRespondedSlaBreached) {
    raiseTo('Máxima', 'clientRespondedSlaBreached')
  }

  for (const key of MIN_HIGH_OVERRIDES) {
    if (!overrides[key]) continue
    raiseTo('Alta', key)
  }

  return {
    index,
    classification,
    urgencyPoints,
    potentialPoints,
    risk,
    appliedOverrides,
    slaConfigured,
    baseClassification,
  }
}

/** Reexportado para consumidores que exibem score e prioridade lado a lado. */
export { classifyScore }

/**
 * TODO: Função pura de montagem dos 5 blocos da Ficha de Oportunidade.
 * Requisito TASK 29 do Mentor Comercial (MX Performance).
 */

import type { MentorDecision, OpportunityFacts } from '../engine/engine'
import { SCORE_PILLAR_WEIGHTS, type ScoreAlert, type ScorePillar } from '../engine/score'

export type ScorePillarDetail = {
  pillar: ScorePillar
  label: string
  score: number
  maxScore: number
  percentage: number
}

export type FichaHeaderBlock = {
  id: 'cabecalho'
  title: 'Cabeçalho da Oportunidade'
  clientName: string
  vehicleName: string
  sellerName: string
  storeName: string
  statusCode: string
  statusLabel: string
  family: string
  channel: string
  responsible: string
  temperature: string | null
  // Separação estrita e explícita: Qualidade (Score) vs Urgência (Prioridade)
  score: {
    total: number
    classification: string
    breakdown: Record<ScorePillar, number>
    pillarsDetail: ScorePillarDetail[]
    clientNeverResponded: boolean
  }
  priority: {
    index: number
    classification: string
    urgencyLevel: string
    potential: string | null
    appliedOverrides: string[]
    slaConfigured: boolean
    baseClassification: string
  }
}

export type FichaNextActionBlock = {
  id: 'proxima_acao'
  title: 'Próxima Ação Recomendada'
  nextStep: string
  objective: string
  nextActionAt: Date | null
  cadenceCode: string | null
  cadenceMode: string | null
  cadenceStep: number | null
  totalCadenceAttempts: number | null
  scriptId: string | null
  scriptReason: string
  allowWhatsApp: boolean
  isInternalScript: boolean
  centralAction: boolean
  centralRule: string | null
  requiresManualUpdate: boolean
}

export type FactSummaryItem = {
  label: string
  value: string
  type: 'info' | 'success' | 'warning' | 'neutral'
}

export type FichaWhatWeKnowBlock = {
  id: 'o_que_sabemos'
  title: 'O que Sabemos'
  factsSummary: FactSummaryItem[]
  clientInteractionStatus: string
  qualityDetails: {
    status: string
    nextStep: string
    execution: string
    cadence: string
    history: string
  }
  appointmentAt: Date | null
  potential: string | null
  temperature: string | null
}

export type MissingPillarInfo = {
  pillar: ScorePillar
  label: string
  current: number
  max: number
  missing: number
}

export type FichaWhatIsMissingBlock = {
  id: 'o_que_falta'
  title: 'O que Falta para Evoluir'
  pendingFlags: string[]
  scoreAlerts: ScoreAlert[]
  missingPillars: MissingPillarInfo[]
  missingScriptVariables: string[]
  requiresManualUpdate: boolean
  explanations: string[]
}

export type FichaHistoryItem = {
  at: Date
  description: string
  statusCode?: string
  result?: string | null
}

export type FichaHistoryBlock = {
  id: 'historico'
  title: 'Histórico'
  entries: FichaHistoryItem[]
  transitionSummary: string | null
  ruleVersion: string
}

export type FichaBlocks = {
  header: FichaHeaderBlock
  nextAction: FichaNextActionBlock
  whatWeKnow: FichaWhatWeKnowBlock
  whatIsMissing: FichaWhatIsMissingBlock
  history: FichaHistoryBlock
  blocks: [
    FichaHeaderBlock,
    FichaNextActionBlock,
    FichaWhatWeKnowBlock,
    FichaWhatIsMissingBlock,
    FichaHistoryBlock,
  ]
}

export type ExtraFichaFacts = {
  clientName?: string
  vehicleName?: string
  sellerName?: string
  storeName?: string
  historyEntries?: FichaHistoryItem[]
  missingScriptVariables?: string[]
}

export function buildFichaBlocks(
  decision: MentorDecision,
  facts: OpportunityFacts,
  extraFacts?: ExtraFichaFacts,
): FichaBlocks {
  const clientName = extraFacts?.clientName ?? 'Cliente não identificado'
  const vehicleName = extraFacts?.vehicleName ?? 'Veículo não informado'
  const sellerName = extraFacts?.sellerName ?? decision.responsible
  const storeName = extraFacts?.storeName ?? 'Loja'

  const pillarLabels: Record<ScorePillar, string> = {
    status: 'Qualidade do Status',
    nextStep: 'Próximo Passo e Responsável',
    execution: 'Execução no Prazo',
    cadence: 'Respeito à Cadência',
    history: 'Histórico Atualizado',
  }

  const pillarsDetail: ScorePillarDetail[] = (
    Object.keys(SCORE_PILLAR_WEIGHTS) as ScorePillar[]
  ).map((pillar) => {
    const score = decision.score.breakdown[pillar] ?? 0
    const maxScore = SCORE_PILLAR_WEIGHTS[pillar]
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
    return {
      pillar,
      label: pillarLabels[pillar],
      score,
      maxScore,
      percentage,
    }
  })

  // 1. Bloco Cabeçalho
  const header: FichaHeaderBlock = {
    id: 'cabecalho',
    title: 'Cabeçalho da Oportunidade',
    clientName,
    vehicleName,
    sellerName,
    storeName,
    statusCode: decision.statusCode,
    statusLabel: decision.statusLabel,
    family: decision.family,
    channel: decision.channel,
    responsible: decision.responsible,
    temperature: decision.temperature,
    score: {
      total: decision.score.total,
      classification: decision.score.classification,
      breakdown: decision.score.breakdown,
      pillarsDetail,
      clientNeverResponded: decision.score.clientNeverResponded,
    },
    priority: {
      index: decision.priority.index,
      classification: decision.priority.classification,
      urgencyLevel: decision.urgency,
      potential: decision.potential,
      appliedOverrides: decision.priority.appliedOverrides,
      slaConfigured: decision.priority.slaConfigured,
      baseClassification: decision.priority.baseClassification,
    },
  }

  // 2. Bloco Próxima Ação Recomendada
  const scriptId = decision.script.scriptId
  const isInternalScript = scriptId?.includes('INTERNO') ?? false
  const allowWhatsApp = decision.script.resolved && !isInternalScript

  const nextAction: FichaNextActionBlock = {
    id: 'proxima_acao',
    title: 'Próxima Ação Recomendada',
    nextStep: decision.nextStep,
    objective: decision.objective,
    nextActionAt: decision.nextActionAt,
    cadenceCode: decision.cadenceCode,
    cadenceMode: decision.cadenceMode,
    cadenceStep: decision.cadenceStep,
    totalCadenceAttempts: decision.cadenceState?.totalAttempts ?? null,
    scriptId,
    scriptReason: decision.script.reason,
    allowWhatsApp,
    isInternalScript,
    centralAction: decision.centralAction,
    centralRule: decision.centralRule,
    requiresManualUpdate: decision.requiresManualUpdate,
  }

  // 3. Bloco O que Sabemos
  const clientInteractionStatus = facts.clientRespondedAt
    ? `Cliente respondeu em ${facts.clientRespondedAt.toLocaleDateString('pt-BR')}`
    : facts.clientNeverResponded
      ? 'Cliente nunca respondeu'
      : 'Aguardando retorno do cliente'

  const factsSummary: FactSummaryItem[] = [
    {
      label: 'Canal de Entrada',
      value: decision.channel,
      type: 'info',
    },
    {
      label: 'Temperatura',
      value: decision.temperature ?? 'Não definida',
      type: decision.temperature === 'Quente' ? 'warning' : 'neutral',
    },
    {
      label: 'Potencial Comercial',
      value: decision.potential ?? 'Baixo',
      type: 'info',
    },
    {
      label: 'Interação com Cliente',
      value: clientInteractionStatus,
      type: facts.clientRespondedAt ? 'success' : 'warning',
    },
  ]

  if (facts.appointmentAt) {
    factsSummary.push({
      label: 'Visita / Agendamento',
      value: facts.appointmentAt.toLocaleString('pt-BR'),
      type: 'success',
    })
  }

  const whatWeKnow: FichaWhatWeKnowBlock = {
    id: 'o_que_sabemos',
    title: 'O que Sabemos',
    factsSummary,
    clientInteractionStatus,
    qualityDetails: {
      status: facts.quality.status ?? 'undefined',
      nextStep: facts.quality.nextStep ?? 'missing',
      execution: facts.quality.execution ?? 'lateOver24h',
      cadence: facts.quality.cadence ?? 'broken',
      history: facts.quality.history ?? 'stale',
    },
    appointmentAt: facts.appointmentAt,
    potential: decision.potential,
    temperature: decision.temperature,
  }

  // 4. Bloco O que Falta para Evoluir
  const missingPillars: MissingPillarInfo[] = pillarsDetail
    .filter((p) => p.score < p.maxScore)
    .map((p) => ({
      pillar: p.pillar,
      label: p.label,
      current: p.score,
      max: p.maxScore,
      missing: p.maxScore - p.score,
    }))

  const whatIsMissing: FichaWhatIsMissingBlock = {
    id: 'o_que_falta',
    title: 'O que Falta para Evoluir',
    pendingFlags: decision.pendingFlags,
    scoreAlerts: decision.score.alerts,
    missingPillars,
    missingScriptVariables: extraFacts?.missingScriptVariables ?? [],
    requiresManualUpdate: decision.requiresManualUpdate,
    explanations: decision.explanations,
  }

  // 5. Bloco Histórico
  // TransitionOutcome não carrega origem nem resultado — quem tem essa narrativa
  // pronta é o próprio motor, em `decision.explanations`.
  const transitionSummary = decision.transition
    ? decision.transition.matched && decision.transition.toStatus
      ? `Transição por ${decision.transition.precedence} para "${decision.transition.toStatus}".`
      : 'A última tentativa de transição não casou nenhuma regra da matriz. Use "Atualizar situação".'
    : null

  const history: FichaHistoryBlock = {
    id: 'historico',
    title: 'Histórico',
    entries: extraFacts?.historyEntries ?? [],
    transitionSummary,
    ruleVersion: decision.ruleVersion,
  }

  return {
    header,
    nextAction,
    whatWeKnow,
    whatIsMissing,
    history,
    blocks: [header, nextAction, whatWeKnow, whatIsMissing, history],
  }
}

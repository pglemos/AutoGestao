/**
 * CommercialMentorEngine — núcleo determinístico de decisão (TASK 10).
 *
 * Puro: não conhece React, não conhece Supabase, não tem relógio próprio.
 * `now` entra por parâmetro. Mesma entrada + mesma versão de regras + mesmo
 * instante lógico = exatamente o mesmo resultado.
 *
 * A IA não escolhe status, responsável, objetivo, próximo passo, cadência,
 * temperatura, script, score nem prioridade. Tudo vem do catálogo e das fórmulas.
 */

import {
  advanceCadence,
  isCadenceRef,
  planCadence,
  registerClientResponse,
  type CadenceState,
  type CadenceStepInput,
} from './cadence'
import {
  computePriority,
  type PotentialLevel,
  type PriorityOverrides,
  type PriorityResult,
  type UrgencyLevel,
} from './priority'
import { resolveScriptRef, type ScriptResolution } from './script'
import {
  buildTransitionIndex,
  resolveTransition,
  type TransitionIndex,
  type TransitionOutcome,
  type TransitionRule,
} from './transition'
import {
  computeScore,
  type ScoreInput,
  type ScoreResult,
} from './score'

export type StatusDefinition = {
  statusId: string
  channel: string
  family: string
  label: string
  definition: string | null
  origin: string | null
  responsible: string
  temperature: string | null
  objective: string
  nextStep: string
  cadenceId: string | null
  scriptId: string | null
  potential: string | null
  centralRule: string | null
  activeInPortfolio: string | null
  mentorGuidance: string | null
  mainResults: string | null
  notes: string | null
}

export type CadenceDefinition = { cadenceId: string; attempts: string; dayPattern: string }

export type RuleCatalog = {
  version: string
  statuses: StatusDefinition[]
  cadences: CadenceDefinition[]
  cadenceSteps: Array<{ cadenceId: string; attempt: string; offset: string }>
  scriptIds: ReadonlySet<string>
  transitions: TransitionRule[]
}

export type StoreSettings = {
  /** `null` = não configurado. Nunca presumir valor, nunca penalizar (§33). */
  sellerResponseSlaMinutes: number | null
  postSaleEnabled: boolean
  warrantyFollowupEnabled: boolean
}

export type OpportunityFacts = {
  statusCode: string
  /** Próxima ação programada. `null` quando não há ação pendente. */
  nextActionAt: Date | null
  /** Instante em que o cliente respondeu e ainda aguarda o vendedor. */
  clientRespondedAt: Date | null
  clientNeverResponded: boolean
  appointmentAt: Date | null
  cadenceAttempt: number
  cadenceState: CadenceState | null
  /** Insumos de qualidade dos cinco pilares, apurados pela camada de aplicação. */
  quality: Omit<ScoreInput, 'clientNeverResponded'>
  pendingFlags: string[]
  returnStatusCode: string | null
}

export type MentorEvent = {
  /** Resultado informado pelo vendedor, conforme a coluna `Resultado informado`. */
  result: string
  at: Date
}

export type MentorDecisionInput = {
  facts: OpportunityFacts
  event?: MentorEvent
  storeSettings: StoreSettings
  catalog: RuleCatalog
  now: Date
}

export type MentorDecision = {
  statusCode: string
  previousStatusCode: string | null
  returnStatusCode: string | null
  statusLabel: string
  family: string
  channel: string
  responsible: string
  temperature: string | null
  objective: string
  nextStep: string
  potential: PotentialLevel | null
  cadenceCode: string | null
  cadenceMode: string | null
  cadenceStep: number | null
  cadenceState: CadenceState | null
  script: ScriptResolution
  scriptRef: string | null
  nextActionAt: Date | null
  pendingFlags: string[]
  score: ScoreResult
  priority: PriorityResult
  urgency: UrgencyLevel
  centralAction: boolean
  centralRule: string | null
  attackEligible: boolean
  transition: TransitionOutcome | null
  requiresManualUpdate: boolean
  explanations: string[]
  ruleVersion: string
}

const MS_PER_DAY = 86_400_000

/** Potencial da planilha; valor fora da escala não vira presunção. */
function normalizePotential(value: string | null): PotentialLevel | null {
  if (value === null) return null
  const trimmed = value.trim()
  if (trimmed === 'Muito alto' || trimmed === 'Alto' || trimmed === 'Médio' || trimmed === 'Baixo') {
    return trimmed
  }
  return null
}

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/**
 * Urgência derivada dos fatos, conforme a escala do §32.
 * Cliente aguardando o vendedor domina qualquer prazo.
 */
export function deriveUrgency(facts: OpportunityFacts, now: Date): UrgencyLevel {
  if (facts.clientRespondedAt !== null) return 'clientRespondedAwaitingSeller'
  if (facts.nextActionAt === null) return 'actionFuture'

  const days = Math.round((startOfUtcDay(facts.nextActionAt) - startOfUtcDay(now)) / MS_PER_DAY)
  if (days < 0) return 'actionOverdue'
  if (days === 0) return 'actionToday'
  if (days === 1) return 'actionTomorrow'
  if (days <= 3) return 'actionWithin3Days'
  return 'actionFuture'
}

/**
 * A coluna `Entra na Central quando` é textual. `Não` (e variações) significa
 * que o status nunca gera ação; qualquer outro texto é condicional e depende
 * de a ação estar vencendo hoje ou de o cliente aguardar retorno.
 */
export function derivesCentralAction(
  centralRule: string | null,
  urgency: UrgencyLevel,
): boolean {
  if (centralRule === null) return false
  const rule = centralRule.trim().toLocaleLowerCase('pt-BR')
  if (rule === 'não' || rule === 'nao' || rule.startsWith('não entra')) return false
  if (rule === 'sim') return true
  return (
    urgency === 'clientRespondedAwaitingSeller' ||
    urgency === 'actionOverdue' ||
    urgency === 'actionToday'
  )
}

function buildPriorityOverrides(
  facts: OpportunityFacts,
  statusDef: StatusDefinition,
  settings: StoreSettings,
  now: Date,
): PriorityOverrides {
  const overrides: PriorityOverrides = {}

  if (facts.clientRespondedAt !== null) {
    overrides.clientResponded = true
    // SLA só é avaliado quando configurado. Sem configuração não se deriva
    // estouro e não se penaliza ninguém (§33, Exemplo F).
    if (settings.sellerResponseSlaMinutes !== null) {
      const elapsedMinutes = (now.getTime() - facts.clientRespondedAt.getTime()) / 60_000
      if (elapsedMinutes > settings.sellerResponseSlaMinutes) {
        overrides.clientRespondedSlaBreached = true
      } else {
        overrides.clientRespondedWithinSla = true
      }
    }
  }

  if (facts.nextActionAt !== null) {
    const overdueMs = now.getTime() - facts.nextActionAt.getTime()
    if (overdueMs > MS_PER_DAY) overrides.actionOverdueOver24h = true
  }

  if (
    facts.appointmentAt !== null &&
    startOfUtcDay(facts.appointmentAt) === startOfUtcDay(now)
  ) {
    overrides.visitToday = true
  }

  // Financiamento aprovado e pronto para fechamento vêm do catálogo, não de heurística.
  if (statusDef.family === 'Financiamento' && /aprovad/i.test(statusDef.label)) {
    overrides.financingApproved = true
  }
  if (/pronto para fechamento|fechamento/i.test(statusDef.label)) {
    overrides.readyToClose = true
  }

  return overrides
}

export function buildCatalogIndexes(catalog: RuleCatalog): {
  statusByCode: Map<string, StatusDefinition>
  statusByLabel: Map<string, StatusDefinition>
  transitionIndex: TransitionIndex
  stepsByCadence: Map<string, CadenceStepInput[]>
} {
  const statusByCode = new Map(catalog.statuses.map((s) => [s.statusId, s]))
  const statusByLabel = new Map<string, StatusDefinition>()
  for (const s of catalog.statuses) {
    if (!statusByLabel.has(s.label)) statusByLabel.set(s.label, s)
  }
  const stepsByCadence = new Map<string, CadenceStepInput[]>()
  for (const step of catalog.cadenceSteps) {
    const list = stepsByCadence.get(step.cadenceId) ?? []
    list.push({ attempt: String(step.attempt), offset: String(step.offset) })
    stepsByCadence.set(step.cadenceId, list)
  }
  return {
    statusByCode,
    statusByLabel,
    transitionIndex: buildTransitionIndex(catalog.transitions),
    stepsByCadence,
  }
}

/**
 * Resolve a decisão do Mentor para uma oportunidade.
 *
 * Quando há evento, a transição é aplicada primeiro; o restante da decisão é
 * derivado do status resultante. Sem regra de transição correspondente o status
 * NÃO muda e a decisão exige `Atualizar situação`.
 */
export function resolveMentorDecision(input: MentorDecisionInput): MentorDecision {
  const { facts, event, storeSettings, catalog, now } = input
  const indexes = buildCatalogIndexes(catalog)

  const currentDef = indexes.statusByCode.get(facts.statusCode)
  if (!currentDef) {
    throw new Error(`Status desconhecido no catálogo ${catalog.version}: "${facts.statusCode}"`)
  }

  const explanations: string[] = []
  let statusDef = currentDef
  let previousStatusCode: string | null = null
  let transition: TransitionOutcome | null = null
  let cadenceState = facts.cadenceState

  if (event) {
    transition = resolveTransition(indexes.transitionIndex, {
      statusLabel: currentDef.label,
      family: currentDef.family,
      result: event.result,
      contexts: [currentDef.family],
    })

    if (transition.matched && transition.toStatus !== null) {
      const target = indexes.statusByLabel.get(transition.toStatus)
      if (target) {
        previousStatusCode = currentDef.statusId
        statusDef = target
        explanations.push(
          `Transição por ${transition.precedence}: "${currentDef.label}" + "${event.result}" → "${target.label}".`,
        )
      } else {
        // O destino existe na matriz de transições mas não como status: não se
        // inventa código. Mantém o status e exige atualização manual.
        transition = { ...transition, matched: false, requiresManualUpdate: true }
        explanations.push(
          `Destino "${transition.toStatus}" não existe no catálogo de status; status preservado.`,
        )
      }
    } else {
      explanations.push(
        `Nenhuma regra de transição para "${currentDef.label}" + "${event.result}". Status preservado; exige Atualizar situação.`,
      )
    }

    // Resposta do cliente interrompe a cadência, qualquer que seja a transição.
    if (/respondeu|resposta/i.test(event.result) && cadenceState) {
      cadenceState = registerClientResponse(cadenceState, { at: event.at })
      explanations.push('Cadência interrompida: o cliente respondeu.')
    } else if (/mensagem enviada|enviada|executad/i.test(event.result) && cadenceState) {
      cadenceState = advanceCadence(cadenceState, { executed: true, now: event.at })
    }
  }

  // Cadência do status resultante.
  const cadenceRef = statusDef.cadenceId
  const cadenceCode = isCadenceRef(cadenceRef) ? cadenceRef : null
  const cadenceMode = cadenceCode === null ? cadenceRef : null

  if (cadenceCode !== null && cadenceState === null) {
    const steps = indexes.stepsByCadence.get(cadenceCode)
    if (steps && steps.length > 0) {
      // Cadências com offset negativo (só CAD-06: D-2, D-1, D0) contam PARA TRÁS a
      // partir da visita, não para frente a partir de hoje. Ancorar em `now` geraria
      // a primeira tentativa dois dias no passado.
      const hasNegativeOffset = steps.some((s) => /^D-\d+$/i.test(s.offset.trim()))
      const anchor =
        hasNegativeOffset && facts.appointmentAt !== null ? facts.appointmentAt : now
      cadenceState = planCadence({ cadenceId: cadenceCode, steps, startedAt: anchor })
    }
  }

  const attempt = cadenceState?.currentAttempt ?? facts.cadenceAttempt
  const script = resolveScriptRef(statusDef.scriptId, {
    catalog: catalog.scriptIds,
    attempt,
    statusId: statusDef.statusId,
  })
  if (script.reason === 'SOURCE_BLOCKER') {
    explanations.push(
      `Script "${statusDef.scriptId}" não existe na matriz v1 (bloqueio de fonte). ` +
        'O envio fica bloqueado até a planilha ser corrigida; o restante do Mentor segue normal.',
    )
  }

  // A próxima ação já persistida na oportunidade é a verdade: uma cadência
  // recém-planejada nunca a sobrescreve. A cadência só define a data quando
  // ainda não existe próxima ação conhecida.
  const nextActionAt = facts.nextActionAt ?? cadenceState?.nextActionAt ?? null
  const urgency = deriveUrgency({ ...facts, nextActionAt }, now)

  const score = computeScore({
    ...facts.quality,
    clientNeverResponded: facts.clientNeverResponded,
  })

  const potential = normalizePotential(statusDef.potential)
  const priority = computePriority({
    urgency,
    // Sem potencial declarado, usa o piso da escala em vez de inventar valor alto.
    potential: potential ?? 'Baixo',
    score: score.total,
    overrides: buildPriorityOverrides({ ...facts, nextActionAt }, statusDef, storeSettings, now),
    slaMinutes: storeSettings.sellerResponseSlaMinutes,
  })

  if (storeSettings.sellerResponseSlaMinutes === null && facts.clientRespondedAt !== null) {
    explanations.push('SLA de resposta ainda não configurado.')
  }

  const centralAction = derivesCentralAction(statusDef.centralRule, urgency)
  const attackEligible = cadenceState?.attackEligible ?? false

  return {
    statusCode: statusDef.statusId,
    previousStatusCode,
    returnStatusCode: facts.returnStatusCode,
    statusLabel: statusDef.label,
    family: statusDef.family,
    channel: statusDef.channel,
    responsible: statusDef.responsible,
    temperature: statusDef.temperature,
    objective: statusDef.objective,
    nextStep: statusDef.nextStep,
    potential,
    cadenceCode,
    cadenceMode,
    cadenceStep: cadenceState?.currentAttempt ?? null,
    cadenceState,
    script,
    scriptRef: statusDef.scriptId,
    nextActionAt,
    pendingFlags: facts.pendingFlags,
    score,
    priority,
    urgency,
    centralAction,
    centralRule: statusDef.centralRule,
    attackEligible,
    transition,
    requiresManualUpdate: transition?.requiresManualUpdate ?? false,
    explanations,
    ruleVersion: catalog.version,
  }
}

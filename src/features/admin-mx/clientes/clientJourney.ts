import { PMR_FOLLOW_UP_VISIT } from '@/lib/consultoria/pmr-visit-rules'

export const DEFAULT_CLIENT_PROGRAM_KEY = 'pmr_7'
export const DEFAULT_CLIENT_PROGRAM_TOTAL = 7

export type ClientJourneyVisit = {
  visit_number: number | null | undefined
  status?: string | null
  created_at?: string | null
  effective_visit_date?: string | null
}

export type ClientJourney = {
  programKey: string
  totalVisits: number
  contractedVisits: ClientJourneyVisit[]
  completedVisits: number
  nextVisitNumber: number | null
  progress: number
}

const COMPLETED_VISIT_STATUSES = new Set([
  'concluida',
  'concluído',
  'concluido',
  'realizada',
  'realizado',
])

function normalizeProgramTotal(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) > 0
    ? Math.floor(Number(value))
    : null
}

/**
 * Resolve o total do contrato sem transformar uma chave de programa em outra.
 * A tabela de programas é a fonte primária; as chaves conhecidas só cobrem o
 * caso de dados legados sem linha correspondente.
 */
export function resolveClientProgramTotal(
  programKey: string | null | undefined,
  configuredTotal?: number | null,
) {
  const configured = normalizeProgramTotal(configuredTotal)
  if (configured) return configured

  if (!String(programKey ?? '').trim()) return 0

  const normalizedKey = String(programKey ?? '').trim().toLowerCase()
  if (normalizedKey === 'pmr_9') return 9
  if (normalizedKey === 'pmr_7' || normalizedKey === 'pmr') return 7
  return DEFAULT_CLIENT_PROGRAM_TOTAL
}

export function isCompletedClientVisit(status: string | null | undefined) {
  return COMPLETED_VISIT_STATUSES.has(String(status ?? '').trim().toLowerCase())
}

/**
 * Encontros fora do contrato não alteram o ciclo contratado. Isso é importante
 * para o acompanhamento mensal (visita 8) criado junto a um PMR de 7 etapas,
 * enquanto um programa explicitamente configurado com 9 etapas continua
 * contando as visitas 1..9.
 */
export function isClientVisitInContract(
  visitNumber: number | null | undefined,
  totalVisits: number,
) {
  const normalizedVisitNumber = Number(visitNumber)
  if (!Number.isInteger(normalizedVisitNumber) || normalizedVisitNumber < 1 || normalizedVisitNumber > totalVisits) return false
  if (totalVisits === 7 && normalizedVisitNumber === PMR_FOLLOW_UP_VISIT) return false
  return true
}

export function isClientVisitInScope(
  visitNumber: number | null | undefined,
  totalVisits: number,
) {
  const normalizedVisitNumber = Number(visitNumber)
  if (!Number.isInteger(normalizedVisitNumber) || normalizedVisitNumber < 1) return false
  // PMR 7 keeps the monthly follow-up (8) visible, although it is not part
  // of the contracted progress. Longer configured programs include it as a
  // regular contracted encounter when the total reaches that number.
  return normalizedVisitNumber <= Math.max(totalVisits, PMR_FOLLOW_UP_VISIT)
}

export function buildClientJourney(input: {
  programKey?: string | null
  programTotal?: number | null
  visits?: ReadonlyArray<ClientJourneyVisit>
}): ClientJourney {
  const rawProgramKey = String(input.programKey ?? '').trim()
  const programKey = rawProgramKey || DEFAULT_CLIENT_PROGRAM_KEY
  const totalVisits = resolveClientProgramTotal(rawProgramKey || null, input.programTotal)
  const contractedVisits = (input.visits ?? [])
    .filter(visit => isClientVisitInContract(visit.visit_number, totalVisits))
    .slice()
    .sort((a, b) => Number(a.visit_number ?? 0) - Number(b.visit_number ?? 0))
  const completedVisits = contractedVisits.filter(visit => isCompletedClientVisit(visit.status)).length
  const scheduledOrInProgress = contractedVisits
    .filter(visit => !isCompletedClientVisit(visit.status) && !['cancelada', 'cancelado'].includes(String(visit.status ?? '').toLowerCase()))
    .map(visit => Number(visit.visit_number))
    .filter(Number.isInteger)
  const nextVisitNumber = scheduledOrInProgress.length ? Math.min(...scheduledOrInProgress) : null

  return {
    programKey,
    totalVisits,
    contractedVisits,
    completedVisits,
    nextVisitNumber,
    progress: totalVisits > 0 ? Math.min(100, Math.round((completedVisits / totalVisits) * 100)) : 0,
  }
}

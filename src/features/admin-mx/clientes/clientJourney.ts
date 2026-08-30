import { PMR_FOLLOW_UP_VISIT } from '@/lib/consultoria/pmr-visit-rules'

export const DEFAULT_CLIENT_PROGRAM_KEY = 'pmr_7'
export const DEFAULT_CLIENT_PROGRAM_TOTAL = 7

export type ClientJourneyVisit = {
  visit_number: number | null | undefined
  status?: string | null
  created_at?: string | null
  scheduled_at?: string | null
  effective_visit_date?: string | null
}

export type ClientJourney = {
  programKey: string
  totalVisits: number
  contractedVisits: ClientJourneyVisit[]
  completedVisits: number
  overdueVisits: number
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

const CANCELLED_VISIT_STATUSES = new Set(['cancelada', 'cancelado'])

function visitCalendarDate(visit: ClientJourneyVisit) {
  const raw = visit.scheduled_at || visit.effective_visit_date || visit.created_at
  const match = String(raw ?? '').match(/^(\d{4}-\d{2}-\d{2})/)
  return match?.[1] ?? null
}

export function todayIsoDate(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isOverdueClientVisit(visit: ClientJourneyVisit, today = todayIsoDate()) {
  if (isCompletedClientVisit(visit.status)) return false
  if (CANCELLED_VISIT_STATUSES.has(String(visit.status ?? '').trim().toLowerCase())) return false
  const date = visitCalendarDate(visit)
  return Boolean(date && date < today)
}

export function clientVisitStatusLabel(visit: ClientJourneyVisit, today = todayIsoDate()) {
  if (isOverdueClientVisit(visit, today)) return 'Atrasada'
  const key = String(visit.status ?? '').trim().toLowerCase()
  const labels: Record<string, string> = {
    agendada: 'Agendada',
    concluida: 'Concluída',
    concluído: 'Concluída',
    concluido: 'Concluída',
    realizada: 'Realizada',
    realizado: 'Realizada',
    em_andamento: 'Em andamento',
    cancelada: 'Cancelada',
    cancelado: 'Cancelada',
  }
  return labels[key] || visit.status || '—'
}

/** Rótulo Base44: "Onboarding: …" / "Encontro N: {objective}". */
export function clientVisitDisplayTitle(visit: {
  visit_number: number | null | undefined
  objective?: string | null
  visit_reason?: string | null
}) {
  const topic = String(visit.objective || visit.visit_reason || '').trim()
  const number = Number(visit.visit_number)
  if (number === 1) return topic ? `Onboarding: ${topic}` : 'Onboarding'
  if (Number.isInteger(number) && number > 1) return topic ? `Encontro ${number}: ${topic}` : `Encontro ${number}`
  return topic || 'Encontro'
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
  today?: string
}): ClientJourney {
  const rawProgramKey = String(input.programKey ?? '').trim()
  const programKey = rawProgramKey || DEFAULT_CLIENT_PROGRAM_KEY
  const totalVisits = resolveClientProgramTotal(rawProgramKey || null, input.programTotal)
  const today = input.today || todayIsoDate()
  const contractedVisits = (input.visits ?? [])
    .filter(visit => isClientVisitInContract(visit.visit_number, totalVisits))
    .slice()
    .sort((a, b) => Number(a.visit_number ?? 0) - Number(b.visit_number ?? 0))
  const completedVisits = contractedVisits.filter(visit => isCompletedClientVisit(visit.status)).length
  const overdueVisits = contractedVisits.filter(visit => isOverdueClientVisit(visit, today)).length
  const scheduledOrInProgress = contractedVisits
    .filter(visit => !isCompletedClientVisit(visit.status) && !CANCELLED_VISIT_STATUSES.has(String(visit.status ?? '').toLowerCase()))
    .map(visit => Number(visit.visit_number))
    .filter(Number.isInteger)
  const nextVisitNumber = scheduledOrInProgress.length ? Math.min(...scheduledOrInProgress) : null

  // #region agent log
  fetch('http://127.0.0.1:7506/ingest/ceac55d9-e57e-4aa7-abcd-40a91956c86a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'285f20'},body:JSON.stringify({sessionId:'285f20',runId:'post-fix',hypothesisId:'W',location:'clientJourney.ts:buildClientJourney',message:'journey cycle',data:{programKey,totalVisits,completedVisits,overdueVisits,registered:contractedVisits.length,statuses:contractedVisits.map(visit => visit.status)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return {
    programKey,
    totalVisits,
    contractedVisits,
    completedVisits,
    overdueVisits,
    nextVisitNumber,
    progress: totalVisits > 0 ? Math.min(100, Math.round((completedVisits / totalVisits) * 100)) : 0,
  }
}

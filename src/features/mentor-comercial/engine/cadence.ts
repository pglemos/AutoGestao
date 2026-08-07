/**
 * Cadence Engine (TASK 15). Fonte: abas `03 Cadências` e `04 Passos_Cadência`.
 *
 * Invariantes que a metodologia exige e que este módulo garante estruturalmente:
 *  - uma única tentativa pendente por oportunidade/cadência
 *  - a próxima tentativa só nasce depois de a anterior ser EXECUTADA
 *  - a passagem do tempo sozinha nunca avança a cadência
 *  - resposta do cliente interrompe
 *  - fim da cadência sem resposta NÃO é perda: é elegibilidade ao Plano de Ataque
 *  - reprocessar é idempotente
 *
 * Puro: sem banco, sem React, sem relógio próprio (a data entra por parâmetro).
 */

/**
 * A coluna `Cadência` da aba Status é polimórfica: dos 28 valores distintos,
 * apenas 13 são referências `CAD-*`. Os demais são diretivas de modo.
 */
export function isCadenceRef(value: string | null | undefined): boolean {
  return value != null && /^CAD-\d{2}$/.test(value.trim())
}

export type ParsedOffset =
  | { kind: 'calendarDays'; days: number }
  | { kind: 'months'; months: number }
  | { kind: 'businessDay'; days: number }
  | { kind: 'storeConfigured' }
  | { kind: 'scheduledDate' }
  | { kind: 'unknown'; raw: string }

/**
 * Converte o offset textual da planilha. Offset desconhecido NUNCA vira zero
 * silencioso — vira `unknown`, para que o chamador trate explicitamente.
 */
export function parseOffset(raw: string): ParsedOffset {
  const value = raw.trim()

  const calendar = value.match(/^D([+-]?\d+)$/i)
  if (calendar) return { kind: 'calendarDays', days: Number.parseInt(calendar[1], 10) }

  const months = value.match(/^(\d+)\s*m$/i)
  if (months) return { kind: 'months', months: Number.parseInt(months[1], 10) }

  if (/^pr[óo]ximo dia [úu]til$/i.test(value)) return { kind: 'businessDay', days: 1 }
  if (/^dia [úu]til$/i.test(value)) return { kind: 'businessDay', days: 0 }
  if (/^configura[çc][ãa]o$/i.test(value)) return { kind: 'storeConfigured' }
  if (/^data programada$/i.test(value)) return { kind: 'scheduledDate' }

  return { kind: 'unknown', raw: value }
}

export type CadenceStepInput = { attempt: string; offset: string }

export type CadenceStatus =
  | 'active'
  | 'interrupted'
  | 'completedWithoutResponse'
  | 'unschedulable'

export type CadenceState = {
  cadenceId: string
  currentAttempt: number
  totalAttempts: number
  pendingAttempts: number
  status: CadenceStatus
  nextActionAt: Date | null
  startedAt: Date
  responsible: 'Vendedor' | 'Cliente'
  attackEligible: boolean
  steps: CadenceStepInput[]
  /** Última chave de idempotência aplicada, para tornar reprocessamento seguro. */
  lastIdempotencyKey: string | null
}

function addCalendarDays(from: Date, days: number): Date {
  const result = new Date(from.getTime())
  result.setUTCDate(result.getUTCDate() + days)
  return result
}

function addMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime())
  result.setUTCMonth(result.getUTCMonth() + months)
  return result
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

function addBusinessDays(from: Date, days: number): Date {
  let result = new Date(from.getTime())
  let remaining = days
  while (remaining > 0) {
    result = addCalendarDays(result, 1)
    if (!isWeekend(result)) remaining -= 1
  }
  while (isWeekend(result)) result = addCalendarDays(result, 1)
  return result
}

/**
 * Data da tentativa `index` (0-based), sempre relativa ao início da cadência.
 * Retorna `null` quando o offset não é resolvível sem informação externa
 * (configuração da loja ou data programada) ou quando é desconhecido.
 */
function scheduleFor(startedAt: Date, step: CadenceStepInput): Date | null {
  const offset = parseOffset(step.offset)
  switch (offset.kind) {
    case 'calendarDays':
      return addCalendarDays(startedAt, offset.days)
    case 'months':
      return addMonths(startedAt, offset.months)
    case 'businessDay':
      return addBusinessDays(startedAt, offset.days)
    default:
      return null
  }
}

export function planCadence(input: {
  cadenceId: string
  steps: CadenceStepInput[]
  startedAt: Date
}): CadenceState {
  const { cadenceId, steps, startedAt } = input
  const first = steps[0]
  const nextActionAt = first ? scheduleFor(startedAt, first) : null

  return {
    cadenceId,
    currentAttempt: 1,
    totalAttempts: steps.length,
    pendingAttempts: steps.length > 0 ? 1 : 0,
    status: steps.length === 0 ? 'unschedulable' : 'active',
    nextActionAt,
    startedAt: new Date(startedAt.getTime()),
    responsible: 'Cliente',
    attackEligible: false,
    steps,
    lastIdempotencyKey: null,
  }
}

/**
 * Avança para a próxima tentativa.
 *
 * Só produz efeito quando `executed` é verdadeiro: a cadência jamais avança pela
 * simples passagem do tempo nem pela falta de resposta do cliente. Chamadas
 * repetidas com a mesma `idempotencyKey` são no-op.
 */
export function advanceCadence(
  state: CadenceState,
  event: { executed: boolean; now?: Date; idempotencyKey?: string },
): CadenceState {
  if (!event.executed) return state
  if (state.status !== 'active') return state
  if (event.idempotencyKey != null && event.idempotencyKey === state.lastIdempotencyKey) {
    return state
  }

  const nextAttempt = state.currentAttempt + 1

  if (nextAttempt > state.totalAttempts) {
    // Cadência cumprida integralmente e o cliente nunca respondeu.
    // Isto NÃO é perda: é elegibilidade ao Plano de Ataque (§29, Exemplo D).
    return {
      ...state,
      currentAttempt: state.totalAttempts,
      pendingAttempts: 0,
      status: 'completedWithoutResponse',
      nextActionAt: null,
      attackEligible: true,
      lastIdempotencyKey: event.idempotencyKey ?? state.lastIdempotencyKey,
    }
  }

  const step = state.steps[nextAttempt - 1]
  return {
    ...state,
    currentAttempt: nextAttempt,
    pendingAttempts: 1,
    nextActionAt: scheduleFor(state.startedAt, step),
    lastIdempotencyKey: event.idempotencyKey ?? state.lastIdempotencyKey,
  }
}

/**
 * Cliente respondeu: interrompe a cadência e devolve a responsabilidade ao vendedor.
 * Idempotente — registrar duas vezes não muda o estado.
 */
export function registerClientResponse(
  state: CadenceState,
  _event: { at: Date },
): CadenceState {
  if (state.status === 'interrupted') return state
  return {
    ...state,
    status: 'interrupted',
    pendingAttempts: 0,
    nextActionAt: null,
    responsible: 'Vendedor',
  }
}

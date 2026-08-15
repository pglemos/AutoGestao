/**
 * Cálculo de capacidade do consultor — port puro do Base44 `capacityCalc.js`.
 *
 * Base: `tempos_encontro_produto` (maximum_time_hours por produto/encontro/
 * modalidade) e reservas de carga de trabalho do consultor.
 */

export const CAPACITY_STATUS = {
  DISPONIVEL: { label: 'Disponível', tone: 'success' },
  ATENCAO: { label: 'Atenção', tone: 'warning' },
  COMPROMETIDA: { label: 'Capacidade comprometida', tone: 'warning' },
  SOBRECARGA: { label: 'Sobrecarga', tone: 'danger' },
  SEM_PARAMETRO: { label: 'Sem parâmetro', tone: 'muted' },
  BASE_PARCIAL: { label: 'Base parcial', tone: 'warning' },
  ERRO: { label: 'Erro técnico', tone: 'danger' },
} as const

export type CapacityStatusKey = keyof typeof CAPACITY_STATUS

export function getCapacityStatus(
  occupancyPct: number,
  hasAvailableHours: boolean,
  hasPendingTime = false,
): CapacityStatusKey {
  if (hasPendingTime) return 'BASE_PARCIAL'
  if (!hasAvailableHours) return 'SEM_PARAMETRO'
  if (occupancyPct > 100) return 'SOBRECARGA'
  if (occupancyPct > 95) return 'COMPROMETIDA'
  if (occupancyPct > 80) return 'ATENCAO'
  return 'DISPONIVEL'
}

export function calcOccupancy(plannedHours: number, availableHours: number): number {
  if (!availableHours) return 0
  return Math.round((plannedHours / availableHours) * 100)
}

/** Mapa { [product_id]: { [encounter_number]: { ONLINE: hours, PRESENCIAL: hours } } } */
export function buildTimeMap(
  timeParams: Array<{ status: string; consulting_product_id: string; encounter_number: number; modality: string; maximum_time_hours: number | null }>,
): Record<string, Record<number, Record<string, number>>> {
  const map: Record<string, Record<number, Record<string, number>>> = {}
  for (const tp of timeParams) {
    if (tp.status !== 'ATIVO' && tp.status !== 'PUBLICADO') continue
    if (!map[tp.consulting_product_id]) map[tp.consulting_product_id] = {}
    if (!map[tp.consulting_product_id][tp.encounter_number]) {
      map[tp.consulting_product_id][tp.encounter_number] = {}
    }
    if (tp.maximum_time_hours != null) {
      map[tp.consulting_product_id][tp.encounter_number][tp.modality] = tp.maximum_time_hours
    }
  }
  return map
}

export function getTimeForEncounter(
  timeMap: ReturnType<typeof buildTimeMap>,
  productId: string,
  encounterNumber: number,
  modality: string,
): number | null {
  return timeMap[productId]?.[encounterNumber]?.[modality] ?? null
}

/** Maior tempo entre modalidades (cálculo conservador para A_DEFINIR). */
export function getMaxTimeAcrossModalities(
  timeMap: ReturnType<typeof buildTimeMap>,
  productId: string,
  encounterNumber: number,
): number | null {
  const times = Object.values(timeMap[productId]?.[encounterNumber] ?? {}).filter((t): t is number => t != null)
  if (times.length === 0) return null
  return Math.max(...times)
}

export function hasBothModalities(
  timeMap: ReturnType<typeof buildTimeMap>,
  productId: string,
  encounterNumber: number,
): boolean {
  const m = timeMap[productId]?.[encounterNumber]
  if (!m) return false
  return m.ONLINE != null && m.PRESENCIAL != null
}

export type WorkloadReservation = {
  status: string
  reference_month?: string | null
  applied_time_hours?: number | null
  maximum_time_hours?: number | null
  modality?: string | null
  allocation_type?: string | null
  travel_reserved_hours?: number | null
  planned_date?: string | null
}

export type CapacityBreakdown = {
  available: number
  confirmed: number
  reserved: number
  travel?: number
  planned: number
  remaining: number
  occupancy: number
  status: CapacityStatusKey
}

export type CapacityResult = {
  online: CapacityBreakdown
  inPerson: CapacityBreakdown
  aDefinir: { encountersWithoutModality: number; encountersWithoutTime: number; assignmentsWithoutMonth: number; hours: number }
  hasPendingTime: boolean
  isPartial: boolean
}

/**
 * Calcula capacidade a partir das reservas de carga de trabalho de um
 * consultor num mês de referência (YYYY-MM).
 */
export function calculateCapacity(
  consultant: { online_available_hours?: number | null; in_person_available_hours?: number | null },
  reservations: WorkloadReservation[],
  referenceMonth?: string,
): CapacityResult {
  const onlineAvail = consultant.online_available_hours || 0
  const inPersonAvail = consultant.in_person_available_hours || 0

  let onlineConfirmed = 0
  let onlineReserved = 0
  let inPersonConfirmed = 0
  let inPersonReserved = 0
  let travelReserved = 0
  let aDefinirHours = 0
  let encountersWithoutModality = 0
  let encountersWithoutTime = 0
  let assignmentsWithoutMonth = 0
  let hasPendingTime = false

  for (const r of reservations) {
    if (r.status === 'CANCELADA' || r.status === 'TRANSFERIDA' || r.status === 'LIBERADA') continue
    if (referenceMonth && r.reference_month && r.reference_month !== referenceMonth) continue

    const time = r.applied_time_hours ?? r.maximum_time_hours ?? 0

    if (r.modality === 'A_DEFINIR' || !r.modality) {
      encountersWithoutModality++
      if (time) aDefinirHours += time
      else encountersWithoutTime++
      continue
    }

    if (!time) {
      encountersWithoutTime++
      hasPendingTime = true
      if (r.status === 'PENDENTE_TEMPO') continue
    }

    if (r.reference_month !== referenceMonth && !r.planned_date) {
      assignmentsWithoutMonth++
    }

    const isConfirmed = r.allocation_type === 'CONFIRMADA'
    const isReserved = r.allocation_type === 'RESERVADA' || r.allocation_type === 'A_DEFINIR'

    if (r.modality === 'ONLINE') {
      if (isConfirmed) onlineConfirmed += time
      else if (isReserved) onlineReserved += time
    } else if (r.modality === 'PRESENCIAL') {
      if (isConfirmed) inPersonConfirmed += time
      else if (isReserved) inPersonReserved += time
      travelReserved += r.travel_reserved_hours || 0
    }
  }

  const onlinePlanned = onlineConfirmed + onlineReserved
  const inPersonPlanned = inPersonConfirmed + inPersonReserved

  const onlineOccupancy = calcOccupancy(onlinePlanned, onlineAvail)
  const inPersonOccupancy = calcOccupancy(inPersonPlanned, inPersonAvail)

  return {
    online: {
      available: onlineAvail,
      confirmed: onlineConfirmed,
      reserved: onlineReserved,
      planned: onlinePlanned,
      remaining: onlineAvail - onlinePlanned,
      occupancy: onlineOccupancy,
      status: getCapacityStatus(onlineOccupancy, onlineAvail > 0, hasPendingTime),
    },
    inPerson: {
      available: inPersonAvail,
      confirmed: inPersonConfirmed,
      reserved: inPersonReserved,
      travel: travelReserved,
      planned: inPersonPlanned,
      remaining: inPersonAvail - inPersonPlanned,
      occupancy: inPersonOccupancy,
      status: getCapacityStatus(inPersonOccupancy, inPersonAvail > 0, hasPendingTime),
    },
    aDefinir: {
      encountersWithoutModality,
      encountersWithoutTime,
      assignmentsWithoutMonth,
      hours: aDefinirHours,
    },
    hasPendingTime,
    isPartial: encountersWithoutModality > 0 || encountersWithoutTime > 0 || assignmentsWithoutMonth > 0 || hasPendingTime,
  }
}

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthLabel(yyyymm: string | null | undefined): string {
  if (!yyyymm) return '—'
  const [year, month] = yyyymm.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[parseInt(month, 10) - 1]}/${year}`
}

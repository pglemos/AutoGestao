export const PMR_MAIN_VISITS_MAX = 7
export const PMR_FOLLOW_UP_VISIT = 8

function normalizeProgramTotal(totalVisits?: number | null) {
  if (typeof totalVisits === 'undefined' || totalVisits === null) return PMR_MAIN_VISITS_MAX
  if (!Number.isFinite(totalVisits) || totalVisits < 1) return 0
  return Math.floor(totalVisits)
}

export function isPmrMainCycleVisitNumber(visitNumber: number, totalVisits?: number | null) {
  const total = normalizeProgramTotal(totalVisits)
  return Number.isInteger(visitNumber) && visitNumber >= 1 && visitNumber <= total
}

export function isPmrFollowUpVisitNumber(visitNumber: number, totalVisits?: number | null) {
  return normalizeProgramTotal(totalVisits) <= PMR_MAIN_VISITS_MAX && visitNumber === PMR_FOLLOW_UP_VISIT
}

export function isPmrSchedulableVisitNumber(visitNumber: number, totalVisits?: number | null) {
  return isPmrMainCycleVisitNumber(visitNumber, totalVisits) || isPmrFollowUpVisitNumber(visitNumber, totalVisits)
}

export function getPmrVisitDisplayLabel(visitNumber: number, totalVisits?: number | null) {
  const total = normalizeProgramTotal(totalVisits)
  if (isPmrFollowUpVisitNumber(visitNumber, total)) return 'Acompanhamento Mensal'
  if (total > 0) return `Visita ${visitNumber}/${total}`
  return `Visita ${visitNumber}`
}

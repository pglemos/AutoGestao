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
  const total = normalizeProgramTotal(totalVisits)
  return visitNumber === (total > PMR_MAIN_VISITS_MAX ? total + 1 : PMR_FOLLOW_UP_VISIT)
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

/**
 * Resolve o total de visitas do programa contratado pelo cliente.
 *
 * `undefined` quando o programa não é conhecido — os validadores acima já
 * caem para `PMR_MAIN_VISITS_MAX` (7) nesse caso, então nada quebra para um
 * cliente sem `program_template_key` ainda preenchido.
 */
export function resolveProgramTotalVisits(
  programTemplateKey: string | null | undefined,
  totalsByProgram: Record<string, number>,
): number | undefined {
  if (!programTemplateKey) return undefined
  return totalsByProgram[programTemplateKey]
}

/** Mensagem de erro do intervalo válido, para o programa efetivamente contratado. */
export function pmrVisitRangeMessage(totalVisits?: number | null): string {
  const total = normalizeProgramTotal(totalVisits)
  return `Este programa aceita visitas de 1 a ${total || PMR_MAIN_VISITS_MAX} e acompanhamento mensal.`
}

/**
 * Próximo número de visita a sugerir, dado o maior já agendado para o cliente.
 *
 * Sem o total do programa, um PMR Híbrido (12 visitas) ficava preso em 8 para
 * sempre depois da visita 7 — a sugestão nunca passava do acompanhamento
 * mensal, então a visita 8 era rotulada de mensal em vez de principal e a 9 em
 * diante nunca era alcançável pela tela.
 */
export function nextPmrVisitNumber(maxScheduled: number, totalVisits?: number | null): number {
  const total = normalizeProgramTotal(totalVisits)
  const nextMain = maxScheduled + 1
  return total > 0 && nextMain <= total ? nextMain : (total > PMR_MAIN_VISITS_MAX ? total + 1 : PMR_FOLLOW_UP_VISIT)
}

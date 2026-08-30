export const OFFICIAL_ROSTER_GATE_MESSAGE = 'Só indicadores oficiais do Base44 entram no plano.'

export function isOfficialRosterGateError(message: string | null | undefined) {
  return (message ?? '').includes(OFFICIAL_ROSTER_GATE_MESSAGE)
}

import { describe, expect, test } from 'bun:test'
import { isOfficialRosterGateError, OFFICIAL_ROSTER_GATE_MESSAGE } from './officialRosterGate'

describe('gate do roster oficial Base44', () => {
  test('reconhece o bloqueio do trigger remoto sem tratar outro erro como gate', () => {
    expect(isOfficialRosterGateError(OFFICIAL_ROSTER_GATE_MESSAGE)).toBe(true)
    expect(isOfficialRosterGateError(`P0001: ${OFFICIAL_ROSTER_GATE_MESSAGE}`)).toBe(true)
    expect(isOfficialRosterGateError('permission denied for table ciclos_plano_estrategico_indicadores')).toBe(false)
    expect(isOfficialRosterGateError(null)).toBe(false)
  })
})

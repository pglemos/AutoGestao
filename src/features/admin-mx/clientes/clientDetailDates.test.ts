import { describe, expect, test } from 'bun:test'
import { resolveClientPlannedStartDate } from './clientDetailDates'

describe('data prevista do detalhe do cliente', () => {
  test('não acessa campos do cliente enquanto o carregamento inicial ainda está nulo', () => {
    expect(resolveClientPlannedStartDate(null)).toBeNull()
    expect(resolveClientPlannedStartDate(undefined)).toBeNull()
  })

  test('prioriza a ativação programada e usa o início do contrato como fallback', () => {
    expect(resolveClientPlannedStartDate({
      scheduled_activation_at: '2026-09-01',
      contract_start_date: '2026-08-01',
    })).toBe('2026-09-01')
    expect(resolveClientPlannedStartDate({ contract_start_date: '2026-08-01' })).toBe('2026-08-01')
    expect(resolveClientPlannedStartDate({ scheduled_activation_at: null, contract_start_date: null })).toBeNull()
  })
})

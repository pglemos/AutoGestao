import { describe, expect, test } from 'bun:test'
import {
  buildTimeMap,
  calcOccupancy,
  calculateCapacity,
  getCapacityStatus,
  getMaxTimeAcrossModalities,
  getMonthLabel,
  getTimeForEncounter,
  hasBothModalities,
  type WorkloadReservation,
} from './capacityCalc'

describe('getCapacityStatus', () => {
  test('sem parâmetro quando não há horas disponíveis', () => {
    expect(getCapacityStatus(0, false)).toBe('SEM_PARAMETRO')
  })

  test('base parcial quando há encontro pendente de tempo', () => {
    expect(getCapacityStatus(50, true, true)).toBe('BASE_PARCIAL')
  })

  test('faixas de ocupação', () => {
    expect(getCapacityStatus(70, true)).toBe('DISPONIVEL')
    expect(getCapacityStatus(81, true)).toBe('ATENCAO')
    expect(getCapacityStatus(96, true)).toBe('COMPROMETIDA')
    expect(getCapacityStatus(110, true)).toBe('SOBRECARGA')
  })
})

describe('calcOccupancy', () => {
  test('calcula percentual arredondado', () => {
    expect(calcOccupancy(40, 80)).toBe(50)
    expect(calcOccupancy(10, 3)).toBe(333)
  })

  test('zero quando não há base', () => {
    expect(calcOccupancy(10, 0)).toBe(0)
  })
})

describe('buildTimeMap / lookups', () => {
  const params = [
    { status: 'PUBLICADO', consulting_product_id: 'p1', encounter_number: 1, modality: 'ONLINE', maximum_time_hours: 2 },
    { status: 'ATIVO', consulting_product_id: 'p1', encounter_number: 1, modality: 'PRESENCIAL', maximum_time_hours: 3 },
    { status: 'ATIVO', consulting_product_id: 'p1', encounter_number: 2, modality: 'ONLINE', maximum_time_hours: 4 },
    { status: 'ARQUIVADO', consulting_product_id: 'p1', encounter_number: 9, modality: 'ONLINE', maximum_time_hours: 99 },
  ]
  const map = buildTimeMap(params)

  test('ignora parâmetros não ativos/publicados', () => {
    expect(getTimeForEncounter(map, 'p1', 9, 'ONLINE')).toBeNull()
  })

  test('busca por produto/encontro/modalidade', () => {
    expect(getTimeForEncounter(map, 'p1', 1, 'ONLINE')).toBe(2)
    expect(getTimeForEncounter(map, 'p1', 2, 'PRESENCIAL')).toBeNull()
  })

  test('máximo entre modalidades e presença das duas', () => {
    expect(getMaxTimeAcrossModalities(map, 'p1', 1)).toBe(3)
    expect(hasBothModalities(map, 'p1', 1)).toBe(true)
    expect(hasBothModalities(map, 'p1', 2)).toBe(false)
  })
})

describe('calculateCapacity', () => {
  const consultant = { online_available_hours: 40, in_person_available_hours: 30 }

  test('vendedor sem reservas fica disponível', () => {
    const result = calculateCapacity(consultant, [])
    expect(result.online.status).toBe('DISPONIVEL')
    expect(result.online.remaining).toBe(40)
    expect(result.inPerson.remaining).toBe(30)
    expect(result.isPartial).toBe(false)
  })

  test('somente conta reservas confirmadas/reservadas do mês de referência', () => {
    const reservations: WorkloadReservation[] = [
      { status: 'ATIVO', reference_month: '2026-08', modality: 'ONLINE', applied_time_hours: 10, allocation_type: 'CONFIRMADA' },
      { status: 'ATIVO', reference_month: '2026-08', modality: 'ONLINE', applied_time_hours: 6, allocation_type: 'RESERVADA' },
      { status: 'CANCELADA', reference_month: '2026-08', modality: 'ONLINE', applied_time_hours: 99, allocation_type: 'CONFIRMADA' },
      { status: 'ATIVO', reference_month: '2026-09', modality: 'ONLINE', applied_time_hours: 99, allocation_type: 'CONFIRMADA' },
    ]
    const result = calculateCapacity(consultant, reservations, '2026-08')
    expect(result.online.confirmed).toBe(10)
    expect(result.online.reserved).toBe(6)
    expect(result.online.planned).toBe(16)
    expect(result.online.remaining).toBe(24)
    expect(result.online.occupancy).toBe(40)
  })

  test('contabiliza horas de viagem presencial', () => {
    const reservations: WorkloadReservation[] = [
      { status: 'ATIVO', reference_month: '2026-08', modality: 'PRESENCIAL', applied_time_hours: 5, allocation_type: 'CONFIRMADA', travel_reserved_hours: 4 },
    ]
    const result = calculateCapacity(consultant, reservations, '2026-08')
    expect(result.inPerson.confirmed).toBe(5)
    expect(result.inPerson.travel).toBe(4)
  })

  test('encontro A_DEFINIR vira base parcial', () => {
    const reservations: WorkloadReservation[] = [
      { status: 'ATIVO', reference_month: '2026-08', modality: 'A_DEFINIR', applied_time_hours: 3 },
    ]
    const result = calculateCapacity(consultant, reservations, '2026-08')
    expect(result.aDefinir.hours).toBe(3)
    expect(result.aDefinir.encountersWithoutModality).toBe(1)
    expect(result.isPartial).toBe(true)
  })

  test('usa applied_time_hours com fallback para maximum_time_hours', () => {
    const reservations: WorkloadReservation[] = [
      { status: 'ATIVO', reference_month: '2026-08', modality: 'ONLINE', applied_time_hours: null, maximum_time_hours: 4, allocation_type: 'CONFIRMADA' },
    ]
    const result = calculateCapacity(consultant, reservations, '2026-08')
    expect(result.online.confirmed).toBe(4)
  })
})

describe('getMonthLabel', () => {
  test('formata mês em português', () => {
    expect(getMonthLabel('2026-08')).toBe('Ago/2026')
    expect(getMonthLabel('')).toBe('—')
    expect(getMonthLabel(null)).toBe('—')
  })
})

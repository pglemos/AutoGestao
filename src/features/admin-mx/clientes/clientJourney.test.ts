import { describe, expect, test } from 'bun:test'
import {
  buildClientJourney,
  isClientVisitInContract,
  resolveClientProgramTotal,
} from './clientJourney'

describe('clientJourney — fonte canônica do ciclo consultivo', () => {
  test('PMR 7 não conta o acompanhamento mensal como etapa contratada', () => {
    const journey = buildClientJourney({
      programKey: 'pmr_7',
      programTotal: 7,
      visits: [
        { visit_number: 1, status: 'concluida' },
        { visit_number: 7, status: 'agendada' },
        { visit_number: 8, status: 'concluida' },
      ],
    })

    expect(journey.totalVisits).toBe(7)
    expect(journey.completedVisits).toBe(1)
    expect(journey.contractedVisits.map(visit => visit.visit_number)).toEqual([1, 7])
    expect(isClientVisitInContract(8, 7)).toBe(false)
  })

  test('programa explicitamente configurado com 9 encontros preserva a etapa 9', () => {
    const journey = buildClientJourney({
      programKey: 'pmr_9',
      programTotal: 9,
      visits: [
        { visit_number: 8, status: 'concluida' },
        { visit_number: 9, status: 'concluida' },
        { visit_number: 10, status: 'concluida' },
      ],
    })

    expect(resolveClientProgramTotal('pmr_9')).toBe(9)
    expect(journey.totalVisits).toBe(9)
    expect(journey.completedVisits).toBe(2)
    expect(journey.contractedVisits.map(visit => visit.visit_number)).toEqual([8, 9])
  })

  test('cliente sem produto não recebe uma jornada fictícia', () => {
    const journey = buildClientJourney({ visits: [{ visit_number: 1, status: 'concluida' }] })

    expect(journey.totalVisits).toBe(0)
    expect(journey.completedVisits).toBe(0)
  })
})

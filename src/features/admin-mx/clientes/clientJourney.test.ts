import { describe, expect, test } from 'bun:test'
import {
  buildClientJourney,
  clientVisitDisplayTitle,
  clientVisitStatusLabel,
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

  test('visita agendada com data passada conta como atrasada, não concluída', () => {
    const journey = buildClientJourney({
      programKey: 'pmr_9',
      programTotal: 9,
      today: '2026-08-30',
      visits: [
        { visit_number: 1, status: 'agendada', scheduled_at: '2026-01-16T17:00:00+00' },
        { visit_number: 2, status: 'concluida', scheduled_at: '2026-01-23T12:30:00+00' },
        { visit_number: 3, status: 'agendada', scheduled_at: '2026-12-01T12:00:00+00' },
      ],
    })

    expect(journey.completedVisits).toBe(1)
    expect(journey.overdueVisits).toBe(1)
    expect(clientVisitStatusLabel({ visit_number: 1, status: 'agendada', scheduled_at: '2026-01-16' }, '2026-08-30')).toBe('Atrasada')
    expect(clientVisitStatusLabel({ visit_number: 3, status: 'agendada', scheduled_at: '2026-12-01' }, '2026-08-30')).toBe('Agendada')
  })

  test('título do encontro usa o objective no formato Base44', () => {
    expect(clientVisitDisplayTitle({
      visit_number: 1,
      objective: 'Planejamento Estratégico, Metodologia de Vendas',
    })).toBe('Onboarding: Planejamento Estratégico, Metodologia de Vendas')
    expect(clientVisitDisplayTitle({
      visit_number: 2,
      objective: 'Rotina do Gerente e Rotina do Vendedor',
    })).toBe('Encontro 2: Rotina do Gerente e Rotina do Vendedor')
    expect(clientVisitDisplayTitle({ visit_number: 9, objective: '', visit_reason: 'Acompanhamento' })).toBe('Encontro 9: Acompanhamento')
  })

  test('cliente sem produto não recebe uma jornada fictícia', () => {
    const journey = buildClientJourney({ visits: [{ visit_number: 1, status: 'concluida' }] })

    expect(journey.totalVisits).toBe(0)
    expect(journey.completedVisits).toBe(0)
  })
})

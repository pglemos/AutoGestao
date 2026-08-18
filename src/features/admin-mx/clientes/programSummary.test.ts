import { describe, expect, test } from 'bun:test'
import { buildProgramSummary } from './programSummary'

describe('programa contratado — lógica pura', () => {
  test('cliente sem produto não tem programa configurado', () => {
    const summary = buildProgramSummary({ product_name: null, program_template_key: null, modality: null, contract_start_date: null, contract_end_date: null, visits: [] })
    expect(summary.configured).toBe(false)
    expect(summary.progress).toBe(0)
  })

  test('com produto e jornada, calcula progresso e consultor', () => {
    const summary = buildProgramSummary({
      product_name: 'PMR Online',
      program_template_key: 'pmr_online',
      modality: 'online',
      contract_start_date: '2026-03-01',
      contract_end_date: '2027-03-01',
      visits: [
        { visit_number: 1, status: 'concluida', is_onboarding: true, consultant_name: 'Marcos' },
        { visit_number: 2, status: 'agendada', is_onboarding: false },
        { visit_number: 3, status: 'concluida', is_onboarding: false },
      ],
    })
    expect(summary.configured).toBe(true)
    expect(summary.visits).toBe(3)
    expect(summary.completed_visits).toBe(2)
    expect(summary.onboarding_visits).toBe(1)
    expect(summary.progress).toBe(67)
    expect(summary.responsible_consultant).toBe('Marcos')
  })

  test('programa configurado apenas pela chave do template', () => {
    const summary = buildProgramSummary({ product_name: null, program_template_key: 'pmr_hibrido', modality: null, contract_start_date: null, contract_end_date: null, visits: [] })
    expect(summary.configured).toBe(true)
    expect(summary.product_name).toBeNull()
  })

  test('usa consultor responsável atribuído quando a jornada não possui visitas', () => {
    const summary = buildProgramSummary({
      product_name: 'PMR - 7 Visitas',
      program_template_key: 'pmr_7',
      modality: 'presencial',
      contract_start_date: '2026-08-20',
      contract_end_date: '2026-12-10',
      responsible_consultant: 'Daniel',
      visits: [],
    })
    expect(summary.configured).toBe(true)
    expect(summary.responsible_consultant).toBe('Daniel')
    expect(summary.visits).toBe(0)
    expect(summary.progress).toBe(0)
  })
})


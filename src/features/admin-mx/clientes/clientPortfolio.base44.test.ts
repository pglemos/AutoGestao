import { describe, expect, test } from 'bun:test'
import { onboardingPortfolioLabel, portfolioStatusCounters } from './clientPortfolio'

describe('onboardingPortfolioLabel', () => {
  test('marca onboarding concluído', () => {
    expect(onboardingPortfolioLabel({ onboarding_completed: true, onboarding_step: 7 })).toBe('Concluído')
  })

  test('mostra etapa parcial', () => {
    expect(onboardingPortfolioLabel({ onboarding_completed: false, onboarding_step: 3 })).toBe('Etapa 3/7')
  })
})

describe('portfolioStatusCounters', () => {
  test('conta os quatro KPIs canônicos sem duplicar', () => {
    const rows = [
      {
        id: '1', name: 'A', slug: 'a', cnpj: null, status: 'ativo', business_phase: null,
        product_name: 'PMR', program_template_key: 'pmr_hibrido', structure_type: null,
        primary_store_id: 's1', implementation_owner_id: null, implementation_owner_name: null,
        contract_end_date: null, onboarding_step: 7, onboarding_completed: true,
        suspended_at: null, suspended_reason: null, activated_at: null, scheduled_activation_at: null,
        primary_store_city: null, main_contact_name: null, hasDonoMaster: true, units: 1, users: 1,
        visitsDone: 0, visitsTotal: 12, modulesEnabled: 1, assignments: 1,
      },
      {
        id: '2', name: 'B', slug: 'b', cnpj: null, status: 'inativo', business_phase: null,
        product_name: null, program_template_key: null, structure_type: null,
        primary_store_id: null, implementation_owner_id: null, implementation_owner_name: null,
        contract_end_date: null, onboarding_step: 2, onboarding_completed: false,
        suspended_at: null, suspended_reason: null, activated_at: null, scheduled_activation_at: null,
        primary_store_city: null, main_contact_name: null, hasDonoMaster: false, units: 0, users: 0,
        visitsDone: 0, visitsTotal: 0, modulesEnabled: 0, assignments: 0,
      },
    ]
    const counters = portfolioStatusCounters(rows)
    expect(counters.ativos).toBe(1)
    expect(counters.em_configuracao).toBe(1)
  })
})

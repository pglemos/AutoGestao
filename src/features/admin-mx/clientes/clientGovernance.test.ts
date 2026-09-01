import { describe, expect, test } from 'bun:test'
import type { PortfolioClient } from './clientPortfolio'
import {
  formatActivationBlocker,
  formatGovernanceReason,
  governanceCategoryRows,
  governanceImpact,
  governanceIssues,
  governanceNextAction,
  governancePriority,
  governanceReferenceLabel,
  governanceSearchText,
  governanceSummary,
  sortGovernanceRows,
} from './clientGovernance'

const HOJE = new Date('2026-08-16T12:00:00Z')

function client(overrides: Partial<PortfolioClient> = {}): PortfolioClient {
  return {
    id: 'c1', name: 'Concessionária Alfa', slug: 'alfa', cnpj: '11222333000181',
    status: 'ativo', business_phase: 'CRESCIMENTO', product_name: 'PMR 7', program_template_key: 'pmr_7',
    structure_type: 'LOJA_UNICA', primary_store_id: 's1', implementation_owner_id: 'u1',
    implementation_owner_name: 'Ana', implementation_owner_email: 'ana@mx.com', contract_end_date: null,
    onboarding_step: 7, onboarding_completed: true, suspended_at: null, suspended_reason: null,
    activated_at: null, scheduled_activation_at: null, updated_at: '2026-08-15T12:00:00Z',
    primary_store_city: 'São Paulo', main_contact_name: 'Carlos Dono', hasDonoMaster: true,
    units: 1, users: 4, visitsDone: 7, visitsTotal: 7, modulesEnabled: 3, assignments: 1,
    ...overrides,
  }
}

describe('governança da carteira', () => {
  test('explica sobreposição entre categorias sem duplicar cliente na fila', () => {
    const rows = [
      client({ id: 'overlap', implementation_owner_id: null, contract_end_date: '2026-09-10' }),
      client({ id: 'blocked', status: 'inativo', primary_store_id: null, product_name: null, modulesEnabled: 0, assignments: 0 }),
      client({ id: 'regular' }),
    ]

    const categories = governanceCategoryRows(rows, HOJE)
    const summary = governanceSummary(rows, HOJE)

    expect(categories.semConsultor.map(row => row.id)).toEqual(['overlap'])
    expect(categories.renovacoes.map(row => row.id)).toEqual(['overlap'])
    expect(categories.bloqueios.map(row => row.id)).toEqual(['blocked'])
    expect(summary.uniqueClients).toBe(2)
    expect(summary.occurrenceCount).toBe(3)
  })

  test('separa qualidade cadastral dos bloqueios de ativação', () => {
    const result = governanceSummary([
      client({ id: 'missing-city', primary_store_city: null }),
      client({ id: 'missing-cnpj', cnpj: null }),
      client({ id: 'complete' }),
    ], HOJE)

    expect(result.incompleteRegistration).toBe(2)
    expect(result.uniqueClients).toBe(0)
  })

  test('normaliza motivos e bloqueadores na camada de apresentação', () => {
    expect(formatGovernanceReason('INADIMPLENCIA')).toBe('Inadimplência')
    expect(formatGovernanceReason('cliente_simplesmente_parou_de_responder')).toBe('Cliente simplesmente parou de responder')
    expect(formatActivationBlocker('sem módulos liberados')).toBe('Módulos ainda não liberados')
    expect(formatGovernanceReason(null)).toBe('Motivo não registrado')
  })

  test('deriva prioridade, impacto, dono e próximo passo dos fatos existentes', () => {
    const suspended = client({
      status: 'suspenso', suspended_at: '2026-08-10T12:00:00Z', suspended_reason: 'INADIMPLENCIA',
      implementation_owner_id: 'u1', implementation_owner_name: 'Ana',
    })
    const blocked = client({ id: 'blocked', status: 'inativo', primary_store_id: null, assignments: 0 })
    const noOwner = client({ id: 'ownerless', name: 'Ownerless Motors', implementation_owner_id: null, implementation_owner_name: null })

    expect(governancePriority(suspended, HOJE)).toBe('critica')
    expect(governancePriority(blocked, HOJE)).toBe('critica')
    expect(governancePriority(noOwner, HOJE)).toBe('alta')
    expect(governanceIssues(suspended, HOJE)[0]).toMatchObject({ label: 'Suspensão ativa', detail: 'Inadimplência' })
    expect(governanceImpact(blocked, HOJE)).toContain('não pode avançar')
    expect(governanceNextAction(noOwner, HOJE)).toBe('Atribuir consultor MX')
    expect(governanceReferenceLabel(suspended, HOJE)).toBe('Suspenso há 6 dias')
    expect(governanceSearchText(noOwner)).toContain('ownerless motors')
  })

  test('ordena por prioridade sem alterar a ordem de origem', () => {
    const rows = [
      client({ id: 'attention', name: 'Zeta', contract_end_date: '2026-10-10' }),
      client({ id: 'critical', name: 'Beta', status: 'inativo', primary_store_id: null }),
      client({ id: 'high', name: 'Alfa', implementation_owner_id: null }),
    ]

    expect(sortGovernanceRows(rows, HOJE).map(row => row.id)).toEqual(['critical', 'high', 'attention'])
    expect(rows.map(row => row.id)).toEqual(['attention', 'critical', 'high'])
  })
})

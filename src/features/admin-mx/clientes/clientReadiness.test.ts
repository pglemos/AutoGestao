import { describe, expect, test } from 'bun:test'
import { buildClientReadiness, journeyProgress, readinessSummary, type ClientReadinessInput } from './clientReadiness'

function input(overrides: Partial<ClientReadinessInput> = {}): ClientReadinessInput {
  return {
    status: 'inativo',
    primary_store_id: 'loja-1',
    product_name: 'PMR 7',
    program_template_key: 'pmr_7',
    modality: 'online',
    cnpj: '11222333000181',
    contract_start_date: '2026-01-01',
    implementation_owner_id: 'user-1',
    units: [{ name: 'Matriz', is_primary: true }],
    contacts: [{ name: 'Ana', is_primary: true, email: 'ana@alfa.com' }],
    modules: [{ enabled: true }],
    assignments: [{ active: true }],
    storeTakenByOtherClient: false,
    ...overrides,
  }
}

describe('checklist de prontidão do cliente', () => {
  test('cliente completo pode ser ativado', () => {
    const summary = readinessSummary(buildClientReadiness(input()))
    expect(summary.canActivate).toBe(true)
    expect(summary.blockers).toEqual([])
    expect(summary.warnings).toEqual([])
  })

  test('sem loja principal a ativação é bloqueada', () => {
    const summary = readinessSummary(buildClientReadiness(input({ primary_store_id: null })))
    expect(summary.canActivate).toBe(false)
    expect(summary.blockers.map(item => item.key)).toContain('loja-principal')
  })

  test('loja ocupada por outro cliente ativo bloqueia', () => {
    const summary = readinessSummary(buildClientReadiness(input({ storeTakenByOtherClient: true })))
    expect(summary.canActivate).toBe(false)
    expect(summary.blockers.map(item => item.key)).toContain('loja-livre')
  })

  test('faltar produto, consultor ou módulo bloqueia', () => {
    for (const patch of [
      { product_name: null, program_template_key: null },
      { assignments: [] },
      { modules: [{ enabled: false }] },
    ] as Array<Partial<ClientReadinessInput>>) {
      expect(readinessSummary(buildClientReadiness(input(patch))).canActivate).toBe(false)
    }
  })

  test('pendência informativa não bloqueia, mas aparece', () => {
    const summary = readinessSummary(buildClientReadiness(input({ cnpj: null, contract_start_date: null })))
    expect(summary.canActivate).toBe(true)
    expect(summary.warnings.map(item => item.key).sort()).toEqual(['cnpj', 'contrato'])
  })

  test('módulo sem flag explícita conta como liberado', () => {
    const summary = readinessSummary(buildClientReadiness(input({ modules: [{ enabled: null }] })))
    expect(summary.canActivate).toBe(true)
  })
})

describe('progresso da jornada', () => {
  test('conta visitas concluídas sobre o total do produto', () => {
    const visits = [{ status: 'concluida' }, { status: 'agendada' }, { status: 'realizada' }, { status: null }]
    expect(journeyProgress(visits, 4)).toBe(50)
  })

  test('produto sem encontros não divide por zero', () => {
    expect(journeyProgress([{ status: 'concluida' }], 0)).toBe(0)
  })

  test('não passa de 100%', () => {
    expect(journeyProgress([{ status: 'concluida' }, { status: 'concluida' }, { status: 'concluida' }], 2)).toBe(100)
  })
})

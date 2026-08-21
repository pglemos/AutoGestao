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
    const checks = buildClientReadiness(input())
    const summary = readinessSummary(checks)
    expect(summary.canActivate).toBe(true)
    expect(summary.blockers).toEqual([])
    expect(summary.warnings).toEqual([])
    expect(checks.every(c => c.evaluationStatus === 'VALID')).toBe(true)
  })

  test('sem loja principal a ativação é bloqueada com status INVALID e rota', () => {
    const checks = buildClientReadiness(input({ primary_store_id: null }))
    const summary = readinessSummary(checks)
    expect(summary.canActivate).toBe(false)
    const check = checks.find(item => item.key === 'loja-principal')
    expect(check?.ok).toBe(false)
    expect(check?.evaluationStatus).toBe('INVALID')
    expect(check?.correctionRoute).toBe('/clientes')
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

  test('avalia checks adicionais de dono master e jornada gerada quando presentes', () => {
    const checks = buildClientReadiness(input({
      owner_master: { status: 'VALID', name: 'Daniel', email: 'dono@empresa.com' },
      journey_generated: true,
    }))
    expect(checks.map(c => c.key)).toContain('dono-master')
    expect(checks.map(c => c.key)).toContain('jornada-gerada')
    expect(checks.find(c => c.key === 'dono-master')?.ok).toBe(true)
    expect(checks.find(c => c.key === 'jornada-gerada')?.ok).toBe(true)
  })

  test('dono master ausente ainda aparece no checklist como pendência (não some da lista)', () => {
    // Bug achado ao vivo em produção: cliente sem nenhuma pessoa cadastrada
    // não mostrava a linha "Dono Master válido" — o checklist simplesmente
    // omitia o item em vez de sinalizar a pendência, igual aos demais checks
    // informativos (Contato principal, CNPJ, etc.) fazem quando faltam.
    const checks = buildClientReadiness(input({
      owner_master: { status: 'NOT_CONFIGURED' },
    }))
    const check = checks.find(c => c.key === 'dono-master')
    expect(check).toBeDefined()
    expect(check?.ok).toBe(false)
    expect(check?.detail).toBe('Nenhum Dono Master configurado para esta empresa.')
  })

  test('dois donos master ao mesmo tempo geram aviso específico de duplicidade', () => {
    const checks = buildClientReadiness(input({
      owner_master: { status: 'DUPLICATE_MASTER' },
    }))
    const check = checks.find(c => c.key === 'dono-master')
    expect(check?.ok).toBe(false)
    expect(check?.detail).toContain('dois usuários marcados como Dono Master')
  })

  test('plano estratégico publicado e completo aparece OK', () => {
    const checks = buildClientReadiness(input({
      strategic_plan_ready: { cycleStatus: 'publicado', total: 46, ready: 46, pending: 0 },
    }))
    const check = checks.find(c => c.key === 'plano-estrategico')
    expect(check?.ok).toBe(true)
    expect(check?.evaluationStatus).toBe('VALID')
    expect(check?.detail).toBe('Publicado — 46 de 46 indicador(es) com meta completa.')
  })

  test('plano estratégico publicado com pendência não some — mostra WARNING, não trava', () => {
    // O bug do doc de correção: status "Publicado" com metas publicadas = 0 não
    // pode aparecer silenciosamente como se estivesse tudo certo.
    const checks = buildClientReadiness(input({
      strategic_plan_ready: { cycleStatus: 'publicado', total: 46, ready: 0, pending: 46 },
    }))
    const check = checks.find(c => c.key === 'plano-estrategico')
    expect(check?.ok).toBe(false)
    expect(check?.evaluationStatus).toBe('WARNING')
    expect(check?.detail).toBe('Publicado — 0 de 46 indicador(es) com meta completa, 46 pendência(s).')
    expect(readinessSummary(checks).canActivate).toBe(true) // informativo não bloqueia ativação
  })

  test('plano estratégico em rascunho não é tratado como pronto', () => {
    const checks = buildClientReadiness(input({
      strategic_plan_ready: { cycleStatus: 'rascunho', total: 46, ready: 10, pending: 36 },
    }))
    const check = checks.find(c => c.key === 'plano-estrategico')
    expect(check?.ok).toBe(false)
    expect(check?.evaluationStatus).toBe('NOT_APPLICABLE')
    expect(check?.detail).toBe('Rascunho — 10 de 46 indicador(es) prontos para publicar.')
  })

  test('plano estratégico sem ciclo não aparece no checklist', () => {
    const checks = buildClientReadiness(input({ strategic_plan_ready: null }))
    expect(checks.map(c => c.key)).not.toContain('plano-estrategico')
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

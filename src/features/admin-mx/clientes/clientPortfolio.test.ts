import { describe, expect, test } from 'bun:test'
import {
  activationBlockers,
  clientBuckets,
  filterPortfolio,
  isRenewalNear,
  journeyLabel,
  nextAction,
  portfolioCounters,
  structureLabel,
  EMPTY_PORTFOLIO_FILTERS,
  type PortfolioClient,
} from './clientPortfolio'

const HOJE = new Date('2026-08-16T12:00:00Z')

function client(overrides: Partial<PortfolioClient> = {}): PortfolioClient {
  return {
    id: 'c1', name: 'Concessionária Alfa', slug: 'alfa', cnpj: '11222333000181',
    status: 'ativo', business_phase: 'CRESCIMENTO', product_name: 'PMR 7', program_template_key: 'pmr_7',
    structure_type: 'LOJA_UNICA', primary_store_id: 's1', implementation_owner_id: 'u1',
    implementation_owner_name: 'Ana', contract_end_date: null, onboarding_step: 7, onboarding_completed: true,
    units: 1, users: 4, visitsDone: 7, visitsTotal: 7, modulesEnabled: 3, assignments: 1,
    ...overrides,
  }
}

describe('impedimentos de ativação', () => {
  test('cliente completo não tem bloqueio', () => {
    expect(activationBlockers(client())).toEqual([])
  })

  test('lista cada peça que falta', () => {
    const blockers = activationBlockers(client({ primary_store_id: null, product_name: null, assignments: 0, modulesEnabled: 0 }))
    expect(blockers).toEqual(['sem loja principal', 'sem produto contratado', 'sem consultor', 'sem módulos liberados'])
  })
})

describe('cards da carteira', () => {
  test('ativo com jornada em curso entra em ativos e em implantação', () => {
    expect(clientBuckets(client({ visitsDone: 3 }), HOJE)).toEqual(['ativos', 'em_implantacao'])
  })

  test('inativo sem pendência fica pronto para ativar', () => {
    expect(clientBuckets(client({ status: 'inativo' }), HOJE)).toContain('prontos_para_ativar')
  })

  test('inativo com pendência cai em bloqueios, não em pronto', () => {
    const buckets = clientBuckets(client({ status: 'inativo', primary_store_id: null }), HOJE)
    expect(buckets).toContain('com_bloqueios')
    expect(buckets).not.toContain('prontos_para_ativar')
  })

  test('renovação próxima aparece mesmo em cliente ativo', () => {
    const buckets = clientBuckets(client({ contract_end_date: '2026-09-10' }), HOJE)
    expect(buckets).toContain('ativos')
    expect(buckets).toContain('renovacoes_proximas')
  })

  test('contrato distante não conta como renovação', () => {
    expect(isRenewalNear(client({ contract_end_date: '2027-01-01' }), HOJE)).toBe(false)
    expect(isRenewalNear(client({ contract_end_date: null }), HOJE)).toBe(false)
  })

  test('onboarding aberto entra em cadastros pendentes', () => {
    expect(clientBuckets(client({ onboarding_completed: false }), HOJE)).toContain('cadastros_pendentes')
  })

  test('contadores somam por card', () => {
    const counters = portfolioCounters([
      client(),
      client({ id: 'c2', status: 'inativo', primary_store_id: null }),
      client({ id: 'c3', contract_end_date: '2026-09-01' }),
    ], HOJE)
    expect(counters.ativos).toBe(2)
    expect(counters.com_bloqueios).toBe(1)
    expect(counters.renovacoes_proximas).toBe(1)
  })
})

describe('próxima ação', () => {
  test('bloqueio vira a ação mais urgente', () => {
    expect(nextAction(client({ status: 'inativo', primary_store_id: null }))).toBe('Resolver: sem loja principal')
  })

  test('inativo sem bloqueio manda ativar', () => {
    expect(nextAction(client({ status: 'inativo' }))).toBe('Validar e ativar cliente')
  })

  test('jornada em curso aponta o próximo encontro', () => {
    expect(nextAction(client({ visitsDone: 2 }))).toBe('Conduzir encontro 3 de 7')
  })

  test('cliente sem usuário pede cadastro de pessoas', () => {
    expect(nextAction(client({ users: 0 }))).toBe('Cadastrar pessoas e acessos')
  })
})

describe('rótulos e filtros', () => {
  test('estrutura e jornada legíveis', () => {
    expect(structureLabel(client({ structure_type: 'REDE', units: 4 }))).toBe('Rede · 4 unidade(s)')
    expect(journeyLabel(client({ visitsDone: 2, visitsTotal: 7 }))).toBe('2 de 7')
    expect(journeyLabel(client({ visitsTotal: 0 }))).toBe('Sem jornada')
  })

  test('busca por nome, responsável e CNPJ', () => {
    const rows = [client(), client({ id: 'c2', name: 'Beta Motors', cnpj: '99888777000166', implementation_owner_name: 'Bruno' })]
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, search: 'beta' }, HOJE)).toHaveLength(1)
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, search: 'Ana' }, HOJE)).toHaveLength(1)
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, search: '99888' }, HOJE)).toHaveLength(1)
  })

  test('filtro por card e por fase', () => {
    const rows = [client(), client({ id: 'c2', status: 'inativo', primary_store_id: null, business_phase: 'ESTRUTURACAO' })]
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, bucket: 'com_bloqueios' }, HOJE)).toHaveLength(1)
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, phase: 'ESTRUTURACAO' }, HOJE)).toHaveLength(1)
  })
})

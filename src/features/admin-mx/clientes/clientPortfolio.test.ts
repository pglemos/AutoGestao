import { describe, expect, test } from 'bun:test'
import {
  activationBlockers,
  canonicalPortfolioStatus,
  clientBuckets,
  clientStructureSummary,
  clientStoreIds,
  clientTeamStat,
  excludeBranchClients,
  formatCityName,
  formatCnpj,
  filterPortfolio,
  parentClientOf,
  branchClientsToArchive,
  isRenewalNear,
  journeyLabel,
  nextAction,
  portfolioCounters,
  portfolioActionPriority,
  portfolioGovernanceAttentionCount,
  portfolioOperationalLabel,
  portfolioOwnerOptions,
  portfolioStatusCounters,
  portfolioStatusLabel,
  sortPortfolioByAction,
  structureLabel,
  EMPTY_PORTFOLIO_FILTERS,
  type PortfolioClient,
  type PortfolioStatusFilter,
} from './clientPortfolio'

const HOJE = new Date('2026-08-16T12:00:00Z')

function client(overrides: Partial<PortfolioClient> = {}): PortfolioClient {
  return {
    id: 'c1', name: 'Concessionária Alfa', slug: 'alfa', cnpj: '11222333000181',
    status: 'ativo', business_phase: 'CRESCIMENTO', product_name: 'PMR 7', program_template_key: 'pmr_7',
    structure_type: 'LOJA_UNICA', primary_store_id: 's1', implementation_owner_id: 'u1',
    implementation_owner_name: 'Ana', contract_end_date: null, onboarding_step: 7, onboarding_completed: true,
    primary_store_city: 'São Paulo', main_contact_name: 'Carlos Dono', hasDonoMaster: true,
    units: 1, users: 4, visitsDone: 7, visitsTotal: 7, modulesEnabled: 3, assignments: 1,
    ...overrides,
  }
}

describe('linguagem da estrutura do cliente', () => {
  test('explica loja única e rede como cliente + unidades', () => {
    expect(clientStructureSummary({ units: 1 })).toBe('Loja única · matriz')
    expect(clientStructureSummary({ units: 3 })).toBe('Matriz + 2 filiais')
    expect(clientStructureSummary({ units: 0 })).toBe('Sem unidade vinculada')
  })
})

describe('equipe do cliente somada nas lojas dele', () => {
  const lojas = [
    { id: 's1', parent_loja_id: null },
    { id: 's2', parent_loja_id: 's1' },
    { id: 's3', parent_loja_id: 's1' },
    { id: 'outra', parent_loja_id: null },
  ]

  test('reúne a loja principal e as filiais dela', () => {
    expect(clientStoreIds(client(), lojas)).toEqual(['s1', 's2', 's3'])
  })

  test('cliente sem loja principal não reivindica loja nenhuma', () => {
    expect(clientStoreIds(client({ primary_store_id: null }), lojas)).toEqual([])
  })

  test('soma os vendedores das unidades em vez de olhar só a matriz', () => {
    const stats = {
      s1: { sellers: 4, checkedIn: 2, disciplinePct: 50 },
      s2: { sellers: 6, checkedIn: 6, disciplinePct: 100 },
      outra: { sellers: 99, checkedIn: 0, disciplinePct: 0 },
    }
    expect(clientTeamStat(['s1', 's2', 's3'], stats)).toEqual({
      sellers: 10,
      checkedIn: 8,
      disciplinePct: 80,
    })
  })

  test('presença pesa por vendedor, não pela média das porcentagens', () => {
    // 1 de 1 numa loja e 0 de 19 na outra é 5%, não 50%.
    const stats = {
      s1: { sellers: 1, checkedIn: 1, disciplinePct: 100 },
      s2: { sellers: 19, checkedIn: 0, disciplinePct: 0 },
    }
    expect(clientTeamStat(['s1', 's2'], stats).disciplinePct).toBe(5)
  })

  test('cliente sem loja conhecida fica em zero, sem quebrar', () => {
    expect(clientTeamStat([], {})).toEqual({ sellers: 0, checkedIn: 0, disciplinePct: 0 })
  })

  test('ignora loja que não está no mapa de estatísticas', () => {
    expect(clientTeamStat(['s1', 'inexistente'], { s1: { sellers: 3, checkedIn: 3, disciplinePct: 100 } })).toEqual({
      sellers: 3,
      checkedIn: 3,
      disciplinePct: 100,
    })
  })
})

describe('filiais não entram na carteira como clientes', () => {
  const lojas = [
    { id: 'matriz', parent_loja_id: null },
    { id: 'piso3', parent_loja_id: 'matriz' },
    { id: 'tito', parent_loja_id: 'matriz' },
    { id: 'orfa', parent_loja_id: 'sumida' },
  ]

  test('esconde 3 Piso e Tito quando a matriz já é cliente', () => {
    const rows = [
      client({ id: 'ag', name: 'AG AUTOMÓVEIS', primary_store_id: 'matriz', units: 3 }),
      client({ id: 'ag-3', name: 'AG AUTOMÓVEIS - 3 PISO', primary_store_id: 'piso3', units: 1 }),
      client({ id: 'ag-tito', name: 'AG AUTOMÓVEIS - TITO', primary_store_id: 'tito', units: 1 }),
    ]
    expect(excludeBranchClients(rows, lojas).map(row => row.id)).toEqual(['ag'])
  })

  test('mantém filial órfã se a matriz não está na carteira', () => {
    const rows = [client({ id: 'orfa', primary_store_id: 'orfa' })]
    expect(excludeBranchClients(rows, lojas)).toHaveLength(1)
  })

  test('aponta a matriz como pai e só arquiva filial sem jornada', () => {
    const rows = [
      client({ id: 'ag', name: 'AG AUTOMÓVEIS', primary_store_id: 'matriz', slug: 'ag-automoveis', visitsTotal: 11 }),
      client({ id: 'ag-3', name: 'AG 3 PISO', primary_store_id: 'piso3', slug: 'ag-3', visitsTotal: 0 }),
      client({ id: 'ag-tito', name: 'AG TITO', primary_store_id: 'tito', slug: 'ag-tito', visitsTotal: 0 }),
      client({ id: 'com-visita', name: 'Filial com jornada', primary_store_id: 'piso3', visitsTotal: 3 }),
    ]
    expect(parentClientOf(rows[1], rows, lojas)?.id).toBe('ag')
    expect(branchClientsToArchive(rows, lojas).map(row => row.id)).toEqual(['ag-3', 'ag-tito'])
  })
})

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

  test('ativo sem Dono Master não infla Com Bloqueios (já está ativo)', () => {
    expect(clientBuckets(client({ hasDonoMaster: false }), HOJE)).not.toContain('com_bloqueios')
    expect(clientBuckets(client({ status: 'inativo', hasDonoMaster: false }), HOJE)).toContain('com_bloqueios')
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

describe('situação canônica da carteira principal', () => {
  test('ativo com jornada incompleta continua nos Ativos; implantação é status explícito', () => {
    expect(canonicalPortfolioStatus(client({ visitsDone: 2 }))).toBe('ativos')
    expect(portfolioStatusLabel(client({ visitsDone: 2 }))).toBe('Ativos')
    expect(portfolioOperationalLabel(client({ visitsDone: 2 }))).toBe('Jornada em andamento')
    expect(portfolioStatusCounters([client({ visitsDone: 2 })])).toEqual({
      ativos: 1,
      em_implantacao: 0,
      prontos_para_ativar: 0,
      em_configuracao: 0,
    })
    expect(canonicalPortfolioStatus(client({ status: 'ativo_em_implantacao', visitsDone: 2 }))).toBe('em_implantacao')
  })

  test('separa pronto, configuração e suspensão', () => {
    expect(canonicalPortfolioStatus(client({ status: 'inativo' }))).toBe('prontos_para_ativar')
    expect(canonicalPortfolioStatus(client({ status: 'em_configuracao' }))).toBe('em_configuracao')
    expect(canonicalPortfolioStatus(client({ status: 'suspenso' }))).toBeNull()
    expect(portfolioStatusLabel(client({ status: 'suspenso' }))).toBe('Suspenso')
  })

  test('não exibe ativação programada para cliente suspenso', () => {
    expect(portfolioOperationalLabel(client({ status: 'suspenso', scheduled_activation_at: '2026-09-01' }))).toBeNull()
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

  test('ordena a carteira pela urgência operacional sem mutar a consulta', () => {
    const rows = [
      client({ id: 'acompanhamento', name: 'Zeta' }),
      client({ id: 'jornada', name: 'Beta', visitsDone: 2 }),
      client({ id: 'master', name: 'Gamma', hasDonoMaster: false }),
      client({ id: 'bloqueio', name: 'Alfa', status: 'inativo', primary_store_id: null }),
    ]

    expect(sortPortfolioByAction(rows, HOJE).map(row => row.id)).toEqual(['bloqueio', 'master', 'jornada', 'acompanhamento'])
    expect(rows.map(row => row.id)).toEqual(['acompanhamento', 'jornada', 'master', 'bloqueio'])
    expect(portfolioActionPriority(rows[3], HOJE)).toBe(0)
  })

  test('conta governança como clientes únicos da visão de pendências', () => {
    expect(portfolioGovernanceAttentionCount([
      client({ id: 'sem-owner', implementation_owner_id: null }),
      client({ id: 'bloqueado', status: 'inativo', primary_store_id: null }),
      client({ id: 'renovacao', contract_end_date: '2026-09-10' }),
      client({ id: 'suspenso', status: 'suspenso', suspended_at: '2026-08-15' }),
      client({ id: 'regular' }),
    ], HOJE)).toBe(4)
  })
})

describe('rótulos e filtros', () => {
  test('estrutura e jornada legíveis', () => {
    expect(structureLabel(client({ structure_type: 'REDE', units: 4 }))).toBe('Rede · 4 unidade(s)')
    expect(structureLabel(client({ structure_type: 'GRUPO', units: 3 }))).toBe('Grupo · 3 unidade(s)')
    expect(journeyLabel(client({ visitsDone: 2, visitsTotal: 7 }))).toBe('2 de 7')
    expect(journeyLabel(client({ visitsTotal: 0 }))).toBe('Não configurada')
  })

  test('deduplica responsável por id e desambigua homônimos por e-mail', () => {
    const options = portfolioOwnerOptions([
      { implementation_owner_id: 'u2', implementation_owner_name: 'Daniel', implementation_owner_email: 'daniel.b@mx.com' },
      { implementation_owner_id: 'u1', implementation_owner_name: 'Daniel', implementation_owner_email: 'daniel.a@mx.com' },
      { implementation_owner_id: 'u1', implementation_owner_name: 'Daniel', implementation_owner_email: 'outro@mx.com' },
    ])
    expect(options).toHaveLength(2)
    expect(options.map(option => option.label)).toEqual([
      'Daniel — daniel.a@mx.com',
      'Daniel — daniel.b@mx.com',
    ])
  })

  test('formata CNPJ e corrige cidades conhecidas sem alterar o valor original', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81')
    expect(formatCnpj('123')).toBe('123')
    expect(formatCityName('Sao Paulo')).toBe('São Paulo')
    expect(formatCityName('Recife')).toBe('Recife')
  })

  test('busca por nome, responsável e CNPJ', () => {
    const rows = [client(), client({ id: 'c2', name: 'Beta Motors', cnpj: '99888777000166', implementation_owner_name: 'Bruno' })]
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, search: 'beta' }, HOJE)).toHaveLength(1)
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, search: 'Ana' }, HOJE)).toHaveLength(1)
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, search: '99888' }, HOJE)).toHaveLength(1)
  })

  test('busca por cidade, contato principal e slug', () => {
    const rows = [client(), client({ id: 'c2', name: 'Gamma', slug: 'gamma-slug', primary_store_city: 'Recife', main_contact_name: 'Marina Diretora' })]
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, search: 'Recife' }, HOJE)).toHaveLength(1)
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, search: 'Marina' }, HOJE)).toHaveLength(1)
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, search: 'gamma' }, HOJE)).toHaveLength(1)
  })

  test('filtro por card e por fase', () => {
    const rows = [client(), client({ id: 'c2', status: 'inativo', primary_store_id: null, business_phase: 'ESTRUTURACAO' })]
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, bucket: 'com_bloqueios' }, HOJE)).toHaveLength(1)
    expect(filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, phase: 'ESTRUTURACAO' }, HOJE)).toHaveLength(1)
  })

  test('expõe e filtra os estados de lifecycle do Base44', () => {
    const rows = [
      client({ id: 'draft', status: 'rascunho' }),
      client({ id: 'collect', status: 'coleta_de_dados' }),
      client({ id: 'validation', status: 'em_validacao' }),
      client({ id: 'ready', status: 'pronto_para_ativar' }),
      client({ id: 'scheduled', status: 'ativacao_programada', scheduled_activation_at: '2026-09-01' }),
      client({ id: 'implanting', status: 'ativo_em_implantacao' }),
      client({ id: 'active', status: 'ativo' }),
      client({ id: 'suspended', status: 'suspenso' }),
      client({ id: 'closed', status: 'encerrado' }),
    ]

    const filters: Array<[PortfolioStatusFilter, string]> = [
      ['rascunho', 'draft'],
      ['coleta_de_dados', 'collect'],
      ['em_validacao', 'validation'],
      ['pronto_para_ativar', 'ready'],
      ['ativacao_programada', 'scheduled'],
      ['ativo_em_implantacao', 'implanting'],
      ['ativo', 'active'],
      ['suspenso', 'suspended'],
      ['encerrado', 'closed'],
    ]

    for (const [status, expectedId] of filters) {
      const result = filterPortfolio(rows, { ...EMPTY_PORTFOLIO_FILTERS, status }, HOJE)
      expect(result.map(item => item.id)).toEqual([expectedId])
    }
  })
})

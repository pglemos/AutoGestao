import { describe, expect, test } from 'bun:test'
import { buildCarteiraOperacional, carteiraCounters, carteiraFilterToNetworkStatus, CARTEIRA_FILTER_GROUPS, filterCarteiraRows } from './carteiraOperacional'
import { CARTEIRA_FILTERS } from './carteiraUrlState'
import type { PortfolioClient } from '@/features/admin-mx/clientes/clientPortfolio'
import type { NetworkCockpitStore } from '@/features/network-dashboard/types'

function store(overrides: Partial<NetworkCockpitStore> & { id: string; name: string }): NetworkCockpitStore {
  const zeroMetric = { value: 0, universe: 0, percentage: 0, periodStart: '', periodEnd: '', source: 'test' }
  return {
    leads: 0, agd: 0, vis: 0, sales: 0, goal: 0, gap: 0, proj: 0, ritmo: 0, efficiency: 0,
    sellers: 0, checkedInToday: 0, disciplinePct: 0,
    dataQuality: { operational: 'available', goal: 'configured', discipline: 'available' },
    pendingClosures: 0, overdueActions: 0, blockedActions: 0, awaitingValidationActions: 0,
    completedActions: 0, totalActions: 0,
    strategicProgress: zeroMetric, consultingProgress: zeroMetric, consultingDeliveryProgress: zeroMetric,
    consultingEvidencePending: 0, consultingParticipantsPending: 0,
    sellersEvolution: [], managersEvolution: [], ownerEvolution: null,
    riskReasons: [], sources: {},
    ...overrides,
  }
}

function client(overrides: Partial<PortfolioClient> & { id: string; name: string }): PortfolioClient {
  return {
    slug: null, cnpj: null, status: 'ativo', business_phase: null, product_name: null,
    program_template_key: null, structure_type: null, primary_store_id: null,
    implementation_owner_id: null, implementation_owner_name: null, contract_end_date: null,
    onboarding_step: null, onboarding_completed: null, suspended_at: null, suspended_reason: null,
    activated_at: null, scheduled_activation_at: null, primary_store_city: null,
    main_contact_name: null, hasDonoMaster: false, units: 0, users: 0,
    visitsDone: 0, visitsTotal: 0, modulesEnabled: 0, assignments: 0,
    ...overrides,
  }
}

describe('carteira operacional unificada', () => {
  test('une loja e cliente pela ponte primary_store_id', () => {
    const rows = buildCarteiraOperacional(
      [store({ id: 's1', name: 'Loja Centro' })],
      [client({ id: 'c1', name: 'GoCars', primary_store_id: 's1', implementation_owner_name: 'Ana' })],
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].linkage).toBe('vinculado')
    // O nome do cliente prevalece sobre o nome da loja quando há vínculo.
    expect(rows[0].name).toBe('GoCars')
    expect(rows[0].ownerName).toBe('Ana')
    expect(rows[0].store?.id).toBe('s1')
  })

  test('mantém os dois lados sem par visíveis em vez de descartar', () => {
    const rows = buildCarteiraOperacional(
      [store({ id: 's1', name: 'Loja sem cliente' })],
      [client({ id: 'c1', name: 'Cliente sem loja' })],
    )

    expect(carteiraCounters(rows)).toEqual({ total: 2, vinculados: 0, semCliente: 1, semLoja: 1 })
    expect(rows.map(row => row.linkage).sort()).toEqual(['sem_cliente', 'sem_loja'])
  })

  test('não deixa um cliente ser reaproveitado por duas lojas', () => {
    const rows = buildCarteiraOperacional(
      [store({ id: 's1', name: 'A' }), store({ id: 's2', name: 'B' })],
      [client({ id: 'c1', name: 'Único', primary_store_id: 's1' })],
    )

    expect(rows.filter(row => row.client?.id === 'c1')).toHaveLength(1)
    expect(carteiraCounters(rows).semCliente).toBe(1)
  })

  test('ordena por urgência: crítico antes de atenção antes de saudável', () => {
    const rows = buildCarteiraOperacional(
      [
        store({ id: 'ok', name: 'Saudável', sales: 10, goal: 10, disciplinePct: 90 }),
        store({ id: 'crit', name: 'Crítica', sales: 0, goal: 100, gap: 100, disciplinePct: 5, riskReasons: ['gap'] }),
      ],
      [],
    )

    expect(rows[0].name).toBe('Crítica')
  })

  test('filtra por busca, por decisão pendente e por ausência de vínculo', () => {
    const rows = buildCarteiraOperacional(
      [store({ id: 's1', name: 'Loja Norte' })],
      [client({ id: 'c1', name: 'Cliente Sul' })],
    )

    expect(filterCarteiraRows(rows, 'todos', 'norte').map(r => r.name)).toEqual(['Loja Norte'])
    expect(filterCarteiraRows(rows, 'sem_vinculo', '')).toHaveLength(2)
    expect(filterCarteiraRows(rows, 'todos', 'inexistente')).toHaveLength(0)
  })
})

describe('controle único de situação', () => {
  test('eixo operacional atravessa para o cockpit', () => {
    expect(carteiraFilterToNetworkStatus('critical')).toBe('critical')
    expect(carteiraFilterToNetworkStatus('healthy')).toBe('healthy')
  })

  test('recortes de contrato e de vínculo deixam a fila aberta', () => {
    // A fila de lojas não conhece contrato: estreitá-la por "com bloqueios"
    // esconderia lojas sem explicação visível.
    expect(carteiraFilterToNetworkStatus('com_bloqueios')).toBe('all')
    expect(carteiraFilterToNetworkStatus('sem_vinculo')).toBe('all')
    expect(carteiraFilterToNetworkStatus('exigem_decisao')).toBe('all')
    expect(carteiraFilterToNetworkStatus('todos')).toBe('all')
  })

  test('todo filtro do vocabulário aparece exatamente uma vez nos grupos', () => {
    const fromGroups = CARTEIRA_FILTER_GROUPS.flatMap(group => group.options.map(option => option.value))
    expect(new Set(fromGroups).size).toBe(fromGroups.length)
    expect([...fromGroups].sort()).toEqual([...CARTEIRA_FILTERS].sort())
  })
})

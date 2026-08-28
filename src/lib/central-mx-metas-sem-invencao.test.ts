import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { buildCentralMxEngine, type CentralMxEngineInput } from './central-mx-engine'

/**
 * O cockpit do Dono exibia metas de negócio cravadas no código — margem-alvo de
 * 18%, estoque acima de 90 dias com alvo 0, custo fixo 25%, turnover 5% — como
 * se fossem a meta do plano estratégico dele. Pior: divergiam da metodologia,
 * que define `STOCK_MARGIN_RATE = 0.20` em `parametros_estrategicos_mx`.
 *
 * A regra passa a ser: meta de negócio vem do parâmetro da MX; sem parâmetro, o
 * indicador fica sem meta. Meta ausente é honesta, meta inventada não é.
 */
const baseInput: CentralMxEngineInput = {
  storeId: 'loja-1',
  storeName: 'Loja Teste',
  period: '2026-08',
  metrics: {
    totalSales: 10, totalLeads: 100, totalAgd: 30, totalVis: 20,
    attainment: 80, goalValue: 12, checkedInCount: 3, sellerCount: 4,
  },
  funnel: { leadToSchedule: 30, scheduleToVisit: 60, visitToSale: 50 },
  benchmarks: { leadToSchedule: 20, scheduleToVisit: 33, visitToSale: 40 },
}

function metaDe(result: ReturnType<typeof buildCentralMxEngine>, code: string) {
  return result.planningIndicators.find(item => item.code === code)?.meta ?? null
}

describe('metas do cockpit não são inventadas', () => {
  test('sem parâmetros da MX, os indicadores de negócio ficam sem meta', () => {
    const engine = buildCentralMxEngine(baseInput)
    for (const code of [
      'avg_margin',
      'stock_over_90_rate',
      'active_stock',
      'trade_in_to_sales_rate',
      'financed_sales_percentage',
      'after_sales_percentage',
    ]) {
      expect(metaDe(engine, code)).toBeNull()
    }
  })

  test('com os parâmetros da MX, a meta é a da metodologia', () => {
    const engine = buildCentralMxEngine({
      ...baseInput,
      strategicParameters: { STOCK_MARGIN_RATE: 0.2, OVER_90_STOCK_RATE: 0.15, TRADE_SALES_RATE: 0.5 },
    })
    // Parâmetro é fração; o cockpit exibe pontos percentuais.
    expect(metaDe(engine, 'avg_margin')).toBe(20)
    expect(metaDe(engine, 'stock_over_90_rate')).toBe(15)
    expect(metaDe(engine, 'trade_in_to_sales_rate')).toBe(50)
  })

  test('nenhuma meta de negócio volta a ser cravada no motor', () => {
    const src = readFileSync('src/lib/central-mx-engine.ts', 'utf8')
    const corpo = src.slice(src.indexOf('function getBaseValues'))
    // `meta: 100` é o topo da escala de score/conformidade, não alvo de negócio.
    const cravadas = [...corpo.matchAll(/meta:\s*(-?\d+(?:\.\d+)?)/g)]
      .map(m => Number(m[1]))
      .filter(valor => valor !== 100)
    expect(cravadas).toEqual([])
  })

  test('indicadores arquivados na metodologia não voltam ao catálogo', () => {
    const engine = buildCentralMxEngine(baseInput)
    const codes = engine.planningIndicators.map(item => item.code)
    expect(codes).not.toContain('cost_per_lead')
    expect(codes).not.toContain('training_completion_rate')
    // O vocabulário paralelo inteiro saiu junto.
    expect(codes).not.toContain('channel_mix_score')
    expect(codes).not.toContain('behavioral_fit_score')
  })
})

/**
 * Ao trocar o catálogo do cockpit pelos 45 da metodologia, três alertas
 * passaram a procurar códigos que não existiam mais. O pior era o do DRE:
 * `indicators.find(...)` devolvia `undefined`, `undefined == null` é `true`, e o
 * alerta disparava sempre — inclusive com o DRE em dia.
 */
describe('alertas apontam para indicadores que existem', () => {
  const comDre = {
    ...baseInput,
    financial: { netProfit: 5000, grossMarginPct: 17 },
  }

  test('o alerta de DRE some quando o financeiro existe', () => {
    const semFinanceiro = buildCentralMxEngine({ ...baseInput, financial: null })
    const comFinanceiro = buildCentralMxEngine(comDre)
    const temAlertaDre = (r: ReturnType<typeof buildCentralMxEngine>) =>
      r.alerts.some(a => /DRE/i.test(a.problem))
    expect(temAlertaDre(semFinanceiro)).toBe(true)
    expect(temAlertaDre(comFinanceiro)).toBe(false)
  })

  test('todo alerta aponta para um indicador do catálogo', () => {
    const engine = buildCentralMxEngine(comDre)
    const codigos = new Set(engine.planningIndicators.map(item => item.code))
    const orfaos = engine.alerts
      .map(alert => (alert.metadata as { sourceIndicator?: string } | null)?.sourceIndicator)
      .filter((code): code is string => Boolean(code) && code !== 'mx_score')
      .filter(code => !codigos.has(code))
    expect(orfaos).toEqual([])
  })
})

/**
 * `crm_evento_tipo` sempre teve `pos_venda_realizado`, mas o cockpit deixava
 * `% de Pós-Venda` e `Volume de Pós-Venda` sem realizado — indicador oficial
 * exibido vazio com a fonte disponível ao lado, na mesma tabela que já
 * alimentava os canais de venda.
 */
describe('pós-venda sai da fonte que já existia', () => {
  const comPosVenda = {
    ...baseInput,
    salesByChannel: { internet: 3, doorFlow: 5, afterSales: 2, other: 0, totalSales: 8 },
  }

  function valorDe(result: ReturnType<typeof buildCentralMxEngine>, code: string) {
    return result.planningIndicators.find(item => item.code === code)?.realizado ?? null
  }

  test('volume e taxa saem dos eventos do mês', () => {
    const engine = buildCentralMxEngine(comPosVenda)
    expect(valorDe(engine, 'after_sales_volume')).toBe(2)
    expect(valorDe(engine, 'after_sales_percentage')).toBe(25)
  })

  test('sem vendas no mês a taxa é nula, não 0%', () => {
    const engine = buildCentralMxEngine({
      ...baseInput,
      salesByChannel: { internet: 0, doorFlow: 0, afterSales: 1, other: 0, totalSales: 0 },
    })
    expect(valorDe(engine, 'after_sales_percentage')).toBeNull()
  })

  test('sem a fonte, os dois seguem sem realizado', () => {
    const engine = buildCentralMxEngine(baseInput)
    expect(valorDe(engine, 'after_sales_volume')).toBeNull()
    expect(valorDe(engine, 'after_sales_percentage')).toBeNull()
  })

  /**
   * Troca e financiamento continuam sem origem: não há tabela de avaliação de
   * usado nem flag de financiamento na venda. Meta sem realizado é honesto;
   * inventar o realizado não seria.
   */
  test('troca e financiamento seguem sem realizado por falta de fonte', () => {
    const engine = buildCentralMxEngine(comPosVenda)
    expect(valorDe(engine, 'trade_in_to_sales_rate')).toBeNull()
    expect(valorDe(engine, 'financed_sales_percentage')).toBeNull()
  })
})

/**
 * Decisão da MX em 2026-08-27: venda sem canal registrado conta como
 * "Vendas - Outros". Eram 48 de 554 vendas em produção que não apareciam em
 * indicador de origem nenhum.
 */
describe('venda sem canal vai para Vendas - Outros', () => {
  function valorDe(result: ReturnType<typeof buildCentralMxEngine>, code: string) {
    return result.planningIndicators.find(item => item.code === code)?.realizado ?? null
  }

  test('as vendas sem canal aparecem em sales_other', () => {
    const engine = buildCentralMxEngine({
      ...baseInput,
      salesByChannel: { internet: 250, doorFlow: 107, afterSales: 0, other: 48, totalSales: 554 },
    })
    expect(valorDe(engine, 'sales_other')).toBe(48)
    expect(valorDe(engine, 'sales_internet')).toBe(250)
  })

  test('zero vendas sem canal é zero, não ausência', () => {
    const engine = buildCentralMxEngine({
      ...baseInput,
      salesByChannel: { internet: 10, doorFlow: 2, afterSales: 0, other: 0, totalSales: 12 },
    })
    expect(valorDe(engine, 'sales_other')).toBe(0)
  })

  test('sem a fonte, sales_other segue sem realizado', () => {
    expect(valorDe(buildCentralMxEngine(baseInput), 'sales_other')).toBeNull()
  })

  /** Carteira continua indivisível: o evento não distingue empresa de vendedor. */
  test('carteira segue sem realizado nos dois indicadores', () => {
    const engine = buildCentralMxEngine({
      ...baseInput,
      salesByChannel: { internet: 250, doorFlow: 107, afterSales: 0, other: 48, totalSales: 554 },
    })
    expect(valorDe(engine, 'sales_company_wallet')).toBeNull()
    expect(valorDe(engine, 'sales_seller_wallet')).toBeNull()
  })
})

/**
 * Provar que o motor calcula um indicador não prova que a tela o mostra.
 * O cockpit renderiza `departments[].indicators`, não `planningIndicators`
 * direto — `DepartmentsView` faz passthrough de `department.indicators`.
 * Um indicador que existisse só na lista plana ficaria invisível na aba do
 * departamento, e nenhum teste anterior pegaria isso.
 */
describe('os indicadores novos chegam ao departamento que a tela renderiza', () => {
  const engine = buildCentralMxEngine({
    ...baseInput,
    salesByChannel: { internet: 250, doorFlow: 107, afterSales: 4, other: 48, totalSales: 554 },
  })

  function noDepartamento(code: string) {
    const dep = engine.departments.find(item => item.indicators.some(ind => ind.code === code))
    return dep ? { departamento: dep.code, valor: dep.indicators.find(i => i.code === code)?.realizado } : null
  }

  test('sales_other aparece no comercial com o valor do motor', () => {
    expect(noDepartamento('sales_other')).toEqual({ departamento: 'comercial', valor: 48 })
  })

  test('os indicadores de pós-venda aparecem no operacional', () => {
    expect(noDepartamento('after_sales_volume')).toEqual({ departamento: 'operacional', valor: 4 })
    expect(noDepartamento('after_sales_percentage')?.departamento).toBe('operacional')
  })

  test('todo indicador do catálogo pertence a algum departamento', () => {
    const emDepartamento = new Set(engine.departments.flatMap(d => d.indicators.map(i => i.code)))
    const orfaos = engine.planningIndicators.map(i => i.code).filter(code => !emDepartamento.has(code))
    expect(orfaos).toEqual([])
  })
})

/**
 * `calcularFunil` devolve 0 quando o denominador é 0. O cockpit exibia esse 0
 * como "0%" e o pontuava como falha — indistinguível de uma conversão que
 * realmente foi zero.
 *
 * Não é hipotético: em produção `agd_cart_prev_day + agd_net_prev_day` está
 * zerado em 29 de 29 lojas com lançamento, então "Conversão de Agendamentos
 * em Visitas" marcava 0% na rede inteira, contra meta de 60%, e ajudava a
 * rotular o comercial como Crítico.
 */
describe('taxa de funil sem denominador é ausência, não zero', () => {
  function taxa(engine: ReturnType<typeof buildCentralMxEngine>, code: string) {
    const item = engine.planningIndicators.find(i => i.code === code)
    return { realizado: item?.realizado ?? null, status: item?.status }
  }

  const semDenominador = buildCentralMxEngine({
    ...baseInput,
    funnel: { leadToSchedule: null, scheduleToVisit: null, visitToSale: null },
  })

  test('as três taxas ficam sem realizado', () => {
    expect(taxa(semDenominador, 'lead_to_appointment_rate').realizado).toBeNull()
    expect(taxa(semDenominador, 'appointment_to_visit_rate').realizado).toBeNull()
    expect(taxa(semDenominador, 'visit_to_sale_rate').realizado).toBeNull()
  })

  test('não dispara alerta crítico de conversão sem dado', () => {
    const alertas = semDenominador.alerts.filter(a => /Convers/i.test(a.problem))
    expect(alertas).toEqual([])
  })

  test('zero medido continua sendo zero, e ainda alerta', () => {
    const zeroReal = buildCentralMxEngine({
      ...baseInput,
      funnel: { leadToSchedule: 0, scheduleToVisit: 0, visitToSale: 0 },
    })
    expect(taxa(zeroReal, 'lead_to_appointment_rate').realizado).toBe(0)
    expect(zeroReal.alerts.some(a => /Convers/i.test(a.problem))).toBe(true)
  })
})

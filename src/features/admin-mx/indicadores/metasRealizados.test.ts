import { describe, expect, test } from 'bun:test'
import {
  applyActualComputedPasses,
  buildMonthlyGrid,
  buildOfficialMonthlyGrid,
  readOfficialMonthValue,
  buildTargetWorkbookSheets,
  buildStoreCopyMutations,
  isCompanyLevelIndicator,
  isPlanningFieldEditable,
  previewStoreTargetsCopy,
  processTargetImport,
  validateQuickEntryCells,
  januaryReplicationSeries,
  indicatorYearComplete,
  monthsAreUniform,
  uniqueFilledValue,
  fillUniformGaps,
  fillIsolatedZeros,
  normalizeQuickEntrySeries,
  copyPreviousMonthSeries,
  countQuickEntryProgress,
  validateTargetImport,
  distributeSalesTotalToChannels,
  distributeIntegerTotalEvenly,
  resolvePlanningPersistenceCode,
} from './metasRealizados'

const INDICATORS = [
  { code: 'SALES_WALKIN', name: 'Vendas Fluxo', department: 'COMERCIAL' },
  { code: 'SALES_TOTAL', name: 'Vendas Total', department: 'COMERCIAL', calculado: true },
  { code: 'INSTAGRAM_FOLLOWERS', name: 'Seguidores', department: 'MARKETING' },
]

describe('isCompanyLevelIndicator', () => {
  test('empresariais não são copiados', () => {
    expect(isCompanyLevelIndicator({ code: 'INSTAGRAM_FOLLOWERS', name: 'x' })).toBe(true)
    expect(isCompanyLevelIndicator({ code: 'SALES_WALKIN', name: 'x' })).toBe(false)
  })
})

describe('edição de metas e realizados', () => {
  test('fórmula bloqueia a Meta; derivados do Realizado também ficam bloqueados', () => {
    // SALES_TOTAL: meta calculada E realizado derivado (ACTUAL_CALCULATED).
    const total = { code: 'SALES_TOTAL', name: 'Vendas Total', calculado: true }
    expect(isPlanningFieldEditable(total, 'meta')).toBe(false)
    expect(isPlanningFieldEditable(total, 'realizado')).toBe(false)
    expect(isPlanningFieldEditable(total, 'ano_anterior')).toBe(false)

    // Indicador manual: meta e realizado são lançamentos operacionais.
    const walkin = { code: 'SALES_WALKIN', name: 'Vendas Fluxo', calculado: false }
    expect(isPlanningFieldEditable(walkin, 'meta')).toBe(true)
    expect(isPlanningFieldEditable(walkin, 'realizado')).toBe(true)
  })
})

describe('replicação de Janeiro', () => {
  test('Janeiro vazio não gera série; zero replica o ano inteiro', () => {
    expect(januaryReplicationSeries(null)).toBeNull()
    expect(januaryReplicationSeries(0)).toEqual(Array.from({ length: 12 }, () => 0))
    expect(januaryReplicationSeries(10)?.length).toBe(12)
    expect(januaryReplicationSeries(10)?.every(value => value === 10)).toBe(true)
  })
})

describe('cadastro rápido valor único e personalizar mês', () => {
  test('ano completo exige os 12 meses; vazio em um mês não conta', () => {
    expect(indicatorYearComplete(Array.from({ length: 12 }, () => 4))).toBe(true)
    expect(indicatorYearComplete([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(true)
    expect(indicatorYearComplete([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, null])).toBe(false)
  })

  test('meses uniformes colapsam para valor único; 0 é uniforme', () => {
    expect(monthsAreUniform([6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6])).toBe(true)
    expect(monthsAreUniform(Array.from({ length: 12 }, () => null))).toBe(true)
    expect(monthsAreUniform([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(true)
    expect(monthsAreUniform([6, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6])).toBe(false)
  })

  test('buraco no mesmo valor único preenche o ano; meses diferentes não', () => {
    const internet = [null, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
    expect(monthsAreUniform(internet)).toBe(false)
    expect(uniqueFilledValue(internet)).toBe(3)
    expect(fillUniformGaps(internet)).toEqual(Array.from({ length: 12 }, () => 3))
    expect(uniqueFilledValue([0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9])).toBeNull()
    expect(fillUniformGaps([0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9])).toEqual([0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9])
    expect(fillIsolatedZeros([0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9])).toEqual(Array.from({ length: 12 }, () => 9))
    expect(normalizeQuickEntrySeries([0, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9])).toEqual(Array.from({ length: 12 }, () => 9))
    expect(fillIsolatedZeros(Array.from({ length: 12 }, () => 0))).toEqual(Array.from({ length: 12 }, () => 0))
  })

  test('copiar mês anterior preenche para frente e não inventa Janeiro', () => {
    expect(copyPreviousMonthSeries([6, null, null, 2, null, null, null, null, null, null, null, null])).toEqual(
      [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    )
    expect(copyPreviousMonthSeries(Array.from({ length: 12 }, () => null)).every(value => value == null)).toBe(true)
  })

  test('progresso por departamento conta só digitáveis com o ano completo', () => {
    const progress = countQuickEntryProgress({
      indicators: [
        { code: 'A', department: 'Comercial' },
        { code: 'B', department: 'Comercial' },
        { code: 'C', department: 'Marketing', calculado: true },
      ],
      valuesFor: code => code === 'A' ? Array.from({ length: 12 }, () => 1) : Array.from({ length: 12 }, () => null),
    })
    expect(progress.digitaveisFilled).toBe(1)
    expect(progress.digitaveisTotal).toBe(2)
    expect(progress.byDept.Comercial).toEqual({ filled: 1, total: 2 })
    expect(progress.byDept.Marketing).toEqual({ filled: 0, total: 0 })
  })
})

describe('previewStoreTargetsCopy', () => {
  const sourceValues = [
    { loja_id: 'src', indicator_code: 'SALES_WALKIN', year: 2026, month: 1, meta: 10, realizado: null, ano_anterior: null },
    { loja_id: 'src', indicator_code: 'SALES_WALKIN', year: 2026, month: 2, meta: 12, realizado: null, ano_anterior: null },
  ]

  test('FILL_EMPTY_ONLY preenche vazio e preserva ocupado', () => {
    const preview = previewStoreTargetsCopy({
      sourceValues,
      targetValues: [
        { loja_id: 'dst', indicator_code: 'SALES_WALKIN', year: 2026, month: 1, meta: 99, realizado: null, ano_anterior: null },
      ],
      indicators: INDICATORS,
      targetStores: [{ id: 'dst', name: 'Filial' }],
      selectedMonths: [],
      selectedIndicatorCodes: [],
      conflictPolicy: 'FILL_EMPTY_ONLY',
    })
    const rows = preview.rows.filter(row => row.action !== 'IGNORAR')
    const month1 = rows.find(row => row.month === 1)
    const month2 = rows.find(row => row.month === 2)
    expect(month1?.action).toBe('MANTER')
    expect(month2?.action).toBe('PREENCHER')
    expect(preview.counters.preserved).toBe(1)
    expect(preview.counters.toFill).toBe(1)
    expect(preview.counters.companyIgnored).toBe(1)
  })

  test('REPLACE_SELECTED substitui valor ocupado', () => {
    const preview = previewStoreTargetsCopy({
      sourceValues,
      targetValues: [
        { loja_id: 'dst', indicator_code: 'SALES_WALKIN', year: 2026, month: 1, meta: 99, realizado: null, ano_anterior: null },
      ],
      indicators: INDICATORS,
      targetStores: [{ id: 'dst', name: 'Filial' }],
      selectedMonths: [1],
      selectedIndicatorCodes: ['SALES_WALKIN'],
      conflictPolicy: 'REPLACE_SELECTED',
    })
    const row = preview.rows.find(row => row.month === 1)
    expect(row?.action).toBe('SUBSTITUIR')
    expect(row?.newValue).toBe(10)
  })
})

describe('buildStoreCopyMutations', () => {
  test('gera mutações apenas das linhas incluídas', () => {
    const preview = previewStoreTargetsCopy({
      sourceValues: [
        { loja_id: 'src', indicator_code: 'SALES_WALKIN', year: 2026, month: 1, meta: 10, realizado: null, ano_anterior: null },
      ],
      targetValues: [],
      indicators: INDICATORS,
      targetStores: [{ id: 'dst', name: 'Filial' }],
      selectedMonths: [],
      selectedIndicatorCodes: ['SALES_WALKIN'],
      conflictPolicy: 'FILL_EMPTY_ONLY',
    })
    const mutations = buildStoreCopyMutations({ preview, year: 2026, conflictPolicy: 'FILL_EMPTY_ONLY' })
    expect(mutations).toEqual([
      { loja_id: 'dst', indicator_code: 'SALES_WALKIN', year: 2026, month: 1, meta: 10 },
    ])
  })
})

describe('validateTargetImport', () => {
  const config = { client_account_id: 'c1', reference_year: '2026', view_type: 'TARGET' }

  test('arquivo válido passa', () => {
    const result = validateTargetImport({
      config,
      rows: [{ code: 'SALES_WALKIN', months: [10], total: null, observation: null }],
      clientId: 'c1',
      referenceYear: 2026,
      indicators: INDICATORS,
    })
    expect(result.errors).toEqual([])
  })

  test('cliente e ano divergentes são bloqueados', () => {
    const result = validateTargetImport({
      config: { client_account_id: 'c2', reference_year: '2025', view_type: 'TARGET' },
      rows: [],
      clientId: 'c1',
      referenceYear: 2026,
      indicators: INDICATORS,
    })
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('código desconhecido vira erro', () => {
    const result = validateTargetImport({
      config,
      rows: [{ code: 'XYZ', months: [], total: null, observation: null }],
      clientId: 'c1',
      referenceYear: 2026,
      indicators: INDICATORS,
    })
    expect(result.errors).toContain('Indicador não encontrado no catálogo: XYZ')
  })

  test('alteração em calculado vira aviso', () => {
    const result = validateTargetImport({
      config,
      rows: [{ code: 'SALES_TOTAL', months: [50], total: null, observation: null }],
      clientId: 'c1',
      referenceYear: 2026,
      indicators: INDICATORS,
    })
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

describe('processTargetImport', () => {
  test('converte números em UPDATE, LIMPAR em CLEAR, inválido em INVALID', () => {
    const changes = processTargetImport({
      rows: [
        { code: 'SALES_WALKIN', months: ['10', 'LIMPAR', 'abc'], total: null, observation: null },
      ],
      indicators: INDICATORS,
      currentValues: [{ indicator_code: 'SALES_WALKIN', month: 2, value: 5 }],
      isPercentage: () => false,
    })
    expect(changes[0]).toMatchObject({ month: 1, newValue: 10, action: 'UPDATE' })
    expect(changes[1]).toMatchObject({ month: 2, action: 'CLEAR' })
    expect(changes[2]).toMatchObject({ month: 3, action: 'INVALID' })
  })

  test('célula vazia não vira zero; zero explícito é UPDATE', () => {
    const changes = processTargetImport({
      rows: [
        { code: 'SALES_WALKIN', months: [0, '', null, '   '], total: null, observation: null },
      ],
      indicators: INDICATORS,
      currentValues: [{ indicator_code: 'SALES_WALKIN', month: 2, value: 8 }],
      isPercentage: () => false,
    })
    expect(changes).toEqual([
      expect.objectContaining({ month: 1, newValue: 0, action: 'UPDATE' }),
    ])
  })

  test('calculados são pulados', () => {
    const changes = processTargetImport({
      rows: [{ code: 'SALES_TOTAL', months: [100], total: null, observation: null }],
      indicators: INDICATORS,
      currentValues: [],
      isPercentage: () => false,
    })
    expect(changes).toEqual([])
  })
})

describe('cadastro rápido', () => {
  test('grid mensal preenche meta e realizado', () => {
    const grid = buildMonthlyGrid(
      [{ loja_id: 'l', indicator_code: 'A', year: 2026, month: 1, meta: 5, realizado: 3, ano_anterior: 4 }],
      ['A'],
    )
    expect(grid.A[1]).toEqual({ meta: 5, realizado: 3, ano_anterior: 4 })
    expect(grid.A[12]).toEqual({ meta: null, realizado: null, ano_anterior: null })
  })

  test('recalcula oficiais no cadastro rápido mesmo com alias e null', () => {
    const grid = buildOfficialMonthlyGrid([
      { loja_id: 'matriz', indicator_code: 'sales_door_flow', year: 2026, month: 1, meta: 15, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_referral', year: 2026, month: 1, meta: 5, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_company_wallet', year: 2026, month: 1, meta: 5, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_seller_wallet', year: 2026, month: 1, meta: 10, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_internet', year: 2026, month: 1, meta: 20, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_other', year: 2026, month: 1, meta: 0, realizado: null, ano_anterior: null },
      { loja_id: 'matriz', indicator_code: 'sales_walkin', year: 2026, month: 1, meta: null, realizado: null, ano_anterior: null },
    ], [
      { code: 'sales_walkin' },
      { code: 'sales_referral' },
      { code: 'sales_company_wallet' },
      { code: 'sales_seller_wallet' },
      { code: 'sales_internet' },
      { code: 'sales_other' },
      { code: 'sales_total' },
    ], 'matriz')

    expect(grid.sales_walkin[1].meta).toBe(15)
    expect(grid.sales_total[1].meta).toBe(55)
  })

  test('recalcula a partir da grade hidratada mesmo com loja_id vazio e código oficial de carteira', () => {
    const grid = buildOfficialMonthlyGrid([
      { loja_id: '', indicator_code: 'sales_door_flow', year: 2026, month: 1, meta: 15, realizado: null, ano_anterior: null },
      { loja_id: '', indicator_code: 'sales_referral', year: 2026, month: 1, meta: 5, realizado: null, ano_anterior: null },
      { loja_id: '', indicator_code: 'sales_company_wallet', year: 2026, month: 1, meta: 5, realizado: null, ano_anterior: null },
      { loja_id: '', indicator_code: 'sales_seller_wallet', year: 2026, month: 1, meta: 10, realizado: null, ano_anterior: null },
      { loja_id: '', indicator_code: 'sales_internet', year: 2026, month: 1, meta: 20, realizado: null, ano_anterior: null },
      { loja_id: '', indicator_code: 'sales_other', year: 2026, month: 1, meta: 0, realizado: null, ano_anterior: null },
    ], [
      { code: 'sales_walkin' },
      { code: 'sales_referral' },
      { code: 'sales_company_portfolio' },
      { code: 'sales_seller_portfolio' },
      { code: 'sales_internet' },
      { code: 'sales_other' },
      { code: 'sales_total' },
      { code: 'net_profit' },
      { code: 'contribution_margin' },
      { code: 'additional_revenue' },
      { code: 'total_expense' },
    ], '467a19d1-af51-4b4f-9b05-d67187a2a759')

    expect(grid.sales_walkin[1].meta).toBe(15)
    expect(grid.sales_company_portfolio[1].meta).toBe(5)
    expect(grid.sales_total[1].meta).toBe(55)
  })

  test('lê SALES_TOTAL a partir dos canais já visíveis na grade', () => {
    const indicators = [
      { code: 'sales_walkin' },
      { code: 'sales_referral' },
      { code: 'sales_company_portfolio' },
      { code: 'sales_seller_portfolio' },
      { code: 'sales_internet' },
      { code: 'sales_other' },
      { code: 'sales_total' },
    ]
    const grid = buildMonthlyGrid([
      { loja_id: 'u', indicator_code: 'sales_walkin', year: 2026, month: 1, meta: 15, realizado: null, ano_anterior: null },
      { loja_id: 'u', indicator_code: 'sales_referral', year: 2026, month: 1, meta: 5, realizado: null, ano_anterior: null },
      { loja_id: 'u', indicator_code: 'sales_company_portfolio', year: 2026, month: 1, meta: 5, realizado: null, ano_anterior: null },
      { loja_id: 'u', indicator_code: 'sales_seller_portfolio', year: 2026, month: 1, meta: 10, realizado: null, ano_anterior: null },
      { loja_id: 'u', indicator_code: 'sales_internet', year: 2026, month: 1, meta: 20, realizado: null, ano_anterior: null },
      { loja_id: 'u', indicator_code: 'sales_other', year: 2026, month: 1, meta: 0, realizado: null, ano_anterior: null },
    ], indicators.map(item => item.code))
    expect(readOfficialMonthValue(grid, indicators, 'sales_total', 1)).toBe(55)
  })

  test('Realizado vazio: SALES_OTHER ZERO_IF_EMPTY não inventa SALES_TOTAL=0', () => {
    const indicators = [
      { code: 'SALES_WALKIN' },
      { code: 'SALES_REFERRAL' },
      { code: 'SALES_COMPANY_PORTFOLIO' },
      { code: 'SALES_SELLER_PORTFOLIO' },
      { code: 'SALES_INTERNET' },
      { code: 'SALES_OTHER' },
      { code: 'SALES_TOTAL' },
    ]
    const empty = buildMonthlyGrid([], indicators.map(item => item.code))
    expect(readOfficialMonthValue(empty, indicators, 'SALES_TOTAL', 7, 'realizado')).toBeNull()

    const partial = buildMonthlyGrid([
      { loja_id: 'u', indicator_code: 'SALES_WALKIN', year: 2026, month: 7, meta: null, realizado: 10, ano_anterior: null },
    ], indicators.map(item => item.code))
    expect(readOfficialMonthValue(partial, indicators, 'SALES_TOTAL', 7, 'realizado')).toBe(10)
  })

  test('SALES_TOTAL persistido=0 sem canais não vira Resultado 0', () => {
    const indicators = [
      { code: 'SALES_WALKIN' },
      { code: 'SALES_REFERRAL' },
      { code: 'SALES_COMPANY_PORTFOLIO' },
      { code: 'SALES_SELLER_PORTFOLIO' },
      { code: 'SALES_INTERNET' },
      { code: 'SALES_OTHER' },
      { code: 'SALES_TOTAL' },
    ]
    const stale = buildMonthlyGrid([
      { loja_id: 'u', indicator_code: 'SALES_TOTAL', year: 2026, month: 7, meta: 8, realizado: 0, ano_anterior: null },
    ], indicators.map(item => item.code))
    expect(readOfficialMonthValue(stale, indicators, 'SALES_TOTAL', 7, 'realizado')).toBeNull()
    const cleaned = applyActualComputedPasses(stale, indicators)
    expect(cleaned.SALES_TOTAL[7].realizado).toBeNull()
  })

  test('SALES_OTHER=0 legado sem canais não inventa SALES_TOTAL=0', () => {
    const indicators = [
      { code: 'SALES_WALKIN' },
      { code: 'SALES_REFERRAL' },
      { code: 'SALES_COMPANY_PORTFOLIO' },
      { code: 'SALES_SELLER_PORTFOLIO' },
      { code: 'SALES_INTERNET' },
      { code: 'SALES_OTHER' },
      { code: 'SALES_TOTAL' },
    ]
    const staleOther = buildMonthlyGrid([
      { loja_id: 'u', indicator_code: 'SALES_OTHER', year: 2026, month: 7, meta: 0, realizado: 0, ano_anterior: null },
    ], indicators.map(item => item.code))
    expect(readOfficialMonthValue(staleOther, indicators, 'SALES_TOTAL', 7, 'realizado')).toBeNull()
  })

  test('estoque/crédito com valor não autoriza SALES_OTHER=0 a inventar total', () => {
    const indicators = [
      { code: 'SALES_WALKIN' },
      { code: 'SALES_REFERRAL' },
      { code: 'SALES_COMPANY_PORTFOLIO' },
      { code: 'SALES_SELLER_PORTFOLIO' },
      { code: 'SALES_INTERNET' },
      { code: 'SALES_OTHER' },
      { code: 'SALES_TOTAL' },
      { code: 'ACTIVE_INVENTORY' },
      { code: 'APPROVED_CREDIT_APPLICATIONS' },
    ]
    const noisy = buildMonthlyGrid([
      { loja_id: 'u', indicator_code: 'SALES_OTHER', year: 2026, month: 7, meta: 0, realizado: 0, ano_anterior: null },
      { loja_id: 'u', indicator_code: 'ACTIVE_INVENTORY', year: 2026, month: 7, meta: null, realizado: 2, ano_anterior: null },
      { loja_id: 'u', indicator_code: 'APPROVED_CREDIT_APPLICATIONS', year: 2026, month: 7, meta: null, realizado: 0, ano_anterior: null },
    ], indicators.map(item => item.code))
    expect(readOfficialMonthValue(noisy, indicators, 'SALES_TOTAL', 7, 'realizado')).toBeNull()
  })

  test('buildOfficialMonthlyGrid preserva realizado manual de INVENTORY_TOTAL', () => {
    const indicators = [
      { code: 'SALES_TOTAL', formula_expression: 'IND("SALES_WALKIN")' },
      { code: 'INVENTORY_TOTAL', formula_expression: 'IND("SALES_TOTAL") * PAR("STOCK_TO_SALES_RATIO")' },
      { code: 'ACTIVE_INVENTORY', formula_expression: 'IND("INVENTORY_TOTAL") * PAR("ACTIVE_STOCK_RATE")' },
    ]
    const grid = buildOfficialMonthlyGrid([
      { loja_id: 'u', indicator_code: 'INVENTORY_TOTAL', year: 2026, month: 7, meta: 13, realizado: 3, ano_anterior: null },
      { loja_id: 'u', indicator_code: 'ACTIVE_INVENTORY', year: 2026, month: 7, meta: null, realizado: 1.95, ano_anterior: null },
    ], indicators, 'u')
    expect(grid.INVENTORY_TOTAL[7].realizado).toBe(3)
    expect(grid.ACTIVE_INVENTORY[7].realizado).toBe(1.95)
  })

  test('validação de células recusa mês fora do intervalo', () => {
    expect(validateQuickEntryCells([{ indicator_code: 'A', month: 13, value: 1 }])).toHaveLength(1)
    expect(validateQuickEntryCells([{ indicator_code: 'A', month: 1, value: 1 }])).toEqual([])
  })
})

describe('modelo XLSX de metas', () => {
  test('inclui grade, instruções e configuração no modelo em branco', () => {
    const sheets = buildTargetWorkbookSheets({
      indicators: [
        { code: 'SALES_WALKIN', name: 'Vendas Fluxo', department: 'COMERCIAL' },
        { code: 'CONVERSION_RATE', name: 'Conversão', department: 'COMERCIAL', value_type: 'percent', casas_decimais: 2 },
        { code: 'SALES_TOTAL', name: 'Vendas Total', department: 'COMERCIAL', calculado: true },
      ],
      year: 2026,
      storeId: 'store-1',
      storeName: 'Matriz',
      values: { CONVERSION_RATE: [0.25] },
    })

    expect(sheets.map(sheet => sheet.name)).toEqual(['INSTRUÇÕES', 'METAS', 'MX_CONFIG'])
    const metasSheet = sheets.find(s => s.name === 'METAS')
    expect(metasSheet).toBeDefined()
    expect(metasSheet?.rows[0]).toMatchObject({ 'Ordem Oficial': 1, 'Código do Indicador': 'SALES_TOTAL', Jan: 'Calculado', Tipo: 'Calculado' })
    expect(metasSheet?.rows[1]).toMatchObject({ 'Código do Indicador': 'SALES_WALKIN', Jan: null, Tipo: 'Digitável' })
    expect(metasSheet?.rows.length).toBe(46)
    const instrucoesSheet = sheets.find(s => s.name === 'INSTRUÇÕES')
    expect(instrucoesSheet?.rows.length).toBeGreaterThan(0)
    const configSheet = sheets.find(s => s.name === 'MX_CONFIG')
    expect(configSheet?.rows).toContainEqual({ Chave: 'view_type', Valor: 'TARGET' })
    expect(configSheet?.rows).toContainEqual({ Chave: 'manual_indicator_count', Valor: '19' })
    expect(configSheet?.rows).toContainEqual({ Chave: 'calculated_indicator_count', Valor: '27' })
  })
})

describe('resolvePlanningPersistenceCode', () => {
  test('marketing digitáveis usam metric_key minúsculo do catálogo', () => {
    expect(resolvePlanningPersistenceCode('INTERNET_COST_PER_SALE')).toBe('internet_cost_per_sale')
    expect(resolvePlanningPersistenceCode('VOLUME_DE_LEADS_POR_VENDA')).toBe('volume_de_leads_por_venda')
    expect(resolvePlanningPersistenceCode('INSTAGRAM_FOLLOWERS')).toBe('instagram_followers')
    expect(resolvePlanningPersistenceCode('GOOGLE_BUSINESS_RATING')).toBe('google_business_rating')
    expect(resolvePlanningPersistenceCode('CONTENT_QUALITY')).toBe('content_quality')
  })

  test('preserva metric_key já persistido no roster', () => {
    expect(resolvePlanningPersistenceCode('internet_cost_per_sale')).toBe('internet_cost_per_sale')
    expect(resolvePlanningPersistenceCode('sales_walkin')).toBe('sales_walkin')
  })
})

describe('cadastro rápido — aplicar em todos', () => {
  test('distribui Vendas Total igualmente nos 6 canais com soma preservada', () => {
    const channels = distributeSalesTotalToChannels(100)
    expect(Object.keys(channels)).toHaveLength(6)
    expect(Object.values(channels).reduce((sum, value) => sum + value, 0)).toBe(100)
  })

  test('distributeIntegerTotalEvenly reparte resto nos primeiros canais', () => {
    expect(distributeIntegerTotalEvenly(10, 3)).toEqual([4, 3, 3])
  })

  test('catálogo tem 19 digitáveis incluindo marketing e estoque/financeiro', () => {
    const sheets = buildTargetWorkbookSheets({
      indicators: [],
      year: 2026,
      storeId: 'store-1',
    })
    const metas = sheets.find(sheet => sheet.name === 'METAS')
    const digitaveis = metas?.rows.filter(row => row.Tipo === 'Digitável') ?? []
    const codes = digitaveis.map(row => row['Código do Indicador'])
    expect(digitaveis.length).toBe(19)
    expect(codes).toEqual(expect.arrayContaining([
      'INTERNET_COST_PER_SALE',
      'VOLUME_DE_LEADS_POR_VENDA',
      'INSTAGRAM_FOLLOWERS',
      'GOOGLE_BUSINESS_RATING',
      'CONTENT_QUALITY',
      'INVENTORY_AVERAGE_TICKET',
      'CONTRIBUTION_MARGIN',
      'EMPLOYEE_COUNT',
    ]))
  })
})

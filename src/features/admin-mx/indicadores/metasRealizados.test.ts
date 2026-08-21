import { describe, expect, test } from 'bun:test'
import {
  buildMonthlyGrid,
  buildTargetWorkbookSheets,
  buildStoreCopyMutations,
  isCompanyLevelIndicator,
  isPlanningFieldEditable,
  previewStoreTargetsCopy,
  processTargetImport,
  validateQuickEntryCells,
  validateTargetImport,
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
  test('indicador calculado bloqueia somente a Meta', () => {
    const indicator = { code: 'SALES_TOTAL', name: 'Vendas Total', calculado: true }
    expect(isPlanningFieldEditable(indicator, 'meta')).toBe(false)
    expect(isPlanningFieldEditable(indicator, 'realizado')).toBe(true)
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

    expect(sheets.map(sheet => sheet.name)).toEqual(['METAS', 'INSTRUCOES', 'MX_CONFIG'])
    expect(sheets[0]?.rows[0]).toMatchObject({ Código: 'SALES_WALKIN', Jan: null, Tipo: 'Digitável' })
    expect(sheets[0]?.rows[1]).toMatchObject({ Código: 'CONVERSION_RATE', Jan: 25 })
    expect(sheets[0]?.rows[2]).toMatchObject({ Código: 'SALES_TOTAL', Jan: 'CALCULADO', Tipo: 'Calculado' })
    expect(sheets[1]?.rows.length).toBeGreaterThan(0)
    expect(sheets[2]?.rows).toContainEqual({ Chave: 'view_type', Valor: 'TARGET' })
  })
})

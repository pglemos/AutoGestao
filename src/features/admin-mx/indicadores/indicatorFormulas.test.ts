import { describe, expect, test } from 'bun:test'
import { BASE44_STANDARD_INDICATORS, officialParameterDefaults } from './canonicalBase44Catalog'
import {
  MONTHS,
  applyOfficialComputedMetas,
  buildDependentsMap,
  calculateAnnualValue,
  computeValueMap,
  evaluateFormula,
  extractIndicatorDeps,
  extractParameterDeps,
  formatDisplay,
  formatEditableInput,
  getFormatConfig,
  parseStrategicInput,
} from './indicatorFormulas'

describe('extração de dependências', () => {
  test('IND e PAR são extraídos separadamente', () => {
    const formula = 'IND("SALES_TOTAL") * PAR("LEAD_TO_APPOINTMENT_RATE")'
    expect(extractIndicatorDeps(formula)).toEqual(['SALES_TOTAL'])
    expect(extractParameterDeps(formula)).toEqual(['LEAD_TO_APPOINTMENT_RATE'])
  })

  test('expressão vazia não produz dependências', () => {
    expect(extractIndicatorDeps('')).toEqual([])
    expect(extractParameterDeps(null)).toEqual([])
  })
})

describe('evaluateFormula', () => {
  test('soma de indicadores', () => {
    expect(evaluateFormula('IND("A") + IND("B")', { A: 10, B: 5 }, {})).toBe(15)
  })

  test('multiplicação por parâmetro', () => {
    expect(evaluateFormula('IND("A") * PAR("P")', { A: 10 }, { P: 2.5 })).toBe(25)
  })

  test('base ausente devolve null', () => {
    expect(evaluateFormula('IND("A") / IND("B")', { A: 10, B: null }, {})).toBeNull()
    expect(evaluateFormula('IND("A") * PAR("P")', { A: 10 }, { P: undefined })).toBeNull()
  })

  test('divisão por zero devolve null', () => {
    expect(evaluateFormula('IND("A") / IND("B")', { A: 10, B: 0 }, {})).toBeNull()
  })

  test('expressão inválida devolve null sem lançar', () => {
    expect(evaluateFormula('IND("A") +', { A: 1 }, {})).toBeNull()
    expect(evaluateFormula(null, {}, {})).toBeNull()
  })

  test('resolve aliases oficiais e chaves persistidas do MX', () => {
    expect(evaluateFormula(
      'IND("SALES_WALKIN") + IND("SALES_REFERRAL")',
      { sales_door_flow: 15, sales_referral: 5 },
      {},
    )).toBe(20)
    expect(evaluateFormula(
      'IND("SALES_TOTAL") * PAR("TRADE_SALES_RATE")',
      { sales_total: 55 },
      { trade_sales_rate: 0.5 },
    )).toBe(27.5)
  })
})

describe('calculateAnnualValue', () => {
  const monthly = [10, 20, null, 40]

  test('soma dos meses', () => {
    expect(calculateAnnualValue(monthly, 'SUM_MONTHS', null, {})).toBe(70)
  })

  test('média dos meses válidos', () => {
    expect(calculateAnnualValue(monthly, 'AVERAGE_MONTHS', null, {})).toBe(70 / 3)
  })

  test('último mês válido', () => {
    expect(calculateAnnualValue(monthly, 'LAST_VALID_MONTH', null, {})).toBe(40)
  })

  test('recalculado pelas bases anuais usa a fórmula anual', () => {
    const allValues = { A: { 1: 10, 2: 20 }, B: { 1: 2, 2: 3 } }
    expect(calculateAnnualValue(monthly, 'RECALCULATE_FROM_ANNUAL_BASES', 'SUM_ANNUAL("A") / SUM_ANNUAL("B")', allValues)).toBe(30 / 5)
  })

  test('sem valores válidos devolve null', () => {
    expect(calculateAnnualValue([null, null], 'SUM_MONTHS', null, {})).toBeNull()
  })
})

describe('formatação', () => {
  test('percentual armazenado como fração exibe como pontos', () => {
    const config = getFormatConfig('percent', 2)
    expect(formatDisplay(0.25, config)).toBe('25,00%')
  })

  test('valor percentual editável respeita as casas decimais', () => {
    const config = getFormatConfig('percent', 2)
    expect(formatEditableInput(0.123456, config)).toBe('12.35')
    expect(formatEditableInput(null, config)).toBe('')
  })

  test('moeda exibe com R$ e casas decimais', () => {
    const config = getFormatConfig('currency', 2)
    expect(formatDisplay(1500.5, config)).toBe('R$ 1.500,50')
  })

  test('parse de percentual converte pontos para fração', () => {
    const config = getFormatConfig('percent', 2)
    expect(parseStrategicInput('20', config)).toBe(0.2)
  })

  test('parse de número aceita separador decimal de vírgula', () => {
    const config = getFormatConfig('number', 2)
    expect(parseStrategicInput('1.234,56', config)).toBe(1234.56)
  })
})

describe('computeValueMap', () => {
  const indicators = [
    { code: 'A', formula_expression: null },
    { code: 'TOTAL', formula_expression: 'IND("A") + IND("B")' },
    { code: 'B', formula_expression: 'IND("A") * PAR("P")' },
  ]
  const monthlyValues = [
    { indicator_code: 'A', month: 1, value: 10 },
  ]

  test('calcula dependências em cadeia', () => {
    const { valueMap, calcStatus } = computeValueMap(monthlyValues, indicators, { P: 2 })
    expect(valueMap.A[1]).toBe(10)
    expect(valueMap.B[1]).toBe(20)
    expect(valueMap.TOTAL[1]).toBe(30)
    expect(calcStatus.TOTAL[1]).toBe('CALCULATED')
  })

  test('mês sem base fica WITHOUT_BASE', () => {
    const { valueMap, calcStatus } = computeValueMap(monthlyValues, indicators, { P: 2 })
    expect(valueMap.TOTAL[2]).toBeNull()
    expect(calcStatus.TOTAL[2]).toBe('WITHOUT_BASE')
  })

  test('demo Base44: canais MX somam 55 e disparam a cadeia oficial', () => {
    const demoValues = [
      { indicator_code: 'sales_door_flow', month: 1, value: 15 },
      { indicator_code: 'sales_referral', month: 1, value: 5 },
      { indicator_code: 'sales_company_wallet', month: 1, value: 5 },
      { indicator_code: 'sales_seller_wallet', month: 1, value: 10 },
      { indicator_code: 'sales_internet', month: 1, value: 20 },
      { indicator_code: 'sales_other', month: 1, value: 0 },
      { indicator_code: 'seller_count', month: 1, value: 7 },
      { indicator_code: 'contribution_margin', month: 1, value: 440000 },
      { indicator_code: 'additional_revenue', month: 1, value: 50000 },
      { indicator_code: 'total_expense', month: 1, value: 300000 },
      { indicator_code: 'inventory_average_ticket', month: 1, value: 45000 },
      { indicator_code: 'internet_cost_per_sale', month: 1, value: 350 },
    ]
    const demoIndicators = BASE44_STANDARD_INDICATORS.map(item => ({
      code: item.code,
      formula_expression: item.formula_expression,
    }))
    const { valueMap, calcStatus } = computeValueMap(demoValues, demoIndicators, month => officialParameterDefaults(month))
    expect(valueMap.SALES_TOTAL[1]).toBe(55)
    expect(valueMap.sales_total[1]).toBe(55)
    expect(calcStatus.SALES_TOTAL[1]).toBe('CALCULATED')
    expect(valueMap.LEADS_RECEIVED[1]).toBe(800)
    expect(valueMap.SALES_WITH_TRADE[1]).toBe(27.5)
    expect(valueMap.INVENTORY_TOTAL[1]).toBe(93.5)
    expect(valueMap.NET_PROFIT[1]).toBe(190000)
    expect(valueMap.INTERNET_INVESTMENT[1]).toBe(7000)

    const applied = applyOfficialComputedMetas({
      values: demoValues.map(item => ({
        loja_id: 'loja-mx',
        indicator_code: item.indicator_code,
        month: item.month,
        meta: item.value,
        realizado: null,
        ano_anterior: null,
      })),
      indicators: BASE44_STANDARD_INDICATORS.map(item => ({
        metric_key: item.code.toLowerCase(),
        formula_expression: item.formula_expression,
      })),
      unitIds: ['loja-mx'],
    })
    expect(applied.find(row => row.indicator_code === 'sales_total' && row.month === 1)?.meta).toBe(55)
  })

  test('null oficial não apaga alias já hidratado', () => {
    const demoIndicators = BASE44_STANDARD_INDICATORS.map(item => ({
      code: item.code,
      formula_expression: item.formula_expression,
    }))
    const { valueMap } = computeValueMap([
      { indicator_code: 'sales_door_flow', month: 1, value: 15 },
      { indicator_code: 'sales_referral', month: 1, value: 5 },
      { indicator_code: 'sales_company_wallet', month: 1, value: 5 },
      { indicator_code: 'sales_seller_wallet', month: 1, value: 10 },
      { indicator_code: 'sales_internet', month: 1, value: 20 },
      { indicator_code: 'sales_other', month: 1, value: 0 },
      { indicator_code: 'sales_walkin', month: 1, value: null },
      { indicator_code: 'SALES_WALKIN', month: 1, value: null },
    ], demoIndicators, month => officialParameterDefaults(month))

    expect(valueMap.SALES_WALKIN[1]).toBe(15)
    expect(valueMap.sales_walkin[1]).toBe(15)
    expect(valueMap.SALES_TOTAL[1]).toBe(55)
  })
})

describe('buildDependentsMap', () => {
  test('mapa transitivo agrupa dependentes indiretos', () => {
    const indicators = [
      { code: 'A', formula_expression: null },
      { code: 'B', formula_expression: 'IND("A") * 2' },
      { code: 'C', formula_expression: 'IND("B") + 1' },
    ]
    const dependents = buildDependentsMap(indicators)
    expect(dependents.A.sort()).toEqual(['B', 'C'])
    expect(dependents.B).toEqual(['C'])
    expect(dependents.C).toEqual([])
  })
})

describe('MONTHS', () => {
  test('12 meses', () => {
    expect(MONTHS).toHaveLength(12)
    expect(MONTHS[0]).toBe(1)
    expect(MONTHS[11]).toBe(12)
  })
})

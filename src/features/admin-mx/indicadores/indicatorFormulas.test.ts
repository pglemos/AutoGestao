import { describe, expect, test } from 'bun:test'
import {
  MONTHS,
  buildDependentsMap,
  calculateAnnualValue,
  computeValueMap,
  evaluateFormula,
  extractIndicatorDeps,
  extractParameterDeps,
  formatDisplay,
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

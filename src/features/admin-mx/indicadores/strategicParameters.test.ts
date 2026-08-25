import { describe, expect, test } from 'bun:test'
import {
  applyPersistedParameterValues,
  isStrategicParameterCode,
  parameterDependents,
  parameterUnit,
  strategicParameterDefinitions,
} from './strategicParameters'
import { getEffectiveParameter } from './parameterCatalog'

describe('strategicParameters', () => {
  test('expõe os 13 parâmetros da metodologia', () => {
    const definitions = strategicParameterDefinitions()
    expect(definitions).toHaveLength(13)
    expect(definitions.every(item => item.allows_client_override)).toBe(true)
    expect(parameterUnit('POST_SALE_RATE')).toBe('%')
    expect(isStrategicParameterCode('post_sale_rate')).toBe(true)
    expect(isStrategicParameterCode('SALES_TOTAL')).toBe(false)
  })

  test('valor persistido pela MX sobrepõe o padrão de código', () => {
    const definitions = applyPersistedParameterValues(strategicParameterDefinitions(), {
      values: { POST_SALE_RATE: 0.35 },
      monthly: { POST_SALE_RATE: null },
    })
    const postSale = definitions.find(item => item.code === 'POST_SALE_RATE')
    expect(postSale?.default_value).toBe(0.35)
    // Sem valor persistido, o parâmetro mantém o padrão da metodologia.
    expect(definitions.find(item => item.code === 'ACTIVE_STOCK_RATE')?.default_value).toBe(0.65)
  })

  test('mantém os valores mensais persistidos e o ajuste do cliente vence o padrão MX', () => {
    const monthly = [1.9, 1.8, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7, 1.7]
    const definitions = applyPersistedParameterValues(strategicParameterDefinitions(), {
      values: { STOCK_TO_SALES_RATIO: 1.7 },
      monthly: { STOCK_TO_SALES_RATIO: monthly },
    })
    expect(getEffectiveParameter('STOCK_TO_SALES_RATIO', 1, definitions, [])).toEqual({ value: 1.9, source: 'MX_DEFAULT' })
    const override = getEffectiveParameter('STOCK_TO_SALES_RATIO', 1, definitions, [
      { parameter_code: 'STOCK_TO_SALES_RATIO', reference_year: 2026, month: null, override_value: 2.1, reason: 'ajuste', status: 'ativo' },
    ])
    expect(override).toEqual({ value: 2.1, source: 'CLIENT_YEAR_OVERRIDE' })
  })

  test('dependentes vêm das fórmulas PAR("CODE")', () => {
    const indicators = [
      { metric_key: 'A', label: 'Indicador A', area: 'Comercial', formula_expression: 'IND("X") * PAR("POST_SALE_RATE")', target_calculation_mode: null },
      { metric_key: 'B', label: 'Indicador B', area: 'Comercial', formula_expression: 'IND("X") + IND("Y")', target_calculation_mode: null },
      { metric_key: 'C', label: 'Indicador C', area: 'Estoque', formula_expression: null, target_calculation_mode: null },
    ]
    expect(parameterDependents(indicators, 'POST_SALE_RATE').map(item => item.code)).toEqual(['A'])
    expect(parameterDependents(indicators, 'ACTIVE_STOCK_RATE')).toHaveLength(0)
  })
})

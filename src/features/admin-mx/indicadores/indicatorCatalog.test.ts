import { describe, expect, test } from 'bun:test'
import {
  allowedIndicatorTransitions,
  indicatorCalculationMode,
  isUsableIndicator,
  reorderIndicators,
  validateDecimals,
  validateIndicatorVigencia,
  validateThresholds,
} from './indicatorCatalog'

describe('ciclo de vida do indicador', () => {
  test('modo manual explícito prevalece sobre fórmula legada', () => {
    expect(indicatorCalculationMode({ target_calculation_mode: 'MANUAL', formula_expression: 'IND("A")' })).toBe('MANUAL')
    expect(indicatorCalculationMode({ target_calculation_mode: null, formula_expression: 'IND("A")' })).toBe('CALCULATED_ADJUSTABLE')
  })

  test('cada status oferece as transições do drawer', () => {
    expect(allowedIndicatorTransitions('rascunho')).toEqual(['em_revisao', 'publicado', 'arquivado'])
    expect(allowedIndicatorTransitions('em_revisao')).toEqual(['publicado', 'rascunho', 'arquivado'])
    expect(allowedIndicatorTransitions('publicado')).toEqual(['desabilitado', 'arquivado'])
    expect(allowedIndicatorTransitions('desabilitado')).toEqual(['publicado', 'arquivado'])
    expect(allowedIndicatorTransitions('arquivado')).toEqual(['rascunho'])
  })

  test('só indicador publicado e ativo é utilizável', () => {
    expect(isUsableIndicator({ status: 'publicado', active: true })).toBe(true)
    expect(isUsableIndicator({ status: 'publicado', active: false })).toBe(false)
    expect(isUsableIndicator({ status: 'rascunho', active: true })).toBe(false)
    expect(isUsableIndicator({ status: 'desabilitado', active: true })).toBe(false)
  })
})

describe('validações do catálogo', () => {
  test('vigência recusa ano final anterior ao inicial', () => {
    expect(validateIndicatorVigencia(2026, 2025)).toBe('Ano final anterior ao inicial.')
    expect(validateIndicatorVigencia(2026, 2027)).toBeNull()
    expect(validateIndicatorVigencia(null, null)).toBeNull()
  })

  test('vigência recusa ano fora do intervalo', () => {
    expect(validateIndicatorVigencia(1990, null)).toBe('Ano inicial fora do intervalo suportado.')
  })

  test('casas decimais aceita 0 a 4', () => {
    expect(validateDecimals(0)).toBeNull()
    expect(validateDecimals(4)).toBeNull()
    expect(validateDecimals(5)).toBe('Casas decimais deve ser um inteiro de 0 a 4.')
    expect(validateDecimals(1.5)).toBe('Casas decimais deve ser um inteiro de 0 a 4.')
  })
})

describe('ordem oficial', () => {
  const keys = ['a', 'b', 'c', 'd']

  test('subir troca com o anterior e renumera de 10 em 10', () => {
    expect(reorderIndicators(keys, 'c', 'up')).toEqual([
      { metric_key: 'a', sort_order: 10 },
      { metric_key: 'c', sort_order: 20 },
      { metric_key: 'b', sort_order: 30 },
      { metric_key: 'd', sort_order: 40 },
    ])
  })

  test('descer troca com o seguinte', () => {
    expect(reorderIndicators(keys, 'a', 'down').map(item => item.metric_key)).toEqual(['b', 'a', 'c', 'd'])
  })

  test('primeiro item não sobe e último não desce', () => {
    expect(reorderIndicators(keys, 'a', 'up').map(item => item.metric_key)).toEqual(keys)
    expect(reorderIndicators(keys, 'd', 'down').map(item => item.metric_key)).toEqual(keys)
  })
})

describe('faixas de parâmetro', () => {
  test('indicador de aumento exige faixas crescentes', () => {
    expect(validateThresholds({ red_threshold: 10, yellow_threshold: 20, green_threshold: 30 }, 'increase')).toBeNull()
    expect(validateThresholds({ red_threshold: 30, yellow_threshold: 20, green_threshold: 10 }, 'increase'))
      .toBe('Para indicador de aumento, as faixas devem crescer: vermelho ≤ amarelo ≤ verde.')
  })

  test('indicador de redução exige faixas decrescentes', () => {
    expect(validateThresholds({ red_threshold: 30, yellow_threshold: 20, green_threshold: 10 }, 'decrease')).toBeNull()
    expect(validateThresholds({ red_threshold: 10, yellow_threshold: 20, green_threshold: 30 }, 'decrease'))
      .toBe('Para indicador de redução, as faixas devem decrescer: vermelho ≥ amarelo ≥ verde.')
  })

  test('faixa incompleta não é validada', () => {
    expect(validateThresholds({ red_threshold: null, yellow_threshold: 20, green_threshold: 30 }, 'increase')).toBeNull()
  })
})

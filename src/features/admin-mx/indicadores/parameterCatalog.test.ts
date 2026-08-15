import { describe, expect, test } from 'bun:test'
import {
  buildParamMapForMonth,
  canOverrideParameter,
  expandOverrideToRows,
  getEffectiveParameter,
  previewParameterImpact,
  validateOverrideDraft,
  validateOverrideReason,
  validateParameterCode,
} from './parameterCatalog'
import { evaluateFormula } from './indicatorFormulas'

const PARAMS = [
  { id: 'p1', code: 'LEAD_TO_APPOINTMENT_RATE', name: 'Conversão de leads', unit: '%', default_value: 0.2, allows_client_override: true, indicator_codes: ['APPOINTMENTS_VOLUME'] },
  { id: 'p2', code: 'LOCKED_PARAM', name: 'Bloqueado', unit: '%', default_value: 0.5, allows_client_override: false },
  { id: 'p3', code: 'MONTHLY_PARAM', name: 'Mensal', unit: 'razão', default_value: 1.7, allows_client_override: true, allows_monthly_values: true, monthly_defaults: [1.7, 1.6, 1.5] },
]

describe('getEffectiveParameter', () => {
  test('padrão MX quando não há override', () => {
    const eff = getEffectiveParameter('LEAD_TO_APPOINTMENT_RATE', 3, PARAMS, [])
    expect(eff).toEqual({ value: 0.2, source: 'MX_DEFAULT' })
  })

  test('override do ano vence o padrão MX', () => {
    const overrides = [{ parameter_code: 'LEAD_TO_APPOINTMENT_RATE', reference_year: 2026, month: null, override_value: 0.3, reason: 'justificativa', status: 'ativo' }]
    const eff = getEffectiveParameter('LEAD_TO_APPOINTMENT_RATE', 3, PARAMS, overrides)
    expect(eff).toEqual({ value: 0.3, source: 'CLIENT_YEAR_OVERRIDE' })
  })

  test('override do mês vence o do ano', () => {
    const overrides = [
      { parameter_code: 'LEAD_TO_APPOINTMENT_RATE', reference_year: 2026, month: null, override_value: 0.3, reason: 'a', status: 'ativo' },
      { parameter_code: 'LEAD_TO_APPOINTMENT_RATE', reference_year: 2026, month: 3, override_value: 0.5, reason: 'b', status: 'ativo' },
    ]
    const eff = getEffectiveParameter('LEAD_TO_APPOINTMENT_RATE', 3, PARAMS, overrides)
    expect(eff).toEqual({ value: 0.5, source: 'CLIENT_MONTH_OVERRIDE' })
  })

  test('padrão MX mensal quando disponível', () => {
    const eff = getEffectiveParameter('MONTHLY_PARAM', 2, PARAMS, [])
    expect(eff).toEqual({ value: 1.6, source: 'MX_DEFAULT' })
  })

  test('override encerrado não é considerado', () => {
    const overrides = [{ parameter_code: 'LEAD_TO_APPOINTMENT_RATE', reference_year: 2026, month: null, override_value: 0.9, reason: 'x', status: 'encerrado' }]
    const eff = getEffectiveParameter('LEAD_TO_APPOINTMENT_RATE', 3, PARAMS, overrides)
    expect(eff).toEqual({ value: 0.2, source: 'MX_DEFAULT' })
  })

  test('parâmetro desconhecido devolve SEM_PARAMETRO', () => {
    expect(getEffectiveParameter('NAO_EXISTE', 1, PARAMS, [])).toEqual({ value: null, source: 'SEM_PARAMETRO' })
  })
})

describe('buildParamMapForMonth', () => {
  test('mapeia todos os parâmetros com valor efetivo', () => {
    const map = buildParamMapForMonth(PARAMS, [], 2)
    expect(map.LEAD_TO_APPOINTMENT_RATE).toBe(0.2)
    expect(map.MONTHLY_PARAM).toBe(1.6)
  })
})

describe('validação', () => {
  test('código do parâmetro', () => {
    expect(validateParameterCode('LEADS_PER_SALE')).toBeNull()
    expect(validateParameterCode('leads')).toBe('O código aceita apenas letras maiúsculas, números e underline.')
    expect(validateParameterCode('')).toBe('Informe o código do parâmetro.')
  })

  test('justificativa obrigatória', () => {
    expect(validateOverrideReason('')).toBe('Justificativa obrigatória para personalizar o parâmetro.')
    expect(validateOverrideReason('Cliente sazonal')).toBeNull()
  })

  test('parâmetro sem permissão não pode ser personalizado', () => {
    expect(canOverrideParameter(PARAMS[0])).toBe(true)
    expect(canOverrideParameter(PARAMS[1])).toBe(false)
  })

  test('draft exige justificativa e meses selecionados', () => {
    const draft = {
      parameter_code: 'LEAD_TO_APPOINTMENT_RATE',
      reference_year: 2026,
      scope: 'MESES_SELECIONADOS' as const,
      months: [],
      new_value: 0.3,
      reason: 'ok',
    }
    expect(validateOverrideDraft(draft, PARAMS[0])).toBe('Selecione ao menos um mês de aplicação.')

    const draftSemJustificativa = { ...draft, months: [1, 2], reason: '' }
    expect(validateOverrideDraft(draftSemJustificativa, PARAMS[0])).toBe('Justificativa obrigatória para personalizar o parâmetro.')

    const draftBloqueado = { ...draft, months: [1], reason: 'x' }
    expect(validateOverrideDraft(draftBloqueado, PARAMS[1])).toBe('Este parâmetro não permite personalização por cliente.')
  })
})

describe('expandOverrideToRows', () => {
  test('ano inteiro vira um override sem mês', () => {
    const draft = { parameter_code: 'LEAD_TO_APPOINTMENT_RATE', reference_year: 2026, scope: 'ANO_INTEIRO' as const, months: [], new_value: 0.3, reason: 'ok' }
    const rows = expandOverrideToRows(draft, PARAMS[0])
    expect(rows).toHaveLength(1)
    expect(rows[0].month).toBeNull()
    expect(rows[0].override_value).toBe(0.3)
    expect(rows[0].reason).toBe('ok')
  })

  test('meses selecionados viram um override por mês', () => {
    const draft = { parameter_code: 'LEAD_TO_APPOINTMENT_RATE', reference_year: 2026, scope: 'MESES_SELECIONADOS' as const, months: [1, 3], new_value: 0.4, reason: 'sazonal' }
    const rows = expandOverrideToRows(draft, PARAMS[0])
    expect(rows).toHaveLength(2)
    expect(rows.map(row => row.month)).toEqual([1, 3])
  })
})

describe('previewParameterImpact', () => {
  test('recalcula dependentes com valor antigo e novo', () => {
    const dependents = [
      { code: 'APPOINTMENTS_VOLUME', name: 'Volume de Agendamentos', formula_expression: 'IND("LEADS_RECEIVED") * PAR("LEAD_TO_APPOINTMENT_RATE")' },
    ]
    const valueMap = { LEADS_RECEIVED: { 1: 100 } }
    const result = previewParameterImpact({
      parameterCode: 'LEAD_TO_APPOINTMENT_RATE',
      paramName: 'Conversão de leads',
      oldValue: 0.2,
      newValue: 0.5,
      month: 1,
      params: PARAMS,
      overrides: [],
      dependents,
      valueMap,
      evaluate: evaluateFormula,
    })
    expect(result.impacted).toHaveLength(1)
    expect(result.impacted[0].oldValue).toBe(20)
    expect(result.impacted[0].newValue).toBe(50)
  })
})

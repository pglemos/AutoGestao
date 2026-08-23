import { describe, expect, test } from 'bun:test'
import {
  CONSOLIDATION_STATUS,
  computeConsolidatedMonth,
  computeConsolidatedYear,
  formatPartialUnitsLabel,
  groupValuesByUnit,
  isEditableInScope,
  resolveActualIndicatorValue,
  resolveStoreScopedValue,
} from './unitConsolidation'
import type { UnitPolicy } from './unitPolicy'

const policy = (
  unit_rollup_method: UnitPolicy['unit_rollup_method'],
  extra: Partial<UnitPolicy> = {},
): UnitPolicy => ({
  unit_entry_mode: 'PER_UNIT_REQUIRED',
  unit_rollup_method,
  weight_indicator_code: null,
  ...extra,
})

describe('computeConsolidatedMonth — SUM', () => {
  const indicators = [{ code: 'SALES_WALKIN' }]
  const policies = { SALES_WALKIN: policy('SUM') }

  test('soma as unidades', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: { SALES_WALKIN: { lojaA: 10, lojaB: 25 } },
      companyValueMap: {},
      indicators,
      policies,
      month: 3,
    })
    expect(consolidated.SALES_WALKIN).toBe(35)
    expect(integrity.SALES_WALKIN.status).toBe(CONSOLIDATION_STATUS.COMPLETO)
    expect(integrity.SALES_WALKIN.unitsWithData).toBe(2)
  })

  test('unidade sem dado marca o consolidado como parcial', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: { SALES_WALKIN: { lojaA: 10, lojaB: null } },
      companyValueMap: {},
      indicators,
      policies,
      month: 3,
    })
    expect(consolidated.SALES_WALKIN).toBe(10)
    expect(integrity.SALES_WALKIN.status).toBe(CONSOLIDATION_STATUS.PARCIAL)
    expect(integrity.SALES_WALKIN.explanation).toBe('Parcial — 1 de 2 unidades')
  })

  test('unidade ausente do mapa entra no denominador quando expectedUnitIds é passado', () => {
    const { integrity } = computeConsolidatedMonth({
      unitValueMap: { SALES_WALKIN: { lojaA: 10, lojaB: 25 } },
      companyValueMap: {},
      indicators,
      policies,
      month: 3,
      expectedUnitIds: ['lojaA', 'lojaB', 'matriz'],
    })
    expect(integrity.SALES_WALKIN.status).toBe(CONSOLIDATION_STATUS.PARCIAL)
    expect(integrity.SALES_WALKIN.explanation).toBe('Parcial — 2 de 3 unidades')
  })

  test('zero é valor, não ausência', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: { SALES_WALKIN: { lojaA: 0, lojaB: 0 } },
      companyValueMap: {},
      indicators,
      policies,
      month: 3,
    })
    expect(consolidated.SALES_WALKIN).toBe(0)
    expect(integrity.SALES_WALKIN.status).toBe(CONSOLIDATION_STATUS.COMPLETO)
  })

  test('nenhuma unidade com dado devolve null e SEM_BASE', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: { SALES_WALKIN: { lojaA: null } },
      companyValueMap: {},
      indicators,
      policies,
      month: 3,
    })
    expect(consolidated.SALES_WALKIN).toBeNull()
    expect(integrity.SALES_WALKIN.status).toBe(CONSOLIDATION_STATUS.SEM_BASE)
  })

  test('política ZERO_IF_EMPTY preenche vazio com zero', () => {
    const { consolidated } = computeConsolidatedMonth({
      unitValueMap: { SALES_WALKIN: { lojaA: null } },
      companyValueMap: {},
      indicators,
      policies,
      month: 3,
      blankPolicy: { SALES_WALKIN: 'ZERO_IF_EMPTY' },
    })
    expect(consolidated.SALES_WALKIN).toBe(0)
  })
})

describe('computeConsolidatedMonth — RECALCULATE_FROM_BASES', () => {
  // Regra central: percentual do cliente NÃO é a soma nem a média dos percentuais
  // das lojas — é recalculado sobre as bases consolidadas.
  const indicators = [
    { code: 'VISITS_VOLUME' },
    { code: 'SALES_TOTAL' },
    {
      code: 'VISIT_TO_SALE_CONVERSION',
      formula_expression: 'IND("SALES_TOTAL") / IND("VISITS_VOLUME")',
    },
  ]
  const policies = {
    VISITS_VOLUME: policy('SUM'),
    SALES_TOTAL: policy('SUM'),
    VISIT_TO_SALE_CONVERSION: policy('RECALCULATE_FROM_BASES'),
  }

  test('recalcula pelas bases somadas em vez de somar percentuais', () => {
    // Loja A: 10/100 = 10%. Loja B: 30/100 = 30%. Consolidado correto: 40/200 = 20%.
    // Somar daria 40%; média simples daria 20% por coincidência de pesos iguais,
    // por isso as bases abaixo são desiguais.
    const { consolidated } = computeConsolidatedMonth({
      unitValueMap: {
        VISITS_VOLUME: { lojaA: 100, lojaB: 300 },
        SALES_TOTAL: { lojaA: 10, lojaB: 90 },
        VISIT_TO_SALE_CONVERSION: { lojaA: 0.1, lojaB: 0.3 },
      },
      companyValueMap: {},
      indicators,
      policies,
      month: 1,
    })
    expect(consolidated.VISITS_VOLUME).toBe(400)
    expect(consolidated.SALES_TOTAL).toBe(100)
    expect(consolidated.VISIT_TO_SALE_CONVERSION).toBeCloseTo(0.25, 10)
    // Nunca a soma (0.4) nem a média simples (0.2).
    expect(consolidated.VISIT_TO_SALE_CONVERSION).not.toBeCloseTo(0.4, 5)
    expect(consolidated.VISIT_TO_SALE_CONVERSION).not.toBeCloseTo(0.2, 5)
  })

  test('derivado herda PARCIAL das bases e mostra N de M', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: {
        VISITS_VOLUME: { lojaA: 100, lojaB: 300, matriz: null },
        SALES_TOTAL: { lojaA: 10, lojaB: 90, matriz: null },
      },
      companyValueMap: {},
      indicators,
      policies,
      month: 1,
      expectedUnitIds: ['lojaA', 'lojaB', 'matriz'],
    })
    expect(consolidated.VISIT_TO_SALE_CONVERSION).toBeCloseTo(0.25, 10)
    expect(integrity.SALES_TOTAL.status).toBe(CONSOLIDATION_STATUS.PARCIAL)
    expect(integrity.VISIT_TO_SALE_CONVERSION.status).toBe(CONSOLIDATION_STATUS.PARCIAL)
    expect(integrity.VISIT_TO_SALE_CONVERSION.explanation).toBe('Parcial — 2 de 3 unidades')
  })

  test('derivado é calculado depois das bases, independente da ordem da lista', () => {
    const { consolidated } = computeConsolidatedMonth({
      unitValueMap: {
        VISITS_VOLUME: { lojaA: 100 },
        SALES_TOTAL: { lojaA: 25 },
      },
      companyValueMap: {},
      indicators: [indicators[2], indicators[0], indicators[1]],
      policies,
      month: 1,
    })
    expect(consolidated.VISIT_TO_SALE_CONVERSION).toBeCloseTo(0.25, 10)
  })

  test('base ausente reporta quais bases faltam', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: { SALES_TOTAL: { lojaA: 10 } },
      companyValueMap: {},
      indicators,
      policies,
      month: 1,
    })
    expect(consolidated.VISIT_TO_SALE_CONVERSION).toBeNull()
    expect(integrity.VISIT_TO_SALE_CONVERSION.status).toBe(CONSOLIDATION_STATUS.SEM_BASE)
    expect(integrity.VISIT_TO_SALE_CONVERSION.explanation).toContain('VISITS_VOLUME')
  })

  test('divisão por zero não vira Infinity', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: {
        VISITS_VOLUME: { lojaA: 0 },
        SALES_TOTAL: { lojaA: 10 },
      },
      companyValueMap: {},
      indicators,
      policies,
      month: 1,
    })
    expect(consolidated.VISIT_TO_SALE_CONVERSION).toBeNull()
    expect(integrity.VISIT_TO_SALE_CONVERSION.status).toBe(CONSOLIDATION_STATUS.INCONSISTENTE)
  })

  test('indicador derivado sem fórmula fica sem base', () => {
    const { integrity } = computeConsolidatedMonth({
      unitValueMap: {},
      companyValueMap: {},
      indicators: [{ code: 'SEM_FORMULA' }],
      policies: { SEM_FORMULA: policy('RECALCULATE_FROM_BASES') },
      month: 1,
    })
    expect(integrity.SEM_FORMULA.status).toBe(CONSOLIDATION_STATUS.SEM_BASE)
  })
})

describe('computeConsolidatedMonth — WEIGHTED_AVERAGE', () => {
  const indicators = [{ code: 'INVENTORY_TOTAL' }, { code: 'INVENTORY_AVERAGE_TICKET' }]
  const policies = {
    INVENTORY_TOTAL: policy('SUM'),
    INVENTORY_AVERAGE_TICKET: policy('WEIGHTED_AVERAGE', {
      unit_entry_mode: 'PER_UNIT_OPTIONAL',
      weight_indicator_code: 'INVENTORY_TOTAL',
    }),
  }

  test('pondera pelo indicador-peso, não pela média simples', () => {
    // Ticket 100 com 10 unidades, ticket 200 com 90 unidades.
    // Ponderada: (100*10 + 200*90) / 100 = 190. Média simples daria 150.
    const { consolidated } = computeConsolidatedMonth({
      unitValueMap: {
        INVENTORY_TOTAL: { lojaA: 10, lojaB: 90 },
        INVENTORY_AVERAGE_TICKET: { lojaA: 100, lojaB: 200 },
      },
      companyValueMap: {},
      indicators,
      policies,
      month: 1,
    })
    expect(consolidated.INVENTORY_AVERAGE_TICKET).toBeCloseTo(190, 10)
  })

  test('peso zerado em todas as unidades não vira divisão por zero', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: {
        INVENTORY_TOTAL: { lojaA: 0, lojaB: 0 },
        INVENTORY_AVERAGE_TICKET: { lojaA: 100, lojaB: 200 },
      },
      companyValueMap: {},
      indicators,
      policies,
      month: 1,
    })
    expect(consolidated.INVENTORY_AVERAGE_TICKET).toBeNull()
    expect(integrity.INVENTORY_AVERAGE_TICKET.status).toBe(CONSOLIDATION_STATUS.SEM_BASE)
  })
})

describe('computeConsolidatedMonth — média, último valor e valor de empresa', () => {
  test('AVERAGE_VALID_VALUES ignora unidades sem dado', () => {
    const { consolidated } = computeConsolidatedMonth({
      unitValueMap: { NOTA: { a: 4, b: 6, c: null } },
      companyValueMap: {},
      indicators: [{ code: 'NOTA' }],
      policies: { NOTA: policy('AVERAGE_VALID_VALUES') },
      month: 1,
    })
    expect(consolidated.NOTA).toBe(5)
  })

  test('COMPANY_VALUE usa o valor da empresa e ignora as unidades', () => {
    const { consolidated } = computeConsolidatedMonth({
      unitValueMap: { INSTAGRAM_FOLLOWERS: { a: 999 } },
      companyValueMap: { INSTAGRAM_FOLLOWERS: 12000 },
      indicators: [{ code: 'INSTAGRAM_FOLLOWERS' }],
      policies: {
        INSTAGRAM_FOLLOWERS: policy('COMPANY_VALUE', { unit_entry_mode: 'COMPANY_ONLY' }),
      },
      month: 1,
    })
    expect(consolidated.INSTAGRAM_FOLLOWERS).toBe(12000)
  })

  test('SHARED_NO_SUM não multiplica o valor pelo número de unidades', () => {
    const { consolidated } = computeConsolidatedMonth({
      unitValueMap: { ESTOQUE: { a: 500, b: 500 } },
      companyValueMap: { ESTOQUE: 500 },
      indicators: [{ code: 'ESTOQUE' }],
      policies: {
        ESTOQUE: policy('SHARED_NO_SUM', { unit_entry_mode: 'SHARED_COMPANY_VALUE' }),
      },
      month: 1,
    })
    expect(consolidated.ESTOQUE).toBe(500)
  })

  test('método desconhecido é inconsistente, nunca soma por engano', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: { X: { a: 1, b: 2 } },
      companyValueMap: {},
      indicators: [{ code: 'X' }],
      policies: { X: policy('METODO_INVENTADO' as UnitPolicy['unit_rollup_method']) },
      month: 1,
    })
    expect(consolidated.X).toBeNull()
    expect(integrity.X.status).toBe(CONSOLIDATION_STATUS.INCONSISTENTE)
  })

  test('indicador sem política declarada não é somado silenciosamente', () => {
    const { consolidated, integrity } = computeConsolidatedMonth({
      unitValueMap: { DESCONHECIDO: { a: 1, b: 2 } },
      companyValueMap: {},
      indicators: [{ code: 'DESCONHECIDO' }],
      policies: {},
      month: 1,
    })
    expect(consolidated.DESCONHECIDO).toBeNull()
    expect(integrity.DESCONHECIDO.status).toBe(CONSOLIDATION_STATUS.INCONSISTENTE)
  })
})

describe('resolveActualIndicatorValue', () => {
  test('calculável usa effective/calculated sem exigir manual', () => {
    expect(resolveActualIndicatorValue({
      indicator_code: 'MARGEM',
      month: 1,
      calculated_value: 12.5,
    })).toBe(12.5)
    expect(resolveActualIndicatorValue({
      indicator_code: 'MARGEM',
      month: 1,
      effective_value: 11,
      calculated_value: 12.5,
    })).toBe(11)
  })

  test('manual_override vence calculated', () => {
    expect(resolveActualIndicatorValue({
      indicator_code: 'VENDAS',
      month: 2,
      manual_override_value: 99,
      effective_value: 50,
      calculated_value: 40,
    })).toBe(99)
  })

  test('meta path não mistura realizado no fallback de applied_value', () => {
    const { companyMonthlyMap } = groupValuesByUnit(
      [{ indicator_code: 'X', month: 1, effective_value: 77, calculated_value: 88 }],
      'applied_value',
    )
    expect(companyMonthlyMap.X[1]).toBeNull()
  })
})

describe('groupValuesByUnit', () => {
  test('separa valores por unidade e de empresa', () => {
    const { unitMonthlyMap, companyMonthlyMap } = groupValuesByUnit(
      [
        { indicator_code: 'SALES_WALKIN', store_id: 'lojaA', month: 1, applied_value: 10 },
        { indicator_code: 'SALES_WALKIN', store_id: 'lojaB', month: 1, applied_value: 20 },
        { indicator_code: 'INSTAGRAM_FOLLOWERS', scope_type: 'COMPANY', month: 1, applied_value: 900 },
      ],
      'applied_value',
    )
    expect(unitMonthlyMap.SALES_WALKIN.lojaA[1]).toBe(10)
    expect(unitMonthlyMap.SALES_WALKIN.lojaB[1]).toBe(20)
    expect(companyMonthlyMap.INSTAGRAM_FOLLOWERS[1]).toBe(900)
  })

  test('registro legado sem store_id nem escopo cai em empresa', () => {
    const { companyMonthlyMap } = groupValuesByUnit(
      [{ indicator_code: 'X', month: 2, applied_value: 5 }],
      'applied_value',
    )
    expect(companyMonthlyMap.X[2]).toBe(5)
  })
})

describe('isEditableInScope', () => {
  const policies = {
    POR_UNIDADE: policy('SUM'),
    SO_EMPRESA: policy('COMPANY_VALUE', { unit_entry_mode: 'COMPANY_ONLY' }),
    COMPARTILHADO: policy('SHARED_NO_SUM', { unit_entry_mode: 'SHARED_COMPANY_VALUE' }),
  }

  test('indicador por unidade não é editável no consolidado', () => {
    expect(isEditableInScope('POR_UNIDADE', 'STORE', policies)).toBe(true)
    expect(isEditableInScope('POR_UNIDADE', 'COMPANY', policies)).toBe(false)
  })

  test('indicador de empresa não é editável na loja', () => {
    expect(isEditableInScope('SO_EMPRESA', 'COMPANY', policies)).toBe(true)
    expect(isEditableInScope('SO_EMPRESA', 'STORE', policies)).toBe(false)
  })

  test('compartilhado é editável só no consolidado', () => {
    expect(isEditableInScope('COMPARTILHADO', 'COMPANY', policies)).toBe(true)
    expect(isEditableInScope('COMPARTILHADO', 'STORE', policies)).toBe(false)
  })

  test('sem política, nada é editável', () => {
    expect(isEditableInScope('INEXISTENTE', 'STORE', policies)).toBe(false)
  })
})

describe('computeConsolidatedYear', () => {
  test('consolida os doze meses preservando a política por indicador', () => {
    const { consolidatedByMonth, integrityByMonth } = computeConsolidatedYear({
      unitMonthlyMap: {
        SALES_WALKIN: {
          lojaA: { 1: 10, 2: 20 },
          lojaB: { 1: 5, 2: null },
        },
      },
      companyMonthlyMap: {},
      indicators: [{ code: 'SALES_WALKIN' }],
      policies: { SALES_WALKIN: policy('SUM') },
    })
    expect(consolidatedByMonth[1].SALES_WALKIN).toBe(15)
    expect(consolidatedByMonth[2].SALES_WALKIN).toBe(20)
    expect(integrityByMonth[2].SALES_WALKIN.status).toBe(CONSOLIDATION_STATUS.PARCIAL)
    expect(consolidatedByMonth[12].SALES_WALKIN).toBeNull()
    expect(Object.keys(consolidatedByMonth)).toHaveLength(12)
  })
})

describe('rótulos de escopo e parcial', () => {
  test('formatPartialUnitsLabel só rotula quando falta unidade', () => {
    expect(formatPartialUnitsLabel(2, 3)).toBe('Parcial — 2 de 3 unidades')
    expect(formatPartialUnitsLabel(3, 3)).toBeNull()
    expect(formatPartialUnitsLabel(0, 3)).toBeNull()
  })

  test('resolveStoreScopedValue nunca cai no consolidado', () => {
    expect(resolveStoreScopedValue(null)).toBeNull()
    expect(resolveStoreScopedValue(undefined)).toBeNull()
    expect(resolveStoreScopedValue(12)).toBe(12)
  })
})

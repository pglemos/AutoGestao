import { describe, expect, test } from 'bun:test'
import { activeUnits, buildClientUnits, hasMultipleUnits } from './clientUnits'
import {
  consolidateClientPlanning,
  indicatorsWithoutPolicy,
  resolvePolicies,
  type PlanningValueRow,
} from './clientPlanningConsolidation'
import { CONSOLIDATION_STATUS } from './unitConsolidation'

const stores = [
  { id: 'matriz', name: 'Matriz Centro', active: true, parent_loja_id: null },
  { id: 'filialB', name: 'Filial Boa Vista', active: true, parent_loja_id: 'matriz' },
  { id: 'filialA', name: 'Filial Aeroporto', active: true, parent_loja_id: 'matriz' },
  { id: 'deOutroCliente', name: 'Loja Alheia', active: true, parent_loja_id: 'outraMatriz' },
]

describe('buildClientUnits', () => {
  test('matriz primeiro, filiais em ordem alfabética', () => {
    const units = buildClientUnits('matriz', stores)
    expect(units.map(unit => unit.id)).toEqual(['matriz', 'filialA', 'filialB'])
    expect(units[0].store_type).toBe('MATRIZ')
    expect(units[1].store_type).toBe('FILIAL')
  })

  test('não inclui loja de outra matriz', () => {
    expect(buildClientUnits('matriz', stores).map(unit => unit.id)).not.toContain('deOutroCliente')
  })

  test('cliente sem matriz definida não tem unidades', () => {
    expect(buildClientUnits(null, stores)).toEqual([])
  })

  test('filial inativa continua listada, marcada como inativa', () => {
    const units = buildClientUnits('matriz', [
      ...stores,
      { id: 'filialC', name: 'Filial Encerrada', active: false, parent_loja_id: 'matriz' },
    ])
    expect(units.find(unit => unit.id === 'filialC')?.active).toBe(false)
    expect(activeUnits(units).map(unit => unit.id)).not.toContain('filialC')
  })

  test('cliente de loja única não pede seletor de escopo', () => {
    expect(hasMultipleUnits(buildClientUnits('matriz', [stores[0]]))).toBe(false)
    expect(hasMultipleUnits(buildClientUnits('matriz', stores))).toBe(true)
  })
})

describe('resolvePolicies', () => {
  test('cai nos padrões do módulo quando o catálogo não declara política', () => {
    const policies = resolvePolicies([{ code: 'SALES_WALKIN' }, { code: 'VISIT_TO_SALE_CONVERSION' }])
    expect(policies.SALES_WALKIN.unit_rollup_method).toBe('SUM')
    expect(policies.VISIT_TO_SALE_CONVERSION.unit_rollup_method).toBe('RECALCULATE_FROM_BASES')
  })

  test('catálogo vence o padrão quando declara política', () => {
    const policies = resolvePolicies([{ code: 'SALES_WALKIN' }], {
      SALES_WALKIN: { unit_entry_mode: 'COMPANY_ONLY', unit_rollup_method: 'COMPANY_VALUE' },
    })
    expect(policies.SALES_WALKIN.unit_rollup_method).toBe('COMPANY_VALUE')
  })

  test('indicador sem política é listado para bloquear a publicação', () => {
    const policies = resolvePolicies([{ code: 'INDICADOR_NOVO' }, { code: 'SALES_WALKIN' }])
    expect(indicatorsWithoutPolicy(policies)).toEqual(['INDICADOR_NOVO'])
  })
})

describe('consolidateClientPlanning', () => {
  const units = buildClientUnits('matriz', stores)
  const indicators = [
    { code: 'VISITS_VOLUME' },
    { code: 'SALES_INTERNET' },
    {
      code: 'VISIT_TO_SALE_CONVERSION',
      formula_expression: 'IND("SALES_INTERNET") / IND("VISITS_VOLUME")',
    },
  ]
  const policies = resolvePolicies(indicators)

  const row = (
    loja_id: string,
    indicator_code: string,
    month: number,
    values: Partial<Pick<PlanningValueRow, 'meta' | 'realizado' | 'ano_anterior'>>,
  ): PlanningValueRow => ({
    loja_id,
    indicator_code,
    year: 2026,
    month,
    meta: values.meta ?? null,
    realizado: values.realizado ?? null,
    ano_anterior: values.ano_anterior ?? null,
  })

  test('consolida as três séries de forma independente', () => {
    const result = consolidateClientPlanning({
      rows: [
        row('matriz', 'VISITS_VOLUME', 1, { meta: 100, realizado: 90, ano_anterior: 80 }),
        row('filialA', 'VISITS_VOLUME', 1, { meta: 300, realizado: 310, ano_anterior: 220 }),
      ],
      units,
      indicators,
      policies,
    })
    expect(result.meta.valueMap.VISITS_VOLUME[1]).toBe(400)
    expect(result.realizado.valueMap.VISITS_VOLUME[1]).toBe(400)
    expect(result.ano_anterior.valueMap.VISITS_VOLUME[1]).toBe(300)
  })

  test('percentual do cliente é recalculado, nunca somado entre lojas', () => {
    const result = consolidateClientPlanning({
      rows: [
        row('matriz', 'VISITS_VOLUME', 1, { realizado: 100 }),
        row('matriz', 'SALES_INTERNET', 1, { realizado: 10 }),
        row('filialA', 'VISITS_VOLUME', 1, { realizado: 300 }),
        row('filialA', 'SALES_INTERNET', 1, { realizado: 90 }),
        row('filialB', 'VISITS_VOLUME', 1, { realizado: 0 }),
        row('filialB', 'SALES_INTERNET', 1, { realizado: 0 }),
      ],
      units,
      indicators,
      policies,
    })
    // 100/400 = 25%; a soma dos percentuais das lojas daria 40%.
    expect(result.realizado.valueMap.VISIT_TO_SALE_CONVERSION[1]).toBeCloseTo(0.25, 10)
  })

  test('unidade sem lançamento deixa o mês parcial em vez de completo', () => {
    const result = consolidateClientPlanning({
      rows: [row('matriz', 'VISITS_VOLUME', 1, { meta: 100 })],
      units,
      indicators,
      policies,
    })
    expect(result.meta.valueMap.VISITS_VOLUME[1]).toBe(100)
    expect(result.meta.integrityByMonth[1].VISITS_VOLUME.status).toBe(CONSOLIDATION_STATUS.PARCIAL)
    expect(result.meta.integrityByMonth[1].VISITS_VOLUME.totalUnits).toBe(3)
    expect(result.meta.integrityByMonth[1].VISITS_VOLUME.unitsWithData).toBe(1)
  })

  test('valores de loja fora do cliente são descartados', () => {
    const result = consolidateClientPlanning({
      rows: [
        row('matriz', 'VISITS_VOLUME', 1, { meta: 100 }),
        row('deOutroCliente', 'VISITS_VOLUME', 1, { meta: 9999 }),
      ],
      units,
      indicators,
      policies,
    })
    expect(result.meta.valueMap.VISITS_VOLUME[1]).toBe(100)
  })

  test('filial encerrada não entra no consolidado', () => {
    const comEncerrada = buildClientUnits('matriz', [
      ...stores,
      { id: 'filialC', name: 'Filial Encerrada', active: false, parent_loja_id: 'matriz' },
    ])
    const result = consolidateClientPlanning({
      rows: [
        row('matriz', 'VISITS_VOLUME', 1, { meta: 100 }),
        row('filialC', 'VISITS_VOLUME', 1, { meta: 500 }),
      ],
      units: comEncerrada,
      indicators,
      policies,
    })
    expect(result.meta.valueMap.VISITS_VOLUME[1]).toBe(100)
  })

  test('linha sem mês é ignorada em vez de virar mês zero', () => {
    const result = consolidateClientPlanning({
      rows: [{ ...row('matriz', 'VISITS_VOLUME', 1, { meta: 100 }), month: null }],
      units,
      indicators,
      policies,
    })
    expect(result.meta.valueMap.VISITS_VOLUME[1]).toBeNull()
  })

  test('cliente de loja única consolida no próprio valor da loja', () => {
    const soMatriz = buildClientUnits('matriz', [stores[0]])
    const result = consolidateClientPlanning({
      rows: [row('matriz', 'VISITS_VOLUME', 5, { meta: 42 })],
      units: soMatriz,
      indicators,
      policies,
    })
    expect(result.meta.valueMap.VISITS_VOLUME[5]).toBe(42)
    expect(result.meta.integrityByMonth[5].VISITS_VOLUME.status).toBe(CONSOLIDATION_STATUS.COMPLETO)
  })
})

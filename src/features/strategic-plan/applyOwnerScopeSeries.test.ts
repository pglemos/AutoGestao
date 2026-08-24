import { describe, expect, test } from 'vitest'
import { applyConsolidatedToSeries, resolveOwnerScopedSeries } from './applyOwnerScopeSeries'
import type { StrategicSeries } from './strategicPlan.types'
import type { ConsolidatedClientPlanning } from './clientPlanningConsolidation'
import { compareDiagnosticValues, buildOwnerFieldRows, resolveAdminStoreDiagnosticSides } from './ownerDataDiagnostics'

function emptySeries(code: string, targets: Array<number | null>): StrategicSeries {
  const empty = Array.from({ length: 12 }, () => null as number | null)
  return {
    id: code,
    code,
    metricCode: code,
    name: code,
    area: 'Vendas',
    direction: 'increase',
    targetValues: targets.length === 12 ? targets : [...targets, ...empty].slice(0, 12),
    currentValues: [...empty],
    previousYearValues: [...empty],
  }
}

function emptyFieldMaps(): ConsolidatedClientPlanning {
  const blank = (): ConsolidatedClientPlanning['meta'] => ({
    valueMap: {},
    integrityByMonth: {},
  })
  return { meta: blank(), realizado: blank(), ano_anterior: blank() }
}

describe('applyOwnerScopeSeries', () => {
  test('overlay troca meta/realizado/AA do indicador no mês', () => {
    const series = [emptySeries('SALES_TOTAL', Array.from({ length: 12 }, (_, i) => i === 6 ? 100 : null))]
    const consolidated = emptyFieldMaps()
    consolidated.meta.valueMap.SALES_TOTAL = { 7: 250 }
    consolidated.realizado.valueMap.SALES_TOTAL = { 7: 180 }
    consolidated.ano_anterior.valueMap.SALES_TOTAL = { 7: 90 }

    const next = applyConsolidatedToSeries(series, consolidated)
    expect(next[0].targetValues[6]).toBe(250)
    expect(next[0].currentValues[6]).toBe(180)
    expect(next[0].previousYearValues[6]).toBe(90)
    expect(series[0].targetValues[6]).toBe(100)
  })

  test('resolveOwnerScopedSeries só overlay em CONSOLIDATED multiunidade', () => {
    const series = [emptySeries('SALES_TOTAL', Array.from({ length: 12 }, () => 10))]
    const consolidated = emptyFieldMaps()
    consolidated.meta.valueMap.SALES_TOTAL = { 1: 99 }

    expect(resolveOwnerScopedSeries({
      series,
      scopeType: 'STORE',
      supportsConsolidated: true,
      consolidated,
    })[0].targetValues[0]).toBe(10)

    expect(resolveOwnerScopedSeries({
      series,
      scopeType: 'CONSOLIDATED',
      supportsConsolidated: true,
      consolidated,
    })[0].targetValues[0]).toBe(99)
  })
})

describe('ownerDataDiagnostics', () => {
  test('compareDiagnosticValues classifica situações', () => {
    const owner = {
      value: 10,
      sourceEntity: 'owner_strategic_series',
      sourceRecordId: 'SALES_TOTAL',
      sourceStoreId: 's1',
      sourceScopeType: 'STORE',
      sourceYear: 2026,
      sourceMonth: 7,
    }
    expect(compareDiagnosticValues({
      admin: { ...owner, sourceEntity: 'valores_indicadores_planejamento_vigentes' },
      owner,
    })).toBe('IGUAL')
    expect(compareDiagnosticValues({
      admin: { ...owner, value: 99 },
      owner,
    })).toBe('FONTE DIFERENTE')
    expect(compareDiagnosticValues({
      admin: { ...owner, sourceMonth: 8 },
      owner,
    })).toBe('COMPETÊNCIA DIFERENTE')
    expect(compareDiagnosticValues({ admin: null, owner: { ...owner, value: null } })).toBe('IGUAL')
    expect(compareDiagnosticValues({ admin: null, owner })).toBe('VALOR AUSENTE')
  })

  test('resolveAdminStoreDiagnosticSides calcula SALES_TOTAL a partir dos canais', () => {
    const sides = resolveAdminStoreDiagnosticSides({
      storeId: 's1',
      year: 2026,
      month: 7,
      indicatorCode: 'SALES_TOTAL',
      rows: [{
        loja_id: 's1',
        indicator_code: 'SALES_WALKIN',
        year: 2026,
        month: 7,
        meta: 8,
        realizado: null,
        ano_anterior: null,
      }],
    })
    expect(sides.META?.value).toBe(8)
    expect(sides.REALIZADO?.value).toBeNull()
  })

  test('buildOwnerFieldRows monta META/REALIZADO/AA', () => {
    const rows = buildOwnerFieldRows({
      meta: 1,
      realizado: 2,
      anoAnterior: 3,
      storeId: 's1',
      scopeType: 'STORE',
      year: 2026,
      month: 7,
      seriesId: 'SALES_TOTAL',
      admin: {
        META: {
          value: 1,
          sourceEntity: 'owner_strategic_series',
          sourceRecordId: 'SALES_TOTAL',
          sourceStoreId: 's1',
          sourceScopeType: 'STORE',
          sourceYear: 2026,
          sourceMonth: 7,
        },
      },
    })
    expect(rows).toHaveLength(3)
    expect(rows[0].situation).toBe('IGUAL')
    expect(rows[1].situation).toBe('VALOR AUSENTE')
  })
})

// Leitura consolidada do planejamento de um cliente.
//
// `valores_indicadores_planejamento` é chaveada por `loja_id`. Ler uma loja
// responde "qual a meta desta unidade"; para responder "qual a meta do cliente"
// é preciso ler todas as unidades e consolidar cada indicador conforme a sua
// política — soma para os aditivos, recálculo pelas bases para percentuais e
// razões, média ponderada onde houver indicador-peso.

import {
  computeConsolidatedYear,
  groupValuesByUnit,
  type BlankPolicy,
  type ConsolidationIndicator,
  type IndicatorIntegrity,
  type ValueRecord,
} from './unitConsolidation'
import { resolveConsolidationFormula, resolveUnitPolicy, type UnitPolicy } from './unitPolicy'
import type { ClientUnit } from './clientUnits'

/** Linha de `valores_indicadores_planejamento`. */
export type PlanningValueRow = {
  loja_id: string
  indicator_code: string
  year: number
  month: number | null
  meta: number | null
  realizado: number | null
  ano_anterior: number | null
}

export type PlanningSeries = 'meta' | 'realizado' | 'ano_anterior'

export type ConsolidatedSeries = {
  /** { [indicatorCode]: { [mes]: valor } } */
  valueMap: Record<string, Record<number, number | null>>
  integrityByMonth: Record<number, Record<string, IndicatorIntegrity>>
}

export type ConsolidatedClientPlanning = Record<PlanningSeries, ConsolidatedSeries>

const SERIES: PlanningSeries[] = ['meta', 'realizado', 'ano_anterior']

/**
 * Completa o roster com a fórmula de consolidação de cada indicador derivado.
 *
 * O catálogo MX não traz fórmula — todos os indicadores são de entrada manual.
 * Sem isto, todo percentual sairia do consolidado como "sem base".
 */
export function withConsolidationFormulas(indicators: ConsolidationIndicator[]): ConsolidationIndicator[] {
  return indicators.map(indicator => ({
    ...indicator,
    formula_expression: resolveConsolidationFormula(indicator.code, indicator.formula_expression),
  }))
}

/**
 * Resolve a política de cada indicador do roster.
 *
 * O catálogo MX não carrega colunas de política de unidade, então a resolução
 * cai nos padrões do módulo. Quando as colunas existirem, basta passá-las em
 * `indicatorDefs` — a hierarquia já prefere o catálogo ao padrão.
 */
export function resolvePolicies(
  indicators: ConsolidationIndicator[],
  indicatorDefs: Record<string, { unit_entry_mode?: string | null; unit_rollup_method?: string | null; weight_indicator_code?: string | null }> = {},
): Record<string, UnitPolicy> {
  const policies: Record<string, UnitPolicy> = {}
  for (const indicator of indicators) {
    policies[indicator.code] = resolveUnitPolicy(indicator.code, null, null, indicatorDefs[indicator.code] ?? null)
  }
  return policies
}

/** Indicadores cuja política não está declarada — bloqueiam a publicação do plano. */
export function indicatorsWithoutPolicy(policies: Record<string, UnitPolicy>): string[] {
  return Object.entries(policies)
    .filter(([, policy]) => !policy.unit_entry_mode || !policy.unit_rollup_method)
    .map(([code]) => code)
    .sort()
}

function toValueRecords(
  rows: PlanningValueRow[],
  series: PlanningSeries,
  unitIds: Set<string>,
  policies: Record<string, UnitPolicy>,
  companyUnitId: string | null,
): ValueRecord[] {
  const records: ValueRecord[] = []
  for (const row of rows) {
    if (row.month == null) continue
    if (!unitIds.has(row.loja_id)) continue
    const entryMode = policies[row.indicator_code]?.unit_entry_mode
    const isCompanyScoped = entryMode === 'COMPANY_ONLY' || entryMode === 'SHARED_COMPANY_VALUE'
    if (isCompanyScoped) {
      // O schema MX guarda a unidade matriz, não um scope_type COMPANY. A
      // política transforma esse registro no escopo empresarial sem somá-lo
      // novamente às filiais.
      if (!companyUnitId || row.loja_id !== companyUnitId) continue
      records.push({
        indicator_code: row.indicator_code,
        month: row.month,
        store_id: null,
        scope_type: 'COMPANY',
        applied_value: row[series],
      })
      continue
    }
    records.push({
      indicator_code: row.indicator_code,
      month: row.month,
      store_id: row.loja_id,
      scope_type: 'STORE',
      applied_value: row[series],
    })
  }
  return records
}

/**
 * Consolida as três séries do planejamento (meta, realizado e ano anterior)
 * para o conjunto de unidades informado.
 *
 * Só as unidades ativas entram: uma filial encerrada não deve puxar o
 * consolidado do cliente para baixo nem marcá-lo como parcial para sempre.
 */
export function consolidateClientPlanning({
  rows,
  units,
  indicators: rosterIndicators,
  policies,
  params = {},
  blankPolicy = null,
}: {
  rows: PlanningValueRow[]
  units: ClientUnit[]
  indicators: ConsolidationIndicator[]
  policies: Record<string, UnitPolicy>
  params?: Record<string, number | null | undefined>
  blankPolicy?: BlankPolicy | null
}): ConsolidatedClientPlanning {
  const indicators = withConsolidationFormulas(rosterIndicators)
  const active = units.filter(unit => unit.active)
  const unitIds = new Set(active.map(unit => unit.id))
  const companyUnitId = active.find(unit => unit.store_type === 'MATRIZ')?.id ?? active[0]?.id ?? null

  const result = {} as ConsolidatedClientPlanning

  for (const series of SERIES) {
    const { unitMonthlyMap, companyMonthlyMap } = groupValuesByUnit(
      toValueRecords(rows, series, unitIds, policies, companyUnitId),
      'applied_value',
    )

    // Unidade sem nenhum registro ainda é unidade: precisa constar do
    // denominador para que o consolidado saia PARCIAL em vez de COMPLETO.
    const expectedUnitIds = active.map(unit => unit.id)
    for (const indicator of indicators) {
      if (!unitMonthlyMap[indicator.code]) unitMonthlyMap[indicator.code] = {}
      for (const unit of active) {
        if (!unitMonthlyMap[indicator.code][unit.id]) unitMonthlyMap[indicator.code][unit.id] = {}
      }
    }

    const { consolidatedByMonth, integrityByMonth } = computeConsolidatedYear({
      unitMonthlyMap,
      companyMonthlyMap,
      indicators,
      policies,
      params,
      blankPolicy,
      expectedUnitIds,
    })

    const valueMap: Record<string, Record<number, number | null>> = {}
    for (const indicator of indicators) valueMap[indicator.code] = {}
    for (const [month, byCode] of Object.entries(consolidatedByMonth)) {
      for (const indicator of indicators) {
        valueMap[indicator.code][Number(month)] = byCode[indicator.code] ?? null
      }
    }

    result[series] = { valueMap, integrityByMonth }
  }

  return result
}

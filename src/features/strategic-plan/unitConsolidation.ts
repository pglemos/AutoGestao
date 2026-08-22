// Motor de consolidação multiunidade.
//
// Ordem do cálculo, por mês:
//   1. carregar os valores de cada unidade
//   2. consolidar as bases conforme a política de cada indicador
//   3. recalcular os derivados sobre as bases já consolidadas
//   4. registrar a integridade do resultado
//
// A regra que justifica o módulo: o consolidado de um percentual ou de uma razão
// não é a soma nem a média dos valores das lojas — é o recálculo da fórmula sobre
// as bases consolidadas. Somar percentual produz número plausível e errado.

import { evaluateFormula, extractIndicatorDeps } from '@/features/admin-mx/indicadores/indicatorFormulas'
import { resolveUnitPolicy, type UnitPolicy } from './unitPolicy'

export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export const CONSOLIDATION_STATUS = {
  COMPLETO: 'COMPLETO',
  PARCIAL: 'PARCIAL',
  SEM_BASE: 'SEM_BASE',
  INCONSISTENTE: 'INCONSISTENTE',
  ERRO_TECNICO: 'ERRO_TECNICO',
} as const

export type ConsolidationStatus = (typeof CONSOLIDATION_STATUS)[keyof typeof CONSOLIDATION_STATUS]

export type ConsolidationIndicator = {
  code: string
  formula_expression?: string | null
  global_display_order?: number | null
}

export type IndicatorIntegrity = {
  status: ConsolidationStatus
  unitsWithData: number
  totalUnits: number
  explanation: string
  month?: number
}

export type BlankPolicy = Record<string, 'ZERO_IF_EMPTY' | string>

type NumericMap = Record<string, number | null | undefined>

/** { [indicatorCode]: { [storeId]: valor } } */
export type UnitValueMap = Record<string, NumericMap>
/** { [indicatorCode]: valor } — escopo empresa */
export type CompanyValueMap = NumericMap
/** { [indicatorCode]: { [storeId]: { [mes]: valor } } } */
export type UnitMonthlyMap = Record<string, Record<string, Record<number, number | null | undefined>>>
/** { [indicatorCode]: { [mes]: valor } } */
export type CompanyMonthlyMap = Record<string, Record<number, number | null | undefined>>

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !Number.isNaN(value)

function unitsWithDataOf(unitVals: NumericMap): string[] {
  return Object.keys(unitVals).filter(storeId => isNumber(unitVals[storeId]))
}

/** Rótulo do consolidado incompleto. Null quando não é parcial. */
export function formatPartialUnitsLabel(unitsWithData: number, totalUnits: number): string | null {
  if (totalUnits <= 0 || unitsWithData <= 0 || unitsWithData >= totalUnits) return null
  return `Parcial — ${unitsWithData} de ${totalUnits} unidades`
}

/**
 * Escopo STORE: o valor da unidade selecionada. Nunca cai no consolidado.
 * Unidade sem lançamento fica vazia — Meta permanece, Resultado e % não.
 */
export function resolveStoreScopedValue(storeValue: number | null | undefined): number | null {
  return storeValue ?? null
}

/**
 * Consolida os indicadores de um mês.
 *
 * Bases são calculadas antes dos derivados, para que `RECALCULATE_FROM_BASES`
 * enxergue as bases já consolidadas independentemente da ordem da lista.
 */
export function computeConsolidatedMonth({
  unitValueMap,
  companyValueMap,
  indicators,
  policies,
  params = {},
  month,
  blankPolicy = null,
  expectedUnitIds,
}: {
  unitValueMap: UnitValueMap
  companyValueMap: CompanyValueMap
  indicators: ConsolidationIndicator[]
  policies: Record<string, UnitPolicy>
  params?: Record<string, number | null | undefined>
  month?: number
  blankPolicy?: BlankPolicy | null
  /** Unidades ativas do cliente — entram no denominador mesmo sem registro. */
  expectedUnitIds?: string[]
}): {
  consolidated: Record<string, number | null>
  integrity: Record<string, IndicatorIntegrity>
} {
  const consolidated: Record<string, number | null> = {}
  const integrity: Record<string, IndicatorIntegrity> = {}

  const sorted = [...indicators].sort((a, b) => {
    const methodA = policies[a.code]?.unit_rollup_method
    const methodB = policies[b.code]?.unit_rollup_method
    const derivedA = methodA === 'RECALCULATE_FROM_BASES' ? 1 : 0
    const derivedB = methodB === 'RECALCULATE_FROM_BASES' ? 1 : 0
    if (derivedA !== derivedB) return derivedA - derivedB
    return (a.global_display_order ?? 999) - (b.global_display_order ?? 999)
  })

  for (const indicator of sorted) {
    const policy = policies[indicator.code] ?? resolveUnitPolicy(indicator.code)
    const method = policy.unit_rollup_method
    const unitVals = unitValueMap[indicator.code] ?? {}
    const storeIds = [...new Set([...(expectedUnitIds ?? []), ...Object.keys(unitVals)])]
    const withData = unitsWithDataOf(unitVals)
    const companyValue = companyValueMap[indicator.code]

    let value: number | null = null
    let status: ConsolidationStatus = CONSOLIDATION_STATUS.SEM_BASE
    let explanation = ''
    let inheritedUnitsWithData: number | null = null
    let inheritedTotalUnits: number | null = null

    switch (method) {
      case 'SUM': {
        const valid = withData.map(storeId => unitVals[storeId] as number)
        if (valid.length > 0) {
          value = valid.reduce((total, current) => total + current, 0)
          status = valid.length === storeIds.length ? CONSOLIDATION_STATUS.COMPLETO : CONSOLIDATION_STATUS.PARCIAL
          explanation = formatPartialUnitsLabel(valid.length, storeIds.length)
            ?? `Soma de ${valid.length} de ${storeIds.length} unidades`
        } else if (blankPolicy?.[indicator.code] === 'ZERO_IF_EMPTY') {
          value = 0
          status = CONSOLIDATION_STATUS.COMPLETO
          explanation = 'Sem valor cadastrado: contabilizado como zero'
        } else {
          explanation = 'Nenhuma unidade possui dados'
        }
        break
      }

      case 'WEIGHTED_AVERAGE': {
        const weightCode = policy.weight_indicator_code
        const weights = weightCode ? (unitValueMap[weightCode] ?? {}) : {}
        let numerator = 0
        let denominator = 0
        for (const storeId of withData) {
          const weight = weights[storeId]
          if (isNumber(weight) && weight !== 0) {
            numerator += (unitVals[storeId] as number) * weight
            denominator += weight
          }
        }
        if (denominator !== 0) {
          value = numerator / denominator
          status = withData.length === storeIds.length ? CONSOLIDATION_STATUS.COMPLETO : CONSOLIDATION_STATUS.PARCIAL
          explanation = formatPartialUnitsLabel(withData.length, storeIds.length)
            ?? `Média ponderada por ${weightCode} (${withData.length}/${storeIds.length} unidades)`
        } else {
          explanation = `Sem peso (${weightCode ?? 'não declarado'}) para a média ponderada`
        }
        break
      }

      case 'AVERAGE_VALID_VALUES': {
        const valid = withData.map(storeId => unitVals[storeId] as number)
        if (valid.length > 0) {
          value = valid.reduce((total, current) => total + current, 0) / valid.length
          status = valid.length === storeIds.length ? CONSOLIDATION_STATUS.COMPLETO : CONSOLIDATION_STATUS.PARCIAL
          explanation = formatPartialUnitsLabel(valid.length, storeIds.length)
            ?? `Média de ${valid.length} valores válidos`
        } else {
          explanation = 'Nenhuma unidade possui dados'
        }
        break
      }

      case 'LAST_VALID_VALUE': {
        if (withData.length > 0) {
          value = unitVals[withData[withData.length - 1]] as number
          status = CONSOLIDATION_STATUS.COMPLETO
          explanation = `Último valor válido entre ${withData.length} unidades`
        } else {
          explanation = 'Nenhuma unidade possui dados'
        }
        break
      }

      case 'SHARED_NO_SUM':
      case 'COMPANY_VALUE':
      case 'MANUAL_CONSOLIDATED': {
        if (isNumber(companyValue)) {
          value = companyValue
          status = CONSOLIDATION_STATUS.COMPLETO
          explanation =
            method === 'SHARED_NO_SUM'
              ? 'Valor compartilhado entre as unidades'
              : 'Valor empresarial centralizado'
        } else {
          explanation = 'Valor empresarial não cadastrado'
        }
        break
      }

      case 'RECALCULATE_FROM_BASES': {
        if (indicator.formula_expression) {
          const calculated = evaluateFormula(indicator.formula_expression, consolidated, params)
          if (isNumber(calculated) && Number.isFinite(calculated)) {
            value = calculated
            status = CONSOLIDATION_STATUS.COMPLETO
            explanation = 'Recalculado sobre as bases consolidadas'
          } else {
            const missing = extractIndicatorDeps(indicator.formula_expression).filter(
              dependency => consolidated[dependency] == null,
            )
            status = missing.length > 0 ? CONSOLIDATION_STATUS.SEM_BASE : CONSOLIDATION_STATUS.INCONSISTENTE
            explanation =
              missing.length > 0
                ? `Faltam bases: ${missing.join(', ')}`
                : 'Divisão por zero ou resultado inconsistente'
          }
        } else {
          explanation = 'Indicador derivado sem fórmula definida'
        }
        if (status === CONSOLIDATION_STATUS.COMPLETO && indicator.formula_expression) {
          const partialDeps = extractIndicatorDeps(indicator.formula_expression)
            .map(code => integrity[code])
            .filter((item): item is IndicatorIntegrity => item?.status === CONSOLIDATION_STATUS.PARCIAL)
          if (partialDeps.length) {
            status = CONSOLIDATION_STATUS.PARCIAL
            inheritedUnitsWithData = Math.min(...partialDeps.map(item => item.unitsWithData))
            inheritedTotalUnits = Math.max(...partialDeps.map(item => item.totalUnits))
            explanation = formatPartialUnitsLabel(inheritedUnitsWithData, inheritedTotalUnits) ?? explanation
          }
        }
        break
      }

      default: {
        // Política ausente ou desconhecida não cai em soma: somar um percentual
        // passa despercebido, um indicador vazio não.
        status = CONSOLIDATION_STATUS.INCONSISTENTE
        explanation = method
          ? `Método de consolidação não reconhecido: ${method}`
          : 'Indicador sem política de consolidação definida'
      }
    }

    consolidated[indicator.code] = value
    integrity[indicator.code] = {
      status,
      unitsWithData: inheritedUnitsWithData ?? withData.length,
      totalUnits: inheritedTotalUnits ?? storeIds.length,
      explanation,
      month,
    }
  }

  return { consolidated, integrity }
}

/** Consolida os doze meses, preservando a política de cada indicador. */
export function computeConsolidatedYear({
  unitMonthlyMap,
  companyMonthlyMap,
  indicators,
  policies,
  params = {},
  paramMapByMonth = null,
  blankPolicy = null,
  expectedUnitIds,
}: {
  unitMonthlyMap: UnitMonthlyMap
  companyMonthlyMap: CompanyMonthlyMap
  indicators: ConsolidationIndicator[]
  policies: Record<string, UnitPolicy>
  params?: Record<string, number | null | undefined>
  paramMapByMonth?: Record<number, Record<string, number | null | undefined>> | null
  blankPolicy?: BlankPolicy | null
  expectedUnitIds?: string[]
}): {
  consolidatedByMonth: Record<number, Record<string, number | null>>
  integrityByMonth: Record<number, Record<string, IndicatorIntegrity>>
} {
  const consolidatedByMonth: Record<number, Record<string, number | null>> = {}
  const integrityByMonth: Record<number, Record<string, IndicatorIntegrity>> = {}

  for (const month of MONTHS) {
    const unitValueMap: UnitValueMap = {}
    for (const [code, storeMap] of Object.entries(unitMonthlyMap)) {
      unitValueMap[code] = {}
      for (const [storeId, monthMap] of Object.entries(storeMap)) {
        unitValueMap[code][storeId] = monthMap[month] ?? null
      }
    }

    const companyValueMap: CompanyValueMap = {}
    for (const [code, monthMap] of Object.entries(companyMonthlyMap)) {
      companyValueMap[code] = monthMap[month] ?? null
    }

    const result = computeConsolidatedMonth({
      unitValueMap,
      companyValueMap,
      indicators,
      policies,
      params: paramMapByMonth ? (paramMapByMonth[month] ?? params) : params,
      month,
      blankPolicy,
      expectedUnitIds,
    })

    consolidatedByMonth[month] = result.consolidated
    integrityByMonth[month] = result.integrity
  }

  return { consolidatedByMonth, integrityByMonth }
}

export type ValueRecord = {
  indicator_code: string
  month: number
  store_id?: string | null
  scope_type?: string | null
  applied_value?: number | null
  effective_value?: number | null
  calculated_value?: number | null
  target_value?: number | null
  manual_value?: number | null
}

/** Separa registros mensais em valores por unidade e valores de empresa. */
export function groupValuesByUnit(
  records: ValueRecord[],
  valueField: keyof ValueRecord = 'applied_value',
): { unitMonthlyMap: UnitMonthlyMap; companyMonthlyMap: CompanyMonthlyMap } {
  const unitMonthlyMap: UnitMonthlyMap = {}
  const companyMonthlyMap: CompanyMonthlyMap = {}

  for (const record of records) {
    const code = record.indicator_code
    const value = (record[valueField] ??
      record.effective_value ??
      record.calculated_value ??
      record.target_value ??
      record.manual_value ??
      null) as number | null

    const isCompanyScope =
      record.scope_type === 'COMPANY' || (!record.store_id && record.scope_type !== 'STORE')

    if (isCompanyScope) {
      if (!companyMonthlyMap[code]) companyMonthlyMap[code] = {}
      companyMonthlyMap[code][record.month] = value
    } else if (record.store_id) {
      if (!unitMonthlyMap[code]) unitMonthlyMap[code] = {}
      if (!unitMonthlyMap[code][record.store_id]) unitMonthlyMap[code][record.store_id] = {}
      unitMonthlyMap[code][record.store_id][record.month] = value
    } else {
      if (!companyMonthlyMap[code]) companyMonthlyMap[code] = {}
      companyMonthlyMap[code][record.month] = value
    }
  }

  return { unitMonthlyMap, companyMonthlyMap }
}

/** Um indicador só é editável no escopo em que a política manda cadastrá-lo. */
export function isEditableInScope(
  indicatorCode: string,
  scopeType: string,
  policies: Record<string, UnitPolicy>,
): boolean {
  const entryMode = policies[indicatorCode]?.unit_entry_mode
  if (!entryMode) return false

  if (scopeType === 'COMPANY' || scopeType === 'CONSOLIDADO') {
    return entryMode === 'COMPANY_ONLY' || entryMode === 'SHARED_COMPANY_VALUE'
  }
  return entryMode === 'PER_UNIT_REQUIRED' || entryMode === 'PER_UNIT_OPTIONAL'
}

/** Rótulo de escopo exibido junto ao indicador; null quando o comportamento é o padrão. */
export function getIndicatorScopeBadge(
  indicatorCode: string,
  policies: Record<string, UnitPolicy>,
): { label: string; tone: 'info' | 'neutral' } | null {
  switch (policies[indicatorCode]?.unit_entry_mode) {
    case 'COMPANY_ONLY':
      return { label: 'Empresa', tone: 'info' }
    case 'SHARED_COMPANY_VALUE':
      return { label: 'Compartilhado', tone: 'info' }
    case 'PER_UNIT_OPTIONAL':
      return { label: 'Cadastro opcional por unidade', tone: 'neutral' }
    default:
      return null
  }
}

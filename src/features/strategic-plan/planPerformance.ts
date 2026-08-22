// Leitura de desempenho do plano: atingimento, variação, faixa de status e
// acumulado até um mês.
//
// Hoje o MX calcula atingimento pontualmente como `vendas / meta` na tela de
// rede. Isso ignora três coisas: indicador em que menos é melhor, o acumulado do
// ano, e o fato de que o acumulado de uma taxa não é a soma nem a média das
// taxas mensais — é a taxa recomposta sobre as bases acumuladas.

import { evaluateFormula, extractIndicatorDeps } from '@/features/admin-mx/indicadores/indicatorFormulas'
import { resolveConsolidationFormula } from './unitPolicy'

/** `increase` = quanto maior melhor; `decrease` = quanto menor melhor. */
export type IndicatorDirection = 'increase' | 'decrease'

export type PerformanceStatus = 'positivo' | 'atencao' | 'critico' | 'sem_base'

export const PERFORMANCE_STATUS_LABEL: Record<PerformanceStatus, string> = {
  positivo: 'Positivo',
  atencao: 'Atenção',
  critico: 'Crítico',
  sem_base: 'Sem base',
}

/** Atingimento em pontos percentuais: 100 significa meta cumprida. */
export function calculateIndicatorAttainment(
  realizado: number | null | undefined,
  meta: number | null | undefined,
): number | null {
  return calcAttainment(meta, realizado)
}

/** Atingimento em pontos percentuais: 100 significa meta cumprida. */
export function calcAttainment(meta: number | null | undefined, realizado: number | null | undefined): number | null {
  if (meta == null || realizado == null || meta === 0) return null
  return (realizado / meta) * 100
}

/** Variação percentual contra um período anterior. */
export function calcVariation(current: number | null | undefined, previous: number | null | undefined): number | null {
  if (current == null || previous == null || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

/**
 * Faixa de status do indicador.
 *
 * Em indicador de `decrease` — custo, idade de estoque, no-show — ficar abaixo da
 * meta é o resultado desejado. Aplicar a faixa de `increase` a esses indicadores
 * inverte o julgamento: o melhor desempenho apareceria como crítico.
 */
export function getPerformanceStatus(
  meta: number | null | undefined,
  realizado: number | null | undefined,
  direction: IndicatorDirection | string | null | undefined,
): PerformanceStatus {
  if (meta == null || realizado == null || meta === 0) return 'sem_base'
  const ratio = realizado / meta

  if (direction === 'decrease') {
    if (ratio <= 1) return 'positivo'
    if (ratio <= 1.1) return 'atencao'
    return 'critico'
  }

  if (ratio >= 1) return 'positivo'
  if (ratio >= 0.9) return 'atencao'
  return 'critico'
}

export type MonthlyValueMap = Record<string, Record<number, number | null>>

/**
 * Acumulado de um indicador do mês 1 até `untilMonth`.
 *
 * Indicador aditivo soma. Indicador derivado é recomposto pela fórmula sobre os
 * acumulados das suas bases — somar taxas mensais daria um número sem
 * significado, e a média delas ignoraria o peso de cada mês.
 */
export function getAccumulatedUntilMonth(
  valueMap: MonthlyValueMap,
  indicatorCode: string,
  untilMonth: number,
  catalogFormula?: string | null,
): number | null {
  const formula = resolveConsolidationFormula(indicatorCode, catalogFormula)

  const sumUntil = (code: string): number | null => {
    let total = 0
    let hasValue = false
    for (let month = 1; month <= untilMonth; month += 1) {
      const value = valueMap[code]?.[month]
      if (value != null && !Number.isNaN(value)) {
        total += value
        hasValue = true
      }
    }
    return hasValue ? total : null
  }

  if (!formula) return sumUntil(indicatorCode)

  const accumulatedBases: Record<string, number | null> = {}
  for (const dependency of extractIndicatorDeps(formula)) {
    accumulatedBases[dependency] = sumUntil(dependency)
  }

  return evaluateFormula(formula, accumulatedBases, {})
}

/** Atingimento acumulado do ano até o mês informado. */
export function getAccumulatedAttainment(
  metaMap: MonthlyValueMap,
  actualMap: MonthlyValueMap,
  indicatorCode: string,
  untilMonth: number,
  catalogFormula?: string | null,
): number | null {
  return calcAttainment(
    getAccumulatedUntilMonth(metaMap, indicatorCode, untilMonth, catalogFormula),
    getAccumulatedUntilMonth(actualMap, indicatorCode, untilMonth, catalogFormula),
  )
}

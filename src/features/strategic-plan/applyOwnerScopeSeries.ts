import type { ConsolidatedClientPlanning } from './clientPlanningConsolidation'
import type { StrategicSeries } from './strategicPlan.types'

/** Aplica mapas consolidados (meta/realizado/AA) sobre a série da loja-identidade. */
export function applyConsolidatedToSeries(
  series: StrategicSeries[],
  consolidated: ConsolidatedClientPlanning | null | undefined,
): StrategicSeries[] {
  if (!consolidated) return series
  // Overlay vazio (fetch falhou / sem vigentes) não pode apagar a série da loja-identidade.
  const hasAnyValue = (['meta', 'realizado', 'ano_anterior'] as const).some(seriesKey => {
    const map = consolidated[seriesKey]?.valueMap
    if (!map) return false
    return Object.values(map).some(byMonth =>
      Object.values(byMonth ?? {}).some(value => value != null),
    )
  })
  if (!hasAnyValue) return series
  return series.map(item => {
    const code = String(item.metricCode || item.code)
    const metaMap = consolidated.meta.valueMap[code]
    const realizadoMap = consolidated.realizado.valueMap[code]
    const aaMap = consolidated.ano_anterior.valueMap[code]
    if (!metaMap && !realizadoMap && !aaMap) return item

    const targetValues = [...item.targetValues]
    const currentValues = [...item.currentValues]
    const previousYearValues = [...item.previousYearValues]
    for (let month = 1; month <= 12; month += 1) {
      const index = month - 1
      if (metaMap && Object.prototype.hasOwnProperty.call(metaMap, month)) {
        targetValues[index] = metaMap[month] ?? null
      }
      if (realizadoMap && Object.prototype.hasOwnProperty.call(realizadoMap, month)) {
        currentValues[index] = realizadoMap[month] ?? null
      }
      if (aaMap && Object.prototype.hasOwnProperty.call(aaMap, month)) {
        previousYearValues[index] = aaMap[month] ?? null
      }
    }
    return { ...item, targetValues, currentValues, previousYearValues }
  })
}

/** View model único Resumo/VG/cards: STORE = série da loja; CONSOLIDATED = overlay. */
export function resolveOwnerScopedSeries(input: {
  series: StrategicSeries[]
  scopeType: string | null | undefined
  supportsConsolidated: boolean
  consolidated: ConsolidatedClientPlanning | null | undefined
}): StrategicSeries[] {
  if (input.scopeType === 'CONSOLIDATED' && input.supportsConsolidated && input.consolidated) {
    return applyConsolidatedToSeries(input.series, input.consolidated)
  }
  return input.series
}

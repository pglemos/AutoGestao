import { catalogAliasKeys, matchCanonicalIndicator } from '@/features/admin-mx/indicadores/canonicalBase44Catalog'

const PREFERRED_CODES = [
  'SALES_TOTAL',
  'LEADS_RECEIVED',
  'INVENTORY_TOTAL',
  'APPOINTMENTS_VOLUME',
  'VISITS_VOLUME',
] as const

function keysOf(code: string): Set<string> {
  const canon = matchCanonicalIndicator(code)
  return new Set([code, ...(canon ? catalogAliasKeys(canon.code) : [])].map(key => key.toLowerCase()))
}

/** Cards da Visão Geral vêm do roster carregado — sem IDs fixos SP-001. */
export function pickExecutiveCards<T extends { id: string; code?: string; metricCode?: string }>(
  allSeries: T[],
  preferredCodes: readonly string[] = PREFERRED_CODES,
): T[] {
  const picked: T[] = []
  const used = new Set<string>()

  for (const code of preferredCodes) {
    const keys = keysOf(code)
    const series = allSeries.find(item => (
      [item.id, item.code, item.metricCode].some(value => value && keys.has(String(value).toLowerCase()))
    ))
    if (series && !used.has(series.id)) {
      picked.push(series)
      used.add(series.id)
    }
  }

  if (picked.length === 0) return allSeries.slice(0, 5)
  return picked
}

export type MorningReportStoreRow = {
  storeId: string
  storeName: string
  sales: number
  goal: number
  sellers: number
  checkedIn: number
  leads: number
  visits: number
}

export type MorningReportSummary = {
  stores: number
  sales: number
  goal: number
  sellers: number
  checkedIn: number
  discipline: number
  attainment: number
}

export function buildMorningReportSummary(rows: MorningReportStoreRow[]): MorningReportSummary {
  const totals = rows.reduce((acc, row) => ({
    stores: acc.stores + 1,
    sales: acc.sales + row.sales,
    goal: acc.goal + row.goal,
    sellers: acc.sellers + row.sellers,
    checkedIn: acc.checkedIn + row.checkedIn,
  }), { stores: 0, sales: 0, goal: 0, sellers: 0, checkedIn: 0 })
  return {
    ...totals,
    discipline: totals.sellers > 0 ? Math.round((totals.checkedIn / totals.sellers) * 100) : 0,
    attainment: totals.goal > 0 ? Math.round((totals.sales / totals.goal) * 100) : 0,
  }
}

export function filterMorningReportRows(rows: MorningReportStoreRow[], search: string) {
  const term = search.trim().toLocaleLowerCase('pt-BR')
  if (!term) return rows
  return rows.filter(row => row.storeName.toLocaleLowerCase('pt-BR').includes(term))
}

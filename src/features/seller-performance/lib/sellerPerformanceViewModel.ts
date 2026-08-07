import type { RankingEntry } from '@/types/database'

export type SellerPerformanceSelection = { sellerId: string; storeId: string }
export type SellerPerformanceLoadState = 'idle' | 'loading' | 'refreshing' | 'error'
export type PeriodPreset = 'hoje' | 'mes_atual' | 'mes_anterior' | 'ultimos_30_dias' | 'custom'
export type SellerSortOption = 'sales_desc' | 'sales_asc' | 'name_asc' | 'name_desc' | 'attainment_desc' | 'leads_desc'

export type SellerPerformanceViewModel = {
  id: string
  name: string
  avatarUrl: string | null
  storeId: string
  storeName: string
  sales: number
  leads: number
  visits: number
  attainment: number
  conversion: number
  rhythm: number
  attributes: Array<{ subject: string; value: number; fullMark: number }>
}

export function buildSellerPerformanceViewModel(entry: RankingEntry): SellerPerformanceViewModel {
  const sales = Number(entry.vnd_total || 0)
  const leads = Number(entry.leads || 0)
  const visits = Number(entry.visitas || 0)
  const attainment = Number(entry.atingimento || 0)
  const rhythm = Number(entry.ritmo || 0)
  const conversion = leads > 0 ? sales / leads * 100 : 0
  return {
    id: entry.user_id,
    name: entry.user_name,
    avatarUrl: entry.avatar_url || null,
    storeId: String((entry as RankingEntry & { store_id?: string }).store_id || ''),
    storeName: String((entry as RankingEntry & { store_name?: string }).store_name || 'Loja não informada'),
    sales,
    leads,
    visits,
    attainment,
    conversion,
    rhythm,
    attributes: [
      { subject: 'Atingimento', value: Math.min(Math.max(attainment, 0), 100), fullMark: 100 },
      { subject: 'Volume', value: Math.min(Math.max(leads + visits, 0), 100), fullMark: 100 },
      { subject: 'Conversão', value: Math.min(Math.max(conversion, 0), 100), fullMark: 100 },
      { subject: 'Ritmo', value: Math.min(Math.max(rhythm * 10, 0), 100), fullMark: 100 },
      { subject: 'Visitas', value: Math.min(Math.max(visits * 5, 0), 100), fullMark: 100 },
    ],
  }
}

export function filterSellerRanking(entries: RankingEntry[], search: string): RankingEntry[] {
  const term = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim()
  if (!term) return entries
  return entries.filter(entry => entry.user_name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').includes(term))
}

export function calculatePeriodDates(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string,
  referenceDate?: string
): { startDate: string; endDate: string; label: string } {
  const ref = referenceDate ? new Date(`${referenceDate}T12:00:00Z`) : new Date()
  const year = ref.getUTCFullYear()
  const month = ref.getUTCMonth()
  const todayStr = referenceDate || ref.toISOString().slice(0, 10)

  if (preset === 'hoje') {
    return { startDate: todayStr, endDate: todayStr, label: 'Hoje' }
  }

  if (preset === 'mes_anterior') {
    const prevMonthDate = new Date(Date.UTC(year, month - 1, 1))
    const prevYear = prevMonthDate.getUTCFullYear()
    const prevMonth = prevMonthDate.getUTCMonth()
    const lastDayPrevMonth = new Date(Date.UTC(prevYear, prevMonth + 1, 0)).getUTCDate()
    const pStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`
    const pEnd = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDayPrevMonth).padStart(2, '0')}`
    return { startDate: pStart, endDate: pEnd, label: 'Mês anterior' }
  }

  if (preset === 'ultimos_30_dias') {
    const d30 = new Date(ref.getTime() - 29 * 24 * 60 * 60 * 1000)
    const d30Str = d30.toISOString().slice(0, 10)
    return { startDate: d30Str, endDate: todayStr, label: 'Últimos 30 dias' }
  }

  if (preset === 'custom') {
    const s = customStart || todayStr
    const e = customEnd || todayStr
    return { startDate: s, endDate: e, label: 'Personalizado' }
  }

  const startOfMonthStr = `${todayStr.slice(0, 7)}-01`
  return { startDate: startOfMonthStr, endDate: todayStr, label: 'Mês atual' }
}

export function sortSellerRanking(entries: RankingEntry[], sortBy: SellerSortOption): RankingEntry[] {
  const list = [...entries]
  switch (sortBy) {
    case 'sales_asc':
      return list.sort((a, b) => (a.vnd_total || 0) - (b.vnd_total || 0))
    case 'name_asc':
      return list.sort((a, b) => a.user_name.localeCompare(b.user_name, 'pt-BR'))
    case 'name_desc':
      return list.sort((a, b) => b.user_name.localeCompare(a.user_name, 'pt-BR'))
    case 'attainment_desc':
      return list.sort((a, b) => (b.atingimento || 0) - (a.atingimento || 0))
    case 'leads_desc':
      return list.sort((a, b) => (b.leads || 0) - (a.leads || 0))
    case 'sales_desc':
    default:
      return list.sort((a, b) => (b.vnd_total || 0) - (a.vnd_total || 0))
  }
}

export function createLatestRequestGuard() {
  let sequence = 0
  return {
    next: () => ++sequence,
    isCurrent: (requestId: number) => requestId === sequence,
  }
}

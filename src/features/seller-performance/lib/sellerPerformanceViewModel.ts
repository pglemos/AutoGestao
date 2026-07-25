import type { RankingEntry } from '@/types/database'

export type SellerPerformanceSelection = { sellerId: string; storeId: string }
export type SellerPerformanceLoadState = 'idle' | 'loading' | 'refreshing' | 'error'

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

export function createLatestRequestGuard() {
  let sequence = 0
  return {
    next: () => ++sequence,
    isCurrent: (requestId: number) => requestId === sequence,
  }
}

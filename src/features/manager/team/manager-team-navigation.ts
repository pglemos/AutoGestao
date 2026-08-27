import type { RankingEntry } from '@/types/database'

export type ManagerTeamAction = 'routine' | 'feedback' | 'closing' | 'training' | 'wallet'

export function buildManagerTeamActionTarget(action: ManagerTeamAction, row: RankingEntry, referenceDate = '') {
  const seller = encodeURIComponent(row.user_name)
  const targets: Record<ManagerTeamAction, { pathname: string; params: Record<string, string> }> = {
    routine: { pathname: '/rotina-equipe', params: { data: referenceDate, busca: row.user_name } },
    feedback: { pathname: '/feedbacks-pdis', params: { tab: 'feedbacks', novoFeedback: row.user_name } },
    closing: { pathname: '/fechamento-diario', params: { busca: row.user_name } },
    training: { pathname: '/universidade-mx', params: { recomendar: row.user_name } },
    // A carteira abre pelo id: o recorte por vendedor no adapter é por
    // `seller_user_id`, e nome não identifica pessoa com segurança.
    wallet: { pathname: '/carteira-clientes', params: { vendedor: row.user_id } },
  }
  const target = targets[action]
  const query = Object.entries(target.params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${key}=${key === 'busca' || key === 'novoFeedback' || key === 'recomendar' ? seller : encodeURIComponent(value)}`)
    .join('&')
  return `${target.pathname}${query ? `?${query}` : ''}`
}

export function buildManagerTeamContext(row: RankingEntry, period: string, view: string) {
  return {
    origemNavegacao: 'MINHA_EQUIPE',
    vendedorIdOrigem: row.user_id,
    vendedorNomeOrigem: row.user_name,
    periodoOrigem: period,
    visaoKanbanOrigem: view.toUpperCase(),
    posicaoRolagemOrigem: typeof window === 'undefined' ? 0 : window.scrollY,
    dataHora: new Date().toISOString(),
  }
}

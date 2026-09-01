/**
 * Filtro e busca da carteira operacional vivem na URL.
 *
 * Em `useState` puro a triagem morria a cada reload e não podia ser enviada
 * para outra pessoa. O consultor com dezenas de lojas refazia o mesmo recorte
 * toda manhã.
 */
import type { CarteiraFilter } from './carteiraOperacional'

export const CARTEIRA_SEARCH_PARAM = 'carteiraBusca'
export const CARTEIRA_FILTER_PARAM = 'carteiraSituacao'

export const CARTEIRA_FILTERS: readonly CarteiraFilter[] = [
  'todos',
  'exigem_decisao',
  'critical',
  'alert',
  'target',
  'healthy',
  'sem_vinculo',
  'ativos',
  'em_implantacao',
  'prontos_para_ativar',
  'com_bloqueios',
]

export const DEFAULT_CARTEIRA_FILTER: CarteiraFilter = 'todos'

/** A URL é entrada não confiável: um valor desconhecido cai no padrão. */
export function parseCarteiraFilter(value: string | null): CarteiraFilter {
  return CARTEIRA_FILTERS.includes(value as CarteiraFilter)
    ? (value as CarteiraFilter)
    : DEFAULT_CARTEIRA_FILTER
}

export function parseCarteiraSearch(value: string | null): string {
  return (value ?? '').slice(0, 120)
}

export type CarteiraUrlState = { search: string; filter: CarteiraFilter }

/**
 * Só o que difere do padrão entra na URL — uma tela sem recorte aplicado
 * continua com o endereço limpo e compartilhável.
 */
export function applyCarteiraParams(params: URLSearchParams, state: CarteiraUrlState): URLSearchParams {
  const next = new URLSearchParams(params)
  const search = state.search.trim()

  if (search) next.set(CARTEIRA_SEARCH_PARAM, search)
  else next.delete(CARTEIRA_SEARCH_PARAM)

  if (state.filter !== DEFAULT_CARTEIRA_FILTER) next.set(CARTEIRA_FILTER_PARAM, state.filter)
  else next.delete(CARTEIRA_FILTER_PARAM)

  return next
}

export function readCarteiraParams(params: URLSearchParams): CarteiraUrlState {
  return {
    search: parseCarteiraSearch(params.get(CARTEIRA_SEARCH_PARAM)),
    filter: parseCarteiraFilter(params.get(CARTEIRA_FILTER_PARAM)),
  }
}

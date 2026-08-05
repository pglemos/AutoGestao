import type { Store } from '@/types/database'

/** Filiais vinculadas à matriz, em ordem alfabética. */
export function selectBranches(stores: Store[], matriz: Store | null): Store[] {
  if (!matriz) return []
  return stores
    .filter((store) => store.parent_loja_id === matriz.id)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

/**
 * Lojas que ainda podem virar filial desta matriz: nem a própria matriz, nem
 * quem já tem vínculo, nem quem já é matriz de outro grupo — o banco recusa
 * hierarquia de dois níveis (trigger `lojas_valida_hierarquia`), então a opção
 * inválida nem chega a ser oferecida.
 */
export function selectLinkableStores(stores: Store[], matriz: Store | null): Store[] {
  if (!matriz) return []
  const parentIds = new Set(
    stores.map((store) => store.parent_loja_id).filter((id): id is string => Boolean(id)),
  )
  return stores
    .filter((store) => store.id !== matriz.id && !store.parent_loja_id && !parentIds.has(store.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

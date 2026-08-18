// Resolução do conjunto de unidades de um cliente.
//
// O restante do app resolve um cliente para uma única loja (`primary_store_id`),
// enquanto a hierarquia matriz/filial vive separada em `lojas.parent_loja_id`.
// Nada juntava as duas — por isso o consolidado do cliente nunca existiu: toda
// leitura enxergava apenas a matriz.
//
// Aqui a hierarquia é de um nível: a matriz é a loja apontada pelo cliente, as
// filiais são as lojas cujo `parent_loja_id` aponta para ela.

export type ClientUnit = {
  id: string
  name: string
  store_type: 'MATRIZ' | 'FILIAL'
  active: boolean
}

type StoreRow = {
  id: string
  name: string | null
  active?: boolean | null
  parent_loja_id?: string | null
}

/**
 * Ordena as unidades de um cliente: matriz primeiro, filiais por nome.
 *
 * `matrizId` costuma vir de `clientes_consultoria.primary_store_id`. Uma loja
 * que aponte para a matriz mas esteja inativa continua na lista, marcada — quem
 * consolida decide se entra no cálculo, e uma unidade sumir da lista silenciosamente
 * seria pior que aparecer inativa.
 */
export function buildClientUnits(matrizId: string | null | undefined, stores: StoreRow[]): ClientUnit[] {
  if (!matrizId) return []

  const byId = new Map(stores.map(store => [store.id, store]))
  const matriz = byId.get(matrizId)
  if (!matriz) return []

  const filiais = stores
    .filter(store => store.id !== matrizId && store.parent_loja_id === matrizId)
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR'))

  const toUnit = (store: StoreRow, store_type: ClientUnit['store_type']): ClientUnit => ({
    id: store.id,
    name: store.name ?? '',
    store_type,
    active: store.active !== false,
  })

  return [toUnit(matriz, 'MATRIZ'), ...filiais.map(store => toUnit(store, 'FILIAL'))]
}

/** Cliente com mais de uma unidade precisa de seletor de escopo e de consolidado. */
export function hasMultipleUnits(units: ClientUnit[]): boolean {
  return units.filter(unit => unit.active).length > 1
}

/** Unidades que entram no cálculo consolidado. */
export function activeUnits(units: ClientUnit[]): ClientUnit[] {
  return units.filter(unit => unit.active)
}

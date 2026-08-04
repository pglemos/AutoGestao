/**
 * Resolução pura do contexto de gestão comercial de uma loja.
 *
 * Fonte canônica: vínculo ativo em `vinculos_loja` com role = 'gerente',
 * is_active = true e ended_at IS NULL. `lojas.manager_email` NÃO participa —
 * em produção esse campo guarda listas de distribuição de relatório e diverge
 * do vínculo real (13 lojas com vínculo x 8 com e-mail, em 2026-08-04).
 *
 * Mantida separada do hook para poder ser testada sem React nem Supabase.
 */

export type StoreLink = {
  userId: string
  role: string
  isActive: boolean
  endedAt: string | null
}

export type StoreManager = {
  userId: string
  name: string | null
  email: string | null
}

export type StoreManagementContext = {
  storeId: string | null
  hasActiveManager: boolean
  activeManagerIds: string[]
  activeManagerCount: number
  /** true quando não há gerente ativo — o dono acumula a gestão comercial */
  ownerAssumesManagement: boolean
  /** independente da gestão: o dono também lança vendas próprias */
  ownerCanSell: boolean
  /** 'gestao' = dono opera como gerente; 'acompanhamento' = existe gerente ativo */
  commercialAccessMode: 'gestao' | 'acompanhamento'
}

export function isActiveManagerLink(link: StoreLink): boolean {
  return link.role === 'gerente' && link.isActive && link.endedAt === null
}

export function resolveStoreManagementContext(
  storeId: string | null,
  links: StoreLink[],
  ownerCanSell = false,
): StoreManagementContext {
  const activeManagerIds = links.filter(isActiveManagerLink).map((link) => link.userId)
  const hasActiveManager = activeManagerIds.length > 0

  return {
    storeId,
    hasActiveManager,
    activeManagerIds,
    activeManagerCount: activeManagerIds.length,
    ownerAssumesManagement: !hasActiveManager,
    ownerCanSell,
    commercialAccessMode: hasActiveManager ? 'acompanhamento' : 'gestao',
  }
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

/**
 * Contexto de gestão comercial da loja.
 *
 * A fonte canônica de "a loja tem gerente?" é o vínculo ativo em `vinculos_loja`
 * (role = 'gerente', is_active = true, ended_at IS NULL). `lojas.manager_email`
 * NÃO comanda permissão — serve apenas como destinatário de relatórios e diverge
 * do vínculo real em boa parte da base.
 *
 * Quando não há gerente ativo, o dono acumula a gestão comercial e recebe o
 * módulo gerencial completo. Quando há, o dono mantém acesso de acompanhamento.
 */

export type StoreManager = {
  userId: string
  name: string | null
  email: string | null
}

export type StoreManagementContext = {
  storeId: string | null
  hasActiveManager: boolean
  activeManagers: StoreManager[]
  /** true quando não há gerente ativo — dono assume a gestão comercial */
  ownerAssumesManagement: boolean
  /** 'gestao' = dono opera como gerente; 'acompanhamento' = existe gerente ativo */
  commercialAccessMode: 'gestao' | 'acompanhamento'
  loading: boolean
}

const EMPTY: StoreManager[] = []

export function useStoreManagementContext(storeIdOverride?: string): StoreManagementContext {
  const { storeId: authStoreId } = useAuth()
  const storeId = storeIdOverride ?? authStoreId ?? null

  const { data, isLoading } = useQuery({
    queryKey: ['store-management-context', storeId],
    queryFn: async (): Promise<StoreManager[]> => {
      if (!storeId) return EMPTY
      const { data, error } = await supabase
        .from('vinculos_loja')
        .select('user_id, usuarios:user_id ( name, email )')
        .eq('store_id', storeId)
        .eq('role', 'gerente')
        .eq('is_active', true)
        .is('ended_at', null)

      if (error || !data) return EMPTY

      return data.map((row) => {
        const user = (Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios) as
          | { name?: string | null; email?: string | null }
          | null
          | undefined
        return {
          userId: row.user_id as string,
          name: user?.name ?? null,
          email: user?.email ?? null,
        }
      })
    },
    enabled: Boolean(storeId),
    staleTime: 5 * 60 * 1000,
  })

  const activeManagers = data ?? EMPTY
  const hasActiveManager = activeManagers.length > 0

  return {
    storeId,
    hasActiveManager,
    activeManagers,
    ownerAssumesManagement: !hasActiveManager,
    commercialAccessMode: hasActiveManager ? 'acompanhamento' : 'gestao',
    loading: isLoading,
  }
}

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  resolveStoreManagementContext,
  type StoreLink,
  type StoreManager,
} from '@/lib/store-management-context'

/**
 * Contexto de gestão comercial da loja ativa.
 *
 * A decisão fica em `resolveStoreManagementContext` (pura, testada). Aqui só
 * buscamos os vínculos da loja e o flag de venda do próprio usuário.
 */

export type { StoreManager }

const EMPTY_LINKS: StoreLink[] = []

type ManagerRow = {
  user_id: string
  role: string
  is_active: boolean
  ended_at: string | null
  usuarios: { name?: string | null; email?: string | null } | Array<{ name?: string | null; email?: string | null }> | null
}

export function useStoreManagementContext(storeIdOverride?: string) {
  const { storeId: authStoreId, profile } = useAuth()
  const storeId = storeIdOverride ?? authStoreId ?? null

  const { data, isLoading } = useQuery({
    queryKey: ['store-management-context', storeId],
    queryFn: async (): Promise<ManagerRow[]> => {
      if (!storeId) return []
      const { data, error } = await supabase
        .from('vinculos_loja')
        .select('user_id, role, is_active, ended_at, usuarios:user_id ( name, email )')
        .eq('store_id', storeId)
        .eq('role', 'gerente')
      if (error || !data) return []
      return data as unknown as ManagerRow[]
    },
    enabled: Boolean(storeId),
    staleTime: 5 * 60 * 1000,
  })

  const rows = data ?? []
  const links: StoreLink[] = rows.length
    ? rows.map((row) => ({
        userId: row.user_id,
        role: row.role,
        isActive: row.is_active,
        endedAt: row.ended_at,
      }))
    : EMPTY_LINKS

  const context = resolveStoreManagementContext(storeId, links, Boolean(profile?.is_venda_loja))

  const activeManagers: StoreManager[] = rows
    .filter((row) => context.activeManagerIds.includes(row.user_id))
    .map((row) => {
      const user = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios
      return {
        userId: row.user_id,
        name: user?.name ?? null,
        email: user?.email ?? null,
      }
    })

  return { ...context, activeManagers, loading: isLoading }
}

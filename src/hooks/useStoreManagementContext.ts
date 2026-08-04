import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  resolveOwnerManagementContext,
  type OwnerManagementContext,
} from '@/lib/owner-management-context'

type UseStoreManagementContextInput = {
  storeId?: string | null
  declaredManagerEmail?: string | null
  enabled?: boolean
}

type StoreManagementState = {
  activeManagerCount: number | null
  loading: boolean
  error: string | null
  queryFailed: boolean
}

export function useStoreManagementContext({
  storeId,
  declaredManagerEmail,
  enabled = true,
}: UseStoreManagementContextInput): OwnerManagementContext & {
  loading: boolean
  error: string | null
} {
  const [state, setState] = useState<StoreManagementState>({
    activeManagerCount: null,
    loading: Boolean(enabled && storeId),
    error: null,
    queryFailed: Boolean(enabled && !storeId),
  })

  useEffect(() => {
    let cancelled = false

    if (!enabled) {
      setState({ activeManagerCount: 0, loading: false, error: null, queryFailed: false })
      return () => { cancelled = true }
    }

    if (!storeId) {
      setState({
        activeManagerCount: null,
        loading: false,
        error: 'Loja não identificada para verificar a gestão comercial.',
        queryFailed: true,
      })
      return () => { cancelled = true }
    }

    setState(current => ({ ...current, loading: true, error: null, queryFailed: false }))

    void supabase
      .from('vinculos_loja')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('role', 'gerente')
      .eq('is_active', true)
      .is('ended_at', null)
      .then(({ count, error }) => {
        if (cancelled) return
        if (error) {
          setState({
            activeManagerCount: null,
            loading: false,
            error: 'Não foi possível confirmar se a loja possui gerente ativo.',
            queryFailed: true,
          })
          return
        }

        setState({
          activeManagerCount: count || 0,
          loading: false,
          error: null,
          queryFailed: false,
        })
      })

    return () => { cancelled = true }
  }, [enabled, storeId])

  const context = useMemo(
    () => resolveOwnerManagementContext({
      activeManagerCount: state.activeManagerCount,
      declaredManagerEmail,
      queryFailed: state.queryFailed,
    }),
    [declaredManagerEmail, state.activeManagerCount, state.queryFailed],
  )

  return { ...context, loading: state.loading, error: state.error }
}

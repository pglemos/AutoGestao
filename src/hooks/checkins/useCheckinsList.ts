import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { DailyCheckin, CheckinWithTotals } from '@/types/database'
import { isLancamentosViaRpcEnabled } from '@/lib/feature-flags'
import { traced } from '@/lib/observability'
import { CHECKIN_SELECT, withCheckinTotals } from './types'

export interface CheckinsListFilters {
    startDate?: string
    endDate?: string
    userId?: string
}

/**
 * Hook responsável por buscar listas de lançamentos com filtros (loja/período/vendedor).
 * Suporta dual-path: RPC (flag ON) ou legacy direct query.
 */
export function useCheckinsList(storeId: string | null) {
    const [checkins, setCheckins] = useState<CheckinWithTotals[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const isFirstLoadRef = useRef(true)

    useEffect(() => {
        isFirstLoadRef.current = true
    }, [storeId])

    const fetchCheckins = useCallback(async (filters?: CheckinsListFilters) => {
        if (!storeId) {
            setCheckins([])
            setLoading(false)
            return
        }
        if (isFirstLoadRef.current) {
            setLoading(true)
        }
        setError(null)

        let data: DailyCheckin[] | null = null
        let queryError: { message: string } | null = null

        if (isLancamentosViaRpcEnabled() && filters?.userId) {
            const start = filters?.startDate || '1970-01-01'
            const end = filters?.endDate || '2999-12-31'
            const { result } = await traced(async () =>
                supabase.rpc('get_lancamentos_por_vendedor_periodo', {
                    p_seller_id: filters.userId!,
                    p_store_id: storeId,
                    p_start_date: start,
                    p_end_date: end,
                    p_scope: 'daily',
                }),
            )
            data = (result.data as DailyCheckin[] | null) || null
            queryError = result.error
        } else if (isLancamentosViaRpcEnabled() && filters?.startDate && filters?.endDate) {
            const { result } = await traced(async () =>
                supabase.rpc('get_lancamentos_por_loja_periodo', {
                    p_store_id: storeId,
                    p_start_date: filters.startDate!,
                    p_end_date: filters.endDate!,
                    p_scope: 'daily',
                }),
            )
            data = (result.data as DailyCheckin[] | null) || null
            queryError = result.error
        } else {
            let query = supabase.from('lancamentos_diarios')
                .select(CHECKIN_SELECT)
                .eq('store_id', storeId)
                .order('reference_date', { ascending: false })

            if (filters?.startDate) query = query.gte('reference_date', filters.startDate)
            if (filters?.endDate) query = query.lte('reference_date', filters.endDate)
            if (filters?.userId) query = query.eq('seller_user_id', filters.userId)

            const res = await query
            data = (res.data as DailyCheckin[] | null) || null
            queryError = res.error
        }

        if (queryError) {
            console.error('Audit Error [useCheckinsList]: fetchCheckins fail ->', queryError.message)
            setError('Não foi possível carregar os lançamentos.')
            setCheckins([])
        } else if (data) {
            setCheckins((data as DailyCheckin[]).map(withCheckinTotals))
        }
        setLoading(false)
        isFirstLoadRef.current = false
    }, [storeId])

    return { checkins, setCheckins, loading, error, setError, fetchCheckins }
}

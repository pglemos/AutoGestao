import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { CheckinCorrectionRequest, CheckinFormData, DailyCheckin } from '@/types/database'
import { getErrorMessage } from '@/lib/error-message'

export function useCheckinAuditor(storeIdOverride?: string) {
    const { profile, storeId: authStoreId } = useAuth()
    const storeId = storeIdOverride || authStoreId
    const [loading, setLoading] = useState(false)

    /** Vendedor solicita correção */
    const requestCorrection = async (checkinId: string, requestedValues: CheckinFormData, reason: string) => {
        if (!profile?.id || !storeId) return { error: 'Sessão inválida' }
        
        setLoading(true)
        const { data, error } = await supabase.rpc('solicitar_regularizacao_fechamento', {
            p_checkin_id: checkinId,
            p_requested_values: requestedValues,
            p_reason: reason,
            p_idempotency_key: null,
        })
        setLoading(false)
        const result = data as { ok?: boolean; error?: unknown; data?: { id?: string } } | null
        return {
            error: error || result?.error
                ? getErrorMessage(error || result?.error, 'Não foi possível solicitar a regularização.')
                : null,
            id: result?.data?.id,
        }
    }

    /** Gerente busca solicitações pendentes da sua loja */
    const fetchPendingRequests = useCallback(async () => {
        if (!storeId) return []
        const { data, error } = await supabase
            .from('solicitacoes_correcao_lancamento')
            .select('*, seller:usuarios!checkin_correction_requests_seller_id_fkey(name, avatar_url)')
            .eq('store_id', storeId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
        if (error) throw error
        return data || []
    }, [storeId])

    // MX-22.5 (AC-6; Spec §10 "pendência gerencial"): fetchPendingRequests é
    // deliberadamente só 'pending' (fila de aprovação). Reconciliar a
    // taxonomia de 7 estados de checkin-history-state.ts (22.3) na visão do
    // gestor exige também 'approved'/'rejected' — a RLS já permite
    // (solicitacoes_correcao_select cobre is_manager_of/is_owner_of para
    // qualquer status, não só pending), então é só remover o filtro de
    // status, sem migration nova.
    const fetchStoreRequests = useCallback(async (): Promise<CheckinCorrectionRequest[]> => {
        if (!storeId) return []
        const { data, error } = await supabase
            .from('solicitacoes_correcao_lancamento')
            .select('*, seller:usuarios!checkin_correction_requests_seller_id_fkey(name, avatar_url)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false })
        if (error) throw error
        return (data || []) as CheckinCorrectionRequest[]
    }, [storeId])

    // MX-22.3 (GAP 2; Spec §8.1/§8.2): o vendedor precisa enxergar o próprio
    // ciclo de vida da regularização (pending/approved/rejected) no
    // Histórico, não só o gerente. fetchPendingRequests é escopo de loja e
    // só 'pending' — este lê todas as solicitações do PRÓPRIO seller_id,
    // usando a RLS já existente (seller_id = auth.uid()), sem migration nova.
    const fetchOwnRequests = useCallback(async (): Promise<CheckinCorrectionRequest[]> => {
        if (!profile?.id) return []
        const { data, error } = await supabase
            .from('solicitacoes_correcao_lancamento')
            .select('*')
            .eq('seller_id', profile.id)
            .order('created_at', { ascending: false })
        if (error) throw error
        return (data || []) as CheckinCorrectionRequest[]
    }, [profile?.id])

    /** Gerente aprova e aplica a correção via RPC Segura */
    const approveRequest = async (request: CheckinCorrectionRequest) => {
        if (!profile?.id) return { error: 'Não autorizado' }
        setLoading(true)

        try {
            const { data, error } = await supabase.rpc('aplicar_regularizacao_fechamento', {
                p_request_id: request.id,
            })

            if (error) throw error
            const result = data as { ok?: boolean; error?: unknown } | null
            if (!result?.ok) {
                return { error: getErrorMessage(result?.error, 'Não foi possível aplicar a regularização.') }
            }
            return { error: null }
        } catch (err: unknown) {
            console.error('Audit Error [useCheckinAuditor]: approveRequest fail ->', err)
            return { error: getErrorMessage(err, 'Não foi possível aplicar a regularização.') }
        } finally {
            setLoading(false)
        }
    }

    /** Gerente rejeita a solicitação via RPC Segura */
    const rejectRequest = async (requestId: string, reason?: string) => {
        if (!profile?.id) return { error: 'Não autorizado' }
        setLoading(true)
        try {
            const { data, error } = await supabase.rpc('rejeitar_regularizacao_fechamento', {
                p_request_id: requestId,
                p_reason: reason || null,
            })
            if (error) throw error
            const result = data as { ok?: boolean; error?: unknown } | null
            if (!result?.ok) {
                return { error: getErrorMessage(result?.error, 'Não foi possível rejeitar a regularização.') }
            }
            return { error: null }
        } catch (err: unknown) {
            console.error('Audit Error [useCheckinAuditor]: rejectRequest fail ->', err)
            return { error: getErrorMessage(err, 'Não foi possível rejeitar a regularização.') }
        } finally {
            setLoading(false)
        }
    }

    const cancelRequest = async (requestId: string) => {
        const { data, error } = await supabase.rpc('cancelar_regularizacao_fechamento', { p_request_id: requestId })
        const result = data as { ok?: boolean; error?: unknown } | null
        return {
            error: error || result?.error
                ? getErrorMessage(error || result?.error, 'Não foi possível cancelar a regularização.')
                : null,
        }
    }

    return { loading, requestCorrection, fetchPendingRequests, fetchStoreRequests, fetchOwnRequests, approveRequest, rejectRequest, cancelRequest }
}

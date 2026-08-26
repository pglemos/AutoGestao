import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isAdministradorMx, useAuth } from '@/hooks/useAuth'
import type { StoreMetaRules, StoreBenchmark } from '@/types/database'

const STORE_META_RULES_SELECT = 'store_id, monthly_goal, individual_goal_mode, include_venda_loja_in_store_total, include_venda_loja_in_individual_goal, bench_lead_agd, bench_agd_visita, bench_visita_vnd, projection_mode, remuneracao_detalhes_visivel, updated_by, updated_at'
const STORE_BENCHMARK_SELECT = 'store_id, lead_to_agend, agend_to_visit, visit_to_sale, updated_by, updated_at'

export function useGoals(storeIdOverride?: string) {
    const { storeId: authStoreId, role } = useAuth()
    const storeId = storeIdOverride || authStoreId
    const [storeGoal, setStoreGoal] = useState<{ target: number; projection_mode: 'calendar' | 'business' } | null>(null)
    const [loading, setLoading] = useState(true)

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    const fetchGoals = useCallback(async () => {
        if (!storeId) {
            setStoreGoal(null)
            setLoading(false)
            return
        }
        setLoading(true)
        try {
            const { data } = await supabase
                .from('regras_metas_loja')
                .select('monthly_goal, projection_mode')
                .eq('store_id', storeId)
                .maybeSingle()

            if (data) {
                setStoreGoal({ target: data.monthly_goal ?? 0, projection_mode: data.projection_mode || 'calendar' })
            } else {
                setStoreGoal({ target: 0, projection_mode: 'calendar' })
            }
        } catch {
            setStoreGoal({ target: 0, projection_mode: 'calendar' })
        } finally {
            setLoading(false)
        }
    }, [storeId])

    const upsertGoal = async (formData: { store_id: string; target: number }): Promise<{ error: string | null }> => {
        if (!isAdministradorMx(role)) return { error: 'Apenas Admin MX pode alterar metas da loja.' }
        const { error } = await supabase.from('regras_metas_loja').upsert({
            store_id: formData.store_id,
            monthly_goal: formData.target,
        }, { onConflict: 'store_id' })
        if (error) return { error: error.message }
        await fetchGoals()
        return { error: null }
    }

    useEffect(() => { fetchGoals() }, [fetchGoals])
    return { storeGoal, sellerGoals: [], loading, fetchGoals, upsertGoal, currentMonth, currentYear }
}

export function useAllStoreGoals() {
    const { role } = useAuth()
    const [metas, setGoals] = useState<{ store_id: string, target: number, store_name?: string }[]>([])
    const [benchmarks, setBenchmarks] = useState<StoreBenchmark[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = useCallback(async () => {
        setLoading(true)
        const [goalsRes, benchRes] = await Promise.all([
            supabase.from('regras_metas_loja').select('store_id, monthly_goal, stores:lojas(name)'),
            supabase.from('benchmarks_loja').select(STORE_BENCHMARK_SELECT)
        ])
        
        if (goalsRes.data) {
            setGoals((goalsRes.data as { store_id: string; monthly_goal: number; lojas?: { name?: string } }[]).map((g) => ({
                store_id: g.store_id,
                target: g.monthly_goal,
                store_name: g.lojas?.name
            })))
        }
        if (benchRes.data) setBenchmarks(benchRes.data)
        setLoading(false)
    }, [])

    const updateGoal = async (storeId: string, target: number) => {
        if (!isAdministradorMx(role)) return { error: 'Apenas Admin MX pode alterar metas da loja.' }
        const { error } = await supabase.from('regras_metas_loja').upsert({
            store_id: storeId,
            monthly_goal: target
        }, { onConflict: 'store_id' })
        if (!error) await fetchData()
        return { error: error?.message || null }
    }

    const updateBenchmark = async (storeId: string, data: Partial<StoreBenchmark>) => {
        if (!isAdministradorMx(role)) return { error: 'Apenas Admin MX pode alterar benchmarks da loja.' }
        const { error } = await supabase.from('benchmarks_loja').upsert({
            store_id: storeId,
            ...data
        }, { onConflict: 'store_id' })
        if (!error) await fetchData()
        return { error: error?.message || null }
    }

    useEffect(() => { fetchData() }, [fetchData])

    return { metas, benchmarks, loading, updateGoal, updateBenchmark, refetch: fetchData }
}

export function useStoreMetaRules(storeIdOverride?: string) {
    const { storeId: authStoreId, role } = useAuth()
    const storeId = storeIdOverride || authStoreId
    const [metaRules, setMetaRules] = useState<StoreMetaRules | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchMetaRules = useCallback(async () => {
        if (!storeId) {
            setMetaRules(null)
            setLoading(false)
            return
        }
        setLoading(true)
        const { data } = await supabase
            .from('regras_metas_loja')
            .select(STORE_META_RULES_SELECT)
            .eq('store_id', storeId)
            .maybeSingle()

        setMetaRules((data as StoreMetaRules) || null)
        setLoading(false)
    }, [storeId])

    const updateMetaRules = async (data: Partial<StoreMetaRules>) => {
        if (!storeId) return { error: 'Loja não selecionada' }
        if (!isAdministradorMx(role)) return { error: 'Apenas Admin MX pode alterar regras de metas.' }
        const { error } = await supabase.from('regras_metas_loja').upsert({
            store_id: storeId,
            ...data
        }, { onConflict: 'store_id' })
        if (!error) await fetchMetaRules()
        return { error: error?.message || null }
    }

    const deleteMetaRules = async () => {
        if (!storeId) return { error: 'Loja não selecionada' }
        if (!isAdministradorMx(role)) return { error: 'Apenas Admin MX pode excluir regras de metas.' }
        const { error } = await supabase
            .from('regras_metas_loja')
            .delete()
            .eq('store_id', storeId)
        if (!error) await fetchMetaRules()
        return { error: error?.message || null }
    }

    useEffect(() => { fetchMetaRules() }, [fetchMetaRules])

    return { metaRules, loading, fetchMetaRules, updateMetaRules, deleteMetaRules }
}

export function useStoreGoal(storeIdOverride?: string | null) {
    const { storeId: authStoreId, role } = useAuth()
    const storeId = storeIdOverride !== undefined ? storeIdOverride : authStoreId
    const [goal, setGoal] = useState<{ target: number; projection_mode: 'calendar' | 'business' } | null>(null)
    const [loading, setLoading] = useState(true)

    const fetch = useCallback(async () => {
        if (!storeId) {
            setGoal(null)
            setLoading(false)
            return
        }
        setLoading(true)
        const { data } = await supabase
            .from('regras_metas_loja')
            .select('monthly_goal, projection_mode')
            .eq('store_id', storeId)
            .maybeSingle()

        if (data) setGoal({ target: data.monthly_goal ?? 0, projection_mode: data.projection_mode || 'calendar' })
        else setGoal({ target: 0, projection_mode: 'calendar' })
        setLoading(false)
    }, [storeId])

    const updateGoal = async (target: number) => {
        const finalStoreId = storeId
        if (!finalStoreId) return { error: 'Loja não selecionada' }
        if (!isAdministradorMx(role)) return { error: 'Apenas Admin MX pode alterar metas da loja.' }
        const { error } = await supabase.from('regras_metas_loja').upsert({
            store_id: finalStoreId,
            monthly_goal: target
        }, { onConflict: 'store_id' })
        if (!error) await fetch()
        return { error: error?.message || null }
    }

    useEffect(() => { fetch() }, [fetch])
    return { goal, loading, refetch: fetch, updateGoal }
}

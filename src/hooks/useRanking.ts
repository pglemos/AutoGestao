import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { RankingEntry, User } from '@/types/database'
import { calcularAtingimento, getDiasInfo, getOperationalStatus } from '@/lib/calculations'
import { calculateReferenceDate } from '@/hooks/useCheckins'
import { isLancamentosViaRpcEnabled } from '@/lib/feature-flags'
import { traced } from '@/lib/observability'
import { resolveIndividualGoal } from '@/lib/storeSalesRules'

type LancamentoRow = {
    seller_user_id: string
    store_id?: string
    reference_date: string
    leads_prev_day?: number | null
    agd_cart_today?: number | null
    agd_net_today?: number | null
    vnd_porta_prev_day?: number | null
    vnd_cart_prev_day?: number | null
    vnd_net_prev_day?: number | null
    visit_prev_day?: number | null
    submission_status?: string | null
}

// MX-22.5 (AC-2; Spec §10.2/FEV-DATA-11): rascunho (submission_status='draft')
// já é metric_scope='daily' desde a 22.2, então some sem esse filtro é
// contabilizado no Ranking de rede antes do vendedor finalizar o fechamento.
// Mesmo filtro aplicado tanto no caminho RPC (get_lancamentos_rede_periodo/
// get_lancamentos_referencia_dia, retornam a linha inteira) quanto no SELECT
// direto legado (que agora também busca submission_status).
export function isOfficialLancamento(row: { submission_status?: string | null }): boolean {
    return row.submission_status !== 'draft'
}

type OfficialPerformanceRow = {
    seller_user_id: string
    vendas_realizadas: number | string
    vendas_ultimo_dia: number | string
    leads: number | string
    atendimentos: number | string
    agendamentos: number | string
}

type RoutineActionRow = {
    seller_id: string
    status: string
}

type StorePerformanceEntry = {
    id: string
    name: string
    meta: number
    realizado: number
    projecao: number
    gap: number
    status: 'green' | 'yellow' | 'red'
    disciplina: { total: number; done: number; ok: boolean }
    efficiency: number
}

export function useRanking(storeIdOverride?: string, filters?: { startDate?: string; endDate?: string }) {
    const { storeId: authStoreId } = useAuth()
    const storeId = storeIdOverride || authStoreId
    const [ranking, setRanking] = useState<RankingEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const reference = calculateReferenceDate()
    const [referenceYear, referenceMonth] = reference.split('-').map(Number)
    const defaultStartOfMonth = `${referenceYear}-${String(referenceMonth).padStart(2, '0')}-01`
    const defaultEndOfMonth = new Date(Date.UTC(referenceYear, referenceMonth, 0)).toISOString().slice(0, 10)

    const startDate = filters?.startDate || defaultStartOfMonth
    const endDate = filters?.endDate || defaultEndOfMonth

    const fetchRanking = useCallback(async () => {
        if (!storeId) {
            setRanking([])
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
        const queryDate = new Date(`${startDate}T12:00:00`)
        const monthNum = queryDate.getMonth() + 1
        const yearNum = queryDate.getFullYear()

        const [officialResult, routineResult, rulesRes, metasRes] = await Promise.all([
            supabase.rpc('vendedor_performance_oficial', {
                p_start_date: startDate,
                p_end_date: endDate,
                p_store_id: storeId,
                p_seller_id: null,
            }),
            supabase
                .from('execution_actions')
                .select('seller_id,status')
                .eq('store_id', storeId)
                .gte('due_at', `${startDate}T00:00:00-03:00`)
                .lte('due_at', `${endDate}T23:59:59-03:00`),
            supabase
                .from('regras_metas_loja')
                .select('monthly_goal, individual_goal_mode, include_venda_loja_in_individual_goal')
                .eq('store_id', storeId)
                .maybeSingle(),
            supabase
                .from('metas')
                .select('user_id, target')
                .eq('store_id', storeId)
                .eq('month', monthNum)
                .eq('year', yearNum),
        ])
        const officialRows = (officialResult.data as OfficialPerformanceRow[] | null) || []
        const checkinsError = officialResult.error
        const routineRows = (routineResult.data as RoutineActionRow[] | null) || []
        const rules = rulesRes.data
        const customMetas = metasRes.data

        if (routineResult.error) {
            console.error('Audit Error [useRanking]: routine actions fail ->', routineResult.error.message)
        }

        if (checkinsError) {
            console.error('Audit Error [useRanking]: checkins fail ->', checkinsError.message)
            setError('Não foi possível carregar os lançamentos do ranking.')
            setRanking([])
            return
        }

        // Get active sellers by operational tenure. Fallback keeps old data readable until lojas are configured.
        const { data: tenures, error: tenuresError } = await supabase
            .from('vendedores_loja')
            .select('seller_user_id, users:usuarios(name, is_venda_loja, avatar_url)')
            .eq('store_id', storeId)
            .eq('is_active', true)
        if (tenuresError) {
            console.error('Audit Error [useRanking]: tenures fail ->', tenuresError.message)
            setError('Não foi possível carregar os vínculos ativos do ranking.')
            setRanking([])
            return
        }

        const { data: fallbackMembers, error: fallbackError } = (!tenures || tenures.length === 0)
            ? await supabase
                .from('vinculos_loja')
                .select('user_id, users:usuarios(name, is_venda_loja, avatar_url)')
                .eq('store_id', storeId)
                .eq('role', 'vendedor')
                .eq('is_active', true)
            : { data: null, error: null }
        if (fallbackError) {
            console.error('Audit Error [useRanking]: fallback members fail ->', fallbackError.message)
            setError('Não foi possível carregar a equipe do ranking.')
            setRanking([])
            return
        }

        if (rulesRes.error) {
            console.error('Audit Error [useRanking]: rules fail ->', rulesRes.error.message)
            setError('Não foi possível carregar as metas do ranking.')
            setRanking([])
            return
        }

        const members = (tenures && tenures.length > 0)
            ? (tenures as unknown as { seller_user_id: string; users?: User }[]).map((item) => ({ user_id: item.seller_user_id, users: item.users }))
            : (fallbackMembers || [])

        if (!members) return

        const storeGoal = rules?.monthly_goal || 0

        const customGoalMap = new Map<string, number>()
        if (customMetas) {
            for (const cm of customMetas) {
                if (cm.target && Number(cm.target) > 0) {
                    customGoalMap.set(cm.user_id, Number(cm.target))
                }
            }
        }

        const routineBySeller = new Map<string, { completed: number; total: number }>()
        for (const action of routineRows) {
            const current = routineBySeller.get(action.seller_id) || { completed: 0, total: 0 }
            current.total += 1
            if (action.status === 'concluida' || action.status === 'justificada') current.completed += 1
            routineBySeller.set(action.seller_id, current)
        }
        
        const aggregated = new Map<string, { leads: number; agd: number; visitas: number; vnd: number; vnd_yesterday: number; name: string; avatarUrl: string | null; isVendaLoja: boolean }>()
        const realSellersCount = members.length
        const goalDivisor = realSellersCount

        for (const m of members) {
            const user = (m as { users?: User }).users
            aggregated.set(m.user_id, { 
                leads: 0, agd: 0, visitas: 0, vnd: 0, vnd_yesterday: 0,
                name: user?.name || 'Nome não informado',
                avatarUrl: user?.avatar_url || null,
                isVendaLoja: user?.is_venda_loja || false
            })
        }

        for (const row of officialRows) {
            const current = aggregated.get(row.seller_user_id)
            if (current) {
                current.leads = Number(row.leads || 0)
                current.agd = Number(row.agendamentos || 0)
                current.visitas = Number(row.atendimentos || 0)
                current.vnd = Number(row.vendas_realizadas || 0)
                current.vnd_yesterday = Number(row.vendas_ultimo_dia || 0)
            }
        }

        const entries: RankingEntry[] = Array.from(aggregated.entries())
            .map(([userId, data]) => {
                const customGoal = customGoalMap.get(userId) || null
                const meta = resolveIndividualGoal({
                    mode: rules?.individual_goal_mode,
                    storeMonthlyGoal: storeGoal,
                    activeSellersCount: goalDivisor,
                    customGoal,
                }) ?? Math.round(storeGoal / Math.max(goalDivisor, 1))

                const routine = routineBySeller.get(userId)

                return {
                    user_id: userId,
                    user_name: data.name,
                    avatar_url: data.avatarUrl,
                    is_venda_loja: data.isVendaLoja,
                    vnd_total: data.vnd,
                    vnd_yesterday: data.vnd_yesterday,
                    leads: data.leads,
                    agd_total: data.agd,
                    visitas: data.visitas,
                    meta,
                    atingimento: 0,
                    position: 0,
                    routine_execution: routine && routine.total > 0
                        ? Math.round((routine.completed / routine.total) * 100)
                        : null,
                }
            })
            .sort((a, b) => {
                if (b.vnd_total !== a.vnd_total) return b.vnd_total - a.vnd_total
                return b.visitas - a.visitas
            })
            .map((e, i) => {
                const atingimento = e.meta > 0 ? calcularAtingimento(e.vnd_total, e.meta) : 0
                const diasInfo = getDiasInfo()
                const targetToday = (e.meta / diasInfo.total) * diasInfo.decorridos
                const efficiency = targetToday > 0 ? (e.vnd_total / targetToday) * 100 : 100
                const status = getOperationalStatus(efficiency, 100)

                const projecao = Math.round((e.vnd_total / Math.max(diasInfo.decorridos, 1)) * diasInfo.total)
                const ritmo = Math.max(0, Math.ceil((e.meta - e.vnd_total) / Math.max(diasInfo.restantes, 1)))
                const gap = Math.max(0, e.meta - e.vnd_total)

                return { 
                    ...e, 
                    atingimento, 
                    projecao, 
                    ritmo, 
                    efficiency,
                    status,
                    gap,
                    position: i + 1 
                }
            })

        setRanking(entries)
        } catch (caughtError) {
            console.error('Audit Error [useRanking]: fetch threw ->', caughtError)
            setError('Não foi possível carregar o ranking.')
            setRanking([])
        } finally {
            setLoading(false)
        }
    }, [storeId, startDate, endDate])

    useEffect(() => {
        void fetchRanking()
        if (!storeId) return

        const channel = supabase
            .channel(`ranking-store-realtime-${storeId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'eventos_comerciais', filter: `loja_id=eq.${storeId}` },
                () => { void fetchRanking() }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'oportunidades', filter: `loja_id=eq.${storeId}` },
                () => { void fetchRanking() }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'lancamentos_diarios', filter: `store_id=eq.${storeId}` },
                () => { void fetchRanking() }
            )
            .subscribe()

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [fetchRanking, storeId])

    return {
        ranking,
        loading,
        error,
        refetch: fetchRanking
    }
}

export function useGlobalRanking(filters?: { startDate?: string; endDate?: string }) {
    const [ranking, setRanking] = useState<RankingEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const startDateFilter = filters?.startDate
    const endDateFilter = filters?.endDate

    const fetchGlobal = useCallback(async () => {
        const reference = calculateReferenceDate()
        const dias = getDiasInfo()
        const today = dias.referencia
        const startOfMonth = startDateFilter || `${reference.slice(0, 7)}-01`
        const endOfRange = endDateFilter || today
        setLoading(true)
        setError(null)

        // Story 1.2: flag ON usa RPCs admin-only (rede + referência dia); flag OFF mantém SELECT direto
        const useRpc = isLancamentosViaRpcEnabled()
        const directCheckinsQuery = supabase.from('lancamentos_diarios')
            .select('seller_user_id, store_id, reference_date, leads_prev_day, agd_cart_today, agd_net_today, vnd_porta_prev_day, vnd_cart_prev_day, vnd_net_prev_day, visit_prev_day, submission_status')
            .eq('metric_scope', 'daily')
            .gte('reference_date', startOfMonth)
            .lte('reference_date', endOfRange)

        const checkinsPromise = useRpc
            ? traced(async () => supabase.rpc('get_lancamentos_rede_periodo', {
                p_start_date: startOfMonth,
                p_end_date: endOfRange,
                p_scope: 'daily',
            })).then(({ result }) => result)
            : directCheckinsQuery
        const todayCheckinsPromise = useRpc
            ? traced(async () => supabase.rpc('get_lancamentos_referencia_dia', {
                p_reference_date: dias.referencia,
                p_scope: 'daily',
            })).then(({ result }) => result)
            : supabase.from('lancamentos_diarios')
                .select('seller_user_id, vnd_porta_prev_day, vnd_cart_prev_day, vnd_net_prev_day, submission_status')
                .eq('metric_scope', 'daily')
                .eq('reference_date', dias.referencia)

        const [checkinsRes, tenuresRes, rulesRes, todayCheckinsRes] = await Promise.all([
            checkinsPromise,
            supabase.from('vendedores_loja')
                .select('seller_user_id, store_id, users:usuarios(name, is_venda_loja, avatar_url), lojas:lojas(name)')
                .eq('is_active', true),
            supabase.from('regras_metas_loja')
                .select('store_id, monthly_goal, include_venda_loja_in_individual_goal'),
            todayCheckinsPromise,
        ])
        if (checkinsRes.error || tenuresRes.error || rulesRes.error || todayCheckinsRes.error) {
            const message = checkinsRes.error?.message || tenuresRes.error?.message || rulesRes.error?.message || todayCheckinsRes.error?.message || 'Erro desconhecido'
            console.error('Audit Error [useGlobalRanking]: fetch fail ->', message)
            setError('Não foi possível carregar o ranking global.')
            setRanking([])
            setLoading(false)
            return
        }
        const checkins = (checkinsRes.data as LancamentoRow[] | null)?.filter(isOfficialLancamento) ?? null
        const tenures = tenuresRes.data
        const rules = rulesRes.data
        const todayCheckins = (todayCheckinsRes.data as LancamentoRow[] | null)?.filter(isOfficialLancamento) ?? null

        if (!checkins || !tenures) { setLoading(false); return }

        const storeGoals = new Map<string, { goal: number; includeVL: boolean }>()
        for (const r of rules || []) {
            storeGoals.set(r.store_id, { goal: r.monthly_goal || 0, includeVL: r.include_venda_loja_in_individual_goal || false })
        }

        const storeSellerCounts = new Map<string, number>()
        for (const t of tenures) {
            storeSellerCounts.set(t.store_id, (storeSellerCounts.get(t.store_id) || 0) + 1)
        }

        const checkedInToday = new Set<string>()
        const salesTodayMap = new Map<string, number>()
        for (const c of todayCheckins || []) {
            checkedInToday.add(c.seller_user_id)
            const v = (c.vnd_porta_prev_day || 0) + (c.vnd_cart_prev_day || 0) + (c.vnd_net_prev_day || 0)
            salesTodayMap.set(c.seller_user_id, v)
        }

        const agg = new Map<string, { vnd: number; vnd_yesterday: number; leads: number; agd: number; vis: number; name: string; avatarUrl: string | null; store: string; storeId: string; isVendaLoja: boolean; checkedIn: boolean }>()
        for (const m of tenures) {
            const mu = m as unknown as { users?: User; lojas?: { name: string } }
            agg.set(m.seller_user_id, {
                vnd: 0, 
                vnd_yesterday: salesTodayMap.get(m.seller_user_id) || 0,
                leads: 0, agd: 0, vis: 0,
                name: mu.users?.name || '',
                avatarUrl: mu.users?.avatar_url || null,
                store: mu.lojas?.name || '',
                storeId: m.store_id,
                isVendaLoja: mu.users?.is_venda_loja || false,
                checkedIn: checkedInToday.has(m.seller_user_id),
            })
        }
        for (const c of checkins) {
            const cur = agg.get(c.seller_user_id)
            if (cur) {
                cur.vnd += (c.vnd_porta_prev_day || 0) + (c.vnd_cart_prev_day || 0) + (c.vnd_net_prev_day || 0)
                cur.leads += c.leads_prev_day || 0
                cur.agd += (c.agd_cart_today || 0) + (c.agd_net_today || 0)
                cur.vis += c.visit_prev_day || 0
            }
        }

        const entries: RankingEntry[] = Array.from(agg.entries())
            .map(([uid, d]) => {
                const sg = storeGoals.get(d.storeId)
                const storeGoal = sg?.goal || 0
                const includeVL = sg?.includeVL || false
                const sellerCount = storeSellerCounts.get(d.storeId) || 1
                const meta = d.isVendaLoja
                    ? (includeVL ? Math.round(storeGoal / Math.max(sellerCount, 1)) : 0)
                    : Math.round(storeGoal / Math.max(sellerCount, 1))

                return {
                    user_id: uid,
                    user_name: d.name,
                    avatar_url: d.avatarUrl,
                    store_name: d.store,
                    is_venda_loja: d.isVendaLoja,
                    vnd_total: d.vnd,
                    vnd_yesterday: d.vnd_yesterday,
                    leads: d.leads,
                    agd_total: d.agd,
                    visitas: d.vis,
                    meta,
                    atingimento: meta > 0 ? calcularAtingimento(d.vnd, meta) : 0,
                    projecao: d.isVendaLoja ? d.vnd : Math.round((d.vnd / Math.max(dias.decorridos, 1)) * dias.total),
                    ritmo: d.isVendaLoja ? 0 : Math.max(0, Math.ceil(Math.max(0, meta - d.vnd) / Math.max(dias.restantes, 1))),
                    gap: Math.max(0, meta - d.vnd),
                    position: 0,
                    efficiency: 0,
                    status: { label: d.checkedIn ? 'Presente' : 'Ausente', color: d.checkedIn ? 'bg-status-success-surface text-status-success' : 'bg-status-error-surface text-status-error' },
                    checked_in: d.checkedIn,
                }
            })
            .sort((a, b) => {
                if (b.vnd_total !== a.vnd_total) return b.vnd_total - a.vnd_total
                if (a.is_venda_loja !== b.is_venda_loja) return a.is_venda_loja ? 1 : -1
                return b.visitas - a.visitas
            })
            .map((e, i) => ({ ...e, position: i + 1 }))

        setRanking(entries)
        setLoading(false)
    }, [startDateFilter, endDateFilter])

    useEffect(() => { fetchGlobal() }, [fetchGlobal])

    return { ranking, loading, error, refetch: fetchGlobal }
}

export function useStorePerformance() {
    const [performance, setPerformance] = useState<StorePerformanceEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPerformance = useCallback(async () => {
        setLoading(true)
        setError(null)
        const reference = calculateReferenceDate()
        const startOfMonth = `${reference.slice(0, 7)}-01`
        const dias = getDiasInfo()

        const useRpc2 = isLancamentosViaRpcEnabled()
        const perfCheckinsPromise = useRpc2
            ? traced(async () => supabase.rpc('get_lancamentos_rede_periodo', {
                p_start_date: startOfMonth,
                p_end_date: dias.referencia,
                p_scope: 'daily',
            })).then(({ result }) => result)
            : supabase.from('lancamentos_diarios')
                .select('store_id, vnd_porta_prev_day, vnd_cart_prev_day, vnd_net_prev_day, submission_status')
                .eq('metric_scope', 'daily')
                .gte('reference_date', startOfMonth)
        const perfTodayPromise = useRpc2
            ? traced(async () => supabase.rpc('get_lancamentos_referencia_dia', {
                p_reference_date: dias.referencia,
                p_scope: 'daily',
            })).then(({ result }) => result)
            : supabase.from('lancamentos_diarios')
                .select('store_id, seller_user_id, submission_status')
                .eq('metric_scope', 'daily')
                .eq('reference_date', dias.referencia)

        const [lojasRes, rulesRes, checkinsRes, sellersRes, yesterdayCheckinsRes] = await Promise.all([
            supabase.from('lojas').select('id, name').eq('active', true),
            supabase.from('regras_metas_loja').select('store_id, monthly_goal'),
            perfCheckinsPromise,
            supabase.from('vendedores_loja').select('store_id, is_active').eq('is_active', true),
            perfTodayPromise,
        ])
        if (lojasRes.error || rulesRes.error || checkinsRes.error || sellersRes.error || yesterdayCheckinsRes.error) {
            const message = lojasRes.error?.message || rulesRes.error?.message || checkinsRes.error?.message || sellersRes.error?.message || yesterdayCheckinsRes.error?.message || 'Erro desconhecido'
            console.error('Audit Error [useStorePerformance]: fetch fail ->', message)
            setError('Não foi possível carregar a performance das lojas.')
            setPerformance([])
            setLoading(false)
            return
        }
        const lojas = lojasRes.data
        const rules = rulesRes.data
        const checkins = ((checkinsRes.data || []) as LancamentoRow[]).filter(isOfficialLancamento)
        const sellers = sellersRes.data
        const yesterdayCheckins = ((yesterdayCheckinsRes.data || []) as LancamentoRow[]).filter(isOfficialLancamento)

        if (!lojas) { setLoading(false); return }

        const rulesMap = new Map(rules?.map(r => [r.store_id, r.monthly_goal]) || [])
        const salesMap = new Map<string, number>()
        checkins.forEach((c) => {
            const v = (c.vnd_porta_prev_day || 0) + (c.vnd_cart_prev_day || 0) + (c.vnd_net_prev_day || 0)
            const sid = c.store_id as string
            salesMap.set(sid, (salesMap.get(sid) || 0) + v)
        })

        const sellersCountMap = new Map<string, number>()
        sellers?.forEach(s => sellersCountMap.set(s.store_id, (sellersCountMap.get(s.store_id) || 0) + 1))

        const checkinsTodayMap = new Map<string, number>()
        yesterdayCheckins.forEach((c) => {
            const sid = c.store_id as string
            checkinsTodayMap.set(sid, (checkinsTodayMap.get(sid) || 0) + 1)
        })

        const perf: StorePerformanceEntry[] = lojas.map(s => {
            const meta = rulesMap.get(s.id) || 0
            const realizado = salesMap.get(s.id) || 0
            const projecao = Math.round((realizado / Math.max(dias.decorridos, 1)) * dias.total)
            const gap = Math.max(0, meta - realizado)
            
            // Disciplina
            const totalSellers = sellersCountMap.get(s.id) || 0
            const doneSellers = checkinsTodayMap.get(s.id) || 0
            const isDisciplined = totalSellers > 0 ? doneSellers >= totalSellers : true
            
            // Semáforo logic
            const targetToday = (meta / dias.total) * dias.decorridos
            const efficiency = targetToday > 0 ? realizado / targetToday : 1
            const status: StorePerformanceEntry['status'] = efficiency >= 1 ? 'green' : efficiency >= 0.8 ? 'yellow' : 'red'

            return {
                id: s.id,
                name: s.name,
                meta,
                realizado,
                projecao,
                gap,
                status,
                disciplina: { total: totalSellers, done: doneSellers, ok: isDisciplined },
                efficiency: Math.round(efficiency * 100)
            }
        })

        setPerformance(perf)
        setLoading(false)
    }, [])

    useEffect(() => { fetchPerformance() }, [fetchPerformance])
    return { performance, loading, error, refetch: fetchPerformance }
}

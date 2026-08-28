import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchAllPaged } from '@/lib/supabasePagination'
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

type OfficialSaleRow = {
    seller_user_id: string
    store_id: string
    competencia: string
    vendas: number | string
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
    seller_name?: string
    meta?: number | string | null
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

type ActiveSellerMembershipRow = {
    user_id: string
    users?: { active?: boolean | null; role?: string | null } | null
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

        // A seller is eligible only when both the operational assignment and the
        // active seller membership exist. There is no fallback to a partial
        // relationship: that would inflate the divisor and expose stale users.
        const { data: tenures, error: tenuresError } = await supabase
            .from('vendedores_loja')
            .select('seller_user_id, users:usuarios(name, is_venda_loja, avatar_url, active)')
            .eq('store_id', storeId)
            .eq('is_active', true)
        if (tenuresError) {
            console.error('Audit Error [useRanking]: tenures fail ->', tenuresError.message)
            setError('Não foi possível carregar os vínculos ativos do ranking.')
            setRanking([])
            return
        }

        const { data: memberships, error: membershipsError } = await supabase
            .from('vinculos_loja')
            .select('user_id, users:usuarios(active, role)')
            .eq('store_id', storeId)
            .eq('role', 'vendedor')
            .eq('is_active', true)
        if (membershipsError) {
            console.error('Audit Error [useRanking]: memberships fail ->', membershipsError.message)
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

        // A elegibilidade continua sendo "vínculo operacional E membership ativa
        // de vendedor" — o que mudou é de onde vem a confirmação da membership.
        //
        // `vinculos_loja` é limitada por RLS: um vendedor lê apenas a própria
        // linha. O cruzamento no cliente colapsava a equipe inteira para uma
        // pessoa, e como a posição no ranking é o índice do array, TODO vendedor
        // via "#1 posição na loja" independentemente do resultado. O gerente,
        // que lê as 4 linhas, via o ranking correto — por isso passou batido.
        //
        // `vendedor_performance_oficial` é SECURITY DEFINER e já exige o mesmo
        // par (vendedores_loja + vinculos_loja com role 'vendedor' ativa), então
        // devolve exatamente o conjunto elegível sem truncar por RLS.
        const officialSellerIds = new Set(officialRows.map((row) => row.seller_user_id))
        const membershipIdsVisiveis = new Set(
            ((memberships || []) as unknown as ActiveSellerMembershipRow[])
                .filter((membership) => membership.users?.active === true && membership.users?.role === 'vendedor')
                .map((membership) => membership.user_id),
        )
        const activeMembershipIds = officialSellerIds.size > 0 ? officialSellerIds : membershipIdsVisiveis
        const eligibleMembers = (tenures || [])
            .map((item) => item as unknown as { seller_user_id: string; users?: User })
            .filter((item) => item.users?.active === true && activeMembershipIds.has(item.seller_user_id))
            .map((item) => ({ user_id: item.seller_user_id, users: item.users }))
        const members = Array.from(
            new Map(eligibleMembers.map((member) => [member.user_id, member])).values(),
        )

        const storeGoal = Number(rules?.monthly_goal ?? 0)

        const customGoalMap = new Map<string, number>()
        if (customMetas) {
            for (const cm of customMetas) {
                const target = cm.target === null || cm.target === undefined ? NaN : Number(cm.target)
                if (Number.isFinite(target) && target >= 0) customGoalMap.set(cm.user_id, target)
            }
        }

        const officialGoalMap = new Map<string, number>()
        for (const row of officialRows) {
            const target = row.meta === null || row.meta === undefined ? NaN : Number(row.meta)
            if (Number.isFinite(target) && target >= 0) officialGoalMap.set(row.seller_user_id, target)
        }

        const routineBySeller = new Map<string, { completed: number; total: number }>()
        for (const action of routineRows) {
            const current = routineBySeller.get(action.seller_id) || { completed: 0, total: 0 }
            current.total += 1
            if (action.status === 'concluida' || action.status === 'justificada') current.completed += 1
            routineBySeller.set(action.seller_id, current)
        }
        
        const aggregated = new Map<string, { leads: number; agd: number; visitas: number; vnd: number; vnd_yesterday: number; name: string; avatarUrl: string | null; isVendaLoja: boolean }>()

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
                if (row.seller_name && current.name === 'Nome não informado') {
                    current.name = row.seller_name
                }
            }
        }

        const goalDivisor = members.filter((member) => !member.users?.is_venda_loja).length

        const entries: RankingEntry[] = Array.from(aggregated.entries())
            .map(([userId, data]) => {
                const savedGoal = customGoalMap.has(userId)
                    ? customGoalMap.get(userId)
                    : officialGoalMap.get(userId)
                const meta = resolveIndividualGoal({
                    storeMonthlyGoal: storeGoal,
                    activeSellersCount: goalDivisor,
                    customGoal: savedGoal,
                    isVendaLoja: data.isVendaLoja,
                }) ?? 0

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
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'metas', filter: `store_id=eq.${storeId}` },
                () => { void fetchRanking() }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'regras_metas_loja', filter: `store_id=eq.${storeId}` },
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
        // Rede inteira × mês: passa das 1000 linhas do PostgREST assim que a
        // adesão cresce, e o corte é silencioso — ranking com vendedor faltando.
        // Vale para o SELECT direto e para a RPC, que devolve SETOF.
        const directCheckinsQuery = fetchAllPaged<LancamentoRow>((from, to) => supabase.from('lancamentos_diarios')
            .select('seller_user_id, store_id, reference_date, leads_prev_day, agd_cart_today, agd_net_today, vnd_porta_prev_day, vnd_cart_prev_day, vnd_net_prev_day, visit_prev_day, submission_status')
            .eq('metric_scope', 'daily')
            .gte('reference_date', startOfMonth)
            .lte('reference_date', endOfRange)
            .order('reference_date', { ascending: true })
            .order('seller_user_id', { ascending: true })
            .range(from, to))

        const checkinsPromise = useRpc
            ? traced(async () => fetchAllPaged<LancamentoRow>((from, to) => supabase.rpc('get_lancamentos_rede_periodo', {
                p_start_date: startOfMonth,
                p_end_date: endOfRange,
                p_scope: 'daily',
            }).range(from, to))).then(({ result }) => result)
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

        // MX-RANK-UNIFY: busca eventos_comerciais como fonte canônica de vendas
        // (mesma lógica da RPC vendedor_performance_oficial — resolve discrepância ranking vs painel)
        const officialSalesPromise = supabase.rpc('get_vendas_oficiais_periodo', {
            p_start_date: startOfMonth,
            p_end_date: endOfRange,
            p_store_id: null,
            p_seller_id: null,
        })

        const goalMonth = Number(startOfMonth.slice(5, 7))
        const goalYear = Number(startOfMonth.slice(0, 4))

        const [checkinsRes, tenuresRes, membershipsRes, rulesRes, metasRes, todayCheckinsRes, officialSalesRes] = await Promise.all([
            checkinsPromise,
            supabase.from('vendedores_loja')
                .select('seller_user_id, store_id, users:usuarios(name, is_venda_loja, avatar_url, active), lojas:lojas(name)')
                .eq('is_active', true),
            supabase.from('vinculos_loja')
                .select('store_id, user_id, users:usuarios(active, role)')
                .eq('role', 'vendedor')
                .eq('is_active', true),
            supabase.from('regras_metas_loja')
                .select('store_id, monthly_goal, include_venda_loja_in_individual_goal'),
            supabase.from('metas')
                .select('store_id, user_id, target')
                .eq('month', goalMonth)
                .eq('year', goalYear),
            todayCheckinsPromise,
            officialSalesPromise,
        ])
        if (checkinsRes.error || tenuresRes.error || membershipsRes.error || rulesRes.error || todayCheckinsRes.error) {
            const message = checkinsRes.error?.message || tenuresRes.error?.message || membershipsRes.error?.message || rulesRes.error?.message || todayCheckinsRes.error?.message || 'Erro desconhecido'
            console.error('Audit Error [useGlobalRanking]: fetch fail ->', message)
            setError('Não foi possível carregar o ranking global.')
            setRanking([])
            setLoading(false)
            return
        }
        if (officialSalesRes.error) {
            console.error('Audit Error [useGlobalRanking]: official sales fetch fail ->', officialSalesRes.error.message)
        }
        const checkins = (checkinsRes.data as LancamentoRow[] | null)?.filter(isOfficialLancamento) ?? null
        const tenures = tenuresRes.data
        const memberships = membershipsRes.data
        const rules = rulesRes.data
        const metas = metasRes.data
        const todayCheckins = (todayCheckinsRes.data as LancamentoRow[] | null)?.filter(isOfficialLancamento) ?? null
        // Read model canônico: competência explícita do evento, da oportunidade
        // ou sale_date. Nunca usa created_at/data_evento como competência.
        const officialSales = (officialSalesRes.data || []) as OfficialSaleRow[]

        if (!checkins || !tenures) { setLoading(false); return }

        const storeGoals = new Map<string, { goal: number; includeVL: boolean }>()
        for (const r of rules || []) {
            storeGoals.set(r.store_id, { goal: Number(r.monthly_goal ?? 0), includeVL: r.include_venda_loja_in_individual_goal ?? false })
        }

        const activeMemberships = new Set(
            ((memberships || []) as unknown as Array<{ store_id: string; user_id: string; users?: { active?: boolean | null; role?: string | null } | null }>)
                .filter((membership) => membership.users?.active === true && membership.users?.role === 'vendedor')
                .map((membership) => `${membership.store_id}:${membership.user_id}`),
        )

        const eligibleTenures = (tenures || []).filter((tenure) => {
            const user = (tenure as unknown as { users?: { active?: boolean | null } | null }).users
            return user?.active === true && activeMemberships.has(`${tenure.store_id}:${tenure.seller_user_id}`)
        })

        const individualGoals = new Map<string, number>()
        for (const goal of metas || []) {
            const target = goal.target === null || goal.target === undefined ? NaN : Number(goal.target)
            if (Number.isFinite(target) && target >= 0) individualGoals.set(`${goal.store_id}:${goal.user_id}`, target)
        }

        const eligibleSellerIdsByStore = new Map<string, Set<string>>()
        for (const t of eligibleTenures) {
            const user = (t as unknown as { users?: { is_venda_loja?: boolean | null } | null }).users
            if (user?.is_venda_loja) continue
            const sellerIds = eligibleSellerIdsByStore.get(t.store_id) || new Set<string>()
            sellerIds.add(t.seller_user_id)
            eligibleSellerIdsByStore.set(t.store_id, sellerIds)
        }

        const checkedInToday = new Set<string>()
        const salesTodayMap = new Map<string, number>()
        for (const c of todayCheckins || []) {
            checkedInToday.add(c.seller_user_id)
        }
        for (const sale of officialSales) {
            if (sale.competencia !== dias.referencia) continue
            salesTodayMap.set(sale.seller_user_id, (salesTodayMap.get(sale.seller_user_id) || 0) + Number(sale.vendas || 0))
        }

        // Mapa seller → store_id para validar loja dos eventos
        const sellerStoreMap = new Map<string, string>()
        for (const t of eligibleTenures) {
            sellerStoreMap.set(t.seller_user_id, t.store_id)
        }

        // Contar vendas por vendedor a partir do read model oficial.
        //
        // A venda conta para quem a fez, mesmo que a loja do evento não seja a
        // do vínculo atual: descartar por loja divergente sumia com a venda de
        // todo ranking quando o vendedor era transferido — sem nenhum aviso. A
        // RPC já restringe o escopo ao que o usuário pode ver.
        const salesBySellerFromEvents = new Map<string, number>()
        for (const sale of officialSales) {
            if (!sellerStoreMap.has(sale.seller_user_id)) continue
            salesBySellerFromEvents.set(sale.seller_user_id, (salesBySellerFromEvents.get(sale.seller_user_id) || 0) + Number(sale.vendas || 0))
        }

        const agg = new Map<string, { vnd: number; vnd_yesterday: number; leads: number; agd: number; vis: number; name: string; avatarUrl: string | null; store: string; storeId: string; isVendaLoja: boolean; checkedIn: boolean }>()
        for (const m of eligibleTenures) {
            const mu = m as unknown as { users?: User; lojas?: { name: string } }
            agg.set(m.seller_user_id, {
                // MX-RANK-UNIFY: usa eventos_comerciais como fonte canônica de vendas
                vnd: salesBySellerFromEvents.get(m.seller_user_id) || 0,
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
                // Leads, agendamentos e visitas continuam vindos de lancamentos_diarios
                cur.leads += c.leads_prev_day || 0
                cur.agd += (c.agd_cart_today || 0) + (c.agd_net_today || 0)
                cur.vis += c.visit_prev_day || 0
            }
        }

        const entries: RankingEntry[] = Array.from(agg.entries())
            .map(([uid, d]) => {
                const sg = storeGoals.get(d.storeId)
                const storeGoal = sg?.goal ?? 0
                const sellerCount = eligibleSellerIdsByStore.get(d.storeId)?.size ?? 0
                const meta = resolveIndividualGoal({
                    storeMonthlyGoal: storeGoal,
                    activeSellersCount: sellerCount,
                    customGoal: individualGoals.get(`${d.storeId}:${uid}`),
                    isVendaLoja: d.isVendaLoja,
                }) ?? 0

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
                    status: { label: d.checkedIn ? 'Presente' : 'Ausente', color: d.checkedIn ? 'bg-status-success-surface text-status-success-text' : 'bg-status-error-surface text-status-error-text' },
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

        const officialSalesPromise = supabase.rpc('get_vendas_oficiais_periodo', {
            p_start_date: startOfMonth,
            p_end_date: dias.referencia,
            p_store_id: null,
            p_seller_id: null,
        })

        const [lojasRes, rulesRes, checkinsRes, sellersRes, yesterdayCheckinsRes, officialSalesRes] = await Promise.all([
            supabase.from('lojas').select('id, name').eq('active', true),
            supabase.from('regras_metas_loja').select('store_id, monthly_goal'),
            perfCheckinsPromise,
            supabase.from('vendedores_loja').select('store_id, is_active').eq('is_active', true),
            perfTodayPromise,
            officialSalesPromise,
        ])
        if (lojasRes.error || rulesRes.error || checkinsRes.error || sellersRes.error || yesterdayCheckinsRes.error || officialSalesRes.error) {
            const message = lojasRes.error?.message || rulesRes.error?.message || checkinsRes.error?.message || sellersRes.error?.message || yesterdayCheckinsRes.error?.message || officialSalesRes.error?.message || 'Erro desconhecido'
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
        const officialSales = (officialSalesRes.data || []) as OfficialSaleRow[]

        if (!lojas) { setLoading(false); return }

        const rulesMap = new Map(rules?.map(r => [r.store_id, r.monthly_goal]) || [])
        const salesMap = new Map<string, number>()
        officialSales.forEach((sale) => {
            const sid = sale.store_id
            salesMap.set(sid, (salesMap.get(sid) || 0) + Number(sale.vendas || 0))
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

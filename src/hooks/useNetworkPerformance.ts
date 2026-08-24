import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { getDiasInfo, calcularProjecao, calcularAtingimento } from '@/lib/calculations'

type RoleBreakdown = {
  role: string
  total: number
  active: number
}

type StatusBreakdown = {
  status: string
  total: number
}

export interface NetworkMetric {
  totalSales: number
  totalLeads: number
  totalAgd: number
  totalVis: number
  networkGoal: number
  projection: number
  reaching: number
  storeCount: number
  activeStoreCount: number
  configuredGoalStores: number
  currentMonthSales: number
  historicalSales: number
  currentMonthCheckins: number
  historicalCheckins: number
  storesWithSales: number
  averageSalesPerStore: number
  disciplineRate: number
  convLeadAgd: number
  convAgdVis: number
  convVisVnd: number
  totalUsers: number
  activeUsers: number
  owners: number
  managers: number
  sellers: number
  activeSellers: number
  internalUsers: number
  consultingClients: number
  activeConsultingClients: number
  consultingVisits: number
  completedConsultingVisits: number
  plannedConsultingVisits: number
  period: {
    currentStart: string
    today: string
    historyStart: string
    historyDays: number
  }
  byMonth: { month: string; sales: number }[]
  byDay: { date: string; sales: number; leads: number; agd: number; vis: number }[]
  roleBreakdown: RoleBreakdown[]
  consultingStatus: StatusBreakdown[]
  byStore: {
    storeId: string
    storeName: string
    active: boolean
    sales: number
    currentMonthSales: number
    goal: number
    reaching: number
    leads: number
    agd: number
    vis: number
    convLeadVnd: number
    convAgdVnd: number
    convVisVnd: number
    ticket: number
    checkinDays: number
    checkins: number
    sellers: number
    managers: number
    owners: number
    lastActivity: string | null
    status: 'excellent' | 'on-track' | 'attention' | 'no-data'
    projection: number
  }[]
}

const EMPTY_METRIC: NetworkMetric = {
  totalSales: 0, totalLeads: 0, totalAgd: 0, totalVis: 0,
  networkGoal: 0, projection: 0, reaching: 0, storeCount: 0,
  activeStoreCount: 0, configuredGoalStores: 0,
  currentMonthSales: 0, historicalSales: 0,
  currentMonthCheckins: 0, historicalCheckins: 0,
  storesWithSales: 0, averageSalesPerStore: 0, disciplineRate: 0,
  convLeadAgd: 0, convAgdVis: 0, convVisVnd: 0,
  totalUsers: 0, activeUsers: 0, owners: 0, managers: 0, sellers: 0, activeSellers: 0, internalUsers: 0,
  consultingClients: 0, activeConsultingClients: 0, consultingVisits: 0, completedConsultingVisits: 0, plannedConsultingVisits: 0,
  period: { currentStart: '', today: '', historyStart: '', historyDays: 180 },
  byMonth: [], byDay: [], roleBreakdown: [], consultingStatus: [], byStore: [],
}

const HISTORY_DAYS = 180

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function round1(value: number) {
  return Math.round(value * 10) / 10
}

function percent(part: number, total: number) {
  if (total <= 0) return 0
  return round1((part / total) * 100)
}

type SupabaseRowsQuery = {
  eq(column: string, value: unknown): SupabaseRowsQuery
  gte(column: string, value: unknown): SupabaseRowsQuery
  lte(column: string, value: unknown): SupabaseRowsQuery
  range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: unknown }>
}

type OfficialSaleRow = {
  seller_user_id: string
  store_id: string
  competencia: string
  vendas: number | string
}

async function fetchAllRows<T extends Record<string, unknown>>(table: string, select: string, configure?: (query: SupabaseRowsQuery) => SupabaseRowsQuery): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  while (true) {
    let query = supabase.from(table).select(select) as unknown as SupabaseRowsQuery
    if (configure) query = configure(query)

    const { data, error } = await query.range(from, from + 999)
    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...(data as unknown as T[]))
    if (data.length < 1000) break
    from += 1000
  }

  return rows
}

export function useNetworkPerformance() {
  const { role } = useAuth()
  const [metrics, setMetrics] = useState<NetworkMetric>(EMPTY_METRIC)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    if (!isPerfilInternoMx(role)) {
      setMetrics(EMPTY_METRIC)
      setLoading(false)
      return
    }
    setLoading(true)

    try {
      const dias = getDiasInfo()
      const today = toDateKey(new Date())
      const monthStart = new Date(dias.referencia).toISOString().slice(0, 8) + '01'
      const historyStart = toDateKey(addDays(new Date(`${today}T12:00:00`), -HISTORY_DAYS))

      const [
        allCheckins,
        officialSales,
        lojas,
        metas,
        users,
        memberships,
        tenures,
        consultingClients,
        consultingVisits,
      ] = await Promise.all([
        fetchAllRows('lancamentos_diarios', 'store_id, seller_user_id, reference_date, metric_scope, leads_prev_day, agd_cart_today, agd_net_today, visit_prev_day, submission_status', q =>
          q.eq('metric_scope', 'daily').gte('reference_date', historyStart).lte('reference_date', today)
        ),
        supabase.rpc('get_vendas_oficiais_periodo', {
          p_start_date: historyStart,
          p_end_date: today,
          p_store_id: null,
          p_seller_id: null,
        }).then(({ data, error }) => {
          if (error) throw error
          return (data || []) as OfficialSaleRow[]
        }),
        fetchAllRows('lojas', 'id, name, active'),
        fetchAllRows('regras_metas_loja', 'store_id, monthly_goal'),
        fetchAllRows('usuarios', 'id, role, active, is_venda_loja'),
        fetchAllRows('vinculos_loja', 'user_id, store_id, role'),
        fetchAllRows('vendedores_loja', 'seller_user_id, store_id, is_active'),
        fetchAllRows('clientes_consultoria', 'id, name, status'),
        fetchAllRows('visitas_consultoria', 'id, client_id, status, visit_number, scheduled_at, effective_visit_date, created_at'),
      ])

      const goalMap = new Map<string, number>()
      for (const g of metas) goalMap.set(String(g.store_id), Number(g.monthly_goal || 0))

      const byMonth: Record<string, number> = {}
      const byDay: Record<string, { sales: number; leads: number; agd: number; vis: number }> = {}
      const byStoreMap: Record<string, {
        sales: number
        currentMonthSales: number
        leads: number
        agd: number
        vis: number
        days: Set<string>
        checkins: number
        lastActivity: string | null
      }> = {}

      let totalSales = 0, totalLeads = 0, totalAgd = 0, totalVis = 0
      let currentMonthSales = 0, currentMonthCheckins = 0

      for (const c of allCheckins) {
        if (c.submission_status === 'draft') continue
        const leads = Number(c.leads_prev_day || 0)
        const agd = Number(c.agd_cart_today || 0) + Number(c.agd_net_today || 0)
        const vis = Number(c.visit_prev_day || 0)
        const sid = c.store_id as string
        const referenceDate = c.reference_date as string
        const month = referenceDate?.slice(0, 7)

        totalLeads += leads
        totalAgd += agd
        totalVis += vis

        if (referenceDate >= monthStart) {
          currentMonthCheckins += 1
        }

        if (referenceDate) {
          if (!byDay[referenceDate]) byDay[referenceDate] = { sales: 0, leads: 0, agd: 0, vis: 0 }
          byDay[referenceDate].leads += leads
          byDay[referenceDate].agd += agd
          byDay[referenceDate].vis += vis
        }

        if (!byStoreMap[sid]) byStoreMap[sid] = { sales: 0, currentMonthSales: 0, leads: 0, agd: 0, vis: 0, days: new Set(), checkins: 0, lastActivity: null }
        byStoreMap[sid].leads += leads
        byStoreMap[sid].agd += agd
        byStoreMap[sid].vis += vis
        byStoreMap[sid].checkins += 1
        if (referenceDate) {
          byStoreMap[sid].days.add(referenceDate)
          if (!byStoreMap[sid].lastActivity || referenceDate > byStoreMap[sid].lastActivity) {
            byStoreMap[sid].lastActivity = referenceDate
          }
        }
      }

      // Vendas oficiais têm uma competência própria. Não derivar de created_at,
      // closed_at, updated_at ou data_evento evita que vendas importadas para a
      // carteira reapareçam no mês em que foram cadastradas.
      for (const row of officialSales) {
        const sale = Number(row.vendas || 0)
        const referenceDate = row.competencia
        const month = referenceDate?.slice(0, 7)
        const sid = String(row.store_id)

        totalSales += sale
        if (referenceDate >= monthStart) currentMonthSales += sale
        if (month) byMonth[month] = (byMonth[month] || 0) + sale
        if (referenceDate) {
          if (!byDay[referenceDate]) byDay[referenceDate] = { sales: 0, leads: 0, agd: 0, vis: 0 }
          byDay[referenceDate].sales += sale
        }
        if (!byStoreMap[sid]) byStoreMap[sid] = { sales: 0, currentMonthSales: 0, leads: 0, agd: 0, vis: 0, days: new Set(), checkins: 0, lastActivity: null }
        byStoreMap[sid].sales += sale
        if (referenceDate >= monthStart) byStoreMap[sid].currentMonthSales += sale
      }

      const sellerCountByStore = new Map<string, number>()
      for (const tenure of tenures) {
        if (!tenure.is_active) continue
        const storeId = String(tenure.store_id)
        sellerCountByStore.set(storeId, (sellerCountByStore.get(storeId) || 0) + 1)
      }

      const roleByStore = new Map<string, { owners: number; managers: number; sellers: number }>()
      const uniqueMembershipUsers = new Set<string>()
      for (const membership of memberships) {
        const storeId = String(membership.store_id)
        const current = roleByStore.get(storeId) || { owners: 0, managers: 0, sellers: 0 }
        if (membership.role === 'dono') current.owners += 1
        if (membership.role === 'gerente') current.managers += 1
        if (membership.role === 'vendedor') current.sellers += 1
        roleByStore.set(storeId, current)
        uniqueMembershipUsers.add(String(membership.user_id))
      }

      const activeStoreCount = lojas.filter(s => s.active !== false).length
      const configuredGoalStores = metas.filter(g => Number(g.monthly_goal || 0) > 0).length
      const networkGoal = metas.reduce((sum, g) => sum + Number(g.monthly_goal || 0), 0)
      const activeUsers = users.filter(u => u.active !== false).length
      const roleStats = new Map<string, RoleBreakdown>()
      for (const user of users) {
        const userRole = String(user.role || 'sem_papel')
        const current = roleStats.get(userRole) || { role: userRole, total: 0, active: 0 }
        current.total += 1
        if (user.active !== false) current.active += 1
        roleStats.set(userRole, current)
      }

      const consultingStatusMap = new Map<string, number>()
      for (const client of consultingClients) {
        const status = String(client.status || 'sem_status')
        consultingStatusMap.set(status, (consultingStatusMap.get(status) || 0) + 1)
      }

      const byStore: NetworkMetric['byStore'] = []
      for (const store of lojas || []) {
        const storeId = String(store.id)
        const goal = goalMap.get(storeId) || 0
        const s = byStoreMap[storeId] || { sales: 0, currentMonthSales: 0, leads: 0, agd: 0, vis: 0, days: new Set<string>(), checkins: 0, lastActivity: null }
        const people = roleByStore.get(storeId) || { owners: 0, managers: 0, sellers: 0 }
        const convLeadVnd = s.leads > 0 ? Math.round((s.sales / s.leads) * 1000) / 10 : 0
        const convAgdVnd = s.agd > 0 ? Math.round((s.sales / s.agd) * 1000) / 10 : 0
        const convVisVnd = s.vis > 0 ? Math.round((s.sales / s.vis) * 1000) / 10 : 0
        const ticket = s.sales > 0 ? Math.round((goal / Math.max(s.sales, 1)) * 100) / 100 : 0
        const reaching = calcularAtingimento(Math.max(s.currentMonthSales, s.sales), goal)
        const status: NetworkMetric['byStore'][number]['status'] = s.sales === 0
          ? 'no-data'
          : reaching >= 100
            ? 'excellent'
            : reaching >= 80
              ? 'on-track'
              : 'attention'

        byStore.push({
          storeId,
          storeName: String(store.name),
          active: store.active !== false,
          sales: s.sales,
          currentMonthSales: s.currentMonthSales,
          goal,
          reaching,
          leads: s.leads,
          agd: s.agd,
          vis: s.vis,
          convLeadVnd,
          convAgdVnd,
          convVisVnd,
          ticket,
          checkinDays: s.days.size,
          checkins: s.checkins,
          sellers: sellerCountByStore.get(storeId) || people.sellers,
          managers: people.managers,
          owners: people.owners,
          lastActivity: s.lastActivity,
          status,
          projection: calcularProjecao(s.sales, dias.decorridos, dias.total),
        })
      }

      byStore.sort((a, b) => b.sales - a.sales)

      const projection = calcularProjecao(currentMonthSales, dias.decorridos, dias.total)
      const reaching = calcularAtingimento(currentMonthSales, networkGoal)
      const storesWithSales = byStore.filter(s => s.sales > 0).length
      const expectedCheckins = Math.max(activeStoreCount, 1) * Math.max(HISTORY_DAYS, 1)
      const activeSellers = tenures.filter(t => t.is_active).length
      const completedConsultingVisits = consultingVisits.filter(v => String(v.status || '').toLowerCase() === 'concluida').length
      const plannedConsultingVisits = consultingVisits.filter(v => String(v.status || '').toLowerCase() !== 'concluida').length

      setMetrics({
        totalSales, totalLeads, totalAgd, totalVis,
        networkGoal, projection, reaching, currentMonthSales,
        historicalSales: totalSales,
        currentMonthCheckins,
        historicalCheckins: allCheckins.length,
        storeCount: lojas?.length || 0,
        activeStoreCount,
        configuredGoalStores,
        storesWithSales,
        averageSalesPerStore: storesWithSales > 0 ? Math.round(totalSales / storesWithSales) : 0,
        disciplineRate: percent(allCheckins.length, expectedCheckins),
        convLeadAgd: percent(totalAgd, totalLeads),
        convAgdVis: percent(totalVis, totalAgd),
        convVisVnd: percent(totalSales, totalVis),
        totalUsers: users.length,
        activeUsers,
        owners: users.filter(u => u.role === 'dono').length,
        managers: users.filter(u => u.role === 'gerente').length,
        sellers: users.filter(u => u.role === 'vendedor').length,
        activeSellers,
        internalUsers: users.filter(u => isPerfilInternoMx(String(u.role))).length,
        consultingClients: consultingClients.length,
        activeConsultingClients: consultingClients.filter(c => String(c.status || '').toLowerCase() !== 'inactive').length,
        consultingVisits: consultingVisits.length,
        completedConsultingVisits,
        plannedConsultingVisits,
        period: { currentStart: monthStart, today, historyStart, historyDays: HISTORY_DAYS },
        byMonth: Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, sales]) => ({ month, sales })),
        byDay: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({ date, ...data })),
        roleBreakdown: Array.from(roleStats.values()).sort((a, b) => b.total - a.total),
        consultingStatus: Array.from(consultingStatusMap.entries()).map(([status, total]) => ({ status, total })).sort((a, b) => b.total - a.total),
        byStore,
      })
    } catch (err) {
      setMetrics(EMPTY_METRIC)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados da rede')
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  return { metrics, loading, error, refetch: fetchMetrics }
}

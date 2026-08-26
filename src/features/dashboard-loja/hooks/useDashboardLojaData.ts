import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO, startOfMonth } from 'date-fns'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { useSellersByStore } from '@/hooks/useStores'
import { isOfficialLancamento } from '@/hooks/useRanking'
import { calculateReferenceDate, useCheckinsByDateRange } from '@/hooks/useCheckins'
import { useStoreGoal } from '@/hooks/useGoals'
import { useOperationalSettings } from '@/hooks/useOperationalSettings'
import { useStoreSales } from '@/hooks/useStoreSales'
import { useDRE } from '@/hooks/useDRE'
import { useOfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import { calcularFunil, gerarDiagnosticoMX } from '@/lib/calculations'
import { buildStoreSalesRules, resolveCanonicalIndividualGoal } from '@/lib/storeSalesRules'
import { getManagerCalendarDate, getManagerMonthRange } from '@/features/manager/home/manager-home-parity'
import { refreshManagerHomeData } from '@/features/manager/home/manager-home-refresh'
import { useOwnerInventoryMetrics } from './useOwnerInventoryMetrics'
import { useOwnerConsultingProgram } from './useOwnerConsultingProgram'
import { ownerClosedMonthLabel } from '@/lib/owner-period'
import type { RankingEntry } from '@/types/database'
import type { Database } from '@/types/database.generated'

export type StoreRankingEntry = RankingEntry & { id: string }
export type ViewMode = 'day' | 'month'

type UseDashboardLojaDataInput = {
  selectedStoreId: string | null
  selectedStoreName: string
  managerCalendarMode?: boolean
  loadOwnerConsultingProgram?: boolean
  period?: 'month' | 'quarter' | 'year' | 'custom'
  periodRange?: { start: string; end: string }
}

type ExecutionActionRow = Pick<Database['public']['Tables']['execution_actions']['Row'], 'seller_id' | 'status'>

const EXECUTION_ACTION_PAGE_SIZE = 1000

async function fetchExecutionActionRows(storeId: string, rangeStart: string, rangeEnd: string): Promise<ExecutionActionRow[]> {
  const rows: ExecutionActionRow[] = []

  for (let from = 0; ; from += EXECUTION_ACTION_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('execution_actions')
      .select('seller_id,status')
      .eq('store_id', storeId)
      .gte('due_at', `${rangeStart}T00:00:00-03:00`)
      .lte('due_at', `${rangeEnd}T23:59:59-03:00`)
      .order('id', { ascending: true })
      .range(from, from + EXECUTION_ACTION_PAGE_SIZE - 1)

    if (error) throw error

    const page = (data || []) as ExecutionActionRow[]
    rows.push(...page)
    if (page.length < EXECUTION_ACTION_PAGE_SIZE) return rows
  }
}

/**
 * Hook agregador para o DashboardLoja — concentra fetch de checkins, sales, DRE,
 * settings operacionais e o canal Supabase Realtime que dispara refetch.
 * Extraído de DashboardLoja.tsx (Story 2.5, ADR-0050).
 */
export function useDashboardLojaData({
  selectedStoreId,
  selectedStoreName,
  managerCalendarMode = false,
  loadOwnerConsultingProgram = false,
  period,
  periodRange,
}: UseDashboardLojaDataInput) {
  const { sellers, loading: sellersLoading, error: sellersError, refetch: refetchSellers } = useSellersByStore(selectedStoreId)
  const { goal: storeGoal, refetch: refetchStoreGoal } = useStoreGoal(selectedStoreId)
  const operationalSettings = useOperationalSettings(selectedStoreId)
  const inventory = useOwnerInventoryMetrics(selectedStoreId)
  const consulting = useOwnerConsultingProgram(selectedStoreId, loadOwnerConsultingProgram)
  const {
    store: operationalStore,
    deliveryRules,
    benchmark,
    metaRules: operationalMetaRules,
    loading: operationalLoading,
    fetchSettings,
    saveSettings,
  } = operationalSettings

  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [operationalReferenceDate, setReferenceDate] = useState(() => calculateReferenceDate())
  const managerReferenceDate = getManagerCalendarDate()
  const referenceDate = periodRange?.end || (managerCalendarMode ? managerReferenceDate : operationalReferenceDate)
  const [startDate, setStartDate] = useState(() => format(startOfMonth(parseISO(referenceDate)), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => referenceDate)
  const [isRefetching, setIsRefetching] = useState(false)
  const [syncWarning, setSyncWarning] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [routineExecutionBySeller, setRoutineExecutionBySeller] = useState<Record<string, number | null>>({})
  const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const managerMonthRange = useMemo(() => getManagerMonthRange(managerReferenceDate), [managerReferenceDate])
  const queryStartDate = periodRange?.start || (managerCalendarMode ? managerReferenceDate : viewMode === 'day' ? referenceDate : startDate)
  const queryEndDate = periodRange?.end || (managerCalendarMode ? managerReferenceDate : viewMode === 'day' ? referenceDate : endDate)
  const {
    checkins,
    loading: checkinsLoading,
    error,
    refetch: refetchCheckins,
  } = useCheckinsByDateRange(
    selectedStoreId,
    queryStartDate,
    queryEndDate,
  )
  const {
    checkins: managerMonthlyCheckins,
    loading: managerMonthlyLoading,
    error: managerMonthlyError,
    refetch: refetchManagerMonthlyCheckins,
  } = useCheckinsByDateRange(
    managerCalendarMode ? selectedStoreId : null,
    managerMonthRange.start,
    managerMonthRange.end,
  )
  const officialPerformance = useOfficialSellerPerformance(
    queryStartDate,
    queryEndDate,
    null,
    selectedStoreId,
  )
  const officialMonthlyPerformance = useOfficialSellerPerformance(
    managerMonthRange.start,
    managerMonthRange.end,
    null,
    selectedStoreId,
  )
  const officialCheckins = useMemo(
    () => (checkins || []).filter(isOfficialLancamento),
    [checkins],
  )

  const refreshDashboardData = useCallback(async () => {
    if (managerCalendarMode) {
      await refreshManagerHomeData({
        refetchDailyCheckins: refetchCheckins,
        refetchMonthlyCheckins: refetchManagerMonthlyCheckins,
        refetchSellers,
        refetchStoreGoal,
        refetchOperationalSettings: fetchSettings,
      })
      await Promise.all([
        officialPerformance.refetch(),
        officialMonthlyPerformance.refetch(),
      ])
      return
    }

      await Promise.all([
        refetchCheckins(),
        refetchSellers(),
        refetchStoreGoal(),
        fetchSettings(),
        officialPerformance.refetch(),
        officialMonthlyPerformance.refetch(),
    ])
  }, [
    fetchSettings,
    managerCalendarMode,
    officialMonthlyPerformance.refetch,
    officialPerformance.refetch,
    refetchCheckins,
    refetchManagerMonthlyCheckins,
    refetchSellers,
    refetchStoreGoal,
  ])

  // Realtime Sync: fechamentos e fatos oficiais de venda alimentam a mesma tela.
  useEffect(() => {
    if (!selectedStoreId) return

    const channel = supabase
      .channel(`dashboard-sync-${selectedStoreId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lancamentos_diarios',
          filter: `store_id=eq.${selectedStoreId}`,
        },
        () => {
          if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
          refetchTimerRef.current = setTimeout(() => {
            void refreshDashboardData()
              .then(() => {
                setSyncWarning(null)
                setLastSyncAt(new Date())
              })
              .catch(() => setSyncWarning('Falha ao sincronizar automaticamente. Use Atualizar.'))
          }, 500)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'eventos_comerciais',
          filter: `loja_id=eq.${selectedStoreId}`,
        },
        () => {
          if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
          refetchTimerRef.current = setTimeout(() => {
            void refreshDashboardData()
              .then(() => {
                setSyncWarning(null)
                setLastSyncAt(new Date())
              })
              .catch(() => setSyncWarning('Falha ao sincronizar automaticamente. Use Atualizar.'))
          }, 500)
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metas',
          filter: `store_id=eq.${selectedStoreId}`,
        },
        () => {
          if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
          refetchTimerRef.current = setTimeout(() => {
            void refreshDashboardData()
              .then(() => {
                setSyncWarning(null)
                setLastSyncAt(new Date())
              })
              .catch(() => setSyncWarning('Falha ao sincronizar automaticamente. Use Atualizar.'))
          }, 500)
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'regras_metas_loja',
          filter: `store_id=eq.${selectedStoreId}`,
        },
        () => {
          if (refetchTimerRef.current) clearTimeout(refetchTimerRef.current)
          refetchTimerRef.current = setTimeout(() => {
            void refreshDashboardData()
              .then(() => {
                setSyncWarning(null)
                setLastSyncAt(new Date())
              })
              .catch(() => setSyncWarning('Falha ao sincronizar automaticamente. Use Atualizar.'))
          }, 500)
        },
      )
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setSyncWarning('Realtime indisponível. Use Atualizar para confirmar os dados.')
          toast.error('Realtime do dashboard indisponível. Use atualizar para sincronizar.')
        }
      })

    return () => {
      if (refetchTimerRef.current) {
        clearTimeout(refetchTimerRef.current)
        refetchTimerRef.current = null
      }
      supabase.removeChannel(channel)
    }
  }, [refreshDashboardData, selectedStoreId])

  const handleRefresh = useCallback(async () => {
    setIsRefetching(true)
    try {
      await refreshDashboardData()
      setSyncWarning(null)
      setLastSyncAt(new Date())
      toast.success('Performance sincronizada!')
    } catch {
      setSyncWarning('Falha na atualização manual. Tente novamente antes de tomar decisão operacional.')
      toast.error('Não foi possível atualizar a performance.')
    } finally {
      setIsRefetching(false)
    }
  }, [refreshDashboardData])

  useEffect(() => {
    const onOwnerReload = () => { void handleRefresh() }
    window.addEventListener('owner:reload', onOwnerReload)
    return () => window.removeEventListener('owner:reload', onOwnerReload)
  }, [handleRefresh])

  useEffect(() => {
    if (!selectedStoreId) {
      setRoutineExecutionBySeller({})
      return
    }

    const rangeStart = periodRange?.start || (viewMode === 'day' ? referenceDate : startDate)
    const rangeEnd = periodRange?.end || (viewMode === 'day' ? referenceDate : endDate)
    let active = true

    void fetchExecutionActionRows(selectedStoreId, rangeStart, rangeEnd)
      .then(actionRows => {
        if (!active) return
        const totals = new Map<string, { completed: number; total: number }>()
        for (const action of actionRows) {
          const current = totals.get(action.seller_id) || { completed: 0, total: 0 }
          current.total += 1
          if (action.status === 'concluida' || action.status === 'justificada') current.completed += 1
          totals.set(action.seller_id, current)
        }
        setRoutineExecutionBySeller(Object.fromEntries(
          Array.from(totals.entries()).map(([sellerId, total]) => [sellerId, total.total > 0 ? Math.round((total.completed / total.total) * 100) : null]),
        ))
      })
      .catch(error => {
        if (!active) return
        console.error('Audit Error [useDashboardLojaData]: routine actions fail ->', error)
        setRoutineExecutionBySeller({})
      })

    return () => { active = false }
  }, [endDate, periodRange, referenceDate, selectedStoreId, startDate, viewMode])

  const effectiveMonthlyGoal = operationalMetaRules?.monthly_goal ?? storeGoal?.target ?? 0
  const activeIndividualSellerCount = useMemo(
    () => (sellers || []).filter(seller => seller.active !== false && !seller.is_venda_loja).length,
    [sellers],
  )

  const funnelBenchmarks = useMemo(
    () => ({
      leadAgd: benchmark?.lead_to_agend ?? operationalMetaRules?.bench_lead_agd ?? 0,
      agdVisita: benchmark?.agend_to_visit ?? operationalMetaRules?.bench_agd_visita ?? 0,
      visitaVnd: benchmark?.visit_to_sale ?? operationalMetaRules?.bench_visita_vnd ?? 0,
    }),
    [benchmark, operationalMetaRules]
  )

  const storeSalesParams = useMemo(() => {
    const checkinsBySeller = officialCheckins.reduce((acc, c) => {
      if (!acc[c.seller_user_id]) acc[c.seller_user_id] = []
      acc[c.seller_user_id].push(c)
      return acc
    }, {} as Record<string, typeof officialCheckins>)

    return {
      checkins: officialCheckins,
      ranking: (sellers || []).map(s => {
        const sellerCheckins = checkinsBySeller[s.id] || []
        const officialRow = officialPerformance.rows.find(row => row.seller_user_id === s.id)
        const disciplineValues = sellerCheckins
          .map(checkin => checkin.pontuacao_disciplina_final)
          .filter((value): value is number => typeof value === 'number')
        return {
          id: s.id,
          user_id: s.id,
          user_name: s.name,
          avatar_url: s.avatar_url,
          is_venda_loja: s.is_venda_loja || false,
          // vendedor_performance_oficial is the single source for the
          // dashboard's period totals. The old fallback reintroduced draft
          // closings and legacy self-reported sales into the same cards.
          vnd_total: officialRow?.vendas_realizadas ?? 0,
          leads: officialRow?.leads ?? 0,
          agd_total: officialRow?.agendamentos ?? 0,
          visitas: officialRow?.atendimentos ?? 0,
          meta: resolveCanonicalIndividualGoal({
            officialGoal: officialRow?.meta,
            storeMonthlyGoal: effectiveMonthlyGoal,
            activeSellersCount: activeIndividualSellerCount,
            isVendaLoja: s.is_venda_loja,
          }),
          atingimento: 0,
          projecao: 0,
          ritmo: 0,
          efficiency: 0,
          status: { label: '', color: '' },
          gap: 0,
          position: 0,
          checked_in: s.checkin_today,
          routine_execution: routineExecutionBySeller[s.id] ?? null,
          discipline_score: disciplineValues.length > 0
            ? Math.round(disciplineValues.reduce((sum, value) => sum + value, 0) / disciplineValues.length)
            : null,
        }
      }),
      rules: buildStoreSalesRules({
        storeId: selectedStoreId,
        monthlyGoal: effectiveMonthlyGoal,
        metaRules: operationalMetaRules,
      }),
    }
  }, [
    effectiveMonthlyGoal,
    activeIndividualSellerCount,
    officialCheckins,
    officialMonthlyPerformance.rows,
    officialPerformance.rows,
    operationalMetaRules,
    routineExecutionBySeller,
    selectedStoreId,
    sellers,
  ])

  const storeSales = useStoreSales(storeSalesParams)
  const { financials, computeDRE: computeDREFn } = useDRE(undefined, selectedStoreId || undefined)

  const latestDRE = useMemo(() => {
    if (!financials || financials.length === 0) return null
    const inRange = financials.filter((financial) => financial.reference_date >= queryStartDate && financial.reference_date <= queryEndDate)
    return inRange.length > 0 ? computeDREFn(inRange[0]) : null
  }, [financials, computeDREFn, queryEndDate, queryStartDate])

  const metrics = useMemo(() => {
    const checkedInCount = periodRange
      ? new Set(officialCheckins.map(checkin => checkin.seller_user_id)).size
      : (sellers || []).filter(s => s.checkin_today).length
    return {
      totalSales: storeSales.storeTotalVendas,
      totalLeads: storeSales.storeTotalLeads,
      totalAgd: storeSales.storeTotalAgd,
      totalVis: storeSales.storeTotalVis,
      attainment: storeSales.storeAttainment,
      goalValue: effectiveMonthlyGoal || storeSales.storeGoal,
      checkedInCount,
      ranking: storeSales.processedRanking,
      storeName: selectedStoreName || 'Unidade MX',
    }
  }, [officialCheckins, periodRange, storeSales, sellers, selectedStoreName, effectiveMonthlyGoal])

  const officialSalesTotal = useMemo(
    () => officialPerformance.rows.reduce((total, row) => total + row.vendas_realizadas, 0),
    [officialPerformance.rows],
  )
  const funilData = useMemo(
    () => calcularFunil(officialCheckins, officialSalesTotal),
    [officialCheckins, officialSalesTotal],
  )
  const diagnostics = useMemo(() => gerarDiagnosticoMX(funilData), [funilData])

  const pendingDisciplineSellers = useMemo(
    () => (sellers || []).filter(seller => !seller.checkin_today),
    [sellers]
  )

  const lastSyncLabel = useMemo(() => {
    if (!lastSyncAt) return 'Ainda não atualizado nesta sessão'
    return `Atualizado às ${lastSyncAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  }, [lastSyncAt])

  const periodLabel = useMemo(() => {
    if (period === 'custom') {
      return `${queryStartDate.split('-').reverse().join('/')} — ${queryEndDate.split('-').reverse().join('/')}`
    }
    if (period === 'month') return ownerClosedMonthLabel()
    const labels = { quarter: 'Trimestre atual', year: 'Ano atual' } as const
    return labels[period as 'quarter' | 'year'] || `${queryStartDate.split('-').reverse().join('/')} — ${queryEndDate.split('-').reverse().join('/')}`
  }, [period, queryEndDate, queryStartDate])

  return {
    // dados brutos
    selectedStoreId,
    sellers,
    sellersLoading,
    checkins,
    managerMonthlyCheckins,
    loading: checkinsLoading || sellersLoading || officialPerformance.loading || officialMonthlyPerformance.loading || operationalLoading || (managerCalendarMode && managerMonthlyLoading),
    error: error || sellersError || officialPerformance.error || officialMonthlyPerformance.error || managerMonthlyError || operationalSettings.error || inventory.error,
    managerMonthlyError,
    officialPerformance: officialPerformance.rows,
    officialMonthlyPerformance: officialMonthlyPerformance.rows,
    // settings operacionais
    storeGoal,
    refetchStoreGoal,
    operationalStore,
    deliveryRules,
    benchmark,
    operationalMetaRules,
    operationalLoading,
    inventory: inventory.metrics,
    inventoryLoading: inventory.loading,
    refetchInventory: inventory.refetch,
    consultingProgram: consulting.program,
    consultingLoading: consulting.loading,
    consultingError: consulting.error,
    refetchConsulting: consulting.refresh,
    fetchSettings,
    saveSettings,
    // período
    viewMode,
    setViewMode,
    referenceDate,
    period,
    periodStartDate: queryStartDate,
    periodEndDate: queryEndDate,
    periodRange,
    periodLabel,
    setReferenceDate,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    // sync
    isRefetching,
    syncWarning,
    lastSyncAt,
    lastSyncLabel,
    handleRefresh,
    refreshDashboardData: handleRefresh,
    // derivados
    effectiveMonthlyGoal,
    funnelBenchmarks,
    metrics,
    funilData,
    diagnostics,
    latestDRE,
    pendingDisciplineSellers,
  }
}

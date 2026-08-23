import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOwnerOptional } from '@/components/owner/OwnerContext'
import { ALL_OWNER_UNITS, resolveOwnerPlanningScopeType } from '@/components/owner/ownerPlanningAdapter'
import { usePlanningRealtime, usePlanningWorkspace } from '@/features/planning-workspace'
import {
  REFERENCE_YEAR,
  calculatePercentageOfTarget,
  getStatusFromPercentage,
  resolveDefaultSelectedMonthIndex,
} from '@/components/owner/strategic/strategicUtils'
import { strategicPlanDataSource } from './strategicPlanRepositoryAdapter'
import { readStrategicRouteState, resolveInitialStrategicDisplayMode, writeStrategicRouteState } from './strategicPlanPreferences'
import { usePlanCycle, type PlanCycleState } from './usePlanCycle'
import { useClientScope } from './useClientScope'
import { CONSOLIDATION_STATUS, formatPartialUnitsLabel, type ConsolidationIndicator } from './unitConsolidation'
import { resolveOwnerScopedSeries } from './applyOwnerScopeSeries'
import type {
  StrategicDisplayMode,
  StrategicPlanRepository,
  StrategicSeries,
  StrategicTab,
  StrategicValueView,
} from './strategicPlan.types'

export type StrategicPlanController = {
  repository: StrategicPlanRepository
  year: number
  loading: boolean
  error: string | null
  series: StrategicSeries[]
  indicator: StrategicSeries | null
  selectedIndicatorId: string
  setSelectedIndicatorId: (id: string) => void
  tab: StrategicTab
  setTab: (tab: StrategicTab) => void
  valueView: StrategicValueView
  setValueView: (view: StrategicValueView) => void
  areaFilter: string
  setAreaFilter: (area: string) => void
  displayMode: StrategicDisplayMode
  setDisplayMode: (mode: StrategicDisplayMode) => void
  effectiveDisplayMode: StrategicDisplayMode
  isMobile: boolean
  existingAction: boolean
  isActionPrimary: boolean
  editOpen: boolean
  setEditOpen: (open: boolean) => void
  actionOpen: boolean
  setActionOpen: (open: boolean) => void
  filtersOpen: boolean
  setFiltersOpen: (open: boolean) => void
  refreshKey: number
  realtimeStatus: 'connecting' | 'connected' | 'degraded'
  reload: () => Promise<void>
  handleCardClick: (id: string) => void
  handleRowClick: (id: string) => void
  handleSaved: () => Promise<void>
  planCycle: PlanCycleState
  selectedMonthIndex: number
  setSelectedMonthIndex: (index: number) => void
  partialUnitsLabel: string | null
  scopeNotice: string | null
  ownerUnitId: string | null
  setOwnerUnitScope: (unitId: string) => void
  clientUnits: Array<{ id: string; name: string; active: boolean }>
  supportsConsolidated: boolean
  /** Contexto de leitura para Diagnóstico de Dados (Admin MX). */
  diagnosticContext: {
    clientAccountId: string | null
    storeId: string | null
    scopeType: string
    supportsConsolidated: boolean
    referenceYear: number
    referenceMonth: number
    selectedValueView: StrategicValueView
    strategicPlanVersionId: string | null
  }
}

export function useStrategicPlanController(options: {
  repository?: StrategicPlanRepository
  year?: number
  onUpdated?: (at: Date) => void
  useRealtime?: typeof usePlanningRealtime
} = {}): StrategicPlanController {
  const { storeId, actor, capabilities } = usePlanningWorkspace()
  const owner = useOwnerOptional() as { unitId?: string; setUnitId?: (id: string) => void } | null
  const [unitScopeOverride, setUnitScopeOverride] = useState<string | null>(null)
  useEffect(() => { setUnitScopeOverride(null) }, [storeId])
  const ownerUnitId = unitScopeOverride ?? owner?.unitId ?? null
  const setOwnerUnitScope = useCallback((next: string) => {
    setUnitScopeOverride(next)
    owner?.setUnitId?.(next)
  }, [owner])
  const repository = options.repository ?? strategicPlanDataSource
  const year = options.year ?? REFERENCE_YEAR
  const onUpdated = options.onUpdated
  const useRealtime = options.useRealtime ?? usePlanningRealtime
  const routeState = useMemo(
    () => readStrategicRouteState(typeof window === 'undefined' ? '' : window.location.search),
    [],
  )
  const initialMode = useMemo(() => {
    const saved = repository.getPreferences().displayMode
    const width = typeof window === 'undefined' ? 1440 : window.innerWidth
    return resolveInitialStrategicDisplayMode({ width, saved })
  }, [repository])

  const requestSequence = useRef(0)
  const [loading, setLoading] = useState(Boolean(storeId))
  const [error, setError] = useState<string | null>(null)
  const [series, setSeries] = useState<StrategicSeries[]>([])
  const [tab, setTabState] = useState<StrategicTab>(routeState.tab)
  const [valueView, setValueView] = useState<StrategicValueView>('meta')
  const [selectedIndicatorId, setSelectedIndicatorIdState] = useState(routeState.indicatorId || '')
  const [areaFilter, setAreaFilter] = useState('all')
  const [displayMode, setDisplayModeState] = useState<StrategicDisplayMode>(initialMode)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [editOpen, setEditOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(() => resolveDefaultSelectedMonthIndex(year))

  const consolidationIndicators = useMemo<ConsolidationIndicator[]>(
    () => series.map(item => ({
      code: String(item.metricCode || item.code),
      formula_expression: typeof item.formula_expression === 'string' ? item.formula_expression : null,
      global_display_order: typeof item.display_order === 'number' ? item.display_order : null,
    })),
    [series],
  )
  const clientScope = useClientScope(storeId, year, consolidationIndicators)
  const reloadClientScope = clientScope.reload
  const wantsConsolidated = ownerUnitId === ALL_OWNER_UNITS
  const scopeType = resolveOwnerPlanningScopeType(ownerUnitId, clientScope.supportsConsolidated)
  const scopeNotice = wantsConsolidated && !clientScope.loading && !clientScope.supportsConsolidated
    ? 'Consolidado indisponível: este cliente tem uma única unidade. Exibindo a loja selecionada.'
    : !wantsConsolidated && ownerUnitId && clientScope.supportsConsolidated
      ? 'Exibindo a loja selecionada. O consolidado não entra neste recorte.'
      : null

  const planCycle = usePlanCycle({
    storeId,
    year,
    userId: actor.id,
    canManageCycle: capabilities.canManageStrategicCycle,
    series,
    activeUnitIds: clientScope.units.filter(unit => unit.active).map(unit => unit.id),
    planningRows: clientScope.values,
  })

  const reload = useCallback(async () => {
    const requestId = ++requestSequence.current
    if (!storeId) {
      setSeries([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      await repository.load({
        storeId,
        year,
        clientId: clientScope.clientId,
        versionId: planCycle.cycle?.id ?? null,
        month: selectedMonthIndex + 1,
        view: displayMode,
        scopeType,
      })
      if (requestId !== requestSequence.current) return
      const snapshot = repository.getOverviewData(year)
      setSeries(snapshot)
      setSelectedIndicatorIdState(current => (
        snapshot.some(item => item.id === current || item.code === current || item.metricCode === current)
          ? current
          : snapshot[0]?.id || ''
      ))
      onUpdated?.(new Date())
    } catch (cause) {
      if (requestId !== requestSequence.current) return
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o Plano Estratégico.')
      setSeries([])
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [clientScope.clientId, displayMode, onUpdated, planCycle.cycle?.id, repository, scopeType, selectedMonthIndex, storeId, year])

  useEffect(() => { void reload() }, [reload])
  useEffect(() => {
    setSelectedMonthIndex(resolveDefaultSelectedMonthIndex(year))
  }, [year])

  const { status: realtimeStatus } = useRealtime({
    scope: 'strategic',
    storeId,
    reload,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    repository.setPreferences({ displayMode })
  }, [displayMode, repository])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const search = writeStrategicRouteState(window.location.search, {
      tab,
      indicatorId: selectedIndicatorId,
    })
    const next = `${window.location.pathname}${search}${window.location.hash}`
    window.history.replaceState({}, '', next)
  }, [selectedIndicatorId, tab])

  const setTab = useCallback((next: StrategicTab) => setTabState(next), [])
  const setSelectedIndicatorId = useCallback((id: string) => setSelectedIndicatorIdState(id), [])
  const setDisplayMode = useCallback((mode: StrategicDisplayMode) => {
    setDisplayModeState(isMobile && mode === 'both' ? 'table' : mode)
  }, [isMobile])

  const scopedSeries = useMemo(
    () => resolveOwnerScopedSeries({
      series,
      scopeType,
      supportsConsolidated: clientScope.supportsConsolidated,
      consolidated: clientScope.consolidated,
    }),
    [clientScope.consolidated, clientScope.supportsConsolidated, scopeType, series],
  )

  const indicator = useMemo(
    () => scopedSeries.find(item => item.id === selectedIndicatorId) || scopedSeries[0] || null,
    [selectedIndicatorId, scopedSeries],
  )
  const effectiveDisplayMode = isMobile && displayMode === 'both' ? 'table' : displayMode
  const existingAction = useMemo(
    () => Boolean(indicator && repository.getActionItems(indicator.id).length > 0),
    [indicator, refreshKey, repository],
  )
  const isActionPrimary = useMemo(() => {
    if (!indicator) return false
    const result = indicator.currentValues[selectedMonthIndex]
    const target = indicator.targetValues[selectedMonthIndex]
    const percentage = calculatePercentageOfTarget(result, target)
    const status = percentage === null ? 'neutral' : getStatusFromPercentage(percentage, indicator.direction)
    return status === 'attention' || status === 'critical'
  }, [indicator, selectedMonthIndex])

  const handleCardClick = useCallback((id: string) => {
    setSelectedIndicatorIdState(id)
    setTabState('resumo')
  }, [])
  const handleRowClick = useCallback((id: string) => {
    setSelectedIndicatorIdState(id)
    setTabState('resumo')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])
  const handleSaved = useCallback(async () => {
    setRefreshKey(key => key + 1)
    reloadClientScope()
    await reload()
  }, [reload, reloadClientScope])

  const partialUnitsLabel = useMemo(() => {
    if (scopeType !== 'CONSOLIDATED' || !clientScope.supportsConsolidated || !clientScope.consolidated) return null
    const month = selectedMonthIndex + 1
    const seriesKey = valueView
    const byCode = clientScope.consolidated[seriesKey]?.integrityByMonth?.[month] ?? {}
    for (const item of Object.values(byCode)) {
      if (item.status === CONSOLIDATION_STATUS.PARCIAL) {
        return formatPartialUnitsLabel(item.unitsWithData, item.totalUnits)
      }
    }
    // Fallback: qualquer série com parcial no mês (ex.: meta preenchida, realizado vazio)
    for (const key of ['meta', 'realizado', 'ano_anterior'] as const) {
      if (key === seriesKey) continue
      const alt = clientScope.consolidated[key]?.integrityByMonth?.[month] ?? {}
      for (const item of Object.values(alt)) {
        if (item.status === CONSOLIDATION_STATUS.PARCIAL) {
          return formatPartialUnitsLabel(item.unitsWithData, item.totalUnits)
        }
      }
    }
    return null
  }, [clientScope.consolidated, clientScope.supportsConsolidated, scopeType, selectedMonthIndex, valueView])


  const diagnosticContext = useMemo(() => ({
    clientAccountId: clientScope.clientId,
    storeId,
    scopeType,
    supportsConsolidated: clientScope.supportsConsolidated,
    referenceYear: year,
    referenceMonth: selectedMonthIndex + 1,
    selectedValueView: valueView,
    strategicPlanVersionId: planCycle.cycle?.id ?? null,
  }), [
    clientScope.clientId,
    clientScope.supportsConsolidated,
    planCycle.cycle?.id,
    scopeType,
    selectedMonthIndex,
    storeId,
    valueView,
    year,
  ])


  return {
    repository,
    year,
    loading,
    error,
    series: scopedSeries,
    indicator,
    selectedIndicatorId,
    setSelectedIndicatorId,
    tab,
    setTab,
    valueView,
    setValueView,
    areaFilter,
    setAreaFilter,
    displayMode,
    setDisplayMode,
    effectiveDisplayMode,
    isMobile,
    existingAction,
    isActionPrimary,
    editOpen,
    setEditOpen,
    actionOpen,
    setActionOpen,
    filtersOpen,
    setFiltersOpen,
    refreshKey,
    realtimeStatus,
    reload,
    handleCardClick,
    handleRowClick,
    handleSaved,
    planCycle,
    selectedMonthIndex,
    setSelectedMonthIndex,
    partialUnitsLabel,
    scopeNotice,
    ownerUnitId: ownerUnitId ?? null,
    setOwnerUnitScope,
    clientUnits: clientScope.units.map(unit => ({ id: unit.id, name: unit.name, active: unit.active })),
    supportsConsolidated: clientScope.supportsConsolidated,
    diagnosticContext,
  }
}

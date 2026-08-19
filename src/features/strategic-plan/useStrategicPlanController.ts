import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePlanningRealtime, usePlanningWorkspace } from '@/features/planning-workspace'
import {
  REFERENCE_YEAR,
  SELECTED_MONTH_INDEX,
  calculatePercentageOfTarget,
  getStatusFromPercentage,
} from '@/components/owner/strategic/strategicUtils'
import { strategicPlanDataSource } from './strategicPlanRepositoryAdapter'
import { readStrategicRouteState, resolveInitialStrategicDisplayMode, writeStrategicRouteState } from './strategicPlanPreferences'
import { usePlanCycle, type PlanCycleState } from './usePlanCycle'
import type {
  StrategicDisplayMode,
  StrategicPlanRepository,
  StrategicSeries,
  StrategicTab,
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
}

export function useStrategicPlanController(options: {
  repository?: StrategicPlanRepository
  year?: number
  onUpdated?: (at: Date) => void
  useRealtime?: typeof usePlanningRealtime
} = {}): StrategicPlanController {
  const { storeId, actor, capabilities } = usePlanningWorkspace()
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
  const [selectedIndicatorId, setSelectedIndicatorIdState] = useState(routeState.indicatorId || 'SP-001')
  const [areaFilter, setAreaFilter] = useState('all')
  const [displayMode, setDisplayModeState] = useState<StrategicDisplayMode>(initialMode)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const [editOpen, setEditOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const planCycle = usePlanCycle({
    storeId,
    year,
    userId: actor.id,
    canManageCycle: capabilities.canEditTargets,
    series,
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
      await repository.load({ storeId, year })
      if (requestId !== requestSequence.current) return
      const snapshot = repository.getOverviewData(year)
      setSeries(snapshot)
      setSelectedIndicatorIdState(current => (
        snapshot.some(item => item.id === current) ? current : snapshot[0]?.id || 'SP-001'
      ))
      onUpdated?.(new Date())
    } catch (cause) {
      if (requestId !== requestSequence.current) return
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o Plano Estratégico.')
      setSeries([])
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [onUpdated, repository, storeId, year])

  useEffect(() => { void reload() }, [reload])

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

  const indicator = useMemo(
    () => series.find(item => item.id === selectedIndicatorId) || series[0] || null,
    [selectedIndicatorId, series],
  )
  const effectiveDisplayMode = isMobile && displayMode === 'both' ? 'table' : displayMode
  const existingAction = useMemo(
    () => Boolean(indicator && repository.getActionItems(indicator.id).length > 0),
    [indicator, refreshKey, repository],
  )
  const isActionPrimary = useMemo(() => {
    if (!indicator) return false
    const result = indicator.currentValues[SELECTED_MONTH_INDEX]
    const target = indicator.targetValues[SELECTED_MONTH_INDEX]
    const percentage = calculatePercentageOfTarget(result, target)
    const status = percentage === null ? 'neutral' : getStatusFromPercentage(percentage, indicator.direction)
    return status === 'attention' || status === 'critical'
  }, [indicator])

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
    await reload()
  }, [reload])

  return {
    repository,
    year,
    loading,
    error,
    series,
    indicator,
    selectedIndicatorId,
    setSelectedIndicatorId,
    tab,
    setTab,
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
  }
}

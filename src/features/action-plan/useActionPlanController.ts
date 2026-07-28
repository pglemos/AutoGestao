import { useCallback, useEffect, useMemo, useState } from 'react'
import { filterActions } from '@/components/owner/actionplan/actionPlanUtils'
import { usePlanningRealtime, usePlanningWorkspace } from '@/features/planning-workspace'
import { buildFocusSections } from './actionPlanFocus'
import { createActionPlanLoadCoordinator } from './actionPlanLoadCoordinator'
import { applyExecutiveCardFilter, calculateActionPlanMetrics, mergeActionPlanFilters } from './actionPlanMetrics'
import { executeActionPlanMutation, validationResultOrThrow } from './actionPlanMutationRunner'
import { getActionPlanPermissions, resolveActionTransition } from './actionPlanPolicy'
import { readActionPlanRouteState, resolveInitialActionPlanMode, writeActionPlanRouteState } from './actionPlanPreferences'
import { actionPlanDataSource } from './actionPlanRepositoryAdapter'
import type {
  ActionPlanFilters,
  ActionPlanItem,
  ActionPlanMode,
  ActionPlanRepository,
  ActionPlanTab,
  ActionTransitionResolution,
  ExecutiveCardKey,
} from './actionPlan.types'

export const ACTION_PLAN_MODE_KEY = 'mx_action_plan_mode'
export const ACTION_PLAN_SORT_KEY = 'mx_action_plan_board_sort'

export const DEFAULT_ACTION_PLAN_FILTERS: ActionPlanFilters = {
  search: '',
  objective: undefined,
  department: undefined,
  responsible: undefined,
  status: undefined,
  priority: undefined,
  origin: undefined,
  display: undefined,
  indicator: undefined,
  impactStatus: undefined,
}

function readStorage(key: string): string | null {
  return typeof window === 'undefined' ? null : window.localStorage.getItem(key)
}

function writeStorage(key: string, value: string): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
}

export type ActionPlanController = {
  storeId: string | null
  actorId: string
  actorName: string
  permissions: ReturnType<typeof getActionPlanPermissions>
  actions: ActionPlanItem[]
  filteredActions: ActionPlanItem[]
  responsiblePeople: string[]
  loading: boolean
  mutating: boolean
  error: string | null
  realtimeStatus: 'connecting' | 'connected' | 'degraded'
  tab: ActionPlanTab
  mode: ActionPlanMode
  sortBy: string
  filters: ActionPlanFilters
  activeCard: ExecutiveCardKey | null
  metrics: ReturnType<typeof calculateActionPlanMetrics>
  focusSections: ReturnType<typeof buildFocusSections>
  setTab(tab: ActionPlanTab): void
  setMode(mode: ActionPlanMode): void
  setSortBy(value: string): void
  setFilters(filters: ActionPlanFilters): void
  clearFilters(): void
  toggleExecutiveCard(card: ExecutiveCardKey): void
  reload(): Promise<void>
  createAction(payload: Record<string, unknown>): Promise<unknown>
  updateAction(id: string, payload: Record<string, unknown>): Promise<unknown>
  approveAction(id: string, payload?: Record<string, unknown>): Promise<unknown>
  delegateAction(id: string, payload?: Record<string, unknown>): Promise<unknown>
  startAction(id: string, payload?: Record<string, unknown>): Promise<unknown>
  updateProgress(id: string, payload?: Record<string, unknown>): Promise<unknown>
  blockAction(id: string, payload?: Record<string, unknown>): Promise<unknown>
  unblockAction(id: string, payload?: Record<string, unknown>): Promise<unknown>
  submitForValidation(id: string, payload?: Record<string, unknown>): Promise<unknown>
  validateAction(id: string, payload?: Record<string, unknown>): Promise<unknown>
  returnToExecution(id: string, payload?: Record<string, unknown>): Promise<unknown>
  reopenAction(id: string, payload?: Record<string, unknown>): Promise<unknown>
  cancelAction(id: string, payload?: Record<string, unknown>): Promise<unknown>
  deleteAction(id: string): Promise<void>
  updateDueDate(id: string, payload?: Record<string, unknown>): Promise<unknown>
  duplicateAction(id: string, payload?: Record<string, unknown>): Promise<unknown>
  resolveTransition(source: ActionPlanItem['status'], destination: ActionPlanItem['status']): ActionTransitionResolution
}

export function useActionPlanController(options: {
  repository?: ActionPlanRepository
  now?: () => Date
} = {}): ActionPlanController {
  const repository = options.repository ?? actionPlanDataSource
  const now = options.now ?? (() => new Date())
  const workspace = usePlanningWorkspace()
  const permissions = useMemo(() => getActionPlanPermissions(workspace.actor.role), [workspace.actor.role])
  const [actions, setActions] = useState<ActionPlanItem[]>([])
  const [responsiblePeople, setResponsiblePeople] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTabState] = useState<ActionPlanTab>(() => readActionPlanRouteState(typeof window === 'undefined' ? '' : window.location.search).tab)
  const [mode, setModeState] = useState<ActionPlanMode>(() => resolveInitialActionPlanMode(readStorage(ACTION_PLAN_MODE_KEY)))
  const [sortBy, setSortByState] = useState(() => readStorage(ACTION_PLAN_SORT_KEY) || 'due_soon')
  const [filters, setFilters] = useState<ActionPlanFilters>(DEFAULT_ACTION_PLAN_FILTERS)
  const [activeCard, setActiveCard] = useState<ExecutiveCardKey | null>(null)

  const coordinator = useMemo(() => createActionPlanLoadCoordinator(
    repository,
    snapshot => {
      setActions(snapshot.actions)
      setResponsiblePeople(snapshot.responsiblePeople)
      setError(null)
    },
    cause => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar o Plano de Ação.'),
  ), [repository])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      await coordinator.load(workspace.storeId)
    } finally {
      setLoading(false)
    }
  }, [coordinator, workspace.storeId])

  useEffect(() => {
    void reload()
    return () => coordinator.invalidate()
  }, [coordinator, reload])

  const realtime = usePlanningRealtime({ scope: 'action', storeId: workspace.storeId, reload })

  const setTab = useCallback((next: ActionPlanTab) => {
    setTabState(next)
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.search = writeActionPlanRouteState(url.search, { tab: next })
    window.history.replaceState({}, '', url)
  }, [])

  const setMode = useCallback((next: ActionPlanMode) => {
    setModeState(next)
    writeStorage(ACTION_PLAN_MODE_KEY, next)
  }, [])

  const setSortBy = useCallback((next: string) => {
    setSortByState(next)
    writeStorage(ACTION_PLAN_SORT_KEY, next)
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_ACTION_PLAN_FILTERS)
    setActiveCard(null)
  }, [])

  const toggleExecutiveCard = useCallback((card: ExecutiveCardKey) => {
    const result = applyExecutiveCardFilter(card, activeCard)
    setActiveCard(result.activeCard)
    setFilters(current => mergeActionPlanFilters(current, result.patch))
  }, [activeCard])

  const perform = useCallback(<T,>(operation: () => Promise<T>) => executeActionPlanMutation({
    operation,
    reload,
    setPending: setMutating,
  }), [reload])

  const createAction = useCallback((payload: Record<string, unknown>) => perform(
    () => repository.createAction(payload, { storeId: workspace.storeId }),
  ), [perform, repository, workspace.storeId])
  const updateAction = useCallback((id: string, payload: Record<string, unknown>) => perform(
    () => repository.updateActionById(id, payload),
  ), [perform, repository])
  const approveAction = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.approveAction(id, payload),
  ), [perform, repository])
  const delegateAction = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.delegateAction(id, payload),
  ), [perform, repository])
  const startAction = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.startAction(id, payload),
  ), [perform, repository])
  const updateProgress = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.updateProgress(id, payload),
  ), [perform, repository])
  const blockAction = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.blockAction(id, payload),
  ), [perform, repository])
  const unblockAction = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.unblockAction(id, payload),
  ), [perform, repository])
  const submitForValidation = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(async () => (
    validationResultOrThrow(await repository.submitForValidation(id, payload))
  )), [perform, repository])
  const validateAction = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.validateAction(id, payload),
  ), [perform, repository])
  const returnToExecution = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.returnToExecution(id, payload),
  ), [perform, repository])
  const reopenAction = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.reopenAction(id, payload),
  ), [perform, repository])
  const cancelAction = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.cancelAction(id, payload),
  ), [perform, repository])
  const deleteAction = useCallback(async (id: string) => {
    if (!permissions.canDeletePermanently) throw new Error('Seu perfil não pode excluir ações definitivamente.')
    await perform(() => repository.deleteAction(id))
  }, [perform, permissions.canDeletePermanently, repository])
  const updateDueDate = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.updateDueDate(id, payload),
  ), [perform, repository])
  const duplicateAction = useCallback((id: string, payload: Record<string, unknown> = {}) => perform(
    () => repository.duplicateAction(id, payload),
  ), [perform, repository])

  const filteredActions = useMemo(() => filterActions(actions, filters), [actions, filters])
  const currentDate = now()
  const metrics = useMemo(() => calculateActionPlanMetrics(actions, currentDate), [actions, currentDate])
  const focusSections = useMemo(() => buildFocusSections(filteredActions, currentDate), [filteredActions, currentDate])

  return {
    storeId: workspace.storeId,
    actorId: workspace.actor.id,
    actorName: workspace.actor.name,
    permissions,
    actions,
    filteredActions,
    responsiblePeople,
    loading,
    mutating,
    error,
    realtimeStatus: realtime.status,
    tab,
    mode,
    sortBy,
    filters,
    activeCard,
    metrics,
    focusSections,
    setTab,
    setMode,
    setSortBy,
    setFilters,
    clearFilters,
    toggleExecutiveCard,
    reload,
    createAction,
    updateAction,
    approveAction,
    delegateAction,
    startAction,
    updateProgress,
    blockAction,
    unblockAction,
    submitForValidation,
    validateAction,
    returnToExecution,
    reopenAction,
    cancelAction,
    deleteAction,
    updateDueDate,
    duplicateAction,
    resolveTransition: resolveActionTransition,
  }
}

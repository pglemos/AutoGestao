import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDashboardLojaData } from '@/features/dashboard-loja/hooks/useDashboardLojaData'
import { ManagerHomeReturnLink } from '@/features/manager/home/ManagerHomeReturnLink'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { PageCanvas } from '@/design-system/page'
import {
  buildManagerRoutineNavigationPath,
  calculateManagerRoutineDaysLate,
  classifyManagerRoutineUrgency,
  type ManagerRoutineAction,
  type ManagerRoutineCategory,
  type ManagerRoutineOrigin,
  type ManagerRoutinePriority,
  type ManagerRoutineResult,
  type ManagerRoutineTask,
} from './manager-day-routine'
import {
  buildManagerRoutineCompletionUpdate,
  buildManagerRoutineCreatePayload,
  executionActionToHistoryTask,
  managerRoutineDateTimeParts,
  readManagerRoutineMetadata,
  type ManagerRoutineExecutionActionRow,
  type ManagerRoutineNewTaskForm,
} from './manager-day-routine-adapter'
import {
  buildManagerRoutineNavigationContext,
  parseManagerRoutineNavigationContext,
} from './manager-day-routine-navigation'
import { ManagerDayRoutineView } from './ManagerDayRoutineView'

const NAVIGATION_CONTEXT_KEY = 'mx_contexto_navegacao'

type CanonicalManagerTaskRow = {
  id: string
  task_key: string
  title: string
  description: string | null
  category: string
  routine_block: string
  origin_module: string
  origin_record_id: string | null
  seller_user_id: string | null
  due_at: string
  priority: string
  status: string
  automatic: boolean
  counts_for_score: boolean
  result: string | null
  observation: string | null
}

export function ManagerDayRoutineCanonical() {
  const navigate = useNavigate()
  const { profile, storeId, membership } = useAuth()
  const dashboard = useDashboardLojaData({
    selectedStoreId: storeId,
    selectedStoreName: membership?.store?.name || '',
    managerCalendarMode: true,
  })
  const referenceDate = dashboard.referenceDate
  const sellers = useMemo(
    () => dashboard.sellers.map(seller => ({ id: seller.id, name: seller.name })),
    [dashboard.sellers],
  )
  const [canonicalRows, setCanonicalRows] = useState<CanonicalManagerTaskRow[]>([])
  const [manualRows, setManualRows] = useState<ManagerRoutineExecutionActionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [restoredContext, setRestoredContext] = useState<ReturnType<typeof consumeNavigationContext> | null>(null)

  useEffect(() => {
    setRestoredContext(consumeNavigationContext())
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const fetchTasks = useCallback(async () => {
    if (!profile?.id || !storeId) {
      setCanonicalRows([])
      setManualRows([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const refreshResult = await supabase.rpc('refresh_manager_daily_tasks', {
      p_manager_user_id: profile.id,
      p_store_id: storeId,
      p_reference_date: referenceDate,
    })

    if (refreshResult.error) {
      setError(refreshResult.error.message)
      setLoading(false)
      return
    }

    const [canonicalResult, manualResult] = await Promise.all([
      supabase
        .from('manager_daily_tasks')
        .select('id,task_key,title,description,category,routine_block,origin_module,origin_record_id,seller_user_id,due_at,priority,status,automatic,counts_for_score,result,observation')
        .eq('manager_user_id', profile.id)
        .eq('store_id', storeId)
        .eq('reference_date', referenceDate)
        .order('due_at', { ascending: true }),
      supabase
        .from('execution_actions')
        .select('id,title,description,due_at,status,priority,created_at,completed_at,justificativa,metadata')
        .eq('store_id', storeId)
        .eq('seller_id', profile.id)
        .eq('source_type', 'manual')
        .contains('metadata', { manager_daily: true })
        .order('due_at', { ascending: false })
        .limit(1000),
    ])

    const firstError = canonicalResult.error || manualResult.error
    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    setCanonicalRows((canonicalResult.data || []) as CanonicalManagerTaskRow[])
    setManualRows((manualResult.data || []) as ManagerRoutineExecutionActionRow[])
    setLoading(false)
  }, [profile?.id, referenceDate, storeId])

  useEffect(() => {
    void fetchTasks()
  }, [fetchTasks])

  const canonicalTasks = useMemo(
    () => canonicalRows.map(row => canonicalRowToTask(row, now, sellers)),
    [canonicalRows, now, sellers],
  )
  const manualTasks = useMemo(
    () => manualRows.map(row => executionActionToHistoryTask(row, now)),
    [manualRows, now],
  )
  const tasks = useMemo(
    () => [
      ...canonicalTasks.filter(task => task.status === 'pendente'),
      ...manualTasks.filter(task => task.status === 'pendente'),
    ],
    [canonicalTasks, manualTasks],
  )
  const historyTasks = useMemo(
    () => [
      ...canonicalTasks.filter(task => task.status !== 'pendente'),
      ...manualTasks.filter(task => task.status !== 'pendente'),
    ],
    [canonicalTasks, manualTasks],
  )

  const refresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchTasks(), dashboard.handleRefresh()])
    } finally {
      setRefreshing(false)
    }
  }

  const createTask = async (form: ManagerRoutineNewTaskForm) => {
    if (!profile?.id || !storeId) throw new Error('Gerente sem unidade vinculada.')
    const relatedSellerName = sellers.find(seller => seller.id === form.relatedSellerId)?.name
    const payload = buildManagerRoutineCreatePayload(form, {
      managerId: profile.id,
      storeId,
      relatedSellerName,
    })
    const { error: insertError } = await supabase.from('execution_actions').insert(payload)
    if (insertError) {
      toast.error(`Não foi possível criar a atividade: ${insertError.message}`)
      throw insertError
    }
    toast.success('Atividade criada na Rotina do Dia.')
    await fetchTasks()
  }

  const completeTask = async (
    task: ManagerRoutineTask,
    result: ManagerRoutineResult,
    observation: string,
  ) => {
    if (!profile?.id || !storeId || !task.rowId) {
      throw new Error('Atividade não encontrada para atualização.')
    }

    const completedAt = new Date().toISOString()
    if (task.automatic) {
      const { error: updateError } = await supabase
        .from('manager_daily_tasks')
        .update({
          status: canonicalStatusForResult(result),
          completion_mode: 'manual',
          completed_at: completedAt,
          completed_by: profile.id,
          result,
          observation: observation.trim() || null,
          updated_at: completedAt,
        })
        .eq('id', task.rowId)
        .eq('manager_user_id', profile.id)
        .eq('store_id', storeId)
      if (updateError) {
        toast.error(`Não foi possível concluir: ${updateError.message}`)
        throw updateError
      }
    } else {
      const persisted = manualRows.find(row => row.id === task.rowId)
      if (!persisted) throw new Error('Atividade manual não encontrada.')
      const update = buildManagerRoutineCompletionUpdate({
        result,
        observation,
        managerId: profile.id,
        completedAt,
        metadata: readManagerRoutineMetadata(persisted.metadata),
      })
      const { error: updateError } = await supabase
        .from('execution_actions')
        .update(update)
        .eq('id', task.rowId)
        .eq('store_id', storeId)
        .eq('seller_id', profile.id)
      if (updateError) {
        toast.error(`Não foi possível concluir: ${updateError.message}`)
        throw updateError
      }
    }

    toast.success('Resultado registrado na Rotina do Dia.')
    await fetchTasks()
  }

  const navigateFromTask = (
    action: ManagerRoutineAction,
    task: ManagerRoutineTask,
    context: Parameters<ComponentProps<typeof ManagerDayRoutineView>['onNavigate']>[2],
  ) => {
    sessionStorage.setItem(NAVIGATION_CONTEXT_KEY, JSON.stringify(buildManagerRoutineNavigationContext({
      taskId: task.id,
      date: referenceDate,
      module: task.origin,
      filter: context.filter,
      sort: context.sort,
    })))
    navigate(buildManagerRoutineNavigationPath(action))
  }

  const storeName = storeId
    ? membership?.store?.name || dashboard.operationalStore?.name || 'Unidade vinculada'
    : null

  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-5">
      <ManagerDayRoutineView
        returnLink={<ManagerHomeReturnLink />}
        referenceDate={referenceDate}
        storeName={storeName}
        tasks={tasks}
        historyTasks={historyTasks}
        sellers={sellers}
        loading={dashboard.loading || loading}
        error={error || errorMessage(dashboard.error)}
        refreshing={refreshing || dashboard.isRefetching}
        initialFilter={restoredContext?.filter || 'todas'}
        initialSort={restoredContext?.sort || 'prioridade'}
        onRefresh={refresh}
        onNavigate={navigateFromTask}
        onCreate={createTask}
        onComplete={completeTask}
      />
    </PageCanvas>
  )
}

function canonicalRowToTask(
  row: CanonicalManagerTaskRow,
  now: Date,
  sellers: Array<{ id: string; name: string }>,
): ManagerRoutineTask {
  const due = managerRoutineDateTimeParts(row.due_at)
  const origin = managerOrigin(row.origin_module)
  return {
    id: row.task_key,
    rowId: row.id,
    title: row.title,
    description: row.description || '',
    category: managerCategory(row.category),
    block: row.routine_block,
    origin,
    originRecordId: row.origin_record_id || undefined,
    relatedSellerId: row.seller_user_id || undefined,
    relatedSellerName: sellers.find(seller => seller.id === row.seller_user_id)?.name,
    dueDate: due.date,
    dueTime: due.time,
    automatic: row.automatic,
    icon: iconForTask(row.task_key),
    actions: actionsForOrigin(origin),
    priority: priorityForRow(row, due.date, due.time, now),
    daysLate: calculateManagerRoutineDaysLate(due.date, now),
    status: visibleStatus(row.status),
    countsForScore: row.counts_for_score,
    observation: row.observation || row.result || undefined,
  }
}

function managerCategory(value: string): ManagerRoutineCategory {
  if (value === 'resultado' || value === 'equipe' || value === 'desenvolvimento') return value
  return 'operacao'
}

function managerOrigin(value: string): ManagerRoutineOrigin {
  if (value === 'rotina_equipe' || value === 'minha_equipe' || value === 'meta_loja'
    || value === 'desenvolvimento' || value === 'universidade_mx'
    || value === 'carteira_clientes' || value === 'manual') return value
  return 'fechamento_diario'
}

function actionsForOrigin(origin: ManagerRoutineOrigin): ManagerRoutineAction[] {
  if (origin === 'fechamento_diario' || origin === 'carteira_clientes') {
    return [
      { label: origin === 'carteira_clientes' ? 'Ver agenda' : 'Ver fechamento', path: '/fechamento-diario', kind: 'consulta' },
      { label: origin === 'carteira_clientes' ? 'Confirmar' : 'Regularizar', path: '/fechamento-diario', kind: 'acao' },
    ]
  }
  if (origin === 'rotina_equipe') {
    return [
      { label: 'Ver rotina', path: '/rotina-equipe', kind: 'consulta' },
      { label: 'Cobrar', path: '/rotina-equipe', kind: 'acao' },
    ]
  }
  if (origin === 'desenvolvimento') {
    return [{ label: 'Abrir desenvolvimento', path: '/feedbacks-pdis', kind: 'acao' }]
  }
  if (origin === 'meta_loja') {
    return [{ label: 'Ver Meta da Loja', path: '/meta-loja', kind: 'consulta' }]
  }
  return [{ label: 'Concluir', kind: 'acao', action: 'concluir_manual' }]
}

function iconForTask(taskKey: string): string {
  if (taskKey.includes('agendamento')) return 'CalendarCheck'
  if (taskKey.includes('plano')) return 'ListChecks'
  if (taskKey.includes('prospeccao')) return 'UserPlus'
  if (taskKey.includes('atualizacao')) return 'RefreshCw'
  return 'ClipboardCheck'
}

function priorityForRow(
  row: CanonicalManagerTaskRow,
  dueDate: string,
  dueTime: string,
  now: Date,
): ManagerRoutinePriority {
  if (row.status !== 'pending') return row.priority as ManagerRoutinePriority
  return classifyManagerRoutineUrgency(dueDate, dueTime, now)
}

function visibleStatus(status: string): string {
  if (status === 'pending') return 'pendente'
  if (status === 'completed') return 'concluida'
  if (status === 'partially_completed') return 'concluida_parcial'
  if (status === 'rescheduled') return 'reagendada'
  return 'nao_realizada'
}

function canonicalStatusForResult(result: ManagerRoutineResult): string {
  if (result === 'concluida') return 'completed'
  if (result === 'concluida_parcial') return 'partially_completed'
  if (result === 'reagendada') return 'rescheduled'
  return 'not_completed'
}

function consumeNavigationContext() {
  if (typeof sessionStorage === 'undefined') return null
  const parsed = parseManagerRoutineNavigationContext(sessionStorage.getItem(NAVIGATION_CONTEXT_KEY))
  if (parsed) sessionStorage.removeItem(NAVIGATION_CONTEXT_KEY)
  return parsed
}

function errorMessage(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'message' in value && typeof value.message === 'string') return value.message
  return 'Não foi possível carregar a rotina do gerente.'
}

export default ManagerDayRoutineCanonical

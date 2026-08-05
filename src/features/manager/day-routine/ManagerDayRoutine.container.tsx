import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useDashboardLojaData } from '@/features/dashboard-loja/hooks/useDashboardLojaData'
import { ManagerHomeReturnLink } from '@/features/manager/home/ManagerHomeReturnLink'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { subscribeToTeamFunnelRealtime } from '@/features/gerente/hooks/team-funnel-realtime'
import {
  buildManagerRoutineNavigationPath,
  buildManagerRoutineTasks,
  type ManagerRoutineAction,
  type ManagerRoutineResult,
  type ManagerRoutineTask,
} from './manager-day-routine'
import {
  buildManagerRoutineAutomaticCompletionPayload,
  buildManagerRoutineCompletionUpdate,
  buildManagerRoutineCreatePayload,
  executionActionToHistoryTask,
  readManagerRoutineMetadata,
  type ManagerRoutineExecutionActionRow,
  type ManagerRoutineNewTaskForm,
} from './manager-day-routine-adapter'
import {
  buildManagerRoutineNavigationContext,
  parseManagerRoutineNavigationContext,
} from './manager-day-routine-navigation'
import {
  composeManagerRoutineSourceData,
  type ManagerRoutineAgendaEventRow,
  type ManagerRoutineClosingRow,
  type ManagerRoutineRegularizationRow,
  type ManagerRoutineSellerExecutionRow,
} from './manager-day-routine-sources'
import { ManagerDayRoutineView } from './ManagerDayRoutineView'

const NAVIGATION_CONTEXT_KEY = 'mx_contexto_navegacao'

type RoutineSourceRows = {
  closings: ManagerRoutineClosingRow[]
  regularizations: ManagerRoutineRegularizationRow[]
  appointments: Array<{ id: string; status: string }>
  sellerExecutionActions: ManagerRoutineSellerExecutionRow[]
  centralOpenings: Array<{ seller_user_id: string; created_at: string }>
  prospectingSchedules: Array<{ quantidade: number | null }>
  qualificationEvents: Array<{ seller_user_id: string; tipo_evento: string }>
  feedbackActions: Array<{ id: string; status: string; data_inicio: string }>
  pdiActions: Array<{ id: string; status: string; data_conclusao: string }>
  pdiSessions: Array<{ id: string; status: string; proxima_revisao_data: string | null }>
  agendaEvents: ManagerRoutineAgendaEventRow[]
  managerActions: ManagerRoutineExecutionActionRow[]
}

const EMPTY_SOURCES: RoutineSourceRows = {
  closings: [],
  regularizations: [],
  appointments: [],
  sellerExecutionActions: [],
  centralOpenings: [],
  prospectingSchedules: [],
  qualificationEvents: [],
  feedbackActions: [],
  pdiActions: [],
  pdiSessions: [],
  agendaEvents: [],
  managerActions: [],
}

export function ManagerDayRoutine() {
  const navigate = useNavigate()
  const { profile, storeId, membership } = useAuth()
  const dashboard = useDashboardLojaData({
    selectedStoreId: storeId,
    selectedStoreName: membership?.store?.name || '',
    managerCalendarMode: true,
  })
  const referenceDate = dashboard.referenceDate
  const yesterdayDate = shiftIsoDate(referenceDate, -1)
  const sellers = useMemo(
    () => dashboard.sellers.map(seller => ({ id: seller.id, name: seller.name })),
    [dashboard.sellers],
  )
  const sellerIds = useMemo(() => sellers.map(seller => seller.id), [sellers])
  const [sourceRows, setSourceRows] = useState<RoutineSourceRows>(EMPTY_SOURCES)
  const [sourceLoading, setSourceLoading] = useState(true)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const [now, setNow] = useState(() => new Date())
  const [restoredContext, setRestoredContext] = useState<ReturnType<typeof consumeNavigationContext> | null>(null)

  useEffect(() => {
    setRestoredContext(consumeNavigationContext())
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const fetchSources = useCallback(async () => {
    if (!profile?.id || !storeId) {
      setSourceRows(EMPTY_SOURCES)
      setSourceError(null)
      setSourceLoading(false)
      return
    }

    setSourceLoading(true)
    setSourceError(null)
    const start = `${referenceDate}T00:00:00-03:00`
    const end = `${referenceDate}T23:59:59.999-03:00`
    const weekday = new Date(`${referenceDate}T12:00:00-03:00`).getDay()
    const weekOfMonth = Math.min(4, Math.ceil(Number(referenceDate.slice(8, 10)) / 7))
    const noRows = Promise.resolve({ data: [], error: null })

    const [
      closingsResult,
      regularizationsResult,
      appointmentsResult,
      sellerActionsResult,
      openingsResult,
      schedulesResult,
      qualificationResult,
      feedbackResult,
      pdiSessionsResult,
      agendaResult,
      managerActionsResult,
    ] = await Promise.all([
      supabase
        .from('lancamentos_diarios')
        .select('id,seller_user_id,reference_date,submission_status,vnd_porta_prev_day,vnd_cart_prev_day,vnd_net_prev_day')
        .eq('store_id', storeId)
        .eq('metric_scope', 'daily')
        .in('reference_date', [yesterdayDate, referenceDate]),
      supabase
        .from('regularizacao_fechamento')
        .select('vendedor_id,data_competencia,status_solicitacao,enviado_para_aprovacao')
        .eq('loja_id', storeId)
        .in('data_competencia', [yesterdayDate, referenceDate]),
      supabase
        .from('agendamentos')
        .select('id,status')
        .eq('loja_id', storeId)
        .gte('data_hora', start)
        .lte('data_hora', end),
      sellerIds.length
        ? supabase
            .from('execution_actions')
            .select('id,seller_id,source_type,title,description,due_at,status,priority,created_at,completed_at,justificativa,metadata')
            .eq('store_id', storeId)
            .in('seller_id', sellerIds)
            .gte('due_at', start)
            .lte('due_at', end)
        : noRows,
      sellerIds.length
        ? supabase
            .from('central_execucao_aberturas')
            .select('seller_user_id,created_at')
            .eq('data', referenceDate)
            .in('seller_user_id', sellerIds)
        : noRows,
      supabase
        .from('prospecting_schedule')
        .select('quantidade')
        .eq('ativo', true)
        .eq('dia_semana', weekday)
        .or(`semana_mes.is.null,semana_mes.eq.${weekOfMonth}`),
      supabase
        .from('eventos_comerciais')
        .select('seller_user_id,tipo_evento')
        .eq('loja_id', storeId)
        .eq('tipo_evento', 'cliente_qualificado')
        .gte('data_evento', start)
        .lte('data_evento', end),
      supabase
        .from('devolutiva_acoes')
        .select('id,status,data_inicio')
        .eq('store_id', storeId)
        .lte('data_inicio', referenceDate),
      supabase
        .from('pdi_sessoes')
        .select('id,status,proxima_revisao_data')
        .eq('loja_id', storeId)
        .eq('gerente_id', profile.id),
      supabase
        .from('eventos_agenda_executiva')
        .select('id,kind,starts_at,title,public_summary,metadata,private_payload')
        .eq('loja_id', storeId)
        .gte('starts_at', start)
        .lte('starts_at', end)
        .or(`responsavel_id.eq.${profile.id},created_by.eq.${profile.id}`),
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

    const pdiSessionIds = (pdiSessionsResult.data || []).map(row => row.id)
    const pdiActionsResult = pdiSessionIds.length
      ? await supabase
          .from('pdi_plano_acao')
          .select('id,status,data_conclusao')
          .in('sessao_id', pdiSessionIds)
      : { data: [], error: null }

    const failed = [
      closingsResult,
      regularizationsResult,
      appointmentsResult,
      sellerActionsResult,
      openingsResult,
      schedulesResult,
      qualificationResult,
      feedbackResult,
      pdiSessionsResult,
      agendaResult,
      managerActionsResult,
      pdiActionsResult,
    ].find(result => result.error)

    if (failed?.error) {
      setSourceRows(EMPTY_SOURCES)
      setSourceError(failed.error.message)
      setSourceLoading(false)
      return
    }

    setSourceRows({
      closings: (closingsResult.data || []) as ManagerRoutineClosingRow[],
      regularizations: (regularizationsResult.data || []) as ManagerRoutineRegularizationRow[],
      appointments: (appointmentsResult.data || []) as Array<{ id: string; status: string }>,
      sellerExecutionActions: (sellerActionsResult.data || []) as ManagerRoutineSellerExecutionRow[],
      centralOpenings: (openingsResult.data || []) as Array<{ seller_user_id: string; created_at: string }>,
      prospectingSchedules: (schedulesResult.data || []) as Array<{ quantidade: number | null }>,
      qualificationEvents: (qualificationResult.data || []) as Array<{ seller_user_id: string; tipo_evento: string }>,
      feedbackActions: (feedbackResult.data || []) as Array<{ id: string; status: string; data_inicio: string }>,
      pdiActions: (pdiActionsResult.data || []) as Array<{ id: string; status: string; data_conclusao: string }>,
      pdiSessions: (pdiSessionsResult.data || []) as Array<{ id: string; status: string; proxima_revisao_data: string | null }>,
      agendaEvents: (agendaResult.data || []) as ManagerRoutineAgendaEventRow[],
      managerActions: (managerActionsResult.data || []) as ManagerRoutineExecutionActionRow[],
    })
    setSourceLoading(false)
  }, [profile?.id, referenceDate, sellerIds, storeId, yesterdayDate])

  useEffect(() => {
    void fetchSources()
  }, [fetchSources])

  // A Rotina do Dia é a tela que o gerente deixa aberta durante o expediente.
  // Sem Realtime, um agendamento ou uma venda registrados agora só apareciam
  // no próximo F5. Assinatura restrita à loja, com o mesmo debounce do funil.
  useEffect(() => {
    if (!storeId) return
    return subscribeToTeamFunnelRealtime({
      client: supabase as unknown as Parameters<typeof subscribeToTeamFunnelRealtime>[0]['client'],
      storeId,
      tables: ['agendamentos', 'eventos_comerciais'],
      onChange: () => { void fetchSources() },
    })
  }, [storeId, fetchSources])

  const sourceData = useMemo(() => composeManagerRoutineSourceData({
    now,
    referenceDate,
    yesterdayDate,
    monthlyGoal: dashboard.effectiveMonthlyGoal || null,
    businessDays: null,
    sellers,
    ...sourceRows,
  }), [dashboard.effectiveMonthlyGoal, now, referenceDate, sellers, sourceRows, yesterdayDate])
  const tasks = useMemo(() => buildManagerRoutineTasks(sourceData), [sourceData])
  const historyTasks = useMemo(
    () => sourceRows.managerActions.map(row => executionActionToHistoryTask(row, now)),
    [now, sourceRows.managerActions],
  )

  const refresh = async () => {
    setManualRefreshing(true)
    try {
      await Promise.all([fetchSources(), dashboard.handleRefresh()])
    } finally {
      setManualRefreshing(false)
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
    const { error } = await supabase.from('execution_actions').insert(payload)
    if (error) {
      toast.error(`Não foi possível criar a atividade: ${error.message}`)
      throw error
    }
    toast.success('Atividade criada na Rotina do Dia.')
    await fetchSources()
  }

  const completeTask = async (
    task: ManagerRoutineTask,
    result: ManagerRoutineResult,
    observation: string,
  ) => {
    if (!profile?.id || !storeId) throw new Error('Gerente sem unidade vinculada.')
    const completedAt = new Date().toISOString()

    if (task.rowId) {
      const persisted = sourceRows.managerActions.find(row => row.id === task.rowId)
      if (!persisted) throw new Error('Atividade não encontrada para atualização.')
      const update = buildManagerRoutineCompletionUpdate({
        result,
        observation,
        managerId: profile.id,
        completedAt,
        metadata: readManagerRoutineMetadata(persisted.metadata),
      })
      const { error } = await supabase
        .from('execution_actions')
        .update(update)
        .eq('id', task.rowId)
        .eq('store_id', storeId)
        .eq('seller_id', profile.id)
      if (error) {
        toast.error(`Não foi possível concluir: ${error.message}`)
        throw error
      }
    } else {
      const { data: persisted, error: lookupError } = await supabase
        .from('execution_actions')
        .select('id,metadata')
        .eq('store_id', storeId)
        .eq('seller_id', profile.id)
        .eq('source_type', 'manual')
        .contains('metadata', { manager_daily: true, automatic_key: task.id })
        .limit(1)
        .maybeSingle()
      if (lookupError) {
        toast.error(`Não foi possível concluir: ${lookupError.message}`)
        throw lookupError
      }

      if (persisted) {
        const update = buildManagerRoutineCompletionUpdate({
          result,
          observation,
          managerId: profile.id,
          completedAt,
          metadata: readManagerRoutineMetadata(persisted.metadata),
        })
        const { error } = await supabase
          .from('execution_actions')
          .update(update)
          .eq('id', persisted.id)
          .eq('store_id', storeId)
          .eq('seller_id', profile.id)
        if (error) {
          toast.error(`Não foi possível concluir: ${error.message}`)
          throw error
        }
      } else {
        const payload = buildManagerRoutineAutomaticCompletionPayload({
          task,
          result,
          observation,
          managerId: profile.id,
          storeId,
          completedAt,
        })
        const { error } = await supabase.from('execution_actions').insert(payload)
        if (error) {
          toast.error(`Não foi possível concluir: ${error.message}`)
          throw error
        }
      }
    }

    toast.success('Resultado registrado na Rotina do Dia.')
    await fetchSources()
  }

  const navigateFromTask = (
    action: ManagerRoutineAction,
    task: ManagerRoutineTask,
    context: Parameters<React.ComponentProps<typeof ManagerDayRoutineView>['onNavigate']>[2],
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

  const dashboardError = errorMessage(dashboard.error)
  const storeName = storeId
    ? membership?.store?.name || dashboard.operationalStore?.name || 'Unidade vinculada'
    : null

  return (
    <div className="min-h-full bg-gray-50">
      <ManagerDayRoutineView
        returnLink={<ManagerHomeReturnLink />}
        referenceDate={referenceDate}
        storeName={storeName}
        tasks={tasks}
        historyTasks={historyTasks}
        sellers={sellers}
        loading={dashboard.loading || sourceLoading}
        error={sourceError || dashboardError}
        refreshing={manualRefreshing || dashboard.isRefetching}
        initialFilter={restoredContext?.filter || 'todas'}
        initialSort={restoredContext?.sort || 'prioridade'}
        onRefresh={refresh}
        onNavigate={navigateFromTask}
        onCreate={createTask}
        onComplete={completeTask}
      />
    </div>
  )
}

function consumeNavigationContext() {
  if (typeof sessionStorage === 'undefined') return null
  const parsed = parseManagerRoutineNavigationContext(sessionStorage.getItem(NAVIGATION_CONTEXT_KEY))
  if (parsed) sessionStorage.removeItem(NAVIGATION_CONTEXT_KEY)
  return parsed
}

function shiftIsoDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function errorMessage(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'message' in value && typeof value.message === 'string') return value.message
  return 'Não foi possível carregar a rotina do gerente.'
}

export default ManagerDayRoutine

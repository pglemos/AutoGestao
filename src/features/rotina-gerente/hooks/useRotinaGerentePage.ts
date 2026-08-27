import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { useTeam, useStores } from '@/hooks/useTeam'
import { calculateReferenceDate, useCheckins } from '@/hooks/useCheckins'
import { useGoals, useStoreMetaRules } from '@/hooks/useGoals'
import { useRanking } from '@/hooks/useRanking'
import { useManagerRoutine } from '@/hooks/useManagerRoutine'
import { useFeedbacks, useNotifications } from '@/hooks/useData'
import { usePDISessions } from '@/hooks/usePDI_MX'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { useStoreSales } from '@/hooks/useStoreSales'
import { useCheckinAuditor } from '@/hooks/useCheckinAuditor'
import { somarVendas, getDiasInfo } from '@/lib/calculations'
import { getSupabaseFunctionUrl, supabase } from '@/lib/supabase'
import { buildStoreSalesRules } from '@/lib/storeSalesRules'
import { buildDailyRoutineReminder } from '@/lib/daily-routine'
import type {
  PendingCorrectionRequest,
  RoutineNotice,
  RoutineProgress,
  RoutineTab,
} from '../data/types'

/**
 * Hook orquestrador da página RotinaGerente.
 * Encapsula TODA a lógica de dados, eventos realtime e handlers de rotina diária.
 * Container apenas consome e renderiza sections (Story 3.6, ADR-0050).
 */
export function useRotinaGerentePage() {
  const [tab, setTab] = useState<RoutineTab>('diario')
  const { role, membership } = useAuth()
  const isAdmin = isPerfilInternoMx(role)
  const { lojas } = useStores()
  const [selectedStoreId, setSelectedStoreId] = useState<string>('')

  const effectiveStoreId = isAdmin ? selectedStoreId : undefined

  const { sellers, refetch: refetchTeam } = useTeam(effectiveStoreId)
  const { checkins, fetchCheckins } = useCheckins(effectiveStoreId)
  const { storeGoal, fetchGoals } = useGoals(effectiveStoreId)
  const { metaRules, fetchMetaRules } = useStoreMetaRules(effectiveStoreId)
  const { ranking, refetch: refetchRanking } = useRanking(effectiveStoreId)
  const { routineLog, registerRoutine } = useManagerRoutine(effectiveStoreId)
  const { refetch: refetchFeedbacks } = useFeedbacks(
    isAdmin ? { storeId: effectiveStoreId } : undefined,
  )
  // Sincroniza a sessão de PDI de verdade; `usePDIs` recarregava a tabela
  // `pdis`, vazia em produção, e a rotina anunciava "PDI atualizado" à toa.
  const { refetch: refetchPDIs } = usePDISessions(effectiveStoreId)
  const { sendNotification } = useNotifications()
  const {
    fetchPendingRequests,
    approveRequest,
    rejectRequest,
    loading: auditorLoading,
  } = useCheckinAuditor(effectiveStoreId)

  const [routineNotice, setRoutineNotice] = useState<RoutineNotice | null>(null)
  const [matinalAudit, setMatinalAudit] = useState<RoutineNotice | null>(null)
  const [pendingRequests, setPendingRequests] = useState<PendingCorrectionRequest[]>([])
  const [executing, setExecuting] = useState(false)
  const [reuniaoDone, setReuniaoDone] = useState(false)
  const [agendaValidated, setAgendaDone] = useState(false)
  const [routineNotes, setRoutineNotes] = useState('')
  const [savingRoutine, setSavingRoutine] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const [sentReminderKeys, setSentReminderKeys] = useState<Set<string>>(new Set())

  const handleRefresh = useCallback(async () => {
    setIsRefetching(true)
    try {
      const [reqs] = await Promise.all([
        fetchPendingRequests(),
        fetchCheckins(),
        fetchGoals(),
        fetchMetaRules(),
        refetchRanking(),
        refetchTeam(),
        refetchFeedbacks(),
        refetchPDIs(),
      ])
      setPendingRequests(reqs)
      setRoutineNotice({
        tone: 'success',
        message: 'Rotina sincronizada.',
        detail:
          'Dados de equipe, ranking, metas, PDI, devolutivas e ajustes foram atualizados.',
        at: new Date(),
      })
      toast.success('Rotina sincronizada.')
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Falha ao sincronizar a rotina.'
      setRoutineNotice({
        tone: 'error',
        message: 'Falha na sincronização da rotina.',
        detail,
        at: new Date(),
      })
      toast.error(detail)
    } finally {
      setIsRefetching(false)
    }
  }, [
    fetchCheckins,
    fetchGoals,
    fetchMetaRules,
    refetchRanking,
    refetchTeam,
    refetchFeedbacks,
    refetchPDIs,
    fetchPendingRequests,
  ])

  // Event Bus: Realtime Notifications for Manager
  useEffect(() => {
    const storeIdToListen = effectiveStoreId || membership?.store_id
    if (!storeIdToListen) return

    const channel = supabase
      .channel('manager_routine_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lancamentos_diarios',
          filter: `store_id=eq.${storeIdToListen}`,
        },
        () => {
          setRoutineNotice({
            tone: 'info',
            message: 'Novo Fechamento Diário recebido.',
            detail: 'A performance da unidade foi atualizada em tempo real.',
            at: new Date(),
          })
          toast.info('Novo Fechamento Diário recebido!', {
            description: 'A performance da unidade foi atualizada em tempo real.',
          })
          handleRefresh()
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'solicitacoes_correcao_lancamento',
          filter: `store_id=eq.${storeIdToListen}`,
        },
        () => {
          setRoutineNotice({
            tone: 'warning',
            message: 'Nova solicitação de correção.',
            detail: 'Revise a aba Ajustes antes de concluir a rotina.',
            at: new Date(),
          })
          toast.warning('Nova solicitação de correção!', {
            description: 'Um vendedor solicitou ajuste em registro passado.',
          })
          handleRefresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [effectiveStoreId, membership?.store_id, handleRefresh])

  const diasInfo = useMemo(() => getDiasInfo(), [])
  const expectedAttainment = useMemo(
    () => (diasInfo.decorridos / diasInfo.total) * 100,
    [diasInfo],
  )

  const storeSales = useStoreSales({
    checkins,
    ranking,
    rules: buildStoreSalesRules({
      storeId: effectiveStoreId || membership?.store_id,
      monthlyGoal: storeGoal?.target || 0,
      metaRules,
    }),
  })

  const referenceDate = calculateReferenceDate()
  const previousDayCheckins = useMemo(
    () => checkins.filter((c) => c.reference_date === referenceDate),
    [checkins, referenceDate],
  )
  const pendingSellers = useMemo(
    () => (sellers || []).filter((s) => !s.checkin_today),
    [sellers],
  )
  const activeRoutineStoreId = effectiveStoreId || membership?.store_id || ''
  const totalAgendamentosHoje = useMemo(
    () =>
      previousDayCheckins.reduce(
        (acc, c) => acc + (c.agd_cart_today || 0) + (c.agd_net_today || 0),
        0,
      ),
    [previousDayCheckins],
  )
  const previousDayLeads = useMemo(
    () => previousDayCheckins.reduce((acc, c) => acc + (c.leads_prev_day || 0), 0),
    [previousDayCheckins],
  )
  const previousDaySales = useMemo(
    () => previousDayCheckins.reduce((acc, c) => acc + somarVendas([c]), 0),
    [previousDayCheckins],
  )

  const canTriggerMatinal = useMemo(
    () => reuniaoDone && agendaValidated && pendingSellers.length === 0,
    [reuniaoDone, agendaValidated, pendingSellers],
  )

  const routineProgress = useMemo<RoutineProgress>(() => {
    const steps = [
      { label: 'Reunião individual', done: reuniaoDone },
      { label: 'Agenda validada', done: agendaValidated },
      { label: 'Registros completos', done: pendingSellers.length === 0 },
    ]
    const doneCount = steps.filter((step) => step.done).length
    return {
      steps,
      doneCount,
      total: steps.length,
      percent: Math.round((doneCount / steps.length) * 100),
    }
  }, [agendaValidated, pendingSellers.length, reuniaoDone])

  useEffect(() => {
    fetchPendingRequests().then(setPendingRequests)
  }, [fetchPendingRequests])

  const handleApproveCorrection = useCallback(
    async (req: PendingCorrectionRequest) => {
      const { error } = await approveRequest(req)
      if (error) toast.error(error)
      else {
        setRoutineNotice({
          tone: 'success',
          message: 'Correção aprovada.',
          detail: `${req.seller?.name || 'Nome não informado'} teve o ajuste aplicado ao histórico.`,
          at: new Date(),
        })
        toast.success('Correção aprovada e aplicada ao histórico!')
        handleRefresh()
      }
    },
    [approveRequest, handleRefresh],
  )

  const handleRejectCorrection = useCallback(
    async (id: string) => {
      const { error } = await rejectRequest(id)
      if (error) toast.error(error)
      else {
        setRoutineNotice({
          tone: 'warning',
          message: 'Solicitação rejeitada.',
          detail:
            'A decisão ficou registrada e a solicitação saiu da fila de ajustes.',
          at: new Date(),
        })
        toast.success('Solicitação de ajuste rejeitada.')
        handleRefresh()
      }
    },
    [rejectRequest, handleRefresh],
  )

  const handleTriggerMatinal = useCallback(async () => {
    setExecuting(true)
    try {
      const { data, error } = await supabase.functions.invoke('relatorio-matinal')
      if (!error) {
        const notice = {
          tone: 'success' as const,
          message: 'Relatório Matinal disparado.',
          detail: 'Edge Function executada com sucesso para a unidade atual.',
          at: new Date(),
        }
        setMatinalAudit(notice)
        setRoutineNotice(notice)
        toast.success('Relatório Matinal disparado!')
      } else {
        const notice = {
          tone: 'error' as const,
          message: 'Falha no disparo do Matinal.',
          detail: error.message || 'Edge Function retornou erro.',
          at: new Date(),
        }
        setMatinalAudit(notice)
        setRoutineNotice(notice)
        toast.error('Falha ao disparar Relatório Matinal.')
      }
    } catch {
      const notice = {
        tone: 'error' as const,
        message: 'Erro de conexão no disparo.',
        detail: 'Não foi possível se comunicar com o serviço do Relatório Matinal.',
        at: new Date(),
      }
      setMatinalAudit(notice)
      setRoutineNotice(notice)
      toast.error('Erro de conexão ao disparar Relatório Matinal.')
    } finally {
      setExecuting(false)
    }
  }, [])

  const handleRegisterRoutine = useCallback(async () => {
    setSavingRoutine(true)
    const { error } = await registerRoutine({
      reference_date: referenceDate,
      checkins_pending_count: pendingSellers.length,
      sem_registro_count: pendingSellers.length,
      agd_cart_today: previousDayCheckins.reduce(
        (acc, c) => acc + (c.agd_cart_today || 0),
        0,
      ),
      agd_net_today: previousDayCheckins.reduce(
        (acc, c) => acc + (c.agd_net_today || 0),
        0,
      ),
      previous_day_leads: previousDayLeads,
      previous_day_sales: previousDaySales,
      ranking_snapshot: storeSales.processedRanking.slice(0, 10).map((item) => ({
        user_id: item.user_id,
        user_name: item.user_name,
        position: item.position,
        vnd_total: item.vnd_total,
        meta: item.meta,
        atingimento: item.atingimento,
      })),
      notes: routineNotes,
    })
    setSavingRoutine(false)
    if (error) toast.error(error)
    else {
      toast.success('Rotina diária firmada!')
      refetchTeam()
    }
  }, [
    registerRoutine,
    referenceDate,
    pendingSellers.length,
    previousDayCheckins,
    previousDayLeads,
    previousDaySales,
    storeSales.processedRanking,
    routineNotes,
    refetchTeam,
  ])

  const handleSendDailyReminders = useCallback(async () => {
    if (!activeRoutineStoreId || pendingSellers.length === 0) return

    const reminders = pendingSellers
      .map((seller) =>
        buildDailyRoutineReminder({
          seller,
          storeId: activeRoutineStoreId,
          referenceDate,
        }),
      )
      .filter((reminder) => !sentReminderKeys.has(reminder.dedupe_key))

    if (reminders.length === 0) {
      setRoutineNotice({
        tone: 'info',
        message: 'Lembretes já enviados.',
        detail: 'Lembretes desta puxada já foram enviados nesta sessão.',
        at: new Date(),
      })
      toast.info('Lembretes desta puxada já foram enviados nesta sessão.')
      return
    }

    const results = await Promise.all(
      reminders.map((reminder) =>
        sendNotification({
          title: reminder.title,
          message: reminder.message,
          type: reminder.type,
          priority: reminder.priority,
          recipient_id: reminder.recipient_id,
          store_id: reminder.store_id,
          link: reminder.link,
        }),
      ),
    )

    const failed = results.filter((result) => result?.error).length
    if (failed > 0) {
      setRoutineNotice({
        tone: 'error',
        message: 'Falha parcial nos lembretes.',
        detail: `${failed} lembrete(s) não foram enviados.`,
        at: new Date(),
      })
      toast.error(`${failed} lembrete(s) não foram enviados.`)
      return
    }
    setSentReminderKeys(
      (prev) => new Set([...prev, ...reminders.map((reminder) => reminder.dedupe_key)]),
    )
    setRoutineNotice({
      tone: 'success',
      message: 'Lembretes enviados.',
      detail: `${reminders.length} vendedor(es) pendentes foram notificados.`,
      at: new Date(),
    })
    toast.success(`${reminders.length} lembrete(s) enviados para vendedores pendentes.`)
  }, [
    activeRoutineStoreId,
    pendingSellers,
    referenceDate,
    sendNotification,
    sentReminderKeys,
  ])

  return {
    // state básico
    tab,
    setTab,
    isAdmin,
    lojas,
    selectedStoreId,
    setSelectedStoreId,
    membership,
    // rotina daily state
    reuniaoDone,
    setReuniaoDone,
    agendaValidated,
    setAgendaDone,
    routineNotes,
    setRoutineNotes,
    routineNotice,
    matinalAudit,
    pendingRequests,
    pendingSellers,
    executing,
    savingRoutine,
    isRefetching,
    auditorLoading,
    routineLog,
    activeRoutineStoreId,
    // derived
    routineProgress,
    canTriggerMatinal,
    totalAgendamentosHoje,
    expectedAttainment,
    // handlers
    handleRefresh,
    handleApproveCorrection,
    handleRejectCorrection,
    handleTriggerMatinal,
    handleRegisterRoutine,
    handleSendDailyReminders,
  }
}

export type UseRotinaGerentePageReturn = ReturnType<typeof useRotinaGerentePage>

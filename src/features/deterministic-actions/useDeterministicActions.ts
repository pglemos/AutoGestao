import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import {
  DETERMINISTIC_RULE_VERSION,
  deriveDeterministicActions,
  type DeterministicAction,
  type TargetPaceInfo,
} from '@/lib/deterministic-actions'
import {
  applyDeterministicResolutions,
  buildDeterministicActionInput,
  type AppointmentRow,
  type CustomerRow,
  type DeterministicResolutionRow,
  type OpportunityRow,
  type ProposalEventRow,
} from './deterministic-action-data'
import { toDeterministicRole } from './deterministic-role'

interface UseDeterministicActionsOptions {
  targetPace?: TargetPaceInfo
}

interface UseDeterministicActionsResult {
  actions: DeterministicAction[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  resolveAction: (action: DeterministicAction) => Promise<{ error: string | null }>
}

function saoPauloDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date())
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Erro desconhecido')
  }
  return error instanceof Error ? error.message : 'Erro ao carregar ações determinísticas.'
}

export function useDeterministicActions(
  options: UseDeterministicActionsOptions = {},
): UseDeterministicActionsResult {
  const { supabaseUser, activeStoreId, storeId, role } = useAuth()
  const effectiveStoreId = activeStoreId || storeId || null
  const normalizedRole = toDeterministicRole(role)
  const targetPace = options.targetPace
  const [actions, setActions] = useState<DeterministicAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refresh = useCallback(async () => {
    if (!supabaseUser || !effectiveStoreId) {
      setActions([])
      setLoading(false)
      setError(null)
      return
    }

    if (!normalizedRole) {
      setActions([])
      setLoading(false)
      setError('Perfil sem permissão para receber ações determinísticas.')
      return
    }

    setLoading(true)
    setError(null)
    const refDate = saoPauloDate()

    try {
      let opportunitiesQuery = supabase
        .from('oportunidades')
        .select('id, cliente_id, etapa, valor_negociado, closed_at, cancelada_em, cancelada_por, motivo_cancelamento, motivo_perda, created_at, updated_at, seller_user_id')
        .eq('loja_id', effectiveStoreId)

      let customersQuery = supabase
        .from('clientes')
        .select('id, nome, status, proxima_acao, proxima_acao_em, ultima_interacao, seller_user_id, do_not_contact')
        .eq('loja_id', effectiveStoreId)

      let appointmentsQuery = supabase
        .from('agendamentos')
        .select('id, cliente_id, oportunidade_id, data_hora, status')
        .eq('loja_id', effectiveStoreId)
        .eq('status', 'aguardando')

      let proposalsQuery = supabase
        .from('eventos_comerciais')
        .select('id, cliente_id, oportunidade_id, data_evento')
        .eq('loja_id', effectiveStoreId)
        .eq('tipo_evento', 'proposta_enviada')
        .gte('data_evento', `${refDate.substring(0, 7)}-01T00:00:00-03:00`)

      let resolutionsQuery = supabase
        .from('deterministic_action_resolutions')
        .select('action_id, scenario_code, opportunity_id, customer_id, completed_at, completed_by, rule_version')
        .eq('store_id', effectiveStoreId)
        .eq('rule_version', DETERMINISTIC_RULE_VERSION)

      if (normalizedRole === 'seller') {
        opportunitiesQuery = opportunitiesQuery.eq('seller_user_id', supabaseUser.id)
        customersQuery = customersQuery.eq('seller_user_id', supabaseUser.id)
        appointmentsQuery = appointmentsQuery.eq('seller_user_id', supabaseUser.id)
        proposalsQuery = proposalsQuery.eq('seller_user_id', supabaseUser.id)
        resolutionsQuery = resolutionsQuery.eq('seller_user_id', supabaseUser.id)
      }

      const [opportunitiesResult, customersResult, appointmentsResult, proposalsResult, resolutionsResult] =
        await Promise.all([
          opportunitiesQuery,
          customersQuery,
          appointmentsQuery,
          proposalsQuery,
          resolutionsQuery,
        ])

      const firstError = [
        opportunitiesResult.error,
        customersResult.error,
        appointmentsResult.error,
        proposalsResult.error,
        resolutionsResult.error,
      ].find(Boolean)

      if (firstError) throw firstError

      const rows = {
        opportunities: (opportunitiesResult.data ?? []) as OpportunityRow[],
        customers: (customersResult.data ?? []) as CustomerRow[],
        appointments: (appointmentsResult.data ?? []) as AppointmentRow[],
        proposalEvents: (proposalsResult.data ?? []) as ProposalEventRow[],
        resolutions: (resolutionsResult.data ?? []) as DeterministicResolutionRow[],
      }

      const input = buildDeterministicActionInput(rows, {
        refDate,
        role: normalizedRole,
        userId: supabaseUser.id,
        storeId: effectiveStoreId,
        targetPace,
      })
      const derived = deriveDeterministicActions(input)
      setActions(applyDeterministicResolutions(derived, rows.resolutions))
    } catch (refreshError) {
      setActions([])
      setError(errorMessage(refreshError))
    } finally {
      setLoading(false)
    }
  }, [effectiveStoreId, normalizedRole, supabaseUser, targetPace])

  const resolveAction = useCallback(async (action: DeterministicAction) => {
    if (!supabaseUser || !effectiveStoreId) return { error: 'Sessão ou loja não identificada.' }
    if (!normalizedRole) return { error: 'Perfil sem permissão para tratar esta ação.' }
    if (action.scenarioCode === 'AUTOMATIC_TASK_ORIGIN_PENDING') {
      return { error: 'Regularize a origem da pendência antes de concluir esta ação.' }
    }

    const { error: upsertError } = await supabase
      .from('deterministic_action_resolutions')
      .upsert({
        action_id: action.id,
        scenario_code: action.scenarioCode,
        resolution_key: action.resolutionKey,
        rule_version: action.ruleVersion,
        store_id: effectiveStoreId,
        user_id: supabaseUser.id,
        seller_user_id: action.sellerUserId,
        customer_id: action.customerId,
        opportunity_id: action.opportunityId,
        evidence: action.evidence,
        completed_by: supabaseUser.id,
        completed_at: new Date().toISOString(),
      }, {
        onConflict: 'completed_by,action_id,rule_version',
        ignoreDuplicates: false,
      })

    if (upsertError) return { error: upsertError.message }
    await refresh()
    return { error: null }
  }, [effectiveStoreId, normalizedRole, refresh, supabaseUser])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!supabaseUser || !effectiveStoreId || !normalizedRole) return

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => void refresh(), 250)
    }

    const channel = supabase
      .channel(`deterministic-actions:${effectiveStoreId}:${supabaseUser.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oportunidades', filter: `loja_id=eq.${effectiveStoreId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `loja_id=eq.${effectiveStoreId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: `loja_id=eq.${effectiveStoreId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_comerciais', filter: `loja_id=eq.${effectiveStoreId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deterministic_action_resolutions', filter: `store_id=eq.${effectiveStoreId}` }, scheduleRefresh)
      .subscribe()

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      void supabase.removeChannel(channel)
    }
  }, [effectiveStoreId, normalizedRole, refresh, supabaseUser])

  return { actions, loading, error, refresh, resolveAction }
}

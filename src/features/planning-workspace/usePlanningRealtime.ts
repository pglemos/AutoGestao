import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type PlanningRealtimeScope = 'strategic' | 'action' | 'consulting'
export type PlanningRealtimeStatus = 'connecting' | 'connected' | 'degraded'

export const PLANNING_REALTIME_TABLES = {
  strategic: [
    'catalogo_indicadores_planejamento',
    'valores_indicadores_planejamento',
    'regras_metas_loja',
    'planos_acao',
    'historico_valores_indicadores_planejamento',
  ],
  action: ['planos_acao', 'historico_planos_acao', 'evidencias_planos_acao'],
  consulting: [
    'clientes_consultoria',
    'visitas_consultoria',
    'evidencias_visita',
    'eventos_agenda_consultoria',
    'solicitacoes_consultoria',
    'consultoria_progresso_aula',
    'consultoria_itens_entrega',
    'consultoria_participantes_encontro',
    'consultoria_solicitacoes_antecipacao',
    'consultoria_historico_antecipacao',
  ],
} as const satisfies Record<PlanningRealtimeScope, readonly string[]>

const STORE_FILTER_COLUMN: Partial<Record<string, string>> = {
  clientes_consultoria: 'primary_store_id',
  valores_indicadores_planejamento: 'loja_id',
  regras_metas_loja: 'store_id',
  planos_acao: 'scope_id',
  consultoria_progresso_aula: 'store_id',
  consultoria_itens_entrega: 'store_id',
  consultoria_participantes_encontro: 'store_id',
  consultoria_solicitacoes_antecipacao: 'store_id',
}

import { createPlanningReloadScheduler } from './planningReloadScheduler'

export function usePlanningRealtime({
  scope,
  storeId,
  reload,
}: {
  scope: PlanningRealtimeScope
  storeId: string | null
  reload: () => Promise<void> | void
}): { status: PlanningRealtimeStatus } {
  const [status, setStatus] = useState<PlanningRealtimeStatus>('connecting')

  useEffect(() => {
    if (!storeId) {
      setStatus('connecting')
      return
    }

    let hasConnected = false
    let wasDegraded = false
    const scheduler = createPlanningReloadScheduler(reload)
    const channel = supabase.channel(`planning-${scope}-${storeId}`)

    for (const table of PLANNING_REALTIME_TABLES[scope]) {
      const filterColumn = STORE_FILTER_COLUMN[table]
      const config = {
        event: '*' as const,
        schema: 'public',
        table,
        ...(filterColumn ? { filter: `${filterColumn}=eq.${storeId}` } : {}),
      }
      channel.on('postgres_changes', config, () => scheduler.schedule())
    }

    channel.subscribe((nextStatus) => {
      if (nextStatus === 'SUBSCRIBED') {
        setStatus('connected')
        if (hasConnected && wasDegraded) scheduler.flush()
        hasConnected = true
        wasDegraded = false
        return
      }
      if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT' || nextStatus === 'CLOSED') {
        wasDegraded = true
        setStatus('degraded')
      }
    })

    return () => {
      scheduler.dispose()
      void supabase.removeChannel(channel)
    }
  }, [reload, scope, storeId])

  return { status }
}

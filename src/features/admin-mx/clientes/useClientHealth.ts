import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { classifyDataSource, mergeTimeline, type DataSourceHealth, type TimelineEvent } from './clientProgress'

type State = {
  sources: DataSourceHealth[]
  timeline: TimelineEvent[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Integridade de dados e linha do tempo do cliente.
 *
 * A auditoria não vive numa tabela só: parte está em `logs_auditoria`, parte no
 * histórico de planos de ação e parte nos próprios encontros. A aba junta as
 * três em uma linha do tempo — separado, ninguém consegue reconstruir o que
 * aconteceu com o cliente.
 */
export function useClientHealth(clientId: string | undefined, storeId: string | null): State {
  const [sources, setSources] = useState<DataSourceHealth[]>([])
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!clientId) {
      setSources([])
      setTimeline([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [visits, targets, results, plans, launches, evidences, audit, planHistory] = await Promise.all([
        supabase.from('visitas_consultoria').select('id, status, effective_visit_date, scheduled_at, visit_number, updated_at').eq('client_id', clientId).order('scheduled_at', { ascending: false }),
        supabase.from('metas_metricas_cliente').select('id, updated_at').eq('client_id', clientId),
        supabase.from('resultados_metricas_cliente').select('id, reference_date').eq('client_id', clientId).order('reference_date', { ascending: false }).limit(400),
        supabase.from('itens_plano_acao').select('id, updated_at').eq('client_id', clientId),
        storeId
          ? supabase.from('lancamentos_diarios').select('id, data').eq('loja_id', storeId).order('data', { ascending: false }).limit(400)
          : Promise.resolve({ data: [] as Array<{ id: string; data: string | null }> }),
        supabase.from('consultoria_itens_entrega').select('id, updated_at, status').eq('client_id', clientId),
        supabase.from('logs_auditoria').select('id, action, entity, entity_id, created_at, user_id').eq('entity_id', clientId).order('created_at', { ascending: false }).limit(40),
        supabase.from('historico_planos_acao').select('id, event_type, event_note, changed_at, changed_by, plano_id').order('changed_at', { ascending: false }).limit(40),
      ])

      const first = <T extends Record<string, unknown>>(rows: T[] | null | undefined, field: string) =>
        rows?.length ? (rows[0][field] as string | null) ?? null : null

      setSources([
        classifyDataSource({ key: 'visitas', label: 'Encontros da jornada', rows: visits.data?.length ?? 0, lastAt: first(visits.data, 'scheduled_at') }),
        classifyDataSource({ key: 'lancamentos', label: 'Lançamentos diários da loja', rows: launches.data?.length ?? 0, lastAt: first(launches.data, 'data') }),
        classifyDataSource({ key: 'metas', label: 'Metas de indicadores', rows: targets.data?.length ?? 0, lastAt: first(targets.data, 'updated_at') }),
        classifyDataSource({ key: 'resultados', label: 'Resultados de indicadores', rows: results.data?.length ?? 0, lastAt: first(results.data, 'reference_date') }),
        classifyDataSource({ key: 'planos', label: 'Itens de plano de ação', rows: plans.data?.length ?? 0, lastAt: first(plans.data, 'updated_at') }),
        classifyDataSource({ key: 'entregas', label: 'Entregas dos encontros', rows: evidences.data?.length ?? 0, lastAt: first(evidences.data, 'updated_at') }),
      ])

      const userIds = [...new Set([
        ...(audit.data ?? []).map(row => row.user_id),
        ...(planHistory.data ?? []).map(row => row.changed_by),
      ].filter((id): id is string => Boolean(id)))]
      const { data: users } = userIds.length
        ? await supabase.from('usuarios').select('id, name').in('id', userIds)
        : { data: [] as Array<{ id: string; name: string | null }> }
      const names = new Map((users ?? []).map(user => [user.id, user.name]))

      setTimeline(mergeTimeline([
        (audit.data ?? []).map(row => ({
          id: `audit-${row.id}`,
          at: row.created_at,
          actor: row.user_id ? names.get(row.user_id) ?? null : null,
          action: row.action ?? 'alteração',
          entity: row.entity ?? 'registro',
          detail: null,
        })),
        (planHistory.data ?? []).map(row => ({
          id: `plan-${row.id}`,
          at: row.changed_at,
          actor: row.changed_by ? names.get(row.changed_by) ?? null : null,
          action: row.event_type ?? 'atualização',
          entity: 'plano de ação',
          detail: row.event_note ?? null,
        })),
        (visits.data ?? []).filter(visit => visit.status === 'concluida').map(visit => ({
          id: `visit-${visit.id}`,
          at: visit.effective_visit_date ?? visit.updated_at ?? '',
          actor: null,
          action: 'encontro concluído',
          entity: `visita ${visit.visit_number ?? '—'}`,
          detail: null,
        })),
      ]))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar integridade e histórico.')
    } finally {
      setLoading(false)
    }
  }, [clientId, storeId])

  useEffect(() => { void refetch() }, [refetch])

  return { sources, timeline, loading, error, refetch }
}

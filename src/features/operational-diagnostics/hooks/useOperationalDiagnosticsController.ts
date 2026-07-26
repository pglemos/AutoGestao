import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCheckins } from '@/hooks/useCheckins'
import { isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { calcularFunil, gerarDiagnosticoMX } from '@/lib/calculations'
import { isLancamentosViaRpcEnabled } from '@/lib/feature-flags'
import type { DailyCheckin } from '@/types/database'
import type { DiagnosticFinding } from '../types'

const ADMIN_AUDIT_LIMIT = 1000
const ADMIN_AUDIT_DAYS = 90
const daysAgoISO = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); return date.toISOString().slice(0, 10) }

export function useOperationalDiagnosticsController() {
  const { role } = useAuth()
  const { checkins: storeCheckins } = useCheckins()
  const internal = isPerfilInternoMx(role)
  const [adminCheckins, setAdminCheckins] = useState<DailyCheckin[]>([])
  const [loading, setLoading] = useState(internal)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  const fetchAdmin = useCallback(async (manual = false) => {
    if (!internal) return
    if (manual) setRefreshing(true)
    else setLoading(true)
    try {
      if (isLancamentosViaRpcEnabled()) {
        const { data, error: rpcError } = await supabase.rpc('get_lancamentos_rede_periodo', { p_start_date: daysAgoISO(ADMIN_AUDIT_DAYS), p_end_date: new Date().toISOString().slice(0, 10), p_scope: 'daily' })
        if (rpcError) throw rpcError
        setAdminCheckins(((data as DailyCheckin[] | null) || []).slice(0, ADMIN_AUDIT_LIMIT))
      } else {
        const { data, error: queryError } = await supabase.from('lancamentos_diarios').select('id, seller_user_id, reference_date, leads_prev_day, agd_cart_prev_day, agd_net_prev_day, agd_cart_today, agd_net_today, vnd_porta_prev_day, vnd_cart_prev_day, vnd_net_prev_day, visit_prev_day').eq('metric_scope', 'daily').gte('reference_date', daysAgoISO(ADMIN_AUDIT_DAYS)).order('reference_date', { ascending: false }).limit(ADMIN_AUDIT_LIMIT)
        if (queryError) throw queryError
        setAdminCheckins((data || []) as DailyCheckin[])
      }
      setError(null)
      setLastUpdatedAt(new Date())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o diagnóstico.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [internal])

  useEffect(() => { void fetchAdmin(false) }, [fetchAdmin])
  const checkins = internal ? adminCheckins : storeCheckins
  const funnel = useMemo(() => calcularFunil(checkins), [checkins])
  const diagnosis = useMemo(() => gerarDiagnosticoMX(funnel), [funnel])
  const findings = useMemo<DiagnosticFinding[]>(() => [{
    id: 'funnel-health',
    severity: diagnosis.gargalo ? 'warning' : 'info',
    title: diagnosis.gargalo ? 'Gargalo operacional identificado' : 'Funil dentro da leitura esperada',
    description: diagnosis.diagnostico,
    suggestedAction: diagnosis.sugestao,
    evidence: [`${funnel.leads} leads`, `${funnel.agd_total} agendamentos`, `${funnel.visitas} visitas`, `${funnel.vnd_total} vendas`],
    completed: false,
  }], [diagnosis, funnel])

  return { role, internal, checkins, funnel, findings, loading, refreshing, error, lastUpdatedAt, refresh: () => fetchAdmin(true) }
}

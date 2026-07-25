import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import {
  MxErrorState,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { isPmrMainCycleVisitNumber } from '@/lib/consultoria/pmr-visit-rules'
import {
  parseConsultingClientArray,
  type ConsultingClient,
} from '@/lib/schemas/consulting-client.schema'
import { ConsultingClientTable } from './components/ConsultingClientTable'
import { ConsultingClientMetrics } from './sections/ConsultingClientMetrics'
import { ConsultingClientToolbar } from './sections/ConsultingClientToolbar'
import { filterConsultingClients } from './lib/consultingClientFilters'

type VisitSummary = {
  visit_number: number
  status: string
  created_at: string
  effective_visit_date?: string | null
}

type ScopedClientRow = ConsultingClient & {
  visitas_consultoria?: VisitSummary[] | null
}

function buildMetrics(rows: ConsultingClient[]) {
  const active = rows.filter(row => (row.status || 'ativo') === 'ativo').length
  const visits = rows.reduce((total, row) => total + Number(row.current_visit_step || 0), 0)
  const healthy = rows.filter(row => {
    if (!row.last_visit_at) return false
    const elapsed = Date.now() - new Date(row.last_visit_at).getTime()
    return Number.isFinite(elapsed) && elapsed <= 21 * 24 * 60 * 60 * 1000
  }).length
  return {
    total: rows.length,
    active,
    visits,
    health: rows.length > 0 ? (healthy / rows.length) * 100 : 0,
  }
}

export function ConsultantAssignedClientsPage() {
  const { profile } = useAuth()
  const [clients, setClients] = useState<ConsultingClient[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!profile?.id) {
      setClients([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data: assignments, error: assignmentError } = await supabase
        .from('atribuicoes_consultoria')
        .select('client_id')
        .eq('user_id', profile.id)
        .eq('active', true)

      if (assignmentError) throw assignmentError
      const clientIds = Array.from(new Set((assignments || []).map(item => item.client_id).filter(Boolean)))
      if (clientIds.length === 0) {
        setClients([])
        return
      }

      const { data, error: clientError } = await supabase
        .from('clientes_consultoria')
        .select('*, visitas_consultoria(visit_number,status,created_at,effective_visit_date)')
        .in('id', clientIds)
        .order('name', { ascending: true })

      if (clientError) throw clientError
      const scopedRows = ((data || []) as unknown as ScopedClientRow[]).map(row => {
        const latestVisit = (row.visitas_consultoria || [])
          .filter(visit => visit.status === 'concluida' && isPmrMainCycleVisitNumber(visit.visit_number))
          .sort((left, right) => new Date(right.effective_visit_date || right.created_at).getTime() - new Date(left.effective_visit_date || left.created_at).getTime())[0]
        return {
          ...row,
          last_visit_at: latestVisit ? latestVisit.effective_visit_date || latestVisit.created_at : null,
        }
      })
      setClients(parseConsultingClientArray(scopedRows))
    } catch (cause) {
      setClients([])
      setError(cause instanceof Error ? cause.message : 'Falha ao carregar os clientes vinculados.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    void refetch()
  }, [refetch])

  const rows = useMemo(() => filterConsultingClients(clients, search), [clients, search])
  const metrics = useMemo(() => buildMetrics(rows), [rows])

  return (
    <MxModulePage id="consultant-assigned-clients">
      <MxModuleHeader
        eyebrow="Minha carteira consultiva"
        title="CRM de Consultoria"
        description="Acesso limitado aos clientes com atribuição ativa para o seu perfil."
        actions={<><Button asChild variant="managerSecondary"><Link to="/agenda"><CalendarDays size={18} />Agenda MX</Link></Button><Button variant="managerSecondary" onClick={() => void refetch()}><RefreshCw size={18} />Atualizar</Button></>}
      />
      <MxStatusBanner tone="info">Somente clientes vinculados ao seu usuário são consultados e exibidos.</MxStatusBanner>
      {loading ? <MxLoadingState label="Carregando clientes vinculados" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : <><ConsultingClientMetrics metrics={metrics} /><ConsultingClientToolbar search={search} onSearch={setSearch} /><MxSectionCard><MxSectionHeader title="Clientes vinculados" description={`${rows.length} registro(s) visível(is).`} /><div className="p-5"><ConsultingClientTable rows={rows} /></div></MxSectionCard></>}
    </MxModulePage>
  )
}

export default ConsultantAssignedClientsPage

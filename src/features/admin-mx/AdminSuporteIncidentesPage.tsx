import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Headphones,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
} from '@/components/module/MxModuleVisualPrimitives'
import { supabase } from '@/lib/supabase'

const PRIORITY_STYLES = {
  CRITICO: 'bg-[var(--mx-color-danger-subtle)] text-[var(--mx-color-danger-text)]',
  ALTO: 'bg-[var(--mx-color-warning-subtle)] text-[var(--mx-color-warning-text)]',
  MEDIO: 'bg-[var(--mx-color-primary-subtle)] text-[var(--mx-color-primary)]',
  BAIXO: 'bg-[var(--mx-color-surface-muted)] text-[var(--mx-color-text-secondary)]',
}

interface SupportTicket {
  id: string
  title: string
  client: string
  category: string
  priority: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAIXO'
  status: 'ABERTO' | 'EM_ATENDIMENTO' | 'RESOLVIDO' | 'FECHADO'
  date: string
}

export function AdminSuporteIncidentesPage() {
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const { data: clients } = await supabase
        .from('clientes_consultoria')
        .select('id, name, status, updated_at')
        .order('name')

      const computed: SupportTicket[] = []
      for (const client of clients || []) {
        if (client.status === 'em_configuracao' || client.status === 'rascunho') {
          computed.push({
            id: `ticket-${client.id}`,
            title: `Apoio na parametrização inicial da unidade`,
            client: client.name,
            category: 'Implantação',
            priority: 'MEDIO',
            status: 'EM_ATENDIMENTO',
            date: client.updated_at ? new Date(client.updated_at).toLocaleDateString('pt-BR') : 'Hoje',
          })
        }
      }
      setTickets(computed)
    } catch {
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchTickets()
  }, [])

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'todos' && t.status !== statusFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.client.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <MxModulePage width={width} bottomClearance={bottomClearance}>
      <MxModuleHeader
        icon={Headphones}
        eyebrow="Plataforma e Governança"
        title="Suporte e Incidentes"
        description="Gestão de chamados operacionais, dúvidas metodológicas e incidentes técnicos."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void fetchTickets()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
            </Button>
            <Button variant="primary" size="sm">
              <Plus size={14} /> Novo Chamado
            </Button>
          </div>
        }
      />

      {/* Métricas de Suporte */}
      <MxMetricGrid>
        <MxMetricCard
          title="Em Atendimento"
          value={tickets.filter(t => t.status === 'EM_ATENDIMENTO').length}
          detail="Chamados em análise pela equipe MX"
          icon={Headphones}
          tone="info"
        />
        <MxMetricCard
          title="Críticos"
          value={tickets.filter(t => t.priority === 'CRITICO').length}
          detail="Incidentes com impacto operacional"
          icon={AlertTriangle}
          tone="danger"
        />
        <MxMetricCard
          title="Resolvidos"
          value={tickets.filter(t => t.status === 'RESOLVIDO').length}
          detail="Chamados concluídos com sucesso"
          icon={CheckCircle2}
          tone="success"
        />
      </MxMetricGrid>

      {/* Lista de Chamados */}
      <MxSectionCard>
        <div className="p-4 border-b border-[var(--mx-color-border-subtle)]">
          <input
            type="text"
            placeholder="Buscar por título ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-[var(--mx-color-border-subtle)] bg-transparent outline-none text-[var(--mx-color-text-primary)]"
          />
        </div>

        {loading ? (
          <div className="p-8">
            <MxLoadingState label="Carregando chamados..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <MxEmptyState
              icon={Headphones}
              title="Nenhum chamado registrado"
              description="Não há tickets ou incidentes em aberto no momento."
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--mx-color-border-subtle)]">
            {filtered.map(ticket => (
              <div key={ticket.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-[var(--mx-color-text-primary)]">
                      {ticket.title}
                    </div>
                    <div className="text-xs text-[var(--mx-color-text-secondary)] mt-0.5">
                      {ticket.client} • {ticket.category} • {ticket.date}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${PRIORITY_STYLES[ticket.priority]}`}>
                      {ticket.priority}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[var(--mx-color-surface-muted)] text-[var(--mx-color-text-secondary)]">
                      {ticket.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </MxSectionCard>
    </MxModulePage>
  )
}

export default AdminSuporteIncidentesPage

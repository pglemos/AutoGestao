import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Minus,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
} from '@/components/module/MxModuleVisualPrimitives'
import { supabase } from '@/lib/supabase'

const STATE_STYLES = {
  OFICIAL: { label: 'Oficial', tone: 'bg-[var(--mx-color-success-subtle)] text-[var(--mx-color-success-text)]', icon: CheckCircle2 },
  DECLARADO: { label: 'Declarado', tone: 'bg-[var(--mx-color-primary-subtle)] text-[var(--mx-color-primary)]', icon: Clock },
  DESATUALIZADO: { label: 'Desatualizado', tone: 'bg-[var(--mx-color-warning-subtle)] text-[var(--mx-color-warning-text)]', icon: AlertTriangle },
  INCONSISTENTE: { label: 'Inconsistente', tone: 'bg-[var(--mx-color-danger-subtle)] text-[var(--mx-color-danger-text)]', icon: XCircle },
  NAO_APLICAVEL: { label: 'N/A', tone: 'bg-[var(--mx-color-surface-muted)] text-[var(--mx-color-text-secondary)]', icon: Minus },
  ERRO_TECNICO: { label: 'Erro Técnico', tone: 'bg-[var(--mx-color-warning-subtle)] text-[var(--mx-color-warning-text)]', icon: AlertCircle },
}

interface ReconciliationRow {
  id: string
  client: string
  domain: string
  state: keyof typeof STATE_STYLES
  last_update: string
  responsible: string
  note: string
}

export function AdminDadosConciliacaoPage() {
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [rows, setRows] = useState<ReconciliationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stateFilter, setStateFilter] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  const fetchReconciliations = async () => {
    setLoading(true)
    try {
      const { data: clients } = await supabase
        .from('clientes_consultoria')
        .select('id, name, status, updated_at')
        .order('name')

      const computed: ReconciliationRow[] = (clients || []).map(client => ({
        id: client.id,
        client: client.name,
        domain: 'Operacional MX',
        state: client.status === 'ativo' ? 'OFICIAL' : client.status === 'pronto_para_ativar' ? 'DECLARADO' : 'DESATUALIZADO',
        last_update: client.updated_at ? new Date(client.updated_at).toLocaleDateString('pt-BR') : 'Sem registro',
        responsible: 'Equipe MX',
        note: client.status === 'ativo' ? 'Dados consolidados' : 'Em processo de conferência',
      }))
      setRows(computed)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchReconciliations()
  }, [])

  const filtered = rows.filter(d => {
    if (stateFilter && d.state !== stateFilter) return false
    if (search && !d.client.toLowerCase().includes(search.toLowerCase()) && !d.domain.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <MxModulePage width={width} bottomClearance={bottomClearance}>
      <MxModuleHeader
        icon={Database}
        eyebrow="Plataforma e Governança"
        title="Dados e Conciliação"
        description="Qualidade, atualizações e conciliações de dados operacionais e financeiros por cliente."
        actions={
          <Button variant="outline" size="sm" onClick={() => void fetchReconciliations()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </Button>
        }
      />

      {/* Grid de Estados */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(STATE_STYLES).map(([key, val]) => {
          const Icon = val.icon
          const count = rows.filter(d => d.state === key).length
          return (
            <button
              key={key}
              onClick={() => setStateFilter(stateFilter === key ? '' : key)}
              className={`rounded-xl p-3 text-center border-2 transition-all ${
                stateFilter === key
                  ? 'border-[var(--mx-color-primary)]'
                  : 'border-transparent'
              } ${val.tone}`}
            >
              <Icon size={16} className="mx-auto mb-1" />
              <div className="text-lg font-bold">{count}</div>
              <div className="text-xs font-medium">{val.label}</div>
            </button>
          )
        })}
      </div>

      {/* Tabela de Conciliação */}
      <MxSectionCard>
        <div className="p-4 border-b border-[var(--mx-color-border-subtle)]">
          <input
            type="text"
            placeholder="Buscar por cliente ou domínio..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-[var(--mx-color-border-subtle)] bg-transparent outline-none text-[var(--mx-color-text-primary)]"
          />
        </div>

        {loading ? (
          <div className="p-8">
            <MxLoadingState label="Carregando conciliação de dados..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <MxEmptyState
              icon={Database}
              title="Nenhum registro encontrado"
              description="Não foram localizados registros de conciliação para os filtros selecionados."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[var(--mx-color-surface-muted)] border-b border-[var(--mx-color-border-subtle)] text-xs text-[var(--mx-color-text-secondary)] font-semibold uppercase">
                <tr>
                  <th className="px-5 py-3">Cliente</th>
                  <th className="px-4 py-3">Domínio</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Última Atualização</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--mx-color-border-subtle)]">
                {filtered.map((row, i) => {
                  const style = STATE_STYLES[row.state]
                  const Icon = style.icon
                  return (
                    <tr key={i} className="transition-colors">
                      <td className="px-5 py-3 font-semibold text-[var(--mx-color-text-primary)]">{row.client}</td>
                      <td className="px-4 py-3 text-[var(--mx-color-text-secondary)]">{row.domain}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${style.tone}`}>
                          <Icon size={12} />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--mx-color-text-secondary)]">{row.last_update}</td>
                      <td className="px-4 py-3 text-xs text-[var(--mx-color-text-primary)]">{row.responsible}</td>
                      <td className="px-4 py-3 text-xs text-[var(--mx-color-text-secondary)]">{row.note}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </MxSectionCard>
    </MxModulePage>
  )
}

export default AdminDadosConciliacaoPage

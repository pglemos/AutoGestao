import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxTableSurface,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { supabase } from '@/lib/supabase'

type AlertType = 'CRITICO' | 'ATENCAO' | 'POSITIVO' | 'CONSULTIVO'

interface AlertItem {
  id: string
  client_name: string
  alert_type: AlertType
  title: string
  description: string
  status: 'ATIVO' | 'RESOLVIDO' | 'IGNORADO'
  created_at: string
}

const SCORE_FAIXAS = [
  { label: 'Elite', range: '90–100', tone: 'bg-[var(--mx-color-success)] text-white' },
  { label: 'Excelente', range: '80–89', tone: 'bg-[var(--mx-color-success-subtle)] text-[var(--mx-color-success-text)]' },
  { label: 'Bom', range: '70–79', tone: 'bg-[var(--mx-color-primary-subtle)] text-[var(--mx-color-primary)]' },
  { label: 'Atenção', range: '60–69', tone: 'bg-[var(--mx-color-warning-subtle)] text-[var(--mx-color-warning-text)]' },
  { label: 'Crítico', range: '< 60', tone: 'bg-[var(--mx-color-danger-subtle)] text-[var(--mx-color-danger-text)]' },
]

export function AdminScoresAlertasPage() {
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('todos')
  const [search, setSearch] = useState('')

  const fetchAlerts = async () => {
    setLoading(true)
    setError(null)
    try {
      // Alertas derivados do estado real do cadastro do cliente — não há
      // tabela de alertas de consultoria: a `alerts` do banco é operacional
      // (loja/vendedor) e pertence a outro escopo.
      const { data: clients } = await supabase
        .from('clientes_consultoria')
        .select('id, name, status, business_phase, updated_at')
        .order('name')

      const generatedAlerts: AlertItem[] = []
      for (const client of clients || []) {
        if (client.status === 'rascunho' || client.status === 'em_configuracao') {
          generatedAlerts.push({
            id: `alert-cfg-${client.id}`,
            client_name: client.name,
            alert_type: 'ATENCAO',
            title: 'Onboarding em aberto',
            description: 'Cliente com cadastro incompleto aguardando definição de Dono Master ou Lojas.',
            status: 'ATIVO',
            created_at: client.updated_at ?? '',
          })
        }
        if (client.status === 'pronto_para_ativar') {
          generatedAlerts.push({
            id: `alert-rdy-${client.id}`,
            client_name: client.name,
            alert_type: 'POSITIVO',
            title: 'Pronto para Ativação',
            description: 'Checklist inicial concluído. Operação pode ser ativada.',
            status: 'ATIVO',
            created_at: client.updated_at ?? '',
          })
        }
      }

      setAlerts(generatedAlerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar alertas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAlerts()
  }, [])

  const filtered = alerts.filter(a => {
    if (typeFilter !== 'todos' && a.alert_type !== typeFilter) return false
    if (search && !a.client_name.toLowerCase().includes(search.toLowerCase()) && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    critico: alerts.filter(a => a.alert_type === 'CRITICO').length,
    atencao: alerts.filter(a => a.alert_type === 'ATENCAO').length,
    positivo: alerts.filter(a => a.alert_type === 'POSITIVO').length,
    consultivo: alerts.filter(a => a.alert_type === 'CONSULTIVO').length,
  }

  return (
    <MxModulePage width={width} bottomClearance={bottomClearance}>
      <MxModuleHeader
        icon={Target}
        eyebrow="Plataforma e Governança"
        title="Scores e Alertas"
        description="Monitore a saúde da plataforma, faixas de consistência e alertas operacionais por cliente."
        actions={
          <Button variant="outline" size="sm" onClick={() => void fetchAlerts()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        }
      />

      {/* Escala de Score MX */}
      <MxSectionCard>
        <div className="p-4 border-b border-[var(--mx-color-border-subtle)]">
          <h3 className="font-semibold text-sm text-[var(--mx-color-text-primary)]">
            Escala de Score MX (0 a 100)
          </h3>
          <p className="text-xs text-[var(--mx-color-text-secondary)] mt-0.5">
            Consistência = Rotina × 70% + Disciplina × 30%. Erros técnicos ou ausência temporária de base não penalizam indevidamente a unidade.
          </p>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {SCORE_FAIXAS.map(f => (
            <div key={f.label} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${f.tone}`}>
              {f.label}: {f.range}
            </div>
          ))}
        </div>
      </MxSectionCard>

      {/* Contadores */}
      <MxMetricGrid>
        <MxMetricCard
          title="Críticos Ativos"
          value={counts.critico}
          detail="Exigem ação imediata"
          icon={AlertTriangle}
          tone="danger"
          actionLabel="Filtrar críticos"
          onAction={() => setTypeFilter('CRITICO')}
        />
        <MxMetricCard
          title="Atenção Ativos"
          value={counts.atencao}
          detail="Desvios operacionais detectados"
          icon={AlertTriangle}
          tone="warning"
          actionLabel="Filtrar atenção"
          onAction={() => setTypeFilter('ATENCAO')}
        />
        <MxMetricCard
          title="Alertas Positivos"
          value={counts.positivo}
          detail="Metas e marcos atingidos"
          icon={CheckCircle2}
          tone="success"
          actionLabel="Filtrar positivos"
          onAction={() => setTypeFilter('POSITIVO')}
        />
        <MxMetricCard
          title="Consultivos"
          value={counts.consultivo}
          detail="Sugestões de melhoria"
          icon={Info}
          tone="violet"
          actionLabel="Filtrar consultivos"
          onAction={() => setTypeFilter('CONSULTIVO')}
        />
      </MxMetricGrid>

      {/* Toolbar & Lista de Alertas */}
      <MxSectionCard>
        <div className="p-4 border-b border-[var(--mx-color-border-subtle)]">
          <input
            type="text"
            placeholder="Buscar por cliente ou título..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-80 px-3 py-1.5 text-xs rounded-lg border border-[var(--mx-color-border-subtle)] bg-transparent outline-none text-[var(--mx-color-text-primary)]"
          />
        </div>

        {loading ? (
          <div className="p-8">
            <MxLoadingState label="Carregando alertas do sistema..." />
          </div>
        ) : error ? (
          <div className="p-8">
            <MxErrorState description={error} retry={() => void fetchAlerts()} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8">
            <MxEmptyState
              icon={Target}
              title="Nenhum alerta registrado"
              description="Os alertas operacionais e de consistência são gerados automaticamente com base nas regras da plataforma."
            />
          </div>
        ) : (
          <div className="divide-y divide-[var(--mx-color-border-subtle)]">
            {filtered.map(alert => (
              <div key={alert.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        alert.alert_type === 'CRITICO'
                          ? 'bg-[var(--mx-color-danger-subtle)] text-[var(--mx-color-danger-text)]'
                          : alert.alert_type === 'ATENCAO'
                          ? 'bg-[var(--mx-color-warning-subtle)] text-[var(--mx-color-warning-text)]'
                          : 'bg-[var(--mx-color-success-subtle)] text-[var(--mx-color-success-text)]'
                      }`}
                    >
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--mx-color-text-primary)]">
                        {alert.title}
                      </div>
                      <div className="text-xs font-medium text-[var(--mx-color-primary)] mt-0.5">
                        {alert.client_name}
                      </div>
                      <p className="text-xs text-[var(--mx-color-text-secondary)] mt-1">
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                      alert.alert_type === 'CRITICO'
                        ? 'bg-[var(--mx-color-danger-subtle)] text-[var(--mx-color-danger-text)]'
                        : alert.alert_type === 'ATENCAO'
                        ? 'bg-[var(--mx-color-warning-subtle)] text-[var(--mx-color-warning-text)]'
                        : 'bg-[var(--mx-color-success-subtle)] text-[var(--mx-color-success-text)]'
                    }`}
                  >
                    {alert.alert_type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </MxSectionCard>
    </MxModulePage>
  )
}

export default AdminScoresAlertasPage

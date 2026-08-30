import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Package,
  Plus,
  RefreshCw,
  Rocket,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
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
} from '@/components/module/MxModuleVisualPrimitives'
import { useClientPortfolio } from './clientes/useClientPortfolio'
import { portfolioCounters, journeyLabel, structureLabel, type PortfolioClient } from './clientes/clientPortfolio'
import { fetchInscricoesPendentes } from './clientes/inscricaoAutocadastroMutations'
import type { InscricaoRow } from './clientes/inscricaoAutocadastro'
import { fetchLojasSemMeta, vendedoresImpactados, type LojaSemMeta } from './lojasSemMeta'

export function AdminDashboardPage() {
  const { rows: clients, loading, error, refetch } = useClientPortfolio()
  const [pendingList, setPendingList] = useState<InscricaoRow[]>([])
  const [lojasSemMeta, setLojasSemMeta] = useState<LojaSemMeta[]>([])
  const location = useLocation()
  const navigate = useNavigate()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  useEffect(() => {
    fetchInscricoesPendentes().then(res => {
      setPendingList(res.rows.slice(0, 5))
    }).catch(() => {
      setPendingList([])
    })
  }, [])

  useEffect(() => {
    fetchLojasSemMeta().then(res => {
      setLojasSemMeta(res.lojas)
    }).catch(() => {
      setLojasSemMeta([])
    })
  }, [])

  const bucketCounters = useMemo(() => portfolioCounters(clients), [clients])

  const recentClients = useMemo(() => {
    return clients.slice(0, 6)
  }, [clients])

  // Alertas operacionais baseados nos dados reais de clientes
  const systemAlerts = useMemo(() => {
    const alerts: Array<{ id: string; title: string; subtitle: string; tone: 'danger' | 'warning' | 'info'; link: string }> = []
    
    const unassigned = clients.filter(c => c.assignments === 0 && (c.status === 'ativo' || c.status === 'ativo_em_implantacao'))
    if (unassigned.length > 0) {
      alerts.push({
        id: 'unassigned',
        title: `${unassigned.length} cliente(s) ativo(s) sem consultor atribuído`,
        subtitle: 'Atribua um consultor MX qualificado para iniciar o acompanhamento.',
        tone: 'warning',
        link: '/clientes?bucket=com_bloqueios',
      })
    }

    const readyToActivate = clients.filter(c => c.status === 'pronto_para_ativar')
    if (readyToActivate.length > 0) {
      alerts.push({
        id: 'ready-activate',
        title: `${readyToActivate.length} cliente(s) pronto(s) para ativação`,
        subtitle: 'Todos os pré-requisitos cumpridos. Agende ou confirme a ativação.',
        tone: 'info',
        link: '/clientes?bucket=prontos_para_ativar',
      })
    }

    const withoutOwner = clients.filter(c => !c.hasDonoMaster && c.status !== 'rascunho')
    if (withoutOwner.length > 0) {
      alerts.push({
        id: 'no-owner',
        title: `${withoutOwner.length} cliente(s) sem Dono Master cadastrado`,
        subtitle: 'Necessário para conceder acessos executivos à conta.',
        tone: 'danger',
        link: '/clientes?bucket=com_bloqueios',
      })
    }

    if (lojasSemMeta.length > 0) {
      const vendedores = vendedoresImpactados(lojasSemMeta)
      alerts.push({
        id: 'loja-sem-meta',
        title: `${lojasSemMeta.length} loja(s) em operação com meta mensal zerada`,
        subtitle: `${vendedores} vendedor(es) veem projeção e atingimento em 0%: ${lojasSemMeta.slice(0, 3).map(item => item.loja).join(', ')}${lojasSemMeta.length > 3 ? '…' : ''}`,
        tone: 'danger',
        link: '/clientes',
      })
    }

    return alerts
  }, [clients, lojasSemMeta])

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    })
  }, [])

  return (
    <MxModulePage width={width} bottomClearance={bottomClearance}>
      <MxModuleHeader
        title={`Panorama Operacional MX 👋`}
        description={`Visão geral da carteira, implantações, consultoria e governança — ${todayFormatted}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/clientes/novo')}
            >
              <Plus size={14} />
              Novo Cliente
            </Button>
          </div>
        }
      />

      {loading ? (
        <MxLoadingState label="Carregando panorama operacional..." />
      ) : error ? (
        <MxErrorState description={error} retry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          {/* Métricas Principais */}
          <MxMetricGrid>
            <MxMetricCard
              title="Clientes Ativos"
              value={bucketCounters.ativos}
              detail="Contratos ativos em execução"
              icon={CheckCircle2}
              tone="success"
              actionLabel="Ver ativos"
              onAction={() => navigate('/clientes?bucket=ativos')}
            />
            <MxMetricCard
              title="Em Implantação"
              value={bucketCounters.em_implantacao}
              detail="Jornada de onboarding em andamento"
              icon={Rocket}
              tone="info"
              actionLabel="Ver implantações"
              onAction={() => navigate('/clientes?bucket=em_implantacao')}
            />
            <MxMetricCard
              title="Prontos para Ativar"
              value={bucketCounters.prontos_para_ativar}
              detail="Checklist de ativação cumprido"
              icon={ClipboardList}
              tone="brand"
              actionLabel="Ver prontos"
              onAction={() => navigate('/clientes?bucket=prontos_para_ativar')}
            />
            <MxMetricCard
              title="Com Bloqueios"
              value={bucketCounters.com_bloqueios}
              detail="Falta Dono Master, loja ou produto"
              icon={AlertTriangle}
              tone="danger"
              actionLabel="Ver bloqueios"
              onAction={() => navigate('/clientes?bucket=com_bloqueios')}
            />
          </MxMetricGrid>

          {/* Grid Principal: Carteira Recente + Painel Lateral */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna 1 e 2: Carteira de Clientes Recentes */}
            <div className="lg:col-span-2 space-y-4">
              <MxSectionCard>
                <div className="flex items-center justify-between p-4 border-b border-[var(--mx-color-border-subtle)]">
                  <div className="flex items-center gap-2">
                    <BriefcaseBusiness size={16} className="text-[var(--mx-color-primary)]" />
                    <h3 className="font-semibold text-sm text-[var(--mx-color-text-primary)]">
                      Carteira de Clientes MX ({clients.length})
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/clientes')}
                    className="text-xs text-[var(--mx-color-primary)]"
                  >
                    Ver todos <ArrowRight size={12} className="ml-1" />
                  </Button>
                </div>

                {recentClients.length === 0 ? (
                  <div className="p-8">
                    <MxEmptyState
                      icon={Building2}
                      title="Nenhum cliente cadastrado"
                      description="Inicie a carteira criando o primeiro cliente da consultoria MX."
                      action={
                        <Button variant="primary" size="sm" onClick={() => navigate('/clientes/novo')}>
                          <Plus size={14} /> Cadastrar Cliente
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--mx-color-border-subtle)]">
                    {recentClients.map(client => (
                      <button
                        type="button"
                        key={client.id}
                        onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                        className="w-full flex items-center justify-between p-4 hover:bg-[var(--mx-color-surface-muted)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)] cursor-pointer transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--mx-color-surface-muted)] border border-[var(--mx-color-border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--mx-color-text-primary)]">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-[var(--mx-color-text-primary)] flex items-center gap-2">
                              {client.name}
                              <span className="text-xs font-normal text-[var(--mx-color-text-secondary)] px-1.5 py-0.5 rounded bg-[var(--mx-color-surface-muted)]">
                                {structureLabel(client)}
                              </span>
                            </div>
                            <div className="text-xs text-[var(--mx-color-text-secondary)] mt-0.5">
                              {client.primary_store_city || 'Cidade a definir'} • {client.implementation_owner_name || 'Responsável MX não atribuído'} • {journeyLabel(client)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                              (client.status ?? 'rascunho') === 'ativo'
                                ? 'bg-[var(--mx-color-success-subtle)] text-[var(--mx-color-success-text)]'
                                : (client.status ?? 'rascunho') === 'pronto_para_ativar'
                                ? 'bg-[var(--mx-color-primary-subtle)] text-[var(--mx-color-primary)]'
                                : (client.status ?? 'rascunho') === 'suspenso'
                                ? 'bg-[var(--mx-color-danger-subtle)] text-[var(--mx-color-danger-text)]'
                                : 'bg-[var(--mx-color-surface-muted)] text-[var(--mx-color-text-secondary)]'
                            }`}
                          >
                            {(client.status ?? 'rascunho').replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <ArrowRight size={14} className="text-[var(--mx-color-text-disabled)]" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </MxSectionCard>

              {/* Acesso Rápido aos Módulos Administrativos */}
              <MxSectionCard>
                <div className="p-4 border-b border-[var(--mx-color-border-subtle)]">
                  <h3 className="font-semibold text-sm text-[var(--mx-color-text-primary)]">
                    Acesso Rápido aos Domínios MX
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                  {[
                    { label: 'Clientes & Lojas', icon: BriefcaseBusiness, path: '/clientes', detail: `${clients.length} empresas` },
                    { label: 'Consultoria MX', icon: CalendarDays, path: '/consultoria', detail: 'Metodologia e visitas' },
                    { label: 'Plano Estratégico', icon: TrendingUp, path: '/plano-estrategico', detail: '46 indicadores e metas por cliente' },
                    { label: 'Planos de Ação', icon: ClipboardList, path: '/plano-acao', detail: 'Templates e Execução' },
                    { label: 'Equipe MX', icon: Users, path: '/equipe', detail: 'Consultores e capacidade' },
                    { label: 'Produtos de Consultoria', icon: Package, path: '/produtos', detail: 'Catálogo de programas' },
                  ].map(shortcut => {
                    const Icon = shortcut.icon
                    return (
                      <button
                        type="button"
                        key={shortcut.path}
                        onClick={() => navigate(shortcut.path)}
                        className="flex flex-col items-start p-3.5 rounded-lg border border-[var(--mx-color-border-subtle)] hover:border-[var(--mx-color-primary)] focus-visible:border-[var(--mx-color-primary)] hover:bg-[var(--mx-color-surface-muted)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)] text-left transition-all group"
                      >
                        <Icon size={16} className="text-[var(--mx-color-primary)] mb-2" />
                        <span className="text-xs font-semibold text-[var(--mx-color-text-primary)] group-hover:text-[var(--mx-color-primary)] group-focus-visible:text-[var(--mx-color-primary)]">
                          {shortcut.label}
                        </span>
                        <span className="text-xs text-[var(--mx-color-text-secondary)] mt-0.5">
                          {shortcut.detail}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </MxSectionCard>
            </div>

            {/* Coluna 3: Painel Lateral com Cadastros Pendentes e Alertas */}
            <div className="space-y-6">
              {/* Cadastros Pendentes */}
              <MxSectionCard>
                <div className="flex items-center justify-between p-4 border-b border-[var(--mx-color-border-subtle)]">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-[var(--mx-color-primary)]" />
                    <h3 className="font-semibold text-sm text-[var(--mx-color-text-primary)]">
                      Cadastros Recebidos
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/clientes?mode=cadastros')}
                    className="text-xs text-[var(--mx-color-primary)]"
                  >
                    Ver todos
                  </Button>
                </div>

                {pendingList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--mx-color-text-secondary)]">
                    Nenhum cadastro ou pré-registro pendente de validação.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--mx-color-border-subtle)]">
                    {pendingList.map(item => (
                      <div key={item.id} className="p-3.5">
                        <div className="text-xs font-semibold text-[var(--mx-color-text-primary)]">
                          {item.nome || 'Solicitação de Acesso'}
                        </div>
                        <div className="text-xs text-[var(--mx-color-text-secondary)] mt-0.5">
                          {item.email || item.telefone || 'Sem contato'} • {item.funcao_declarada || 'Aguardando validação'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </MxSectionCard>

              {/* Alertas Operacionais */}
              <MxSectionCard>
                <div className="p-4 border-b border-[var(--mx-color-border-subtle)]">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={16} className="text-[var(--mx-color-warning)]" />
                    <h3 className="font-semibold text-sm text-[var(--mx-color-text-primary)]">
                      Alertas e Bloqueios Operacionais
                    </h3>
                  </div>
                </div>

                {systemAlerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--mx-color-success-text)]">
                    <CheckCircle2 size={24} className="mx-auto mb-2 text-[var(--mx-color-success)]" />
                    Nenhum bloqueio operacional crítico detectado na carteira.
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--mx-color-border-subtle)]">
                    {systemAlerts.map(alert => (
                      <button
                        type="button"
                        key={alert.id}
                        onClick={() => navigate(alert.link)}
                        className="w-full p-3.5 hover:bg-[var(--mx-color-surface-muted)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)] cursor-pointer transition-colors text-left"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            size={14}
                            className={`shrink-0 mt-0.5 ${
                              alert.tone === 'danger'
                                ? 'text-[var(--mx-color-danger)]'
                                : 'text-[var(--mx-color-warning)]'
                            }`}
                          />
                          <div>
                            <div className="text-xs font-semibold text-[var(--mx-color-text-primary)]">
                              {alert.title}
                            </div>
                            <div className="text-xs text-[var(--mx-color-text-secondary)] mt-0.5">
                              {alert.subtitle}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </MxSectionCard>
            </div>
          </div>
        </div>
      )}
    </MxModulePage>
  )
}

export default AdminDashboardPage

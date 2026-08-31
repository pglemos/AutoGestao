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
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModulePage,
  MxSectionCard,
} from '@/components/module/MxModuleVisualPrimitives'
import { useClientPortfolio } from './clientes/useClientPortfolio'
import { portfolioCounters } from './clientes/clientPortfolio'
import { fetchInscricoesPendentes } from './clientes/inscricaoAutocadastroMutations'
import type { InscricaoRow } from './clientes/inscricaoAutocadastro'
import { fetchLojasSemMeta, vendedoresImpactados, type LojaSemMeta } from './lojasSemMeta'

function greetingForHour(date = new Date()): string {
  const hour = Number(date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }))
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function AdminDashboardPage() {
  const { rows: clients, loading, error, refetch } = useClientPortfolio()
  const [pendingList, setPendingList] = useState<InscricaoRow[]>([])
  const [lojasSemMeta, setLojasSemMeta] = useState<LojaSemMeta[]>([])
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const operationalView = searchParams.get('view') === 'operacional'

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

  const recentClients = useMemo(() => clients.slice(0, 6), [clients])

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
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--mx-color-text-primary)]">
              {greetingForHour()}, Administrador 👋
            </h1>
            <p className="mt-1 text-sm text-[var(--mx-color-text-secondary)]">
              Aqui está o panorama operacional do dia — {todayFormatted}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!operationalView ? (
              <Button variant="ghost" size="sm" onClick={() => navigate('/painel?view=operacional')}>
                Visão operacional
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate('/painel')}>
                Visão padrão
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </Button>
          </div>
        </div>

        {loading ? (
          <MxLoadingState label="Carregando panorama operacional..." />
        ) : error ? (
          <MxErrorState description={error} retry={() => void refetch()} />
        ) : (
          <>
            <MxMetricGrid>
              <MxMetricCard
                title="Clientes Ativos"
                value={bucketCounters.ativos}
                detail="Contratos ativos"
                icon={CheckCircle2}
                tone="success"
              />
              <MxMetricCard
                title="Em Implantação"
                value={bucketCounters.em_implantacao}
                detail="Onboarding em curso"
                icon={ClipboardList}
                tone="info"
              />
              <MxMetricCard
                title="Prontos para Ativar"
                value={bucketCounters.prontos_para_ativar}
                detail="Checklist concluído"
                icon={TrendingUp}
                tone="brand"
              />
              <MxMetricCard
                title="Com Bloqueios"
                value={bucketCounters.com_bloqueios}
                detail="Pendências impeditivas"
                icon={AlertTriangle}
                tone="danger"
              />
            </MxMetricGrid>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <MxSectionCard>
                  <div className="flex items-center justify-between border-b border-[var(--mx-color-border-subtle)] p-4">
                    <div className="flex items-center gap-2">
                      <BriefcaseBusiness size={16} className="text-[var(--mx-color-primary)]" />
                      <h3 className="text-sm font-semibold text-[var(--mx-color-text-primary)]">
                        Carteira de Clientes MX
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
                            <Plus size={14} /> Novo Cliente MX
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
                          className="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-[var(--mx-color-surface-muted)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mx-color-surface-muted)] text-xs font-bold text-[var(--mx-color-text-primary)]">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--mx-color-text-primary)]">
                                {client.name}
                              </div>
                              <div className="mt-0.5 text-xs text-[var(--mx-color-text-secondary)]">
                                {client.primary_store_city || 'Cidade a definir'} • {client.implementation_owner_name || 'Responsável MX não atribuído'}
                              </div>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              (client.status ?? 'rascunho') === 'ativo'
                                ? 'bg-[var(--mx-color-success-subtle)] text-[var(--mx-color-success-text)]'
                                : (client.status ?? 'rascunho') === 'pronto_para_ativar'
                                ? 'bg-[var(--mx-color-primary-subtle)] text-[var(--mx-color-primary)]'
                                : (client.status ?? 'rascunho') === 'suspenso'
                                ? 'bg-[var(--mx-color-danger-subtle)] text-[var(--mx-color-danger-text)]'
                                : 'bg-[var(--mx-color-surface-muted)] text-[var(--mx-color-text-secondary)]'
                            }`}
                          >
                            {(client.status ?? 'rascunho').replace(/_/g, ' ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </MxSectionCard>

                {operationalView ? (
                  <MxSectionCard>
                    <div className="border-b border-[var(--mx-color-border-subtle)] p-4">
                      <h3 className="text-sm font-semibold text-[var(--mx-color-text-primary)]">
                        Acesso Rápido aos Domínios MX
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
                      {[
                        { label: 'Clientes & Lojas', icon: BriefcaseBusiness, path: '/clientes', detail: `${clients.length} empresas` },
                        { label: 'Consultoria MX', icon: CalendarDays, path: '/consultoria', detail: 'Metodologia e visitas' },
                        { label: 'Plano Estratégico', icon: TrendingUp, path: '/plano-estrategico', detail: 'Indicadores e metas por cliente' },
                        { label: 'Planos de Ação', icon: ClipboardList, path: '/plano-acao', detail: 'Templates e execução' },
                        { label: 'Equipe MX', icon: Users, path: '/equipe', detail: 'Consultores e capacidade' },
                        { label: 'Produtos de Consultoria', icon: Package, path: '/produtos', detail: 'Catálogo de programas' },
                      ].map(shortcut => {
                        const Icon = shortcut.icon
                        return (
                          <button
                            type="button"
                            key={shortcut.path}
                            onClick={() => navigate(shortcut.path)}
                            className="group flex flex-col items-start rounded-lg border border-[var(--mx-color-border-subtle)] p-3.5 text-left transition-all hover:border-[var(--mx-color-primary)] hover:bg-[var(--mx-color-surface-muted)] focus-visible:border-[var(--mx-color-primary)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)]"
                          >
                            <Icon size={16} className="mb-2 text-[var(--mx-color-primary)]" />
                            <span className="text-xs font-semibold text-[var(--mx-color-text-primary)] group-hover:text-[var(--mx-color-primary)] group-focus-visible:text-[var(--mx-color-primary)]">
                              {shortcut.label}
                            </span>
                            <span className="mt-0.5 text-xs text-[var(--mx-color-text-secondary)]">
                              {shortcut.detail}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </MxSectionCard>
                ) : null}
              </div>

              <div className="space-y-6">
                <MxSectionCard>
                  <div className="flex items-center justify-between border-b border-[var(--mx-color-border-subtle)] p-4">
                    <div className="flex items-center gap-2">
                      <UserCheck size={16} className="text-[var(--mx-color-primary)]" />
                      <h3 className="text-sm font-semibold text-[var(--mx-color-text-primary)]">
                        Cadastros Pendentes
                      </h3>
                    </div>
                    {pendingList.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/clientes?tab=inscricoes')}
                        className="text-xs text-[var(--mx-color-primary)]"
                      >
                        Ver
                      </Button>
                    ) : null}
                  </div>

                  {pendingList.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--mx-color-text-secondary)]">
                      Nenhum cadastro aguardando validação.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--mx-color-border-subtle)]">
                      {pendingList.map(item => (
                        <div key={item.id} className="p-3.5">
                          <div className="text-xs font-semibold text-[var(--mx-color-text-primary)]">
                            {item.nome || 'Solicitação de Acesso'}
                          </div>
                          <div className="mt-0.5 text-xs text-[var(--mx-color-text-secondary)]">
                            {item.email || item.telefone || 'Sem contato'} • {item.funcao_declarada || 'Aguardando validação'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </MxSectionCard>

                <MxSectionCard>
                  <div className="flex items-center justify-between border-b border-[var(--mx-color-border-subtle)] p-4">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={16} className="text-[var(--mx-color-warning)]" />
                      <h3 className="text-sm font-semibold text-[var(--mx-color-text-primary)]">
                        Alertas Ativos
                      </h3>
                    </div>
                    {systemAlerts.length > 0 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/clientes?tab=governanca')}
                        className="text-xs text-[var(--mx-color-primary)]"
                      >
                        Ver
                      </Button>
                    ) : null}
                  </div>

                  {systemAlerts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--mx-color-text-secondary)]">
                      Nenhum bloqueio crítico no momento.
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--mx-color-border-subtle)]">
                      {systemAlerts.slice(0, 4).map(alert => (
                        <button
                          type="button"
                          key={alert.id}
                          onClick={() => navigate(alert.link)}
                          className="w-full cursor-pointer p-3.5 text-left transition-colors hover:bg-[var(--mx-color-surface-muted)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)]"
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle
                              size={14}
                              className={`mt-0.5 shrink-0 ${
                                alert.tone === 'danger'
                                  ? 'text-[var(--mx-color-danger)]'
                                  : 'text-[var(--mx-color-warning)]'
                              }`}
                            />
                            <div>
                              <div className="text-xs font-semibold text-[var(--mx-color-text-primary)]">
                                {alert.title}
                              </div>
                              <div className="mt-0.5 text-xs text-[var(--mx-color-text-secondary)]">
                                {alert.subtitle}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </MxSectionCard>

                <MxSectionCard>
                  <div className="border-b border-[var(--mx-color-border-subtle)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--mx-color-text-primary)]">
                      Ações Rápidas
                    </h3>
                  </div>
                  <div className="space-y-2 p-4">
                    <Button className="w-full justify-center" variant="primary" onClick={() => navigate('/clientes/novo')}>
                      Novo Cliente MX
                    </Button>
                    <Button className="w-full justify-center" variant="info" onClick={() => navigate('/clientes?tab=inscricoes')}>
                      Validar Cadastros
                    </Button>
                    <Button className="w-full justify-center" variant="warning" onClick={() => navigate('/produtos')}>
                      Novo Produto
                    </Button>
                    <Button className="w-full justify-center bg-brand-secondary text-white hover:bg-brand-secondary/90 focus-visible:ring-brand-secondary/20" onClick={() => navigate('/seguranca')}>
                      Ver Auditoria
                    </Button>
                  </div>
                </MxSectionCard>
              </div>
            </div>
          </>
        )}
      </div>
    </MxModulePage>
  )
}

export default AdminDashboardPage

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Package,
  Plus,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UserCheck,
  Building2,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { getSafeUserFacingDataError } from '@/lib/errors/user-facing-error'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'
import { NetworkDashboardContent } from '@/features/network-dashboard/NetworkDashboardContent'
import { useClientPortfolio } from './clientes/useClientPortfolio'
import { portfolioCounters } from './clientes/clientPortfolio'
import { fetchInscricoesPendentes } from './clientes/inscricaoAutocadastroMutations'
import type { InscricaoRow } from './clientes/inscricaoAutocadastro'
import { fetchLojasSemMeta, vendedoresImpactados, type LojaSemMeta } from './lojasSemMeta'

function errorMessage(cause: unknown, fallback: string): string {
  return getSafeUserFacingDataError(cause, fallback)
}

function statusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    ativo_em_implantacao: 'Ativo em implantação',
    em_implantacao: 'Em implantação',
    em_configuracao: 'Em configuração',
    pronto_para_ativar: 'Pronto para ativar',
    suspenso: 'Suspenso',
    rascunho: 'Rascunho',
  }
  return labels[status ?? 'rascunho'] ?? (status ?? 'Rascunho').replace(/_/g, ' ')
}

function statusClass(status: string | null | undefined): string {
  if (status === 'ativo') return 'bg-[var(--mx-color-success-subtle)] text-[var(--mx-color-success-text)]'
  if (status === 'pronto_para_ativar') return 'bg-[var(--mx-color-primary-subtle)] text-[var(--mx-color-primary)]'
  if (status === 'suspenso') return 'bg-[var(--mx-color-danger-subtle)] text-[var(--mx-color-danger-text)]'
  return 'bg-[var(--mx-color-surface-muted)] text-[var(--mx-color-text-secondary)]'
}

function formatTime(value: Date | null): string {
  return value ? value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'ainda não sincronizado'
}

export function AdminDashboardPage() {
  const { rows: clients, loading: clientsLoading, error: clientsError, lastUpdatedAt: clientsUpdatedAt, refetch: refetchClients } = useClientPortfolio()
  const [pendingList, setPendingList] = useState<InscricaoRow[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [pendingError, setPendingError] = useState<string | null>(null)
  const [pendingUpdatedAt, setPendingUpdatedAt] = useState<Date | null>(null)
  const [lojasSemMeta, setLojasSemMeta] = useState<LojaSemMeta[]>([])
  const [lojasLoading, setLojasLoading] = useState(true)
  const [lojasError, setLojasError] = useState<string | null>(null)
  const [lojasUpdatedAt, setLojasUpdatedAt] = useState<Date | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const loadPending = useCallback(async () => {
    setPendingLoading(true)
    setPendingError(null)
    try {
      const result = await fetchInscricoesPendentes()
      if (result.error) throw new Error(result.error)
      setPendingList(result.rows.slice(0, 5))
      setPendingUpdatedAt(new Date())
    } catch (cause) {
      setPendingError(errorMessage(cause, 'Falha ao carregar cadastros pendentes.'))
    } finally {
      setPendingLoading(false)
    }
  }, [])

  const loadStoresWithoutGoal = useCallback(async () => {
    setLojasLoading(true)
    setLojasError(null)
    try {
      const result = await fetchLojasSemMeta()
      if (result.error) throw new Error(result.error)
      setLojasSemMeta(result.lojas)
      setLojasUpdatedAt(new Date())
    } catch (cause) {
      setLojasError(errorMessage(cause, 'Falha ao verificar metas das lojas.'))
    } finally {
      setLojasLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPending()
    void loadStoresWithoutGoal()
  }, [loadPending, loadStoresWithoutGoal])

  const refreshGovernance = useCallback(async () => {
    await Promise.all([refetchClients(), loadPending(), loadStoresWithoutGoal()])
  }, [loadPending, loadStoresWithoutGoal, refetchClients])

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

  const governanceUpdatedAt = useMemo(() => {
    return [clientsUpdatedAt, pendingUpdatedAt, lojasUpdatedAt]
      .filter((value): value is Date => Boolean(value))
      .reduce<Date | null>((latest, value) => !latest || value > latest ? value : latest, null)
  }, [clientsUpdatedAt, lojasUpdatedAt, pendingUpdatedAt])

  const governanceLoading = clientsLoading || pendingLoading || lojasLoading

  return (
    <MxModulePage width={width} bottomClearance={bottomClearance}>
      <div className="space-y-8">
        <NetworkDashboardContent scope="internal" />

        <section id="governanca-carteira" aria-labelledby="governanca-carteira-title" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 id="governanca-carteira-title" className="text-xl font-semibold text-[var(--mx-color-text-primary)]">Governança da carteira</h2>
              <p className="mt-1 max-w-3xl text-sm text-[var(--mx-color-text-secondary)]">Cadastros, acessos, ativação e configuração de metas. Esta leitura complementa o cockpit comercial acima.</p>
              <p className="mt-1 text-xs text-[var(--mx-color-text-secondary)]">Última leitura do conjunto: {formatTime(governanceUpdatedAt)}.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refreshGovernance()} disabled={governanceLoading}>
              <RefreshCw size={14} className={governanceLoading ? 'animate-spin motion-reduce:animate-none' : ''} />
              Atualizar governança
            </Button>
          </div>

          {clientsError && clients.length > 0 ? <MxStatusBanner tone="warning">A carteira está desatualizada. Os dados anteriores foram mantidos até a próxima tentativa. {clientsError}</MxStatusBanner> : null}
          {pendingError && pendingList.length > 0 ? <MxStatusBanner tone="warning">Cadastros pendentes: leitura anterior mantida. {pendingError}</MxStatusBanner> : null}
          {lojasError && lojasSemMeta.length > 0 ? <MxStatusBanner tone="warning">A verificação de metas está desatualizada. Os alertas anteriores foram mantidos. {lojasError}</MxStatusBanner> : null}

          {clientsLoading && clients.length === 0 ? <MxLoadingState label="Carregando governança da carteira..." /> : clientsError && clients.length === 0 ? <MxErrorState title="Não foi possível carregar a governança" description={clientsError} retry={() => void refreshGovernance()} /> : (
            <>
              <MxMetricGrid>
                <MxMetricCard title="Clientes Ativos" value={bucketCounters.ativos} detail="Contratos ativos na carteira" icon={CheckCircle2} tone="success" actionLabel="Abrir clientes ativos" onAction={() => navigate('/clientes?bucket=ativos')} />
                <MxMetricCard title="Em implantação" value={bucketCounters.em_implantacao} detail="Jornada consultiva em curso" icon={ClipboardList} tone="info" actionLabel="Abrir implantação" onAction={() => navigate('/clientes?bucket=em_implantacao')} />
                <MxMetricCard title="Prontos para ativar" value={bucketCounters.prontos_para_ativar} detail="Sem pendência impeditiva" icon={TrendingUp} tone="brand" actionLabel="Abrir fila de ativação" onAction={() => navigate('/clientes?bucket=prontos_para_ativar')} />
                <MxMetricCard title="Com Bloqueios" value={bucketCounters.com_bloqueios} detail="Pendências que exigem decisão" icon={AlertTriangle} tone="danger" actionLabel="Abrir bloqueios" onAction={() => navigate('/clientes?bucket=com_bloqueios')} />
              </MxMetricGrid>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div className="order-2 space-y-5 xl:order-1 xl:col-span-2">
                  <MxSectionCard>
                    <MxSectionHeader
                      title="Carteira de Clientes MX"
                      description="Contas recentes para abrir a ficha completa."
                      actions={<Button variant="ghost" size="sm" onClick={() => navigate('/clientes')} className="text-[var(--mx-color-primary)]">Ver todos <ArrowRight size={12} aria-hidden="true" /></Button>}
                    />
                    {recentClients.length === 0 ? (
                      <div className="p-8">
                        <MxEmptyState
                          icon={Building2}
                          title="Nenhum cliente cadastrado"
                          description="Inicie a carteira criando o primeiro cliente da consultoria MX."
                          action={<Button variant="primary" size="sm" onClick={() => navigate('/clientes/novo')}><Plus size={14} /> Novo Cliente MX</Button>}
                        />
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--mx-color-border-subtle)]">
                        {recentClients.map(client => {
                          const label = statusLabel(client.status)
                          return (
                            <button
                              type="button"
                              key={client.id}
                              onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                              aria-label={`Abrir ficha de ${client.name}`}
                              className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--mx-color-surface-muted)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)]"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mx-color-surface-muted)] text-xs font-bold text-[var(--mx-color-text-primary)]">{client.name.charAt(0).toUpperCase()}</div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-[var(--mx-color-text-primary)]">{client.name}</div>
                                  <div className="mt-0.5 truncate text-xs text-[var(--mx-color-text-secondary)]">{client.primary_store_city || 'Cidade a definir'} • {client.implementation_owner_name || 'Responsável MX não atribuído'}</div>
                                </div>
                              </div>
                              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(client.status)}`}>{label}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </MxSectionCard>

                  <MxSectionCard>
                    <MxSectionHeader title="Ações de governança" description="Atalhos para tarefas administrativas recorrentes da carteira MX." />
                    <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
                      <Button className="w-full justify-center" variant="primary" onClick={() => navigate('/clientes/novo')}><Plus size={16} /> Novo Cliente MX</Button>
                      <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/clientes?tab=inscricoes')}><UserCheck size={16} /> Validar Cadastros</Button>
                      <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/produtos')}><Package size={16} /> Produtos de consultoria</Button>
                      <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/seguranca')}><ShieldAlert size={16} /> Ver Auditoria</Button>
                    </div>
                  </MxSectionCard>
                </div>

                <div className="order-1 space-y-5 xl:order-2">
                  <MxSectionCard>
                    <MxSectionHeader
                      title="Cadastros pendentes"
                      description="Solicitações aguardando validação."
                      actions={pendingList.length > 0 ? <Button variant="ghost" size="sm" onClick={() => navigate('/clientes?tab=inscricoes')} className="text-[var(--mx-color-primary)]">Ver todos</Button> : undefined}
                    />
                    {pendingLoading && !pendingList.length ? <MxLoadingState context="initial" label="Carregando cadastros..." /> : pendingError && !pendingList.length ? <MxErrorState title="Cadastros indisponíveis" description={pendingError} retry={() => void loadPending()} /> : pendingList.length === 0 ? <MxEmptyState className="px-4 py-6" title="Nenhum cadastro aguardando validação" description="A fila está vazia nesta leitura." /> : (
                      <div className="divide-y divide-[var(--mx-color-border-subtle)]">
                        {pendingList.map(item => (
                          <div key={item.id} className="p-3.5">
                            <div className="text-sm font-semibold text-[var(--mx-color-text-primary)]">{item.nome || 'Solicitação de acesso'}</div>
                            <div className="mt-0.5 text-xs text-[var(--mx-color-text-secondary)]">{item.email || item.telefone || 'Sem contato'} • {item.funcao_declarada || 'Aguardando validação'}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </MxSectionCard>

                  <MxSectionCard>
                    <MxSectionHeader
                      title="Alertas ativos"
                      description="Bloqueios e riscos que precisam de encaminhamento."
                      actions={systemAlerts.length > 0 ? <Button variant="ghost" size="sm" onClick={() => navigate('/clientes?tab=governanca')} className="text-[var(--mx-color-primary)]">Ver governança</Button> : undefined}
                    />
                    {lojasError && !lojasSemMeta.length ? <div className="border-b border-[var(--mx-color-border-subtle)] p-4"><MxErrorState title="Alertas de meta indisponíveis" description={lojasError} retry={() => void loadStoresWithoutGoal()} /></div> : null}
                    {lojasLoading && !lojasSemMeta.length && !systemAlerts.length ? <MxLoadingState context="initial" label="Verificando metas das lojas..." /> : systemAlerts.length === 0 ? lojasError && !lojasSemMeta.length ? null : <MxEmptyState className="px-4 py-6" title="Nenhum bloqueio crítico no momento" description="A leitura não encontrou alertas ativos." /> : (
                      <div className="divide-y divide-[var(--mx-color-border-subtle)]">
                        {systemAlerts.slice(0, 4).map(alert => (
                          <button
                            type="button"
                            key={alert.id}
                            onClick={() => navigate(alert.link)}
                            aria-label={alert.title}
                            className="w-full cursor-pointer p-3.5 text-left transition-colors hover:bg-[var(--mx-color-surface-muted)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)]"
                          >
                            <div className="flex items-start gap-2">
                              {alert.tone === 'danger' ? <ShieldAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--mx-color-danger)]" /> : alert.tone === 'warning' ? <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--mx-color-warning)]" /> : <CheckCircle2 size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--mx-color-primary)]" />}
                              <div>
                                <div className="text-sm font-semibold text-[var(--mx-color-text-primary)]">{alert.title}</div>
                                <div className="mt-0.5 text-xs leading-5 text-[var(--mx-color-text-secondary)]">{alert.subtitle}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </MxSectionCard>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </MxModulePage>
  )
}

export default AdminDashboardPage

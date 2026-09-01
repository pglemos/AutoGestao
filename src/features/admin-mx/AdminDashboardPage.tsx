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

function countPhrase(value: number, singular: string, plural: string): string {
  return `${value.toLocaleString('pt-BR')} ${value === 1 ? singular : plural}`
}

export function AdminDashboardPage() {
  const { rows: clients, loading: clientsLoading, error: clientsError, lastUpdatedAt: clientsUpdatedAt, refetch: refetchClients } = useClientPortfolio()
  const [pendingList, setPendingList] = useState<InscricaoRow[]>([])
  const [pendingTotal, setPendingTotal] = useState(0)
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
      setPendingTotal(result.rows.length)
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
        title: countPhrase(unassigned.length, 'cliente ativo sem consultor atribuído', 'clientes ativos sem consultor atribuído'),
        subtitle: 'Atribua um consultor MX qualificado para iniciar o acompanhamento.',
        tone: 'warning',
        link: '/clientes?bucket=com_bloqueios',
      })
    }

    const readyToActivate = clients.filter(c => c.status === 'pronto_para_ativar')
    if (readyToActivate.length > 0) {
      alerts.push({
        id: 'ready-activate',
        title: countPhrase(readyToActivate.length, 'cliente pronto para ativação', 'clientes prontos para ativação'),
        subtitle: 'Todos os pré-requisitos cumpridos. Agende ou confirme a ativação.',
        tone: 'info',
        link: '/clientes?bucket=prontos_para_ativar',
      })
    }

    const withoutOwner = clients.filter(c => !c.hasDonoMaster && c.status !== 'rascunho')
    if (withoutOwner.length > 0) {
      alerts.push({
        id: 'no-owner',
        title: countPhrase(withoutOwner.length, 'cliente sem Dono Master cadastrado', 'clientes sem Dono Master cadastrado'),
        subtitle: 'Necessário para conceder acessos executivos à conta.',
        tone: 'danger',
        link: '/clientes?bucket=com_bloqueios',
      })
    }

    if (lojasSemMeta.length > 0) {
      const vendedores = vendedoresImpactados(lojasSemMeta)
      alerts.push({
        id: 'loja-sem-meta',
        title: countPhrase(lojasSemMeta.length, 'loja em operação com meta mensal zerada', 'lojas em operação com meta mensal zerada'),
        subtitle: `${countPhrase(vendedores, 'vendedor vê', 'vendedores veem')} projeção e atingimento em 0%: ${lojasSemMeta.slice(0, 3).map(item => item.loja).join(', ')}${lojasSemMeta.length > 3 ? '…' : ''}`,
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
  const exceptionTotal = systemAlerts.length + pendingTotal
  const exceptionSummary = [
    systemAlerts.length > 0 ? countPhrase(systemAlerts.length, 'alerta agrupado', 'alertas agrupados') : null,
    pendingTotal > 0 ? countPhrase(pendingTotal, 'cadastro aguardando validação', 'cadastros aguardando validação') : null,
  ].filter((value): value is string => Boolean(value)).join(' · ')

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

              <MxSectionCard id="governanca-excecoes" aria-labelledby="governanca-excecoes-title">
                <MxSectionHeader
                  title={<span id="governanca-excecoes-title">Fila de exceções</span>}
                  description={exceptionSummary ? `${exceptionSummary}. Cada item aponta o próximo destino.` : 'Nenhuma exceção ativa nesta leitura.'}
                  actions={exceptionTotal > 0 ? <Button variant="ghost" size="sm" onClick={() => navigate('/clientes?tab=governanca')} className="text-[var(--mx-color-primary)]">Abrir governança <ArrowRight size={12} aria-hidden="true" /></Button> : undefined}
                />

                <div className="divide-y divide-[var(--mx-color-border-subtle)]">
                  {lojasError && !lojasSemMeta.length ? <div className="p-4"><MxErrorState title="Alertas de meta indisponíveis" description={lojasError} retry={() => void loadStoresWithoutGoal()} /></div> : null}
                  {pendingError && !pendingList.length ? <div className="p-4"><MxErrorState title="Cadastros indisponíveis" description={pendingError} retry={() => void loadPending()} /></div> : null}
                  {lojasLoading && !lojasSemMeta.length && !systemAlerts.length ? <div className="px-4"><MxLoadingState context="initial" label="Verificando metas das lojas..." /></div> : null}
                  {pendingLoading && !pendingList.length && !pendingError ? <div className="px-4"><MxLoadingState context="initial" label="Carregando cadastros..." /></div> : null}

                  {systemAlerts.map(alert => (
                    <button
                      type="button"
                      key={alert.id}
                      onClick={() => navigate(alert.link)}
                      aria-label={alert.title}
                      className="flex w-full cursor-pointer items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-[var(--mx-color-surface-muted)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)]"
                    >
                      <span className="flex min-w-0 items-start gap-3">
                        {alert.tone === 'danger' ? <ShieldAlert size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--mx-color-danger)]" /> : alert.tone === 'warning' ? <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--mx-color-warning)]" /> : <CheckCircle2 size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--mx-color-primary)]" />}
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--mx-color-text-primary)]">{alert.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-[var(--mx-color-text-secondary)]">{alert.subtitle}</span>
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--mx-color-primary)]">Abrir <ArrowRight size={14} aria-hidden="true" /></span>
                    </button>
                  ))}

                  {pendingList.map(item => (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => navigate('/clientes?tab=inscricoes')}
                      aria-label={`Validar cadastro de ${item.nome || 'solicitação de acesso'}`}
                      className="flex w-full cursor-pointer items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-[var(--mx-color-surface-muted)] focus-visible:bg-[var(--mx-color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mx-color-primary)]"
                    >
                      <span className="flex min-w-0 items-start gap-3">
                        <UserCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--mx-color-primary)]" />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-[var(--mx-color-text-primary)]">{item.nome || 'Solicitação de acesso'}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-[var(--mx-color-text-secondary)]">{item.email || item.telefone || 'Sem contato'} • {item.funcao_declarada || 'Aguardando validação'}</span>
                        </span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--mx-color-primary)]">Validar <ArrowRight size={14} aria-hidden="true" /></span>
                    </button>
                  ))}

                  {exceptionTotal === 0 && !pendingError && !lojasError && !pendingLoading && !lojasLoading ? <MxEmptyState className="px-4 py-8" title="Nenhuma exceção ativa" description="Cadastros, acessos e metas estão sem bloqueios nesta leitura." /> : null}
                </div>

                {pendingTotal > pendingList.length ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--mx-color-border-subtle)] px-4 py-3">
                    <p className="text-xs text-[var(--mx-color-text-secondary)]">Mostrando {pendingList.length.toLocaleString('pt-BR')} de {pendingTotal.toLocaleString('pt-BR')} {pendingTotal === 1 ? 'cadastro' : 'cadastros'} aguardando validação.</p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/clientes?tab=inscricoes')}>Ver todos os cadastros</Button>
                  </div>
                ) : null}

                <div className="border-t border-[var(--mx-color-border-subtle)] p-4">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-[var(--mx-color-text-primary)]">Ações de governança</h3>
                    <p className="mt-1 text-xs leading-5 text-[var(--mx-color-text-secondary)]">Atalhos para corrigir a fila e manter a carteira pronta para operar.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <Button className="w-full justify-center" variant="primary" onClick={() => navigate('/clientes/novo')}><Plus size={16} /> Novo Cliente MX</Button>
                    <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/clientes?tab=inscricoes')}><UserCheck size={16} /> Validar Cadastros</Button>
                    <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/produtos')}><Package size={16} /> Produtos de consultoria</Button>
                    <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/seguranca')}><ShieldAlert size={16} /> Ver Auditoria</Button>
                  </div>
                </div>
              </MxSectionCard>

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
            </>
          )}
        </section>
      </div>
    </MxModulePage>
  )
}

export default AdminDashboardPage

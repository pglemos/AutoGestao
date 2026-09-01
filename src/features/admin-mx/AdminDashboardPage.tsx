import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { getSafeUserFacingDataError } from '@/lib/errors/user-facing-error'
import {
  MxEmptyState,
  MxErrorState,
  MxInput,
  MxLoadingState,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'
import { NetworkDashboardContent } from '@/features/network-dashboard/NetworkDashboardContent'
import { slugify } from '@/lib/utils'
import type { NetworkCockpitStore } from '@/features/network-dashboard/types'
import { useClientPortfolio } from './clientes/useClientPortfolio'
import { fetchInscricoesPendentes } from './clientes/inscricaoAutocadastroMutations'
import type { InscricaoRow } from './clientes/inscricaoAutocadastro'
import { fetchLojasSemMeta, vendedoresImpactados, type LojaSemMeta } from './lojasSemMeta'
import {
  buildCarteiraOperacional,
  carteiraCounters,
  filterCarteiraRows,
  sortCarteiraRows,
  type CarteiraFilter,
  type CarteiraRow,
} from './painel/carteiraOperacional'
import { CarteiraOperacionalTable, type CarteiraSort } from './painel/CarteiraOperacionalTable'

const CARTEIRA_FILTER_LABELS: Record<CarteiraFilter, string> = {
  todos: 'Todas as situações',
  exigem_decisao: 'Exigem decisão',
  critical: 'Críticas',
  alert: 'Em atenção',
  target: 'Meta atingida',
  healthy: 'Em dia',
  sem_vinculo: 'Sem vínculo loja↔cliente',
  ativos: 'Contrato: Clientes Ativos',
  em_implantacao: 'Contrato: Em implantação',
  prontos_para_ativar: 'Contrato: Prontos para ativar',
  com_bloqueios: 'Contrato: Com Bloqueios',
}

function errorMessage(cause: unknown, fallback: string): string {
  return getSafeUserFacingDataError(cause, fallback)
}

function formatTime(value: Date | null): string {
  return value ? value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'ainda não sincronizado'
}

function countPhrase(value: number, singular: string, plural: string): string {
  return `${value.toLocaleString('pt-BR')} ${value === 1 ? singular : plural}`
}

/**
 * Operação da rede e governança da carteira na mesma tabela. Cada linha é uma
 * loja, um cliente MX, ou os dois quando o vínculo existe — com todas as
 * colunas e ações dos dois domínios.
 */
function CarteiraSection({ stores, clients, loading, search, onSearch, filter, onFilter, sort, onSort, actions }: {
  stores: NetworkCockpitStore[]
  clients: ReturnType<typeof useClientPortfolio>['rows']
  loading: boolean
  search: string
  onSearch: (value: string) => void
  filter: CarteiraFilter
  onFilter: (value: CarteiraFilter) => void
  sort: CarteiraSort | null
  onSort: (value: CarteiraSort) => void
  actions: Parameters<typeof CarteiraOperacionalTable>[0]['actions']
}) {
  const allRows = useMemo(() => buildCarteiraOperacional(stores, clients), [clients, stores])
  const counters = useMemo(() => carteiraCounters(allRows), [allRows])
  const rows = useMemo(() => {
    const filtered = filterCarteiraRows(allRows, filter, search)
    return sort ? sortCarteiraRows(filtered, sort.key, sort.direction) : filtered
  }, [allRows, filter, search, sort])
  const unlinked = counters.semCliente + counters.semLoja

  return (
    <MxSectionCard id="carteira-operacional" aria-labelledby="carteira-operacional-title">
      <MxSectionHeader
        title={<span id="carteira-operacional-title">Carteira operacional</span>}
        description="Operação da rede e governança da carteira na mesma linha. Ordene pelos cabeçalhos; a coluna da loja fica fixa na rolagem."
      />

      <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3 sm:flex-row sm:items-end sm:px-5">
        <div className="relative min-w-0 flex-1">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <MxInput
            value={search}
            onChange={event => onSearch(event.target.value)}
            placeholder="Buscar loja, cliente ou responsável"
            aria-label="Buscar loja, cliente ou responsável"
            className="pl-10"
          />
        </div>
        <MxSelect
          label="Situação"
          value={filter}
          onChange={event => onFilter(event.target.value as CarteiraFilter)}
          className="sm:w-64"
        >
          {(Object.keys(CARTEIRA_FILTER_LABELS) as CarteiraFilter[]).map(value => (
            <option key={value} value={value}>{CARTEIRA_FILTER_LABELS[value]}</option>
          ))}
        </MxSelect>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-subtle px-4 py-3 text-sm sm:px-5" aria-live="polite">
        <span className="font-semibold text-foreground">Exibindo {rows.length.toLocaleString('pt-BR')} de {counters.total.toLocaleString('pt-BR')} registros</span>
        {unlinked > 0 ? (
          <button type="button" onClick={() => onFilter('sem_vinculo')} className="inline-flex items-center gap-1.5 rounded-lg font-medium text-status-warning-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
            <AlertTriangle size={14} aria-hidden="true" />
            {unlinked.toLocaleString('pt-BR')} sem vínculo loja↔cliente
          </button>
        ) : null}
        {loading ? <span className="text-muted-foreground">Atualizando a carteira…</span> : null}
      </div>

      <div className="p-4 sm:p-5">
        <CarteiraOperacionalTable
          rows={rows}
          sort={sort ?? { key: 'name', direction: 'asc' }}
          onSort={onSort}
          actions={actions}
        />
      </div>
    </MxSectionCard>
  )
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

  const [carteiraSearch, setCarteiraSearch] = useState('')
  const [carteiraFilter, setCarteiraFilter] = useState<CarteiraFilter>('todos')
  const [carteiraSort, setCarteiraSort] = useState<CarteiraSort | null>(null)

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

  const openStore = useCallback((row: CarteiraRow, path: string) => {
    if (!row.store) return
    navigate(`${path}?storeId=${encodeURIComponent(row.store.id)}`)
  }, [navigate])

  const carteiraActions = useMemo(() => ({
    onAnalyzeStore: (row: CarteiraRow) => { if (row.store) navigate(`/lojas/${slugify(row.store.name)}?storeId=${encodeURIComponent(row.store.id)}`) },
    onOpenClient: (row: CarteiraRow) => { if (row.clientSlug) navigate(`/clientes/${row.clientSlug}`) },
    onOpenStrategicPlan: (row: CarteiraRow) => openStore(row, '/plano-estrategico'),
    onOpenActionPlan: (row: CarteiraRow) => openStore(row, '/plano-acao'),
    onOpenConsulting: (row: CarteiraRow) => openStore(row, '/consultoria'),
  }), [navigate, openStore])
  const exceptionTotal = systemAlerts.length + pendingTotal
  const exceptionSummary = [
    systemAlerts.length > 0 ? countPhrase(systemAlerts.length, 'alerta agrupado', 'alertas agrupados') : null,
    pendingTotal > 0 ? countPhrase(pendingTotal, 'cadastro aguardando validação', 'cadastros aguardando validação') : null,
  ].filter((value): value is string => Boolean(value)).join(' · ')

  return (
    <MxModulePage width={width} bottomClearance={bottomClearance}>
      <div className="space-y-8">
        <NetworkDashboardContent
          scope="internal"
          onConfigureGoals={() => navigate('/metas')}
          carteiraSlot={stores => (
            <CarteiraSection
              stores={stores}
              clients={clients}
              loading={clientsLoading}
              search={carteiraSearch}
              onSearch={setCarteiraSearch}
              filter={carteiraFilter}
              onFilter={setCarteiraFilter}
              sort={carteiraSort}
              onSort={setCarteiraSort}
              actions={carteiraActions}
            />
          )}
        />

        <section id="governanca-carteira" aria-labelledby="governanca-carteira-title" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <h2 id="governanca-carteira-title" className="text-xl font-semibold text-foreground">Governança da carteira</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Exceções que exigem decisão e atalhos de cadastro. Os números por loja e cliente ficam na carteira operacional acima.</p>
              <p className="mt-1 text-xs text-muted-foreground">Última leitura: {formatTime(governanceUpdatedAt)}.</p>
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
            <MxSectionCard id="governanca-excecoes" aria-labelledby="governanca-excecoes-title">
              <MxSectionHeader
                title={<span id="governanca-excecoes-title">Fila de exceções</span>}
                description={exceptionSummary ? `${exceptionSummary}. Cada item aponta o próximo destino.` : 'Nenhuma exceção ativa nesta leitura.'}
                actions={exceptionTotal > 0 ? <Button variant="ghost" size="sm" onClick={() => navigate('/clientes?tab=governanca')} className="text-status-success-text">Abrir governança <ArrowRight size={12} aria-hidden="true" /></Button> : undefined}
              />

              <div className="divide-y divide-border-subtle">
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
                    className="flex w-full cursor-pointer items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      {alert.tone === 'danger' ? <ShieldAlert size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-status-error-text" /> : alert.tone === 'warning' ? <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-status-warning-text" /> : <CheckCircle2 size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-status-success-text" />}
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{alert.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{alert.subtitle}</span>
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-status-success-text">Abrir <ArrowRight size={14} aria-hidden="true" /></span>
                  </button>
                ))}

                {pendingList.map(item => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => navigate('/clientes?tab=inscricoes')}
                    aria-label={`Validar cadastro de ${item.nome || 'solicitação de acesso'}`}
                    className="flex w-full cursor-pointer items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                  >
                    <span className="flex min-w-0 items-start gap-3">
                      <UserCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-status-success-text" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground">{item.nome || 'Solicitação de acesso'}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.email || item.telefone || 'Sem contato'} • {item.funcao_declarada || 'Aguardando validação'}</span>
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-status-success-text">Validar <ArrowRight size={14} aria-hidden="true" /></span>
                  </button>
                ))}

                {exceptionTotal === 0 && !pendingError && !lojasError && !pendingLoading && !lojasLoading ? <MxEmptyState className="px-4 py-8" title="Nenhuma exceção ativa" description="Cadastros, acessos e metas estão sem bloqueios nesta leitura." /> : null}
              </div>

              {pendingTotal > pendingList.length ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
                  <p className="text-xs text-muted-foreground">Mostrando {pendingList.length.toLocaleString('pt-BR')} de {pendingTotal.toLocaleString('pt-BR')} {pendingTotal === 1 ? 'cadastro' : 'cadastros'} aguardando validação.</p>
                  <Button variant="outline" size="sm" onClick={() => navigate('/clientes?tab=inscricoes')}>Ver todos os cadastros</Button>
                </div>
              ) : null}

              <div className="border-t border-border-subtle p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Ações de governança</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Atalhos para corrigir a fila e manter a carteira pronta para operar.</p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <Button className="w-full justify-center" variant="primary" onClick={() => navigate('/clientes/novo')}><Plus size={16} /> Novo Cliente MX</Button>
                  <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/clientes?tab=inscricoes')}><UserCheck size={16} /> Validar Cadastros</Button>
                  <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/produtos')}><Package size={16} /> Produtos de consultoria</Button>
                  <Button className="w-full justify-center" variant="outline" onClick={() => navigate('/seguranca')}><ShieldAlert size={16} /> Ver Auditoria</Button>
                </div>
              </div>
            </MxSectionCard>
          )}
        </section>
      </div>
    </MxModulePage>
  )
}

export default AdminDashboardPage

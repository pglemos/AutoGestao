import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Filter,
  Info,
  LayoutGrid,
  Rocket,
  RefreshCw,
  Search,
  Settings2,
  ShoppingCart,
  TableProperties,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import { useIsMobile } from '@/hooks/useIsMobile'
import {
  MxEmptyState,
  MxInput,
  MxProgress,
  MxSelect,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import type { Store } from '@/types/database'
import { ClientActionsMenu, type ClientAction } from './ClientActionsMenu'
import { PendenciasModal } from './PendenciasModal'
import {
  EMPTY_PORTFOLIO_FILTERS,
  PORTFOLIO_BUCKET_LABEL,
  activationBlockers,
  canonicalPortfolioStatus,
  clientStoreIds,
  clientTeamStat,
  clientStructureSummary,
  filterPortfolio,
  formatCityName,
  formatCnpj,
  journeyLabel,
  nextAction,
  portfolioActionPriority,
  portfolioCounters,
  portfolioOperationalLabel,
  portfolioOwnerOptions,
  portfolioStatusCounters,
  portfolioStatusLabel,
  sortPortfolioByAction,
  type PortfolioBucket,
  type PortfolioClient,
  type PortfolioFilters,
  type PortfolioStatus,
} from './clientPortfolio'
import { aggregateClientSalesForStores, CLIENT_SALES_TIME_ZONE, resolveClientSalesEvidence, type ClientSalesPeriod } from './clientSales'
import { useClientSales, type ClientStoreSales } from './useClientSales'

const PHASE_LABEL: Record<string, string> = {
  ESTRUTURACAO: 'Estruturação',
  CRESCIMENTO: 'Crescimento',
  CONSOLIDACAO: 'Consolidação',
  EXPANSAO: 'Expansão',
  RECUPERACAO: 'Recuperação',
}

const STATUS_METRICS: Array<{
  status: PortfolioStatus
  label: string
  detail: string
  icon: typeof Building2
  tone: 'brand' | 'success' | 'info' | 'danger'
}> = [
  { status: 'ativos', label: 'Ativos', detail: 'Situação da conta', icon: CheckCircle2, tone: 'success' },
  { status: 'em_implantacao', label: 'Em implantação', detail: 'Status explícito da conta', icon: Rocket, tone: 'info' },
  { status: 'prontos_para_ativar', label: 'Prontos para ativar', detail: 'Sem bloqueio estrutural', icon: ClipboardList, tone: 'brand' },
  { status: 'em_configuracao', label: 'Em configuração', detail: 'Cadastro incompleto', icon: Settings2, tone: 'danger' },
]

const OPERATIONAL_METRICS: Array<{
  bucket: PortfolioBucket
  label: string
  detail: string
  icon: typeof Building2
  tone: 'info' | 'danger' | 'warning'
}> = [
  { bucket: 'com_bloqueios', label: 'Com bloqueios', detail: 'Pendência estrutural', icon: AlertTriangle, tone: 'danger' },
  { bucket: 'em_implantacao', label: 'Jornada em andamento', detail: 'Visitas consultivas pendentes', icon: TrendingUp, tone: 'info' },
  { bucket: 'renovacoes_proximas', label: 'Renovações próximas', detail: 'Vencimento em até 60 dias', icon: CalendarClock, tone: 'warning' },
]

const SALES_PERIOD_OPTIONS: Array<{ value: ClientSalesPeriod; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'last15days', label: 'Últimos 15 dias' },
  { value: 'month', label: 'Este mês' },
  { value: 'custom', label: 'Data personalizada' },
]
const SALES_COUNT_FORMATTER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const SALES_PERCENT_FORMATTER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const SALES_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: CLIENT_SALES_TIME_ZONE })

type PortfolioClientSales = ReturnType<typeof aggregateClientSalesForStores> & { units: ClientStoreSales[] }

function formatSalesCount(value: number): string { return SALES_COUNT_FORMATTER.format(Math.round(value)) }
function formatSalesLabel(value: number): string { return `${formatSalesCount(value)} ${value === 1 ? 'venda' : 'vendas'}` }
function formatSalesPercent(value: number | null): string { return value === null ? '—' : `${SALES_PERCENT_FORMATTER.format(value)}%` }
function formatSalesDate(dateKey: string | null): string {
  if (!dateKey) return 'Nenhuma venda registrada no período'
  const [year, month, day] = dateKey.split('-').map(Number)
  return SALES_DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day, 12)))
}
function formatSalesRange(startDate: string, endDate: string): string {
  return startDate === endDate ? formatSalesDate(startDate) : `${formatSalesDate(startDate)} a ${formatSalesDate(endDate)}`
}
function salesProgressTone(attainment: number | null): 'brand' | 'success' | 'warning' | 'neutral' {
  if (attainment === null) return 'neutral'
  if (attainment >= 100) return 'success'
  if (attainment >= 70) return 'brand'
  return 'warning'
}
function salesProgressTextClass(attainment: number | null): string {
  if (attainment === null) return 'text-muted-foreground'
  if (attainment >= 100) return 'text-status-success-text'
  if (attainment >= 70) return 'text-brand-primary'
  return 'text-status-warning-text'
}
function hasSalesRecord(rollup: Pick<PortfolioClientSales, 'units'>): boolean {
  return rollup.units.some(unit => unit.hasSalesRecord)
}

function salesEvidenceLabel(rollup: PortfolioClientSales): string {
  if (rollup.units.length === 0) return 'Sem unidade vinculada'
  const evidence = resolveClientSalesEvidence(rollup.sales, hasSalesRecord(rollup))
  if (evidence === 'recorded') return formatSalesLabel(rollup.sales)
  return evidence === 'zero_confirmed' ? '0 confirmado' : 'Nenhum registro'
}

function salesEvidenceDetail(rollup: PortfolioClientSales): string {
  if (rollup.units.length === 0) return 'Cadastre uma unidade para consultar vendas.'
  if (rollup.sales > 0) return `${formatSalesLabel(rollup.sales)} no período`
  return hasSalesRecord(rollup) ? '0 confirmado no período' : 'Nenhum registro no período'
}

function unitSalesEvidenceLabel(unit: ClientStoreSales): string {
  const evidence = resolveClientSalesEvidence(unit.sales, unit.hasSalesRecord)
  if (evidence === 'recorded') return formatSalesLabel(unit.sales)
  return evidence === 'zero_confirmed' ? '0 confirmado' : 'Nenhum registro'
}

function salesStatus(rollup: PortfolioClientSales): { label: string; variant: 'success' | 'warning' | 'outline' | 'secondary' } {
  if (rollup.units.length === 0) return { label: 'Sem unidade vinculada', variant: 'outline' }
  if (rollup.monthlyGoal > 0 && rollup.attainment !== null && rollup.attainment >= 100) return { label: 'Meta atingida', variant: 'success' }
  if (rollup.monthlyGoal > 0 && rollup.attainment !== null && rollup.attainment >= 70) return { label: 'Em ritmo', variant: 'warning' }
  if (rollup.monthlyGoal > 0) return { label: rollup.sales > 0 ? 'Abaixo da meta' : hasSalesRecord(rollup) ? '0 confirmado' : 'Nenhum registro', variant: rollup.sales > 0 ? 'warning' : 'outline' }
  return { label: rollup.sales > 0 ? 'Meta não configurada' : hasSalesRecord(rollup) ? '0 confirmado' : 'Nenhum registro', variant: rollup.sales > 0 ? 'secondary' : 'outline' }
}

function statusBadgeVariant(status: PortfolioStatus | null): 'success' | 'info' | 'brand' | 'secondary' | 'outline' {
  if (status === 'ativos') return 'success'
  if (status === 'em_implantacao') return 'info'
  if (status === 'prontos_para_ativar') return 'brand'
  if (status === 'em_configuracao') return 'secondary'
  return 'outline'
}

function sellerLabel(value: number): string {
  return value === 1 ? 'vendedor' : 'vendedores'
}

function ViewModeSwitch({ viewMode, onChange }: { viewMode: 'tabela' | 'cards'; onChange: (mode: 'tabela' | 'cards') => void }) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Modo de visualização da carteira">
      <Button
        variant={viewMode === 'tabela' ? 'primary' : 'ghost'}
        size="sm"
        className="min-h-11 px-3 text-sm"
        onClick={() => onChange('tabela')}
        aria-label="Visualização em tabela"
        aria-pressed={viewMode === 'tabela'}
      >
        <TableProperties size={14} className="mr-1" />
        Tabela
      </Button>
      <Button
        variant={viewMode === 'cards' ? 'primary' : 'ghost'}
        size="sm"
        className="min-h-11 px-3 text-sm"
        onClick={() => onChange('cards')}
        aria-label="Visualização em cards"
        aria-pressed={viewMode === 'cards'}
      >
        <LayoutGrid size={14} className="mr-1" />
        Cards
      </Button>
    </div>
  )
}

type PortfolioClientViewData = {
  client: PortfolioClient
  blockers: string[]
  storeIds: string[]
  stat: ReturnType<typeof clientTeamStat>
  teamDataAvailable: boolean
  accountStatus: PortfolioStatus | null
  accountStatusLabel: string
  operationalLabel: string | null
  sales: PortfolioClientSales
  storeSlug: string
  progressPct: number
  action: string
  actionPriority: number
}

function buildPortfolioClientViewData(
  client: PortfolioClient,
  lojas: Store[],
  stats: Record<string, { sellers: number; checkedIn?: number; disciplinePct: number }>,
  salesByClient: Map<string, PortfolioClientSales>,
): PortfolioClientViewData {
  const blockers = activationBlockers(client)
  const storeIds = clientStoreIds(client, lojas)
  const sales = salesByClient.get(client.id) ?? {
    ...aggregateClientSalesForStores(storeIds, []),
    units: [],
  }

  return {
    client,
    blockers,
    storeIds,
    stat: clientTeamStat(storeIds, stats),
    teamDataAvailable: storeIds.some(storeId => Boolean(stats[storeId])),
    accountStatus: canonicalPortfolioStatus(client),
    accountStatusLabel: portfolioStatusLabel(client),
    operationalLabel: portfolioOperationalLabel(client),
    sales,
    storeSlug: client.slug || client.id,
    progressPct: client.visitsTotal > 0 ? Math.min(100, Math.round((client.visitsDone / client.visitsTotal) * 100)) : 0,
    action: nextAction(client),
    actionPriority: portfolioActionPriority(client),
  }
}

function ClientPrimaryAction({ data, onOpen }: { data: PortfolioClientViewData; onOpen: (client: PortfolioClient) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(data.client)}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-brand-primary/40 bg-brand-primary/5 px-3 py-2 text-left text-sm font-semibold leading-5 text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
      aria-label={`Executar próxima ação: ${data.action} para ${data.client.name}`}
      title={data.action}
    >
      <span className="min-w-0 break-words">{data.action}</span>
      <ChevronRight size={16} className="shrink-0" aria-hidden="true" />
    </button>
  )
}

export interface PortfolioOverviewTabProps {
  rows: PortfolioClient[]
  lojas: Store[]
  stats: Record<string, { sellers: number; checkedIn?: number; disciplinePct: number }>
  onAction: (client: PortfolioClient, action: ClientAction) => void
  onRefetch: () => void
}

export function PortfolioOverviewTab({ rows, lojas, stats, onAction, onRefetch }: PortfolioOverviewTabProps) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [filters, setFilters] = useState<PortfolioFilters>(EMPTY_PORTFOLIO_FILTERS)
  const [viewPreference, setViewPreference] = useState<'auto' | 'tabela' | 'cards'>('auto')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const viewMode = viewPreference === 'auto' ? (isMobile ? 'cards' : 'tabela') : viewPreference
  const [pendenciasClient, setPendenciasClient] = useState<PortfolioClient | null>(null)
  const [salesPeriod, setSalesPeriod] = useState<ClientSalesPeriod>('month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const {
    range: salesRange,
    rangeError: salesRangeError,
    rows: salesRows,
    loading: salesLoading,
    error: salesError,
    loadedQueryKey: salesLoadedQueryKey,
    queryKey: salesQueryKey,
    refetch: refetchSales,
  } = useClientSales({ stores: lojas, period: salesPeriod, customStartDate, customEndDate })

  const openPendencias = (client: PortfolioClient) => setPendenciasClient(client)
  const closePendencias = () => setPendenciasClient(null)
  const counters = useMemo(() => portfolioCounters(rows), [rows])
  const statusCounters = useMemo(() => portfolioStatusCounters(rows), [rows])
  const filtered = useMemo(() => filterPortfolio(rows, filters), [rows, filters])
  const prioritized = useMemo(() => sortPortfolioByAction(filtered), [filtered])
  const salesByClient = useMemo(() => {
    const byClient = new Map<string, PortfolioClientSales>()
    for (const client of rows) {
      const storeIds = clientStoreIds(client, lojas)
      const unitRows = storeIds
        .map(storeId => salesRows.find(row => row.storeId === storeId))
        .filter((row): row is ClientStoreSales => Boolean(row))
      byClient.set(client.id, {
        ...aggregateClientSalesForStores(storeIds, salesRows),
        units: unitRows,
      })
    }
    return byClient
  }, [lojas, rows, salesRows])
  const salesTotalsForView = useMemo(() => {
    const visibleStoreIds = [...new Set(filtered.flatMap(client => clientStoreIds(client, lojas)))]
    const rollup = aggregateClientSalesForStores(visibleStoreIds, salesRows)
    const visibleSalesRows = salesRows.filter(row => visibleStoreIds.includes(row.storeId))
    return {
      totalSales: rollup.sales,
      totalMonthlyGoal: rollup.monthlyGoal,
      totalAttainment: rollup.attainment,
      storesWithSales: rollup.storesWithSales,
      totalStores: visibleStoreIds.length,
      hasSalesRecord: visibleSalesRows.some(row => row.hasSalesRecord),
    }
  }, [filtered, lojas, salesRows])
  const salesDataReady = Boolean(salesQueryKey && salesLoadedQueryKey === salesQueryKey)
  const salesUnavailable = Boolean(salesRangeError || (salesError && !salesDataReady))
  const salesInitialLoading = Boolean(salesQueryKey && !salesDataReady && !salesUnavailable)
  const salesStale = Boolean(salesError && salesDataReady)
  const salesRefreshing = Boolean(salesLoading && salesDataReady)
  const phases = useMemo(() => [...new Set(rows.map(row => row.business_phase).filter((value): value is string => Boolean(value)))].sort(), [rows])
  const products = useMemo(() => [...new Set(rows.map(row => row.product_name).filter((value): value is string => Boolean(value)))].sort(), [rows])
  const owners = useMemo(() => portfolioOwnerOptions(rows), [rows])
  const clientViewData = useMemo(
    () => prioritized.map(client => buildPortfolioClientViewData(client, lojas, stats, salesByClient)),
    [lojas, prioritized, salesByClient, stats],
  )
  const actionQueueCount = useMemo(() => rows.filter(client => portfolioActionPriority(client) < 8).length, [rows])

  const patch = (values: Partial<PortfolioFilters>) => setFilters(current => ({ ...current, ...values }))
  const hasActiveFilters = useMemo(() => (
    Boolean(filters.search.trim()) ||
    filters.status !== 'todos' ||
    filters.bucket !== 'todos' ||
    filters.phase !== 'todas' ||
    filters.product !== 'todos' ||
    filters.owner !== 'todos'
  ), [filters])
  const activeFilterCount = useMemo(() => [
    filters.search.trim(),
    filters.status !== 'todos' ? filters.status : '',
    filters.bucket !== 'todos' ? filters.bucket : '',
    filters.phase !== 'todas' ? filters.phase : '',
    filters.product !== 'todos' ? filters.product : '',
    filters.owner !== 'todos' ? filters.owner : '',
  ].filter(Boolean).length, [filters])
  const additionalFilterCount = Number(filters.phase !== 'todas') + Number(filters.product !== 'todos') + Number(filters.owner !== 'todos')
  const clearAllFilters = () => setFilters(EMPTY_PORTFOLIO_FILTERS)
  const refreshAll = () => { void Promise.all([onRefetch(), refetchSales()]) }

  return (
    <div className="space-y-5">
      <header className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Fila de clientes</h2>
        <p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">
          {rows.length} clientes · {lojas.length} unidades. A lista começa pela próxima ação; matriz e filiais permanecem agrupadas, com resultado comercial e jornada consultiva separados.
        </p>
      </header>

      <section aria-labelledby="client-operational-queue-heading" className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id="client-operational-queue-heading" className="text-base font-semibold text-foreground">Fila de decisão</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Sinais independentes para escolher o próximo trabalho.</p>
          </div>
          <span className="text-sm font-medium text-status-error-text">{actionQueueCount} {actionQueueCount === 1 ? 'cliente com ação prioritária' : 'clientes com ação prioritária'}</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {OPERATIONAL_METRICS.map(item => {
            const count = counters[item.bucket]
            const isSelected = filters.bucket === item.bucket
            const Icon = item.icon
            return (
              <button
                key={item.bucket}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${item.label}: ${count} clientes`}
                onClick={() => patch({ bucket: isSelected ? 'todos' : item.bucket, status: 'todos' })}
                className={`flex min-h-[6.25rem] min-w-0 flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
                  isSelected
                    ? 'border-brand-primary bg-brand-primary/10 shadow-xs ring-1 ring-brand-primary/30'
                    : 'border-border bg-card hover:border-brand-primary/40 hover:bg-surface-alt'
                }`}
              >
                <div className="flex w-full items-start justify-between gap-1.5">
                  <span className="text-sm font-semibold leading-4 text-foreground">{item.label}</span>
                  <Icon size={16} aria-hidden="true" className={item.tone === 'danger' ? 'text-status-error-text' : item.tone === 'warning' ? 'text-status-warning-text' : 'text-status-info-text'} />
                </div>
                <span className="mt-2 text-2xl font-bold leading-none text-foreground">{count}</span>
                <span className="mt-1 text-xs leading-4 text-muted-foreground">{item.detail}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="client-account-status-heading" className="space-y-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 id="client-account-status-heading" className="text-base font-semibold text-foreground">Situação da conta</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Uma situação canônica por cliente.</p>
          </div>
          <span className="text-xs text-muted-foreground">Suspensos e encerrados aparecem no cadastro e na governança.</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS_METRICS.map(item => {
            const count = statusCounters[item.status]
            const isSelected = filters.status === item.status
            const Icon = item.icon
            return (
              <button
                key={item.status}
                type="button"
                aria-pressed={isSelected}
                aria-label={`${item.label}: ${count} clientes`}
                onClick={() => patch({ status: isSelected ? 'todos' : item.status, bucket: 'todos' })}
                className={`flex min-h-[5.5rem] min-w-0 flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
                  isSelected
                    ? 'border-brand-primary bg-brand-primary/10 shadow-xs ring-1 ring-brand-primary/30'
                    : 'border-border bg-card hover:border-brand-primary/40 hover:bg-surface-alt'
                }`}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="text-sm font-semibold leading-4 text-foreground">{item.label}</span>
                  <Icon size={16} aria-hidden="true" className={item.tone === 'success' ? 'text-status-success-text' : item.tone === 'danger' ? 'text-status-error-text' : item.tone === 'info' ? 'text-status-info-text' : 'text-brand-primary'} />
                </div>
                <span className="mt-2 text-2xl font-bold leading-none text-foreground">{count}</span>
                <span className="mt-1 text-xs leading-4 text-muted-foreground">{item.detail}</span>
              </button>
            )
          })}
        </div>
      </section>

      <details className="rounded-xl border border-border-subtle bg-surface-alt/60">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><Info size={16} className="text-brand-primary" aria-hidden="true" />Como interpretar status e métricas</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <div className="border-t border-border-subtle px-3 py-3 text-sm leading-5 text-muted-foreground">
          <p><span className="font-semibold text-foreground">Situação da conta</span> é exclusiva. Jornada, bloqueios e renovação são sinais que podem se sobrepor.</p>
          <p className="mt-2">Em vendas, <span className="font-medium text-foreground">0 confirmado</span> é um registro oficial com zero; <span className="font-medium text-foreground">Nenhum registro</span> indica ausência de linha no período; <span className="font-medium text-foreground">Não configurada</span> indica que a meta ou jornada não foi cadastrada; <span className="font-medium text-foreground">Indisponível</span> indica falha na consulta.</p>
        </div>
      </details>

      <section aria-labelledby="client-portfolio-list-heading" className="space-y-3">
        <div className="sticky top-2 z-[var(--mx-z-sticky)] rounded-xl border border-border bg-white/95 p-3 shadow-sm backdrop-blur-sm sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <MxInput
                id="client-portfolio-search"
                name="client-search"
                value={filters.search}
                onChange={event => patch({ search: event.target.value })}
                placeholder="Buscar por loja, CNPJ, cidade, produto ou responsável..."
                aria-label="Buscar cliente na carteira"
                className="h-11 w-full pl-9 pr-10 text-sm"
              />
              {filters.search ? (
                <button
                  type="button"
                  onClick={() => patch({ search: '' })}
                  className="absolute right-1.5 top-1/2 grid min-h-9 min-w-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
                  aria-label="Limpar busca"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span className="whitespace-nowrap text-sm font-medium text-muted-foreground" aria-live="polite">
                {filtered.length} de {rows.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
              </span>
              <ViewModeSwitch viewMode={viewMode} onChange={mode => setViewPreference(mode)} />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            <MxSelect
              aria-label="Filtrar por situação da conta"
              value={filters.status}
              onChange={event => patch({ status: event.target.value as PortfolioFilters['status'] })}
              className="h-11 w-full min-w-0 text-sm"
            >
              <option value="todos">Todas as situações</option>
              {STATUS_METRICS.map(item => <option key={item.status} value={item.status}>{item.label}</option>)}
            </MxSelect>
            <MxSelect
              aria-label="Filtrar pela fila de decisão"
              value={filters.bucket}
              onChange={event => patch({ bucket: event.target.value as PortfolioFilters['bucket'] })}
              className="h-11 w-full min-w-0 text-sm"
            >
              <option value="todos">Todas as filas</option>
              {OPERATIONAL_METRICS.map(item => <option key={item.bucket} value={item.bucket}>{item.label}</option>)}
              <option value="cadastros_pendentes">Cadastros pendentes</option>
            </MxSelect>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="col-span-2 min-h-11 text-sm md:hidden"
              onClick={() => setShowAdvancedFilters(current => !current)}
              aria-expanded={showAdvancedFilters}
            >
              <Filter size={14} className="mr-1.5" />
              {showAdvancedFilters ? 'Ocultar filtros adicionais' : 'Mais filtros'}
              {additionalFilterCount > 0 ? ` · ${additionalFilterCount}` : ''}
            </Button>
          </div>

          <div className={`${showAdvancedFilters ? 'grid' : 'hidden'} mt-2 grid-cols-1 gap-2 sm:grid-cols-3 md:grid`}>
            <MxSelect
              aria-label="Filtrar por fase empresarial"
              value={filters.phase}
              onChange={event => patch({ phase: event.target.value })}
              className="h-11 w-full min-w-0 text-sm"
            >
              <option value="todas">Todas as fases</option>
              {phases.map(phase => <option key={phase} value={phase}>{PHASE_LABEL[phase] ?? phase}</option>)}
            </MxSelect>
            <MxSelect
              aria-label="Filtrar por produto"
              value={filters.product}
              onChange={event => patch({ product: event.target.value })}
              className="h-11 w-full min-w-0 text-sm"
            >
              <option value="todos">Todos os produtos</option>
              {products.map(product => <option key={product} value={product}>{product}</option>)}
            </MxSelect>
            <MxSelect
              aria-label="Filtrar por responsável MX"
              value={filters.owner}
              onChange={event => patch({ owner: event.target.value })}
              className="h-11 w-full min-w-0 text-sm"
            >
              <option value="todos">Todos os responsáveis</option>
              {owners.map(owner => <option key={owner.id} value={owner.id}>{owner.label}</option>)}
            </MxSelect>
          </div>
        </div>

        <aside className="rounded-xl border border-border-subtle bg-surface-alt/60 p-3 sm:p-4" aria-label="Resumo comercial da carteira">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-status-success-surface text-status-success-text" aria-hidden="true">
                <ShoppingCart size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Resultado comercial</p>
                <p className="mt-0.5 break-words text-xs leading-4 text-muted-foreground">
                  Vendas oficiais · período de referência: {salesRange ? formatSalesRange(salesRange.startDate, salesRange.endDate) : 'aguardando datas'} · presença referente a hoje
                  {salesRefreshing ? ' · atualizando' : ''}{salesStale ? ' · últimos dados válidos' : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex min-w-[10rem] flex-col gap-1 text-xs font-semibold text-muted-foreground">
                Período de vendas
                <MxSelect data-testid="client-sales-period" aria-label="Filtrar vendas por período" value={salesPeriod} onChange={event => setSalesPeriod(event.target.value as ClientSalesPeriod)} className="h-10 text-sm">
                  {SALES_PERIOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </MxSelect>
              </label>
              {salesPeriod === 'custom' ? (
                <>
                  <label htmlFor="client-sales-custom-start" className="flex min-w-[9.5rem] flex-col gap-1 text-xs font-semibold text-muted-foreground">
                    Data inicial
                    <MxInput data-testid="client-sales-custom-start" id="client-sales-custom-start" type="date" aria-label="Data inicial das vendas" value={customStartDate} onChange={event => setCustomStartDate(event.target.value)} className="h-10 text-sm" />
                  </label>
                  <label htmlFor="client-sales-custom-end" className="flex min-w-[9.5rem] flex-col gap-1 text-xs font-semibold text-muted-foreground">
                    Data final
                    <MxInput data-testid="client-sales-custom-end" id="client-sales-custom-end" type="date" aria-label="Data final das vendas" value={customEndDate} onChange={event => setCustomEndDate(event.target.value)} className="h-10 text-sm" />
                  </label>
                </>
              ) : null}
              <Button variant="outline" size="sm" className="min-h-10 text-sm" onClick={refreshAll} disabled={salesLoading} aria-label="Atualizar vendas e carteira">
                <RefreshCw size={14} className="mr-1.5" />Atualizar
              </Button>
            </div>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border-subtle pt-3 sm:grid-cols-4" aria-busy={salesLoading} aria-live="polite">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Vendas</dt>
              <dd className="mt-0.5 break-words text-sm font-bold text-foreground">{salesInitialLoading ? 'Atualizando' : salesUnavailable ? 'Indisponível' : salesTotalsForView.totalSales > 0 ? formatSalesLabel(salesTotalsForView.totalSales) : salesTotalsForView.hasSalesRecord ? '0 confirmado' : 'Nenhum registro'}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Meta do mês</dt>
              <dd className="mt-0.5 break-words text-sm font-bold text-foreground">{salesInitialLoading ? 'Atualizando' : salesUnavailable ? 'Indisponível' : salesTotalsForView.totalMonthlyGoal > 0 ? formatSalesLabel(salesTotalsForView.totalMonthlyGoal) : 'Não configurada'}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Atingimento</dt>
              <dd className={`mt-0.5 text-sm font-bold ${salesInitialLoading || salesUnavailable ? 'text-foreground' : salesProgressTextClass(salesTotalsForView.totalAttainment)}`}>
                {salesInitialLoading ? 'Atualizando' : salesUnavailable ? 'Indisponível' : salesTotalsForView.totalAttainment === null ? 'Não calculado' : formatSalesPercent(salesTotalsForView.totalAttainment)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Unidades com venda</dt>
              <dd className="mt-0.5 text-sm font-bold text-foreground">{salesInitialLoading ? 'Atualizando' : salesUnavailable ? 'Indisponível' : `${salesTotalsForView.storesWithSales}/${salesTotalsForView.totalStores}`}</dd>
            </div>
          </dl>
        </aside>

        {salesRangeError ? <div className="rounded-lg border border-status-warning/30 bg-status-warning-surface px-3 py-2 text-sm font-medium text-status-warning-text" role="status">{salesRangeError}</div> : null}
        {salesError ? <div className="rounded-lg border border-status-error/30 bg-status-error-surface px-3 py-2 text-sm font-medium text-status-error-text" role="alert">{salesError} <button type="button" onClick={() => void refetchSales()} className="ml-1 min-h-9 rounded px-1 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-error/30">Tentar novamente</button></div> : null}

        {hasActiveFilters ? (
          <div className="flex flex-wrap items-center gap-1.5 text-sm" aria-label="Filtros ativos">
            <span className="font-semibold text-foreground">Filtros ativos:</span>
            {filters.search.trim() ? (
              <span className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-surface-alt px-2 text-foreground">
                Busca: “{filters.search}”
                <button type="button" onClick={() => patch({ search: '' })} className="grid min-h-7 min-w-7 place-items-center rounded hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30" aria-label="Remover filtro de busca"><X size={14} /></button>
              </span>
            ) : null}
            {filters.status !== 'todos' ? (
              <span className="inline-flex min-h-8 items-center gap-1 rounded-md border border-brand-primary/30 bg-brand-primary/10 px-2 text-brand-primary">
                Situação: {STATUS_METRICS.find(item => item.status === filters.status)?.label ?? filters.status}
                <button type="button" onClick={() => patch({ status: 'todos' })} className="grid min-h-7 min-w-7 place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30" aria-label="Remover filtro de situação da conta"><X size={14} /></button>
              </span>
            ) : null}
            {filters.bucket !== 'todos' ? (
              <span className="inline-flex min-h-8 items-center gap-1 rounded-md border border-brand-primary/30 bg-brand-primary/10 px-2 text-brand-primary">
                Fila: {OPERATIONAL_METRICS.find(item => item.bucket === filters.bucket)?.label ?? PORTFOLIO_BUCKET_LABEL[filters.bucket]}
                <button type="button" onClick={() => patch({ bucket: 'todos' })} className="grid min-h-7 min-w-7 place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30" aria-label="Remover filtro da fila de decisão"><X size={14} /></button>
              </span>
            ) : null}
            {filters.phase !== 'todas' ? (
              <span className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-surface-alt px-2 text-foreground">
                Fase: {PHASE_LABEL[filters.phase] ?? filters.phase}
                <button type="button" onClick={() => patch({ phase: 'todas' })} className="grid min-h-7 min-w-7 place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30" aria-label="Remover filtro de fase"><X size={14} /></button>
              </span>
            ) : null}
            {filters.product !== 'todos' ? (
              <span className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-surface-alt px-2 text-foreground">
                Produto: {filters.product}
                <button type="button" onClick={() => patch({ product: 'todos' })} className="grid min-h-7 min-w-7 place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30" aria-label="Remover filtro de produto"><X size={14} /></button>
              </span>
            ) : null}
            {filters.owner !== 'todos' ? (
              <span className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border bg-surface-alt px-2 text-foreground">
                Responsável: {owners.find(owner => owner.id === filters.owner)?.label ?? filters.owner}
                <button type="button" onClick={() => patch({ owner: 'todos' })} className="grid min-h-7 min-w-7 place-items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30" aria-label="Remover filtro de responsável"><X size={14} /></button>
              </span>
            ) : null}
            <Button variant="ghost" size="sm" className="min-h-9 text-sm text-muted-foreground hover:text-status-error-text" onClick={clearAllFilters}>Limpar todos</Button>
            <span className="ml-auto text-sm text-muted-foreground">{activeFilterCount} {activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}</span>
          </div>
        ) : null}

        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="client-portfolio-list-heading" className="text-base font-semibold text-foreground">Clientes</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? 'resultado ordenado' : 'resultados ordenados'} pela próxima ação.</p>
          </div>
          <span className="text-xs text-muted-foreground">Ação principal destacada em cada registro</span>
        </div>

        {filtered.length === 0 ? (
          <MxEmptyState
            variant="filter"
            title="Nenhum cliente ou loja encontrado"
            description="Nenhum resultado corresponde aos filtros selecionados. Tente ajustar a busca ou remover um filtro."
            action={<Button variant="outline" onClick={clearAllFilters}>Limpar filtros</Button>}
          />
        ) : viewMode === 'tabela' ? (
          <MxTableSurface aria-label="Carteira de clientes com próxima ação, consultoria e vendas" data-testid="client-portfolio-table">
            <p className="mb-2 text-sm text-muted-foreground md:hidden">A tabela é comparativa. Deslize horizontalmente para consultar as cinco colunas.</p>
            <Table className="w-full min-w-[960px] table-fixed text-sm xl:min-w-0">
              <colgroup>
                <col className="w-[27%]" />
                <col className="w-[23%]" />
                <col className="w-[21%]" />
                <col className="w-[17%]" />
                <col className="w-[12%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3 py-3 text-xs leading-4">Cliente / estrutura</TableHead>
                  <TableHead className="px-3 py-3 text-xs leading-4">Próxima ação</TableHead>
                  <TableHead className="px-3 py-3 text-xs leading-4"><span className="inline-flex items-center gap-1"><Target size={14} aria-hidden="true" />Vendas e meta</span></TableHead>
                  <TableHead className="px-3 py-3 text-xs leading-4"><span className="inline-flex items-center gap-1"><TrendingUp size={14} aria-hidden="true" />Consultoria</span></TableHead>
                  <TableHead className="px-3 py-3 text-xs leading-4">Equipe / ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientViewData.map(data => {
                  const { client, blockers, stat, teamDataAvailable, accountStatus, accountStatusLabel, operationalLabel, sales, storeSlug, progressPct } = data
                  const salesState = salesStatus(sales)
                  return (
                    <TableRow key={client.id} data-action-priority={data.actionPriority} className="transition-colors hover:bg-surface-alt/50">
                      <TableCell className="align-top px-3 py-3">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-primary/10 text-sm font-bold text-brand-primary">{client.name.charAt(0).toUpperCase()}</div>
                          <div className="min-w-0">
                            <button type="button" onClick={() => navigate(`/clientes/${client.slug || client.id}`)} className="block max-w-full break-words text-left text-sm font-semibold leading-5 text-foreground outline-none hover:text-brand-primary focus-visible:text-brand-primary" title={client.name}>{client.name}</button>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <Badge variant={statusBadgeVariant(accountStatus)} className="py-0.5 text-xs">{accountStatusLabel}</Badge>
                              {operationalLabel ? <span className="text-xs text-muted-foreground">{operationalLabel}</span> : null}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                              <span className="font-medium text-brand-primary">{clientStructureSummary(client)}</span>
                              {client.primary_store_city ? <><span aria-hidden="true">•</span><span>{formatCityName(client.primary_store_city)}</span></> : null}
                            </div>
                            <div className="mt-0.5 break-words text-xs text-muted-foreground">{client.cnpj ? `CNPJ: ${formatCnpj(client.cnpj)}` : 'CNPJ não informado'}</div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-top px-3 py-3">
                        <ClientPrimaryAction data={data} onOpen={openPendencias} />
                        {blockers.length > 0 ? (
                          <button type="button" onClick={() => openPendencias(client)} className="mt-2 flex min-h-8 items-center gap-1 text-left text-xs font-medium text-status-error-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-error/30" aria-label={`${blockers.length} ${blockers.length === 1 ? 'bloqueio' : 'bloqueios'} de ativação para ${client.name}`} title={blockers.join(' · ')}>
                            <AlertTriangle size={14} aria-hidden="true" />{blockers.length} {blockers.length === 1 ? 'bloqueio de ativação' : 'bloqueios de ativação'}
                          </button>
                        ) : <span className="mt-2 block text-xs text-muted-foreground">Sem bloqueio estrutural</span>}
                      </TableCell>

                      <TableCell className="align-top px-3 py-3">
                        {salesInitialLoading ? <span className="text-sm text-muted-foreground">Atualizando vendas...</span> : salesUnavailable ? <span className="text-sm text-muted-foreground" title={salesRangeError ?? salesError ?? undefined}>Indisponível</span> : (
                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-start justify-between gap-1.5">
                              <span className="text-base font-bold leading-5 text-foreground">{salesEvidenceLabel(sales)}</span>
                              <Badge variant={salesState.variant} className="py-0.5 text-xs">{salesState.label}</Badge>
                            </div>
                            <p className="break-words text-xs leading-4 text-muted-foreground">
                              {sales.monthlyGoal > 0 ? `Meta ${formatSalesLabel(sales.monthlyGoal)} · ${formatSalesPercent(sales.attainment)}` : 'Meta não configurada'} · {sales.storesWithSales}/{client.units} unidades com venda · {formatSalesDate(sales.lastSaleDate)}
                            </p>
                            {sales.monthlyGoal > 0 && sales.attainment !== null ? <MxProgress value={sales.attainment} tone={salesProgressTone(sales.attainment)} label={`${formatSalesLabel(sales.sales)} de ${formatSalesLabel(sales.monthlyGoal)} · meta do mês`} /> : <span className="block text-xs text-muted-foreground">{salesEvidenceDetail(sales)}</span>}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="align-top px-3 py-3">
                        <div className="min-w-0 space-y-2">
                          <div className="min-w-0">
                            <div className="break-words text-sm font-medium leading-5 text-foreground" title={client.product_name || 'Produto não configurado'}>{client.product_name || 'Produto não configurado'}</div>
                            <span className="mt-1 block break-words text-xs text-muted-foreground">Fase: {PHASE_LABEL[client.business_phase ?? ''] ?? 'Não configurada'}</span>
                          </div>
                          <div className="border-t border-border-subtle pt-2">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-foreground">Jornada consultiva</span>
                              <span className="text-muted-foreground">{journeyLabel(client)}</span>
                            </div>
                            {client.visitsTotal > 0 ? <MxProgress value={progressPct} tone="brand" label={`${client.visitsDone}/${client.visitsTotal} encontros`} /> : <span className="mt-1 block text-xs text-muted-foreground">Não configurada</span>}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="align-top px-3 py-3">
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Users size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="text-sm font-semibold text-foreground">{stat.sellers} {sellerLabel(stat.sellers)}</span>
                          </div>
                          {teamDataAvailable ? stat.sellers > 0 ? <div className="text-xs text-muted-foreground"><span className="font-medium text-status-success-text">{stat.disciplinePct}%</span> presença hoje</div> : <div className="text-xs text-muted-foreground">Nenhum vendedor cadastrado</div> : <div className="text-xs text-muted-foreground">Equipe indisponível</div>}
                          <div className="border-t border-border-subtle pt-2">
                            <span className="block text-xs text-muted-foreground">Responsável MX</span>
                            {client.implementation_owner_name ? <span className="block break-words text-sm font-medium text-foreground" title={client.implementation_owner_email ?? client.implementation_owner_name}>{client.implementation_owner_name}</span> : <span className="block text-sm italic text-muted-foreground">Não atribuído</span>}
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="outline" size="sm" className="min-h-10 h-auto px-2 text-sm" onClick={() => navigate(`/clientes/${storeSlug}`)}>Visão 360</Button>
                            <ClientActionsMenu compact client={client} onAction={action => onAction(client, action)} />
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </MxTableSurface>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clientViewData.map(data => {
              const { client, blockers, stat, teamDataAvailable, accountStatus, accountStatusLabel, operationalLabel, sales, storeSlug, progressPct } = data
              const salesState = salesStatus(sales)
              return (
                <article key={client.id} data-action-priority={data.actionPriority} className="flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 shadow-xs transition-colors hover:border-brand-primary/40">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-primary/10 font-bold text-brand-primary">{client.name.charAt(0).toUpperCase()}</span>
                      <div className="min-w-0">
                        <button type="button" onClick={() => navigate(`/clientes/${client.slug || client.id}`)} className="block line-clamp-2 break-words text-left text-sm font-semibold leading-5 text-foreground outline-none hover:text-brand-primary focus-visible:text-brand-primary" title={client.name}>{client.name}</button>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant={statusBadgeVariant(accountStatus)} className="py-0.5 text-xs">{accountStatusLabel}</Badge>
                          {operationalLabel ? <span className="text-xs text-muted-foreground">{operationalLabel}</span> : null}
                        </div>
                      </div>
                    </div>
                    <ClientActionsMenu client={client} onAction={action => onAction(client, action)} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="font-medium text-brand-primary">{clientStructureSummary(client)}</span>
                    {client.primary_store_city ? <><span aria-hidden="true">•</span><span>{formatCityName(client.primary_store_city)}</span></> : null}
                    <span aria-hidden="true">•</span>
                    <span className="break-words">{client.cnpj ? `CNPJ: ${formatCnpj(client.cnpj)}` : 'CNPJ não informado'}</span>
                  </div>

                  <div className="mt-4 border-t border-border-subtle pt-3">
                    <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">Próxima ação</span>
                    <ClientPrimaryAction data={data} onOpen={openPendencias} />
                    {blockers.length > 0 ? (
                      <button type="button" onClick={() => openPendencias(client)} className="mt-2 flex min-h-8 items-center gap-1 text-left text-sm font-medium text-status-error-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-status-error/30" aria-label={`${blockers.length} ${blockers.length === 1 ? 'bloqueio' : 'bloqueios'} de ativação para ${client.name}`} title={blockers.join(' · ')}>
                        <AlertTriangle size={14} aria-hidden="true" />{blockers.length} {blockers.length === 1 ? 'pendência de ativação' : 'pendências de ativação'}
                      </button>
                    ) : <span className="mt-2 block text-sm text-muted-foreground">Sem pendências de ativação</span>}
                  </div>

                  <div className="mt-4 border-t border-border-subtle pt-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <span className="text-sm font-semibold text-muted-foreground">Vendas no período</span>
                        <div className="mt-0.5 text-xl font-bold leading-6 text-foreground">{salesInitialLoading ? 'Atualizando' : salesUnavailable ? 'Indisponível' : salesEvidenceLabel(sales)}</div>
                      </div>
                      {!salesInitialLoading && !salesUnavailable ? <Badge variant={salesState.variant} className="py-0.5 text-xs">{salesState.label}</Badge> : null}
                    </div>
                    {salesInitialLoading ? <span className="mt-2 block text-sm text-muted-foreground">Atualizando vendas e meta...</span> : salesUnavailable ? <span className="mt-2 block text-sm text-muted-foreground">Dados comerciais indisponíveis</span> : sales.monthlyGoal > 0 && sales.attainment !== null ? <MxProgress value={sales.attainment} tone={salesProgressTone(sales.attainment)} label={`${formatSalesLabel(sales.sales)} de ${formatSalesLabel(sales.monthlyGoal)} · meta do mês`} /> : <span className="mt-2 block text-sm text-muted-foreground">{salesEvidenceDetail(sales)} · meta não configurada</span>}
                    {!salesInitialLoading && !salesUnavailable ? <p className="mt-2 break-words text-xs leading-4 text-muted-foreground">{sales.monthlyGoal > 0 ? `Meta ${formatSalesLabel(sales.monthlyGoal)} · ${formatSalesPercent(sales.attainment)}` : 'Meta não configurada'} · {sales.storesWithSales}/{client.units} unidades com venda · {formatSalesDate(sales.lastSaleDate)}</p> : null}
                  </div>

                  <div className="mt-4 border-t border-border-subtle pt-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-semibold text-foreground">Jornada consultiva</span>
                      <span className="text-muted-foreground">{journeyLabel(client)}</span>
                    </div>
                    {client.visitsTotal > 0 ? <MxProgress value={progressPct} tone="brand" label={`${client.visitsDone}/${client.visitsTotal} encontros`} /> : <span className="mt-1 block text-sm text-muted-foreground">Não configurada</span>}
                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <div className="flex items-center gap-1.5">
                        <Users size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="font-semibold text-foreground">{stat.sellers}</span>
                        <span className="text-muted-foreground">{sellerLabel(stat.sellers)}</span>
                      </div>
                      {teamDataAvailable && stat.sellers > 0 ? <div className="font-medium text-foreground"><span className="text-status-success-text">{stat.disciplinePct}%</span> presença hoje</div> : teamDataAvailable ? <span className="text-sm text-muted-foreground">Nenhum vendedor cadastrado</span> : <span className="text-sm text-muted-foreground">Equipe indisponível</span>}
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Responsável MX: </span>
                      {client.implementation_owner_name ? <span className="break-words font-medium text-foreground" title={client.implementation_owner_email ?? client.implementation_owner_name}>{client.implementation_owner_name}</span> : <span className="italic text-muted-foreground">Não atribuído</span>}
                    </div>
                  </div>

                  <details className="mt-4 border-t border-border-subtle pt-3">
                    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 [&::-webkit-details-marker]:hidden">
                      Ver detalhes da conta
                      <ChevronDown size={16} aria-hidden="true" />
                    </summary>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="min-w-0"><span className="block text-xs text-muted-foreground">Produto</span><span className="block break-words font-medium text-foreground">{client.product_name || 'Produto não configurado'}</span></div>
                      <div className="min-w-0"><span className="block text-xs text-muted-foreground">Fase</span><span className="block break-words font-medium text-foreground">{PHASE_LABEL[client.business_phase ?? ''] ?? 'Não configurada'}</span></div>
                      <div className="min-w-0"><span className="block text-xs text-muted-foreground">Unidades</span><span className="block break-words font-medium text-foreground">{client.units}</span></div>
                      <div className="min-w-0"><span className="block text-xs text-muted-foreground">E-mail do responsável</span><span className="block break-words font-medium text-foreground">{client.implementation_owner_email || 'Não informado'}</span></div>
                    </div>
                    {sales.units.length > 0 ? (
                      <div className="mt-3 border-t border-border-subtle pt-3">
                        <span className="block text-xs font-semibold text-muted-foreground">Vendas por unidade</span>
                        <div className="mt-1 divide-y divide-border-subtle" role="list" aria-label={`Vendas por unidade de ${client.name}`}>
                          {sales.units.map(unit => <div key={unit.storeId} role="listitem" className="flex items-start justify-between gap-2 py-2 text-sm"><span className="min-w-0 break-words text-muted-foreground">{unit.parentStoreName ? 'Filial' : 'Matriz'} · {unit.storeName}</span><strong className="shrink-0 text-foreground">{unitSalesEvidenceLabel(unit)}</strong></div>)}
                        </div>
                      </div>
                    ) : null}
                  </details>

                  <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <Button variant="outline" size="sm" className="min-h-10 text-sm" onClick={() => navigate(`/lojas/${storeSlug}`)}>Abrir loja</Button>
                    <Button variant="ghost" size="sm" className="min-h-10 text-sm" onClick={() => navigate(`/clientes/${client.slug || client.id}`)}>Visão 360</Button>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <PendenciasModal
        open={Boolean(pendenciasClient)}
        clientId={pendenciasClient?.id ?? ''}
        clientName={pendenciasClient?.name ?? ''}
        onClose={closePendencias}
        onRefetch={onRefetch}
        onCorrect={check => {
          if (check.key !== 'dono-master' || !pendenciasClient) return
          const slug = pendenciasClient.slug || pendenciasClient.id
          setPendenciasClient(null)
          navigate(`/clientes/${slug}?tab=pessoas&corrigirMaster=1&returnTo=activation`)
        }}
      />
    </div>
  )
}

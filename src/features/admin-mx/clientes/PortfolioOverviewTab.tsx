import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  LayoutGrid,
  Rocket,
  RefreshCw,
  Search,
  ShoppingCart,
  Store as StoreIcon,
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
import { ScrollableRegion } from '@/design-system/page/ScrollableRegion'
import {
  MxEmptyState,
  MxInput,
  MxProgress,
  MxSectionCard,
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
  clientStoreIds,
  clientTeamStat,
  clientStructureSummary,
  filterPortfolio,
  isActive,
  journeyLabel,
  nextAction,
  portfolioCounters,
  type PortfolioBucket,
  type PortfolioClient,
  type PortfolioFilters,
} from './clientPortfolio'
import { aggregateClientSalesForStores, CLIENT_SALES_TIME_ZONE, type ClientSalesPeriod } from './clientSales'
import { useClientSales, type ClientStoreSales } from './useClientSales'

const PHASE_LABEL: Record<string, string> = {
  ESTRUTURACAO: 'Estruturação',
  CRESCIMENTO: 'Crescimento',
  CONSOLIDACAO: 'Consolidação',
  EXPANSAO: 'Expansão',
  RECUPERACAO: 'Recuperação',
}

const METRIC_BUCKETS: Array<{
  bucket: PortfolioBucket
  label: string
  icon: typeof Building2
  tone: 'brand' | 'success' | 'info' | 'danger' | 'warning' | 'violet'
}> = [
  { bucket: 'ativos', label: 'Ativos', icon: CheckCircle2, tone: 'success' },
  { bucket: 'em_implantacao', label: 'Em Implantação', icon: Rocket, tone: 'info' },
  { bucket: 'prontos_para_ativar', label: 'Prontos p/ Ativar', icon: ClipboardList, tone: 'brand' },
  { bucket: 'com_bloqueios', label: 'Com Bloqueios', icon: AlertTriangle, tone: 'danger' },
  { bucket: 'renovacoes_proximas', label: 'Renovações', icon: CalendarClock, tone: 'warning' },
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
function formatSalesPercent(value: number | null): string { return value === null ? '—' : `${SALES_PERCENT_FORMATTER.format(value)}%` }
function formatSalesDate(dateKey: string | null): string {
  if (!dateKey) return 'Sem venda registrada'
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
function salesStatus(rollup: Pick<PortfolioClientSales, 'sales' | 'monthlyGoal' | 'attainment'>): { label: string; variant: 'success' | 'warning' | 'outline' | 'secondary' } {
  if (rollup.monthlyGoal > 0 && rollup.attainment !== null && rollup.attainment >= 100) return { label: 'Meta atingida', variant: 'success' }
  if (rollup.monthlyGoal > 0 && rollup.attainment !== null && rollup.attainment >= 70) return { label: 'Em ritmo', variant: 'warning' }
  if (rollup.monthlyGoal > 0) return { label: rollup.sales > 0 ? 'Abaixo da meta' : 'Sem vendas', variant: rollup.sales > 0 ? 'warning' : 'outline' }
  return { label: rollup.sales > 0 ? 'Com vendas' : 'Sem meta', variant: rollup.sales > 0 ? 'secondary' : 'outline' }
}

function getInitialPortfolioViewMode(): 'tabela' | 'cards' {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'tabela'
  return window.matchMedia('(max-width: 767px)').matches ? 'cards' : 'tabela'
}

function ViewModeSwitch({ viewMode, onChange }: { viewMode: 'tabela' | 'cards'; onChange: (mode: 'tabela' | 'cards') => void }) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Modo de visualização da carteira">
      <Button
        variant={viewMode === 'tabela' ? 'primary' : 'ghost'}
        size="sm"
        className="h-9 px-3 text-xs"
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
        className="h-9 px-3 text-xs"
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

export interface PortfolioOverviewTabProps {
  rows: PortfolioClient[]
  lojas: Store[]
  stats: Record<string, { sellers: number; checkedIn?: number; disciplinePct: number }>
  onAction: (client: PortfolioClient, action: ClientAction) => void
  onCopyLink: (name: string) => void
  onEditStore: (store: Store) => void
  onRefetch: () => void
}

export function PortfolioOverviewTab({
  rows,
  lojas,
  stats,
  onAction,
  onCopyLink,
  onEditStore,
  onRefetch,
}: PortfolioOverviewTabProps) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<PortfolioFilters>(EMPTY_PORTFOLIO_FILTERS)
  const [viewMode, setViewMode] = useState<'tabela' | 'cards'>(getInitialPortfolioViewMode)
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

  const openPendencias = (client: PortfolioClient) => {
    setPendenciasClient(client)
  }

  const closePendencias = () => {
    setPendenciasClient(null)
  }

  const counters = useMemo(() => portfolioCounters(rows), [rows])
  const filtered = useMemo(() => filterPortfolio(rows, filters), [rows, filters])
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
    return {
      totalSales: rollup.sales,
      totalMonthlyGoal: rollup.monthlyGoal,
      totalAttainment: rollup.attainment,
      storesWithSales: rollup.storesWithSales,
      totalStores: visibleStoreIds.length,
    }
  }, [filtered, lojas, salesRows])
  const salesDataReady = Boolean(salesQueryKey && salesLoadedQueryKey === salesQueryKey)
  const salesUnavailable = Boolean(salesRangeError || (salesError && !salesDataReady))
  const salesInitialLoading = Boolean(salesQueryKey && !salesDataReady && !salesUnavailable)
  const salesStale = Boolean(salesError && salesDataReady)
  const salesRefreshing = Boolean(salesLoading && salesDataReady)
  const phases = useMemo(() => [...new Set(rows.map(r => r.business_phase).filter((v): v is string => Boolean(v)))].sort(), [rows])
  const products = useMemo(() => [...new Set(rows.map(r => r.product_name).filter((v): v is string => Boolean(v)))].sort(), [rows])
  const owners = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of rows) {
      if (r.implementation_owner_id) map.set(r.implementation_owner_id, r.implementation_owner_name ?? 'Sem nome')
    }
    return [...map.entries()]
  }, [rows])

  const patch = (values: Partial<PortfolioFilters>) => setFilters(cur => ({ ...cur, ...values }))

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(filters.search.trim()) ||
      filters.bucket !== 'todos' ||
      filters.phase !== 'todas' ||
      filters.product !== 'todos' ||
      filters.owner !== 'todos'
    )
  }, [filters])

  const clearAllFilters = () => setFilters(EMPTY_PORTFOLIO_FILTERS)
  const refreshAll = () => { void Promise.all([onRefetch(), refetchSales()]) }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Clientes, lojas e consultoria</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Uma linha por cliente: loja única ou matriz com filiais. A jornada consultiva e o resultado comercial aparecem juntos, cada um no seu bloco.</p>
        </div>
        <ViewModeSwitch viewMode={viewMode} onChange={setViewMode} />
      </div>

      {/* Metric Quick-Filter Segment Buttons */}
      <ScrollableRegion axis="horizontal" label="Indicadores da carteira" className="flex gap-2 pb-1 md:grid md:grid-cols-6 md:overflow-visible">
        <button
          type="button"
          onClick={() => patch({ bucket: 'todos' })}
          className={`flex min-h-[5.25rem] w-[9.25rem] shrink-0 flex-col items-start justify-between rounded-xl border p-2 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 sm:p-3 md:min-h-0 md:w-auto md:min-w-0 ${
            filters.bucket === 'todos'
              ? 'border-brand-primary bg-brand-primary/10 shadow-xs'
              : 'border-border bg-card hover:border-brand-primary/40 hover:bg-surface-alt'
          }`}
        >
          <span className="line-clamp-2 text-caption font-medium text-muted-foreground">Clientes na carteira</span>
          <span className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{rows.length}</span>
          <span className="line-clamp-2 text-caption text-muted-foreground">{lojas.length} unidades · matriz + filiais</span>
        </button>

        {METRIC_BUCKETS.map(item => {
          const count = counters[item.bucket]
          const isSelected = filters.bucket === item.bucket
          const Icon = item.icon

          return (
            <button
              key={item.bucket}
              type="button"
              onClick={() => patch({ bucket: isSelected ? 'todos' : item.bucket })}
              className={`flex min-h-[5.25rem] w-[9.25rem] shrink-0 flex-col items-start justify-between rounded-xl border p-2 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 sm:p-3 md:min-h-0 md:w-auto md:min-w-0 ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/10 shadow-xs ring-1 ring-brand-primary/30'
                  : 'border-border bg-card hover:border-brand-primary/40 hover:bg-surface-alt'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="line-clamp-2 text-caption font-medium text-muted-foreground">{item.label}</span>
                <Icon
                  size={14}
                  className={
                    item.tone === 'success'
                      ? 'text-status-success-text'
                      : item.tone === 'danger'
                      ? 'text-status-error-text'
                      : item.tone === 'warning'
                      ? 'text-status-warning-text'
                      : 'text-brand-primary'
                  }
                />
              </div>
              <span className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{count}</span>
              <span className="line-clamp-2 text-caption text-muted-foreground">{PORTFOLIO_BUCKET_LABEL[item.bucket]}</span>
            </button>
          )
        })}
      </ScrollableRegion>
      <p className="-mt-2 text-caption text-muted-foreground md:hidden">Deslize para ver todos os indicadores da carteira.</p>

      {/* Main Container */}
      <MxSectionCard>
        {/* Toolbar with Search and Filters */}
        <div className="border-b border-border p-4 sm:p-5 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 lg:min-w-0">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <MxInput
                id="client-portfolio-search"
                name="client-search"
                value={filters.search}
                onChange={e => patch({ search: e.target.value })}
                placeholder="Buscar por loja, CNPJ, cidade, produto ou responsável..."
                aria-label="Buscar cliente na carteira"
                className="pl-9 pr-8 h-10 w-full"
              />
              {filters.search ? (
                <button
                  type="button"
                  onClick={() => patch({ search: '' })}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
                  aria-label="Limpar busca"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>

            {/* Filter Selects & View Mode Toggle */}
            <div className="grid grid-cols-2 items-center gap-2 lg:flex lg:flex-wrap">
              <MxSelect
                aria-label="Filtrar por fase empresarial"
                value={filters.phase}
                onChange={e => patch({ phase: e.target.value })}
                className="h-10 w-full min-w-0 text-xs lg:w-auto lg:min-w-[140px]"
              >
                <option value="todas">Todas as fases</option>
                {phases.map(phase => (
                  <option key={phase} value={phase}>
                    {PHASE_LABEL[phase] ?? phase}
                  </option>
                ))}
              </MxSelect>

              <MxSelect
                aria-label="Filtrar por produto"
                value={filters.product}
                onChange={e => patch({ product: e.target.value })}
                className="h-10 w-full min-w-0 text-xs lg:w-auto lg:min-w-[140px]"
              >
                <option value="todos">Todos os produtos</option>
                {products.map(product => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </MxSelect>

              <MxSelect
                aria-label="Filtrar por responsável MX"
                value={filters.owner}
                onChange={e => patch({ owner: e.target.value })}
                className="h-10 w-full min-w-0 text-xs lg:w-auto lg:min-w-[160px]"
              >
                <option value="todos">Todos os responsáveis</option>
                {owners.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </MxSelect>

            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-alt/50 p-2.5 sm:p-3 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-status-success-surface text-status-success-text" aria-hidden="true">
                <ShoppingCart size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground sm:text-sm">Vendas, meta e progresso comercial</p>
                <p className="line-clamp-2 text-caption leading-4 text-muted-foreground">
                  {salesRange ? `Período: ${formatSalesRange(salesRange.startDate, salesRange.endDate)}` : 'Informe as datas para consultar as vendas.'}
                  {' · '}progresso sobre a meta mensal · consultoria separada
                  {salesRefreshing ? ' · atualizando' : ''}
                  {salesStale ? ' · últimos dados válidos' : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 lg:flex lg:flex-wrap">
              <label className="flex min-w-0 flex-col gap-1 text-caption font-semibold text-muted-foreground sm:min-w-[11rem]">
                Período de vendas
                <MxSelect data-testid="client-sales-period" aria-label="Filtrar vendas por período" value={salesPeriod} onChange={event => setSalesPeriod(event.target.value as ClientSalesPeriod)} className="h-9 text-xs">
                  {SALES_PERIOD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </MxSelect>
              </label>
              {salesPeriod === 'custom' ? (
                <>
                  <label htmlFor="client-sales-custom-start" className="col-span-2 flex min-w-0 flex-col gap-1 text-caption font-semibold text-muted-foreground sm:col-span-1 sm:min-w-[9.5rem]">
                    Data inicial
                    <MxInput data-testid="client-sales-custom-start" id="client-sales-custom-start" type="date" aria-label="Data inicial das vendas" value={customStartDate} onChange={event => setCustomStartDate(event.target.value)} className="h-9 text-xs" />
                  </label>
                  <label htmlFor="client-sales-custom-end" className="col-span-2 flex min-w-0 flex-col gap-1 text-caption font-semibold text-muted-foreground sm:col-span-1 sm:min-w-[9.5rem]">
                    Data final
                    <MxInput data-testid="client-sales-custom-end" id="client-sales-custom-end" type="date" aria-label="Data final das vendas" value={customEndDate} onChange={event => setCustomEndDate(event.target.value)} className="h-9 text-xs" />
                  </label>
                </>
              ) : null}
              <Button variant="outline" size="sm" className="h-9 px-2.5 text-xs" onClick={refreshAll} disabled={salesLoading} aria-label="Atualizar vendas e carteira">
                <RefreshCw size={14} className="mr-1.5" />Atualizar vendas
              </Button>
            </div>

            <dl className="grid grid-cols-4 gap-x-2 border-t border-border-subtle pt-2 text-caption lg:flex lg:items-center lg:gap-x-4 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0" aria-busy={salesLoading} aria-live="polite">
              <div className="min-w-0">
                <dt className="truncate text-muted-foreground">Vendas</dt>
                <dd className="font-bold text-foreground">{salesInitialLoading ? 'Atualizando' : salesUnavailable ? '—' : formatSalesCount(salesTotalsForView.totalSales)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="truncate text-muted-foreground">Meta mensal</dt>
                <dd className="font-bold text-foreground">{salesInitialLoading ? 'Atualizando' : salesUnavailable ? '—' : formatSalesCount(salesTotalsForView.totalMonthlyGoal)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="truncate text-muted-foreground">Atingimento</dt>
                <dd className={`font-bold ${salesInitialLoading || salesUnavailable ? 'text-foreground' : salesProgressTextClass(salesTotalsForView.totalAttainment)}`}>
                  {salesInitialLoading ? 'Atualizando' : salesUnavailable ? '—' : formatSalesPercent(salesTotalsForView.totalAttainment)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="truncate text-muted-foreground">Unidades com venda</dt>
                <dd className="font-bold text-foreground">{salesInitialLoading ? 'Atualizando' : salesUnavailable ? '—' : `${salesTotalsForView.storesWithSales}/${salesTotalsForView.totalStores}`}</dd>
              </div>
            </dl>
          </div>

          {salesRangeError ? <div className="rounded-lg border border-status-warning/30 bg-status-warning-surface px-3 py-2 text-xs font-medium text-status-warning-text" role="status">{salesRangeError}</div> : null}
          {salesError ? <div className="rounded-lg border border-status-error/30 bg-status-error-surface px-3 py-2 text-xs font-medium text-status-error-text" role="alert">{salesError} <button type="button" onClick={() => void refetchSales()} className="ml-1 underline underline-offset-2">Tentar novamente</button></div> : null}

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
              <span className="font-medium text-muted-foreground">Filtros ativos:</span>

              {filters.search.trim() && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-alt px-2 py-0.5 text-foreground border border-border">
                  Busca: &ldquo;{filters.search}&rdquo;
                  <button
                    type="button"
                    onClick={() => patch({ search: '' })}
                    className="hover:text-status-error-text focus-visible:text-status-error-text focus-visible:outline-none"
                    aria-label="Remover filtro de busca"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {filters.bucket !== 'todos' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-primary/10 px-2 py-0.5 text-brand-primary border border-brand-primary/30">
                  {PORTFOLIO_BUCKET_LABEL[filters.bucket]}
                  <button
                    type="button"
                    onClick={() => patch({ bucket: 'todos' })}
                    className="hover:text-status-error-text focus-visible:text-status-error-text focus-visible:outline-none"
                    aria-label="Remover filtro de situação"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {filters.phase !== 'todas' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-alt px-2 py-0.5 text-foreground border border-border">
                  Fase: {PHASE_LABEL[filters.phase] ?? filters.phase}
                  <button
                    type="button"
                    onClick={() => patch({ phase: 'todas' })}
                    className="hover:text-status-error-text focus-visible:text-status-error-text focus-visible:outline-none"
                    aria-label="Remover filtro de fase"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {filters.product !== 'todos' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-alt px-2 py-0.5 text-foreground border border-border">
                  Produto: {filters.product}
                  <button
                    type="button"
                    onClick={() => patch({ product: 'todos' })}
                    className="hover:text-status-error-text focus-visible:text-status-error-text focus-visible:outline-none"
                    aria-label="Remover filtro de produto"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {filters.owner !== 'todos' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-alt px-2 py-0.5 text-foreground border border-border">
                  Responsável: {owners.find(([id]) => id === filters.owner)?.[1] ?? filters.owner}
                  <button
                    type="button"
                    onClick={() => patch({ owner: 'todos' })}
                    className="hover:text-status-error-text focus-visible:text-status-error-text focus-visible:outline-none"
                    aria-label="Remover filtro de responsável"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-status-error-text"
                onClick={clearAllFilters}
              >
                Limpar todos
              </Button>

              <span className="ml-auto text-caption text-muted-foreground">
                {filtered.length} de {rows.length} {filtered.length === 1 ? 'cliente' : 'clientes'}
              </span>
            </div>
          )}
        </div>

        {/* Content View */}
        <div className="p-4 sm:p-5">
          {filtered.length === 0 ? (
            <MxEmptyState
              variant="filter"
              title="Nenhum cliente ou loja encontrado"
              description="Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos da busca."
              action={
                <Button variant="outline" onClick={clearAllFilters}>
                  Limpar filtros
                </Button>
              }
            />
          ) : viewMode === 'tabela' ? (
            <MxTableSurface aria-label="Carteira de clientes com consultoria e vendas" data-testid="client-portfolio-table">
              <p className="mb-2 text-caption text-muted-foreground md:hidden">Deslize horizontalmente para consultar todas as colunas.</p>
              <Table className="w-full min-w-[1040px] table-fixed text-xs xl:min-w-0">
                <colgroup>
                  <col className="w-[24%] sm:w-[18%]" />
                  <col className="w-[14%] sm:w-[14%]" />
                  <col className="w-[16%] sm:w-[15%]" />
                  <col className="w-[17%] sm:w-[17%]" />
                  <col className="w-[13%] sm:w-[13%]" />
                  <col className="w-[11%] sm:w-[13%]" />
                  <col className="w-[5%] sm:w-[10%]" />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2.5 py-2 text-caption leading-4">Cliente e estrutura</TableHead>
                    <TableHead className="px-2.5 py-2 text-caption leading-4"><span className="inline-flex items-center gap-1"><StoreIcon size={14} aria-hidden="true" />Vendas</span></TableHead>
                    <TableHead className="px-2.5 py-2 text-caption leading-4"><span className="inline-flex items-center gap-1"><Target size={14} aria-hidden="true" />Meta do mês / atingimento</span></TableHead>
                    <TableHead className="px-2.5 py-2 text-caption leading-4"><span className="inline-flex items-center gap-1"><TrendingUp size={14} aria-hidden="true" />Consultoria</span></TableHead>
                    <TableHead className="px-2.5 py-2 text-caption leading-4">Equipe / responsável</TableHead>
                    <TableHead className="px-2.5 py-2 text-caption leading-4">Próxima ação</TableHead>
                    <TableHead className="px-2.5 py-2 text-right text-caption leading-4">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(client => {
                    const blockers = activationBlockers(client)
                    const storeIds = clientStoreIds(client, lojas)
                    const stat = clientTeamStat(storeIds, stats)
                    const sales = salesByClient.get(client.id) ?? {
                      ...aggregateClientSalesForStores(storeIds, []),
                      units: [],
                    }
                    const storeSlug = client.slug || client.id
                    const clientActive = isActive(client)
                    const progressPct =
                      client.visitsTotal > 0
                        ? Math.min(100, Math.round((client.visitsDone / client.visitsTotal) * 100))
                        : 0

                    return (
                      <TableRow key={client.id} className="transition-colors hover:bg-surface-alt/50">
                        {/* 1. Cliente = loja única ou matriz com filiais */}
                        <TableCell className="align-top px-2.5 py-2 text-caption">
                          <div className="flex min-w-0 items-start gap-2">
                            <div aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-primary/10 text-brand-primary text-sm font-bold">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                                className="block max-w-full truncate text-left font-semibold text-foreground outline-none hover:text-brand-primary focus-visible:text-brand-primary"
                                title={client.name}
                              >
                                {client.name}
                              </button>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-muted-foreground">
                                <span className="font-medium text-brand-primary">{clientStructureSummary(client)}</span>
                                {client.primary_store_city && (
                                  <>
                                    <span>•</span>
                                    <span>{client.primary_store_city}</span>
                                  </>
                                )}
                              </div>
                              <div className="mt-0.5 text-caption text-muted-foreground">{client.cnpj ? `CNPJ: ${client.cnpj}` : 'Sem CNPJ'}</div>
                              <div className="mt-1.5 space-y-1.5 border-t border-border-subtle pt-1.5 sm:hidden">
                                <div className="flex items-center justify-between gap-2 text-caption">
                                  <span className="font-medium text-muted-foreground">Vendas no período</span>
                                  <span className="font-bold text-foreground">{salesInitialLoading ? 'Atualizando' : salesUnavailable ? 'Indisponível' : `${formatSalesCount(sales.sales)} vendas`}</span>
                                </div>
                                {!salesInitialLoading && !salesUnavailable && sales.monthlyGoal > 0 && sales.attainment !== null ? <MxProgress value={sales.attainment} tone={salesProgressTone(sales.attainment)} label={`${formatSalesCount(sales.sales)} de ${formatSalesCount(sales.monthlyGoal)} vendas · meta do mês`} /> : <span className="block text-caption text-muted-foreground">{salesInitialLoading ? 'Atualizando vendas e meta...' : salesUnavailable ? 'Dados comerciais indisponíveis' : 'Meta não configurada'}</span>}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Resultado comercial do cliente consolidado */}
                        <TableCell className="align-top px-2.5 py-2 text-caption">
                          {salesInitialLoading ? <span className="text-muted-foreground">Atualizando vendas...</span> : salesUnavailable ? <span className="text-muted-foreground" title={salesRangeError ?? salesError ?? undefined}>Indisponível</span> : (
                            <div className="min-w-0">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-bold leading-none text-foreground">{formatSalesCount(sales.sales)}</span>
                                <span className="text-caption text-muted-foreground">vendas</span>
                              </div>
                              <div className="mt-1 text-caption text-muted-foreground">{sales.storesWithSales}/{Math.max(client.units, 1)} unidades com venda · {formatSalesDate(sales.lastSaleDate)}</div>
                              {sales.units.length > 0 ? (
                                <div className="mt-1.5 flex max-w-full flex-wrap gap-1" role="list" aria-label="Vendas por unidade">
                                  {sales.units.slice(0, 3).map(unit => (
                                    <span key={unit.storeId} role="listitem" className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md bg-surface-alt px-1.5 py-0.5 text-caption text-muted-foreground" title={`${unit.storeName}: ${formatSalesCount(unit.sales)} vendas`}>
                                      <span className="truncate">{unit.parentStoreName ? 'Filial' : 'Matriz'} · {unit.storeName}</span>
                                      <strong className="shrink-0 text-foreground">{formatSalesCount(unit.sales)}</strong>
                                    </span>
                                  ))}
                                  {sales.units.length > 3 ? <span role="listitem" className="rounded-md bg-surface-alt px-1.5 py-0.5 text-caption text-muted-foreground" title={`${sales.units.slice(3).map(unit => `${unit.storeName}: ${formatSalesCount(unit.sales)}`).join(' · ')}`}>+{sales.units.length - 3} unidades</span> : null}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </TableCell>

                        {/* 3. Meta comercial e progresso */}
                        <TableCell className="align-top px-2.5 py-2 text-caption">
                          {salesInitialLoading ? <span className="text-muted-foreground">Atualizando meta...</span> : salesUnavailable ? <span className="text-muted-foreground">Indisponível</span> : sales.monthlyGoal > 0 && sales.attainment !== null ? (
                            <div className="min-w-0 space-y-1.5">
                              <MxProgress value={sales.attainment} tone={salesProgressTone(sales.attainment)} label={`${formatSalesCount(sales.sales)} de ${formatSalesCount(sales.monthlyGoal)} vendas`} />
                              <Badge variant={salesStatus(sales).variant} className="text-caption py-0.5">{salesStatus(sales).label} · {formatSalesPercent(sales.attainment)}</Badge>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <span className="block font-semibold text-foreground">{formatSalesCount(sales.sales)} vendas</span>
                              <span className="block text-caption text-muted-foreground">Meta não configurada</span>
                            </div>
                          )}
                        </TableCell>

                        {/* 4. Consultoria permanece separada do comercial */}
                        <TableCell className="align-top px-2.5 py-2 text-caption">
                          <div className="min-w-0 space-y-2">
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground" title={client.product_name || 'Produto não configurado'}>{client.product_name || 'Produto não configurado'}</div>
                              <Badge variant="outline" className="mt-1 text-caption py-0">{PHASE_LABEL[client.business_phase ?? ''] ?? 'Fase não informada'}</Badge>
                            </div>
                            <div className="border-t border-border-subtle pt-1.5">
                              <div className="flex items-center justify-between text-caption">
                                <span className="font-medium text-foreground">Jornada consultiva</span>
                                <span className="text-muted-foreground">{journeyLabel(client)}</span>
                              </div>
                              {client.visitsTotal > 0 ? <MxProgress value={progressPct} tone="brand" label={`${client.visitsDone}/${client.visitsTotal} encontros`} /> : <span className="text-caption text-muted-foreground">Sem jornada contratada</span>}
                            </div>
                          </div>
                        </TableCell>

                        {/* 5. Equipe e responsável */}
                        <TableCell className="align-top px-2.5 py-2 text-caption">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Users size={14} className="text-muted-foreground" aria-hidden="true" />
                              <span className="font-semibold text-foreground">{stat.sellers}</span>
                              <span className="text-caption text-muted-foreground">vendedores</span>
                            </div>
                            {stat.sellers > 0 ? <div className="text-caption text-muted-foreground"><span className="font-medium text-status-success-text">{stat.disciplinePct}%</span> presença hoje</div> : null}
                            <div className="border-t border-border-subtle pt-1.5">
                              <span className="block text-caption text-muted-foreground">Responsável MX</span>
                              <span className="block truncate text-xs font-medium text-foreground" title={client.implementation_owner_name ?? undefined}>{client.implementation_owner_name || <span className="italic text-muted-foreground">Não atribuído</span>}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* 6. Próxima ação */}
                        <TableCell className="align-top px-2.5 py-2 text-caption">
                          <div className="space-y-1">
                            {client.suspended_at ? (
                              <Badge variant="danger" className="text-caption">
                                Suspenso
                              </Badge>
                            ) : !clientActive ? (
                              <Badge variant="outline" className="text-caption">
                                Inativo
                              </Badge>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => openPendencias(client)}
                              className="w-full text-left text-xs font-medium leading-4 text-foreground line-clamp-2 hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary/30"
                              title={nextAction(client)}
                            >
                              {nextAction(client)}
                            </button>
                            {blockers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => openPendencias(client)}
                                className="text-caption font-medium text-status-error-text block hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-status-error/30"
                              >
                                +{blockers.length - 1} pendência(s)
                              </button>
                            )}
                          </div>
                        </TableCell>

                        {/* 7. Ações */}
                        <TableCell className="px-2.5 py-2 text-right text-caption">
                          <div className="flex min-w-0 items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="xs"
                              className="h-8 w-8 shrink-0 p-0"
                              onClick={() => navigate(`/lojas/${storeSlug}`)}
                              title="Abrir área da loja"
                              aria-label={`Abrir área da loja de ${client.name}`}
                            >
                              <ExternalLink size={14} />
                              <span className="sr-only">Abrir</span>
                            </Button>
                            <ClientActionsMenu compact client={client} onAction={action => onAction(client, action)} />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </MxTableSurface>
          ) : (
            /* Cards Operacionais View */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map(client => {
                const blockers = activationBlockers(client)
                const storeIds = clientStoreIds(client, lojas)
                const stat = clientTeamStat(storeIds, stats)
                const sales = salesByClient.get(client.id) ?? {
                  ...aggregateClientSalesForStores(storeIds, []),
                  units: [],
                }
                const storeSlug = client.slug || client.id
                const clientActive = isActive(client)
                const progressPct =
                  client.visitsTotal > 0
                    ? Math.min(100, Math.round((client.visitsDone / client.visitsTotal) * 100))
                    : 0

                return (
                  <div
                    key={client.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-all hover:border-brand-primary/40 hover:shadow-md"
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary font-bold">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                              className="font-semibold text-foreground hover:text-brand-primary focus-visible:text-brand-primary text-left truncate block outline-none"
                            >
                              {client.name}
                            </button>
                            <p className="text-xs text-muted-foreground truncate">
                              {client.cnpj ? `CNPJ: ${client.cnpj}` : 'Sem CNPJ'}
                              {client.primary_store_city ? ` • ${client.primary_store_city}` : ''}
                            </p>
                          </div>
                        </div>
                        {client.suspended_at ? (
                          <Badge variant="danger">Suspenso</Badge>
                        ) : !clientActive ? (
                          <Badge variant="outline">Inativo</Badge>
                        ) : null}
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                        <div>
                          <span className="text-muted-foreground">Produto:</span>{' '}
                          <span className="font-medium text-foreground block truncate">
                            {client.product_name || 'Consultoria PMR'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Fase:</span>{' '}
                          <span className="font-medium text-foreground block truncate">
                            {PHASE_LABEL[client.business_phase ?? ''] ?? 'Estruturação'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Responsável:</span>{' '}
                          <span className="font-medium text-foreground block truncate">
                            {client.implementation_owner_name || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Estrutura:</span>{' '}
                          <span className="font-medium text-foreground block truncate">
                            {clientStructureSummary(client)}
                          </span>
                        </div>
                      </div>

                      {/* Commercial result stays visible in the alternate view too */}
                      <div className="space-y-2 rounded-lg border border-status-success/20 bg-status-success-surface/30 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-medium text-muted-foreground">Vendas no período</span>
                            <div className="mt-0.5 flex items-baseline gap-1">
                              <span className="text-xl font-bold leading-none text-foreground">{salesInitialLoading ? 'Atualizando' : salesUnavailable ? '—' : formatSalesCount(sales.sales)}</span>
                              <span className="text-xs text-muted-foreground">vendas</span>
                            </div>
                          </div>
                          {!salesInitialLoading && !salesUnavailable ? <Badge variant={salesStatus(sales).variant} className="text-caption py-0.5">{salesStatus(sales).label}</Badge> : null}
                        </div>
                        {salesInitialLoading ? <span className="text-xs text-muted-foreground">Atualizando vendas e meta...</span> : salesUnavailable ? <span className="text-xs text-muted-foreground">Dados comerciais indisponíveis</span> : sales.monthlyGoal > 0 && sales.attainment !== null ? <MxProgress value={sales.attainment} tone={salesProgressTone(sales.attainment)} label={`${formatSalesCount(sales.sales)} de ${formatSalesCount(sales.monthlyGoal)} vendas`} /> : <span className="text-xs text-muted-foreground">Meta não configurada</span>}
                        {!salesInitialLoading && !salesUnavailable ? <div className="text-caption text-muted-foreground">{sales.monthlyGoal > 0 ? `Meta ${formatSalesCount(sales.monthlyGoal)} · ${formatSalesPercent(sales.attainment)}` : 'Sem meta configurada'} · {sales.storesWithSales}/{Math.max(client.units, 1)} unidades com venda</div> : null}
                      </div>

                      {/* Journey Progress */}
                      <div className="space-y-1.5 rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{journeyLabel(client)}</span>
                          <span className="text-muted-foreground">
                            {client.visitsTotal > 0 ? `${client.visitsDone}/${client.visitsTotal} encontros` : 'Livre'}
                          </span>
                        </div>
                        {client.visitsTotal > 0 && (
                          <div className="h-1.5 w-full">
                            <MxProgress value={progressPct} tone="brand" />
                          </div>
                        )}
                      </div>

                      {/* Next operational step and activation blockers remain visible on cards */}
                      <div className="space-y-1.5 border-t border-border-subtle pt-3">
                        <span className="block text-caption font-semibold text-muted-foreground">Próxima ação</span>
                        <button
                          type="button"
                          onClick={() => openPendencias(client)}
                          className="w-full text-left text-xs font-medium leading-4 text-foreground line-clamp-2 hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary/30"
                          title={nextAction(client)}
                        >
                          {nextAction(client)}
                        </button>
                        {blockers.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => openPendencias(client)}
                            className="text-caption font-medium text-status-error-text hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-status-error/30"
                          >
                            {blockers.length === 1 ? '1 pendência de ativação' : `${blockers.length} pendências de ativação`}
                          </button>
                        ) : (
                          <span className="text-caption text-muted-foreground">Sem pendências de ativação</span>
                        )}
                      </div>

                      {/* Team & Presence */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-muted-foreground" aria-hidden="true" />
                          <span className="font-semibold text-foreground">{stat.sellers}</span>
                          <span className="text-muted-foreground">vendedores</span>
                        </div>
                        {stat.sellers > 0 ? (
                          <div className="font-medium text-foreground">
                            <span className="text-status-success-text">{stat.disciplinePct}%</span> presença hoje
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => navigate(`/lojas/${storeSlug}`)}
                        >
                          Abrir loja
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => navigate(`/lojas/${storeSlug}/equipe`)}
                        >
                          Equipe
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                        >
                          Visão 360
                        </Button>
                        <ClientActionsMenu client={client} onAction={action => onAction(client, action)} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </MxSectionCard>

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

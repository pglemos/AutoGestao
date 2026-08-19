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
  Search,
  TableProperties,
  Users,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
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
import {
  EMPTY_PORTFOLIO_FILTERS,
  PORTFOLIO_BUCKET_LABEL,
  activationBlockers,
  clientStoreIds,
  clientTeamStat,
  filterPortfolio,
  isActive,
  journeyLabel,
  nextAction,
  portfolioCounters,
  structureLabel,
  type PortfolioBucket,
  type PortfolioClient,
  type PortfolioFilters,
} from './clientPortfolio'

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

export interface PortfolioOverviewTabProps {
  rows: PortfolioClient[]
  lojas: Store[]
  stats: Record<string, { sellers: number; checkedIn?: number; disciplinePct: number }>
  onAction: (client: PortfolioClient, action: ClientAction) => void
  onCopyLink: (name: string) => void
  onEditStore: (store: Store) => void
}

export function PortfolioOverviewTab({
  rows,
  lojas,
  stats,
  onAction,
  onCopyLink,
  onEditStore,
}: PortfolioOverviewTabProps) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<PortfolioFilters>(EMPTY_PORTFOLIO_FILTERS)
  const [viewMode, setViewMode] = useState<'tabela' | 'cards'>('tabela')

  const counters = useMemo(() => portfolioCounters(rows), [rows])
  const filtered = useMemo(() => filterPortfolio(rows, filters), [rows, filters])
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

  return (
    <div className="space-y-4">
      {/* Metric Quick-Filter Segment Buttons */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
        <button
          type="button"
          onClick={() => patch({ bucket: 'todos' })}
          className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
            filters.bucket === 'todos'
              ? 'border-brand-primary bg-brand-primary/10 shadow-xs'
              : 'border-border bg-card hover:border-brand-primary/40 hover:bg-surface-alt'
          }`}
        >
          <span className="text-caption font-medium text-muted-foreground">Total de Lojas</span>
          <span className="mt-1 text-2xl font-bold text-foreground">{rows.length}</span>
          <span className="text-caption text-muted-foreground">Visão geral da rede</span>
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
              className={`flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
                isSelected
                  ? 'border-brand-primary bg-brand-primary/10 shadow-xs ring-1 ring-brand-primary/30'
                  : 'border-border bg-card hover:border-brand-primary/40 hover:bg-surface-alt'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-caption font-medium text-muted-foreground">{item.label}</span>
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
              <span className="mt-1 text-2xl font-bold text-foreground">{count}</span>
              <span className="text-caption text-muted-foreground">{PORTFOLIO_BUCKET_LABEL[item.bucket]}</span>
            </button>
          )
        })}
      </div>

      {/* Main Container */}
      <MxSectionCard>
        {/* Toolbar with Search and Filters */}
        <div className="border-b border-border p-4 sm:p-5 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <MxInput
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
            <div className="flex flex-wrap items-center gap-2">
              <MxSelect
                aria-label="Filtrar por fase empresarial"
                value={filters.phase}
                onChange={e => patch({ phase: e.target.value })}
                className="h-10 text-xs w-auto min-w-[140px]"
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
                className="h-10 text-xs w-auto min-w-[140px]"
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
                className="h-10 text-xs w-auto min-w-[160px]"
              >
                <option value="todos">Todos os responsáveis</option>
                {owners.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </MxSelect>

              {/* View Switcher */}
              <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                <Button
                  variant={viewMode === 'tabela' ? 'primary' : 'ghost'}
                  size="sm"
                  className="h-9 px-3 text-xs"
                  onClick={() => setViewMode('tabela')}
                  aria-label="Visualização em tabela"
                >
                  <TableProperties size={14} className="mr-1" />
                  Tabela
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'primary' : 'ghost'}
                  size="sm"
                  className="h-9 px-3 text-xs"
                  onClick={() => setViewMode('cards')}
                  aria-label="Visualização em cards"
                >
                  <LayoutGrid size={14} className="mr-1" />
                  Cards
                </Button>
              </div>
            </div>
          </div>

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
                {filtered.length} de {rows.length} {filtered.length === 1 ? 'loja' : 'lojas'}
              </span>
            </div>
          )}
        </div>

        {/* Content View */}
        <div className="p-4 sm:p-5">
          {filtered.length === 0 ? (
            <MxEmptyState
              variant="filter"
              title="Nenhuma loja ou cliente encontrado"
              description="Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos da busca."
              action={
                <Button variant="outline" onClick={clearAllFilters}>
                  Limpar filtros
                </Button>
              }
            />
          ) : viewMode === 'tabela' ? (
            <MxTableSurface>
              <Table className="min-w-[1056px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Cliente / Loja</TableHead>
                    <TableHead className="w-[180px]">Programa & Fase</TableHead>
                    <TableHead className="w-[160px]">Jornada Consultiva</TableHead>
                    <TableHead className="w-[160px]">Equipe & Presença</TableHead>
                    <TableHead className="w-[160px]">Responsável MX</TableHead>
                    <TableHead className="w-[180px]">Próxima Ação</TableHead>
                    <TableHead className="w-[140px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(client => {
                    const blockers = activationBlockers(client)
                    const stat = clientTeamStat(clientStoreIds(client, lojas), stats)
                    const storeSlug = client.slug || client.id
                    const clientActive = isActive(client)
                    const progressPct =
                      client.visitsTotal > 0
                        ? Math.min(100, Math.round((client.visitsDone / client.visitsTotal) * 100))
                        : 0

                    return (
                      <TableRow key={client.id} className="transition-colors hover:bg-surface-alt/50">
                        {/* 1. Empresa / Loja */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-primary/10 text-brand-primary font-bold text-sm">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                                className="font-semibold text-foreground hover:text-brand-primary focus-visible:text-brand-primary text-left truncate block max-w-[220px] outline-none"
                                title={client.name}
                              >
                                {client.name}
                              </button>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                                <span>{client.cnpj ? `CNPJ: ${client.cnpj}` : 'Sem CNPJ'}</span>
                                {client.primary_store_city && (
                                  <>
                                    <span>•</span>
                                    <span>{client.primary_store_city}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Programa & Fase */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-foreground text-sm">
                              {client.product_name || 'Consultoria PMR'}
                            </div>
                            <Badge variant="outline" className="text-caption py-0">
                              {PHASE_LABEL[client.business_phase ?? ''] ?? 'Estruturação'}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* 3. Jornada Consultiva */}
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-foreground">{journeyLabel(client)}</span>
                              <span className="text-muted-foreground">
                                {client.visitsTotal > 0 ? `${client.visitsDone}/${client.visitsTotal}` : 'Livre'}
                              </span>
                            </div>
                            {client.visitsTotal > 0 ? (
                              <div className="h-1.5 w-full">
                                <MxProgress value={progressPct} tone="brand" />
                              </div>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* 4. Equipe & Presença */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Users size={14} className="text-muted-foreground" />
                              <span className="font-semibold text-foreground">{stat.sellers}</span>
                              <span className="text-xs text-muted-foreground">vendedores</span>
                            </div>
                            {stat.sellers > 0 ? (
                              <div className="text-caption text-muted-foreground">
                                <span className="font-medium text-status-success-text">{stat.disciplinePct}%</span> presença hoje
                              </div>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* 5. Responsável MX */}
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">
                            {client.implementation_owner_name || (
                              <span className="text-muted-foreground italic">Não atribuído</span>
                            )}
                          </div>
                          <div className="text-caption text-muted-foreground">{structureLabel(client)}</div>
                        </TableCell>

                        {/* 6. Próxima Ação */}
                        <TableCell>
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
                            <div className="text-xs text-foreground font-medium line-clamp-1" title={nextAction(client)}>
                              {nextAction(client)}
                            </div>
                            {blockers.length > 1 && (
                              <span className="text-caption font-medium text-status-error-text block">
                                +{blockers.length - 1} pendência(s)
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 7. Ações */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-medium"
                              onClick={() => navigate(`/lojas/${storeSlug}`)}
                              title="Acessar Workspace da Loja"
                              aria-label={`Acessar Workspace de ${client.name}`}
                            >
                              <ExternalLink size={14} className="mr-1" />
                              Workspace
                            </Button>
                            <ClientActionsMenu client={client} onAction={action => onAction(client, action)} />
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
                const stat = stats[client.id]
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
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-brand-primary font-bold">
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
                            {structureLabel(client)}
                          </span>
                        </div>
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

                      {/* Team & Presence */}
                      <div className="flex items-center justify-between text-xs px-1">
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-muted-foreground" />
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
                          Workspace
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
    </div>
  )
}

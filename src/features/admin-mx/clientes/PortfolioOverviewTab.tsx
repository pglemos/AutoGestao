import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Filter,
  Rocket,
  Search,
  Settings2,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxInput,
  MxMetricCard,
  MxMetricGrid,
  MxSectionCard,
  MxSelect,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import type { Store } from '@/types/database'
import { ClientActionsMenu, type ClientAction } from './ClientActionsMenu'
import { PendenciasModal } from './PendenciasModal'
import {
  EMPTY_PORTFOLIO_FILTERS,
  PORTFOLIO_STATUS_DETAIL,
  PORTFOLIO_STATUS_LABEL,
  activationBlockers,
  canonicalPortfolioStatus,
  filterPortfolio,
  portfolioStatusCounters,
  portfolioStatusLabel,
  type PortfolioClient,
  type PortfolioFilters,
  type PortfolioStatus,
} from './clientPortfolio'

const PHASE_LABEL: Record<string, string> = {
  NAO_DEFINIDA: 'Não definida',
  SOBREVIVENCIA: 'Sobrevivência',
  ORGANIZACAO: 'Organização',
  ESTRUTURACAO: 'Estruturação',
  CRESCIMENTO: 'Crescimento',
  CONSOLIDACAO: 'Consolidação',
  EXPANSAO: 'Expansão',
  ESCALA: 'Escala',
  RECUPERACAO: 'Recuperação',
}

const METRICS: Array<{
  status: PortfolioStatus
  icon: typeof CheckCircle2
  tone: 'success' | 'info' | 'warning' | 'danger'
}> = [
  { status: 'ativos', icon: CheckCircle2, tone: 'success' },
  { status: 'em_implantacao', icon: Rocket, tone: 'info' },
  { status: 'prontos_para_ativar', icon: ClipboardList, tone: 'warning' },
  { status: 'em_configuracao', icon: AlertTriangle, tone: 'danger' },
]

const STATUS_OPTIONS: Array<{ value: PortfolioFilters['status']; label: string }> = [
  { value: 'todos', label: 'Todos os status' },
  ...METRICS.map(item => ({ value: item.status, label: PORTFOLIO_STATUS_LABEL[item.status] })),
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'coleta_de_dados', label: 'Coleta de Dados' },
  { value: 'em_validacao', label: 'Em Validação' },
  { value: 'pronto_para_ativar', label: 'Pronto para Ativar' },
  { value: 'ativacao_programada', label: 'Ativação Programada' },
  { value: 'ativo_em_implantacao', label: 'Ativo em Implantação' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'encerrado', label: 'Encerrado' },
]

export interface PortfolioOverviewTabProps {
  rows: PortfolioClient[]
  /** Mantidos para os fluxos operacionais existentes da página. */
  lojas: Store[]
  stats: Record<string, { sellers: number; checkedIn?: number; disciplinePct: number }>
  onAction: (client: PortfolioClient, action: ClientAction) => void
  onCopyLink: (name: string) => void
  onEditStore: (store: Store) => void
  onRefetch: () => void
}

function onboardingLabel(client: PortfolioClient): string {
  if (client.onboarding_completed === true) return 'Concluído'
  if (client.onboarding_step && client.onboarding_step > 0) return `Etapa ${client.onboarding_step}/7`
  return 'Não iniciado'
}

function statusVariant(client: PortfolioClient): 'success' | 'info' | 'warning' | 'danger' | 'outline' {
  const value = portfolioStatusLabel(client)
  if (value === 'Ativo' || value === 'Ativos') return 'success'
  if (value === 'Ativo em Implantação') return 'warning'
  if (value === 'Prontos p/ Ativar') return 'info'
  if (value === 'Suspenso' || value === 'Encerrado') return 'danger'
  if (value === 'Em Configuração') return 'info'
  return 'outline'
}

export function PortfolioOverviewTab({ rows, onAction, onRefetch }: PortfolioOverviewTabProps) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<PortfolioFilters>(EMPTY_PORTFOLIO_FILTERS)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [pendenciasClient, setPendenciasClient] = useState<PortfolioClient | null>(null)

  const counters = useMemo(() => portfolioStatusCounters(rows), [rows])
  const filtered = useMemo(() => filterPortfolio(rows, filters), [rows, filters])
  const phases = useMemo(
    () => [...new Set(rows.map(row => row.business_phase).filter((value): value is string => Boolean(value)))].sort(),
    [rows],
  )
  const products = useMemo(
    () => [...new Set(rows.map(row => row.product_name).filter((value): value is string => Boolean(value)))].sort(),
    [rows],
  )
  const owners = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) {
      if (row.implementation_owner_id) map.set(row.implementation_owner_id, row.implementation_owner_name ?? 'Sem nome')
    }
    return [...map.entries()]
  }, [rows])

  const patch = (values: Partial<PortfolioFilters>) => setFilters(current => ({ ...current, ...values }))
  const advancedFilterCount = [filters.phase !== 'todas', filters.product !== 'todos', filters.owner !== 'todos'].filter(Boolean).length
  const hasActiveFilters = Boolean(
    filters.search.trim() ||
    filters.status !== 'todos' ||
    filters.bucket !== 'todos' ||
    advancedFilterCount,
  )

  const clearAllFilters = () => setFilters(EMPTY_PORTFOLIO_FILTERS)

  return (
    <div className="space-y-4">
      <MxMetricGrid className="gap-3 lg:grid-cols-4">
        {METRICS.map(item => {
          const Icon = item.icon
          const selected = filters.status === item.status
          return (
            <MxMetricCard
              key={item.status}
              title={PORTFOLIO_STATUS_LABEL[item.status]}
              value={counters[item.status]}
              detail={PORTFOLIO_STATUS_DETAIL[item.status]}
              icon={Icon}
              tone={item.tone}
              className={selected ? 'ring-2 ring-brand-primary/30' : undefined}
              actionLabel={selected ? 'Limpar filtro' : 'Filtrar'}
              onAction={() => patch({ status: selected ? 'todos' : item.status })}
            />
          )
        })}
      </MxMetricGrid>

      <MxSectionCard className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:p-5 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <MxInput
              value={filters.search}
              onChange={event => patch({ search: event.target.value })}
              placeholder="Buscar por nome, cidade ou CNPJ..."
              aria-label="Buscar cliente por nome, cidade ou CNPJ"
              className="h-11 w-full pl-9 pr-9"
            />
            {filters.search ? (
              <button
                type="button"
                onClick={() => patch({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MxSelect
              aria-label="Filtrar por status"
              value={filters.status}
              onChange={event => patch({ status: event.target.value as PortfolioFilters['status'] })}
              className="h-11 min-w-44"
            >
              {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </MxSelect>
            <Button
              variant={advancedOpen || advancedFilterCount ? 'primary' : 'outline'}
              size="sm"
              className="h-11"
              onClick={() => setAdvancedOpen(open => !open)}
              aria-expanded={advancedOpen}
            >
              <Filter size={14} />Filtros{advancedFilterCount ? ` (${advancedFilterCount})` : ''}
            </Button>
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" className="h-11 text-muted-foreground" onClick={clearAllFilters}>
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>

        {advancedOpen ? (
          <div className="grid gap-3 border-b border-border bg-surface-alt/50 p-4 sm:grid-cols-3 sm:p-5">
            <label className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
              Fase empresarial
              <MxSelect aria-label="Filtrar por fase empresarial" value={filters.phase} onChange={event => patch({ phase: event.target.value })}>
                <option value="todas">Todas as fases</option>
                {phases.map(phase => <option key={phase} value={phase}>{PHASE_LABEL[phase] ?? phase}</option>)}
              </MxSelect>
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
              Produto contratado
              <MxSelect aria-label="Filtrar por produto" value={filters.product} onChange={event => patch({ product: event.target.value })}>
                <option value="todos">Todos os produtos</option>
                {products.map(product => <option key={product} value={product}>{product}</option>)}
              </MxSelect>
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
              Responsável MX
              <MxSelect aria-label="Filtrar por responsável MX" value={filters.owner} onChange={event => patch({ owner: event.target.value })}>
                <option value="todos">Todos os responsáveis</option>
                {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </MxSelect>
            </label>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground sm:px-5">
          <div className="flex items-center gap-2">
            <Settings2 size={14} aria-hidden="true" />
            <span>{filtered.length} de {rows.length} {rows.length === 1 ? 'cliente' : 'clientes'}</span>
          </div>
          {hasActiveFilters ? <span>Filtros aplicados</span> : <span>Carteira completa</span>}
        </div>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {filtered.length === 0 ? (
            <MxEmptyState
              variant="filter"
              title="Nenhum cliente encontrado"
              description="Ajuste a busca ou os filtros para localizar outro cliente da carteira."
              action={<Button variant="outline" onClick={clearAllFilters}>Limpar filtros</Button>}
            />
          ) : (
            <MxTableSurface>
              <Table className="min-w-[920px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Fase</TableHead>
                    <TableHead>Onboarding</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(client => {
                    const blockers = activationBlockers(client)
                    const canonical = canonicalPortfolioStatus(client)
                    const statusLabel = portfolioStatusLabel(client)
                    return (
                      <TableRow key={client.id} data-client-id={client.id} className="transition-colors hover:bg-surface-alt/60">
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-inverse text-sm font-bold text-white" aria-hidden="true">
                              {client.name.charAt(0).toUpperCase() || '?'}
                            </span>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                                className="block max-w-[260px] truncate text-left text-sm font-semibold text-foreground hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                                title={client.name}
                              >
                                {client.name}
                              </button>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{client.primary_store_city || 'Cidade não informada'}</span>
                                {client.cnpj ? <><span aria-hidden="true">·</span><span>{client.cnpj}</span></> : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <Badge variant={statusVariant(client)}>{statusLabel}</Badge>
                            {canonical === 'em_configuracao' && blockers.length ? (
                              <button
                                type="button"
                                onClick={() => setPendenciasClient(client)}
                                className="block text-left text-xs font-medium text-status-error-text hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                              >
                                {blockers.length} {blockers.length === 1 ? 'pendência' : 'pendências'}
                              </button>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{PHASE_LABEL[client.business_phase ?? ''] ?? (client.business_phase || 'Não definida')}</span>
                        </TableCell>
                        <TableCell>
                          <span className={client.onboarding_completed ? 'text-sm font-semibold text-status-success-text' : 'text-sm text-foreground'}>
                            {onboardingLabel(client)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="block max-w-[180px] truncate text-sm text-foreground" title={client.implementation_owner_name ?? undefined}>
                            {client.implementation_owner_name || 'Não atribuído'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <ClientActionsMenu client={client} onAction={action => onAction(client, action)} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </MxTableSurface>
          )}
        </div>
      </MxSectionCard>

      <PendenciasModal
        open={Boolean(pendenciasClient)}
        clientId={pendenciasClient?.id ?? ''}
        clientName={pendenciasClient?.name ?? ''}
        onClose={() => setPendenciasClient(null)}
        onRefetch={onRefetch}
      />
    </div>
  )
}

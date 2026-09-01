import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Rocket,
  Search,
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
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { ClientActionsMenu, type ClientAction } from './ClientActionsMenu'
import {
  filterPortfolio,
  EMPTY_PORTFOLIO_FILTERS,
  formatCityName,
  formatCnpj,
  onboardingPortfolioLabel,
  portfolioOperationalLabel,
  portfolioStatusCounters,
  portfolioStatusLabel,
  type PortfolioClient,
  type PortfolioFilters,
  type PortfolioStatus,
} from './clientPortfolio'

const PHASE_LABEL: Record<string, string> = {
  ESTRUTURACAO: 'Estruturação',
  CRESCIMENTO: 'Crescimento',
  CONSOLIDACAO: 'Consolidação',
  EXPANSAO: 'Expansão',
  RECUPERACAO: 'Recuperação',
  SOBREVIVENCIA: 'Sobrevivência',
  ORGANIZACAO: 'Organização',
}

const STATUS_KPI: Array<{
  status: PortfolioStatus
  label: string
  icon: typeof CheckCircle2
  tone: 'success' | 'info' | 'brand' | 'danger'
}> = [
  { status: 'ativos', label: 'Ativos', icon: CheckCircle2, tone: 'success' },
  { status: 'em_implantacao', label: 'Em implantação', icon: Rocket, tone: 'info' },
  { status: 'prontos_para_ativar', label: 'Prontos para ativar', icon: ClipboardList, tone: 'brand' },
  { status: 'em_configuracao', label: 'Em configuração', icon: AlertTriangle, tone: 'danger' },
]

function statusBadgeVariant(label: string): 'success' | 'warning' | 'danger' | 'outline' | 'secondary' {
  const normalized = label.toLowerCase()
  if (normalized.includes('ativo') && !normalized.includes('implantação') && !normalized.includes('implantacao')) return 'success'
  if (normalized.includes('implantação') || normalized.includes('implantacao')) return 'warning'
  if (normalized.includes('suspenso') || normalized.includes('configuração') || normalized.includes('configuracao')) return 'secondary'
  if (normalized.includes('pronto')) return 'outline'
  return 'outline'
}

export interface PortfolioBase44ListTabProps {
  rows: PortfolioClient[]
  onAction: (client: PortfolioClient, action: ClientAction) => void
}

export function PortfolioBase44ListTab({ rows, onAction }: PortfolioBase44ListTabProps) {
  const navigate = useNavigate()
  const [filters, setFilters] = useState<PortfolioFilters>(EMPTY_PORTFOLIO_FILTERS)
  const statusCounters = useMemo(() => portfolioStatusCounters(rows), [rows])
  const filtered = useMemo(() => filterPortfolio(rows, filters), [rows, filters])
  const hasFilters = Boolean(filters.search.trim()) || filters.status !== 'todos'

  const patch = (values: Partial<PortfolioFilters>) => setFilters(current => ({ ...current, ...values }))

  return (
    <div className="space-y-4" data-testid="portfolio-base44-list">
      <MxMetricGrid>
        {STATUS_KPI.map(item => {
          const Icon = item.icon
          return (
            <MxMetricCard
              key={item.status}
              title={item.label}
              value={statusCounters[item.status]}
              detail="Situação única da conta"
              icon={Icon}
              tone={item.tone}
            />
          )
        })}
      </MxMetricGrid>

      <MxToolbar>
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <MxInput
            value={filters.search}
            onChange={event => patch({ search: event.target.value })}
            placeholder="Buscar por nome, cidade..."
            aria-label="Buscar cliente"
            className="pl-9"
          />
        </div>
        <MxSelect value={filters.status} onChange={event => patch({ status: event.target.value as PortfolioFilters['status'] })} aria-label="Filtrar por situação da conta">
          <option value="todos">Todas as situações</option>
          <option value="ativos">Ativos</option>
          <option value="em_implantacao">Em implantação</option>
          <option value="prontos_para_ativar">Prontos para ativar</option>
          <option value="em_configuracao">Em configuração</option>
          <option value="suspenso">Suspenso</option>
        </MxSelect>
      </MxToolbar>

      <MxSectionCard>
        <div className="p-5">
          {filtered.length ? (
            <>
              <div className="hidden md:block">
                <MxTableSurface aria-label="Lista de clientes MX">
                  <Table className="min-w-[760px]">
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
                    const statusLabel = portfolioStatusLabel(client)
                    return (
                      <TableRow key={client.id} className="hover:bg-surface-alt/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <button
                                type="button"
                                className="block truncate text-left font-semibold text-foreground hover:text-primary focus-visible:text-primary"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                              >
                              {client.name}
                              </button>
                              {client.primary_store_city || client.cnpj ? (
                                <span className="block truncate text-xs text-muted-foreground">
                                  {client.primary_store_city ? formatCityName(client.primary_store_city) : 'Cidade não informada'}
                                  {client.cnpj ? ` · CNPJ ${formatCnpj(client.cnpj)}` : ''}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={statusBadgeVariant(statusLabel)}>{statusLabel}</Badge>
                            {portfolioOperationalLabel(client) ? <span className="block text-caption text-muted-foreground">{portfolioOperationalLabel(client)}</span> : null}
                          </div>
                        </TableCell>
                        <TableCell>{PHASE_LABEL[client.business_phase ?? ''] ?? client.business_phase ?? 'Não configurada'}</TableCell>
                        <TableCell>
                          <span className={client.onboarding_completed ? 'text-status-success-text font-medium' : 'text-muted-foreground'}>
                            {onboardingPortfolioLabel(client)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {client.implementation_owner_name ? <span title={client.implementation_owner_email ?? client.implementation_owner_name}>{client.implementation_owner_name}</span> : <span className="italic text-muted-foreground">Não atribuído</span>}
                          {client.implementation_owner_email ? <span className="block max-w-[180px] truncate text-caption text-muted-foreground" title={client.implementation_owner_email}>{client.implementation_owner_email}</span> : null}
                        </TableCell>
                        <TableCell className="text-right">
                          <ClientActionsMenu compact client={client} onAction={action => onAction(client, action)} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                  </Table>
                </MxTableSurface>
              </div>

              <div className="grid gap-3 md:hidden" data-testid="portfolio-base44-mobile-cards">
                {filtered.map(client => {
                  const statusLabel = portfolioStatusLabel(client)
                  const operationalLabel = portfolioOperationalLabel(client)
                  return (
                    <article key={client.id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-sm font-bold text-brand-primary">{client.name.charAt(0).toUpperCase()}</span>
                          <div className="min-w-0">
                            <button type="button" className="block max-w-full truncate text-left font-semibold text-foreground hover:text-primary focus-visible:text-primary" onClick={() => navigate(`/clientes/${client.slug || client.id}`)} title={client.name}>{client.name}</button>
                            <p className="mt-1 break-words text-xs text-muted-foreground">
                              {client.primary_store_city ? formatCityName(client.primary_store_city) : 'Cidade não informada'}
                              {client.cnpj ? ` · CNPJ ${formatCnpj(client.cnpj)}` : ''}
                            </p>
                          </div>
                        </div>
                        <ClientActionsMenu compact client={client} onAction={action => onAction(client, action)} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <Badge variant={statusBadgeVariant(statusLabel)}>{statusLabel}</Badge>
                        {operationalLabel ? <span className="text-caption text-muted-foreground">{operationalLabel}</span> : null}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-surface-alt/60 p-3 text-xs">
                        <div><dt className="text-muted-foreground">Fase</dt><dd className="mt-0.5 font-medium text-foreground">{PHASE_LABEL[client.business_phase ?? ''] ?? client.business_phase ?? 'Fase não informada'}</dd></div>
                        <div><dt className="text-muted-foreground">Configuração inicial</dt><dd className="mt-0.5 font-medium text-foreground">{onboardingPortfolioLabel(client)}</dd></div>
                        <div className="col-span-2"><dt className="text-muted-foreground">Responsável MX</dt><dd className="mt-0.5 font-medium text-foreground">{client.implementation_owner_name || <span className="italic text-muted-foreground">Não atribuído</span>}</dd>{client.implementation_owner_email ? <dd className="truncate text-caption text-muted-foreground" title={client.implementation_owner_email}>{client.implementation_owner_email}</dd> : null}</div>
                      </dl>
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
                        <span className="text-caption text-muted-foreground">{client.units === 1 ? 'Loja única · matriz' : `${client.units} unidades`}</span>
                        <Button variant="outline" size="sm" className="h-9" onClick={() => navigate(`/clientes/${client.slug || client.id}`)}>Abrir Visão 360</Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
            <MxEmptyState
              variant="filter"
              title="Nenhum cliente encontrado"
              description="Ajuste a busca ou o filtro de situação da conta."
              action={hasFilters ? <Button variant="outline" onClick={() => setFilters(EMPTY_PORTFOLIO_FILTERS)}>Limpar filtros</Button> : undefined}
            />
          )}
        </div>
      </MxSectionCard>
    </div>
  )
}

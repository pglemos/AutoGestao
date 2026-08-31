import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Rocket,
  Search,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
  onboardingPortfolioLabel,
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
  { status: 'em_implantacao', label: 'Em Implantação', icon: Rocket, tone: 'info' },
  { status: 'prontos_para_ativar', label: 'Prontos p/ Ativar', icon: ClipboardList, tone: 'brand' },
  { status: 'em_configuracao', label: 'Em Configuração', icon: AlertTriangle, tone: 'danger' },
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
              detail="Clientes na carteira"
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
        <MxSelect value={filters.status} onChange={event => patch({ status: event.target.value as PortfolioFilters['status'] })} aria-label="Filtrar por status">
          <option value="todos">Todos os status</option>
          <option value="ativos">Ativos</option>
          <option value="em_implantacao">Em Implantação</option>
          <option value="prontos_para_ativar">Prontos p/ Ativar</option>
          <option value="em_configuracao">Em Configuração</option>
          <option value="suspenso">Suspenso</option>
        </MxSelect>
      </MxToolbar>

      <MxSectionCard>
        <div className="p-5">
          {filtered.length ? (
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
                              {client.primary_store_city ? (
                                <span className="block truncate text-xs text-muted-foreground">{client.primary_store_city}</span>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(statusLabel)}>{statusLabel}</Badge>
                        </TableCell>
                        <TableCell>{PHASE_LABEL[client.business_phase ?? ''] ?? client.business_phase ?? 'Não definida'}</TableCell>
                        <TableCell>
                          <span className={client.onboarding_completed ? 'text-status-success-text font-medium' : 'text-muted-foreground'}>
                            {onboardingPortfolioLabel(client)}
                          </span>
                        </TableCell>
                        <TableCell>{client.implementation_owner_name || '—'}</TableCell>
                        <TableCell className="text-right">
                          <ClientActionsMenu compact client={client} onAction={action => onAction(client, action)} />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </MxTableSurface>
          ) : (
            <MxEmptyState variant="filter" title="Nenhum cliente encontrado" description="Ajuste a busca ou o filtro de status." />
          )}
        </div>
      </MxSectionCard>
    </div>
  )
}

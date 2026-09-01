import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Plus,
  Rocket,
  Search,
  Sparkles,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxInput,
  MxProgress,
  MxSectionCard,
  MxSectionHeader,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { ClientActionsMenu, type ClientAction } from './ClientActionsMenu'
import {
  activationBlockers,
  formatCityName,
  isActive,
  journeyLabel,
  nextAction,
  type PortfolioClient,
} from './clientPortfolio'

export interface OnboardingPortfolioTabProps {
  rows: PortfolioClient[]
  onAction: (client: PortfolioClient, action: ClientAction) => void
}

export function OnboardingPortfolioTab({ rows, onAction }: OnboardingPortfolioTabProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'todos' | 'em_andamento' | 'prontos' | 'bloqueados'>('todos')

  // Filter clients that belong to onboarding ecosystem
  const onboardingClients = useMemo(() => {
    return rows.filter(client => {
      const active = isActive(client)
      const blockers = activationBlockers(client)
      const inOnboarding = client.onboarding_completed === false || (client.onboarding_step ?? 0) > 0
      const isImplantation = active && client.visitsTotal > 0 && client.visitsDone < client.visitsTotal
      const isReady = !active && blockers.length === 0
      const isBlocked = !active && blockers.length > 0
      return inOnboarding || isImplantation || isReady || isBlocked
    })
  }, [rows])

  const filtered = useMemo(() => {
    return onboardingClients.filter(client => {
      const active = isActive(client)
      const blockers = activationBlockers(client)
      const isReady = !active && blockers.length === 0
      const isBlocked = !active && blockers.length > 0

      if (filterType === 'prontos' && !isReady) return false
      if (filterType === 'bloqueados' && !isBlocked) return false
      if (filterType === 'em_andamento' && (isReady || isBlocked)) return false

      if (!search.trim()) return true
      const term = search.toLowerCase()
      return (
        client.name.toLowerCase().includes(term) ||
        (client.cnpj ?? '').includes(term) ||
        (client.product_name ?? '').toLowerCase().includes(term) ||
        (client.implementation_owner_name ?? '').toLowerCase().includes(term)
      )
    })
  }, [onboardingClients, filterType, search])

  const stats = useMemo(() => {
    let prontos = 0
    let bloqueados = 0
    let emAndamento = 0

    for (const c of onboardingClients) {
      const active = isActive(c)
      const blockers = activationBlockers(c)
      if (!active && blockers.length === 0) prontos++
      else if (!active && blockers.length > 0) bloqueados++
      else emAndamento++
    }

    return { total: onboardingClients.length, prontos, bloqueados, emAndamento }
  }, [onboardingClients])

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilterType('todos')}
          className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
            filterType === 'todos'
              ? 'border-brand-primary bg-brand-primary/10 shadow-xs'
              : 'border-border bg-card hover:border-brand-primary/40 hover:bg-surface-alt'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Total em Onboarding</span>
            <Rocket size={16} className="text-brand-primary" />
          </div>
          <span className="mt-2 text-2xl font-bold text-foreground">{stats.total}</span>
          <span className="text-caption text-muted-foreground">Unidades em processo</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('em_andamento')}
          className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
            filterType === 'em_andamento'
              ? 'border-status-info/40 bg-status-info-surface/80 shadow-xs'
              : 'border-border bg-card hover:border-status-info/40 hover:bg-surface-alt'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Em Implantação</span>
            <Sparkles size={16} className="text-status-info-text" />
          </div>
          <span className="mt-2 text-2xl font-bold text-foreground">{stats.emAndamento}</span>
          <span className="text-caption text-muted-foreground">Jornada em execução</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('prontos')}
          className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
            filterType === 'prontos'
              ? 'border-status-success/40 bg-status-success-surface/80 shadow-xs'
              : 'border-border bg-card hover:border-status-success/40 hover:bg-surface-alt'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Prontos p/ Ativar</span>
            <CheckCircle2 size={16} className="text-status-success-text" />
          </div>
          <span className="mt-2 text-2xl font-bold text-foreground">{stats.prontos}</span>
          <span className="text-caption text-muted-foreground">Checklist completo</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('bloqueados')}
          className={`flex flex-col items-start justify-between rounded-xl border p-4 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-status-success/30 ${
            filterType === 'bloqueados'
              ? 'border-status-error/40 bg-status-error-surface/80 shadow-xs'
              : 'border-border bg-card hover:border-status-error/40 hover:bg-surface-alt'
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Com Bloqueios</span>
            <AlertTriangle size={16} className="text-status-error-text" />
          </div>
          <span className="mt-2 text-2xl font-bold text-foreground">{stats.bloqueados}</span>
          <span className="text-caption text-muted-foreground">Pendências críticas</span>
        </button>
      </div>

      {/* Main Section */}
      <MxSectionCard>
        <div className="border-b border-border p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <MxInput
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar em onboarding..."
              aria-label="Buscar clientes em onboarding"
              className="pl-9 h-10 w-full"
            />
          </div>

          <Button asChild size="sm" className="h-9">
            <Link to="/clientes/novo">
              <Plus size={14} className="mr-1" />
              Novo Onboarding
            </Link>
          </Button>
        </div>

        <div className="p-4 sm:p-5">
          {filtered.length === 0 ? (
            <MxEmptyState
              title="Nenhum cliente em processo de onboarding encontrado"
              description="Todas as unidades cadastradas estão ativas ou nenhum resultado corresponde à busca."
              action={
                <Button variant="outline" onClick={() => { setSearch(''); setFilterType('todos') }}>
                  Ver todos
                </Button>
              }
            />
          ) : (
            <MxTableSurface>
              <Table className="min-w-[960px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[280px]">Cliente / Loja</TableHead>
                    <TableHead className="w-[180px]">Status do Onboarding</TableHead>
                    <TableHead className="w-[220px]">Checklist de Prontidão</TableHead>
                    <TableHead className="w-[160px]">Responsável MX</TableHead>
                    <TableHead className="w-[180px] text-right">Ação Recomendada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(client => {
                    const blockers = activationBlockers(client)
                    const active = isActive(client)
                    const isReady = !active && blockers.length === 0
                    const hasBlockers = blockers.length > 0
                    const progressPct =
                      client.visitsTotal > 0
                        ? Math.min(100, Math.round((client.visitsDone / client.visitsTotal) * 100))
                        : 0

                    return (
                      <TableRow key={client.id} className="transition-colors hover:bg-surface-alt/50">
                        {/* 1. Empresa */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-status-info-surface text-status-info-text font-bold text-sm">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                                className="font-semibold text-foreground hover:text-brand-primary focus-visible:text-brand-primary text-left truncate block max-w-[220px] outline-none"
                              >
                                {client.name}
                              </button>
                              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <span>{client.product_name || 'Consultoria PMR'}</span>
                                {client.primary_store_city && <span>• {formatCityName(client.primary_store_city)}</span>}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* 2. Status */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              {active ? (
                                <Badge variant="success" className="text-caption">
                                  Ativo em Jornada
                                </Badge>
                              ) : isReady ? (
                                <Badge variant="brand" className="text-caption">
                                  Pronto p/ Ativar
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="text-caption">
                                  Em Configuração
                                </Badge>
                              )}
                            </div>
                            {client.visitsTotal > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {client.visitsDone}/{client.visitsTotal} encontros ({progressPct}%)
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* 3. Checklist */}
                        <TableCell>
                          <div className="space-y-1">
                            {hasBlockers ? (
                              <div className="flex flex-wrap gap-1">
                                {blockers.map(b => (
                                  <span
                                    key={b}
                                    className="inline-flex items-center gap-1 rounded bg-status-error-surface px-1.5 py-0.5 text-caption font-medium text-status-error-text"
                                  >
                                    <AlertTriangle size={12} />
                                    {b}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-status-success-surface px-2 py-0.5 text-xs font-medium text-status-success-text">
                                <CheckCircle2 size={12} />
                                Checklist 100% Completo
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 4. Responsável */}
                        <TableCell>
                          <div className="text-sm font-medium text-foreground">
                            {client.implementation_owner_name || (
                              <span className="text-muted-foreground italic">Não atribuído</span>
                            )}
                          </div>
                        </TableCell>

                        {/* 5. Ação */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!active && isReady ? (
                              <Button
                                variant="primary"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}?tab=implantacao`)}
                              >
                                Ativar Cliente
                                <ArrowRight size={14} className="ml-1" />
                              </Button>
                            ) : client.onboarding_completed === false ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => navigate(`/clientes/novo?continue=${client.id}`)}
                              >
                                Continuar Onboarding
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => navigate(`/clientes/${client.slug || client.id}`)}
                              >
                                Visão 360
                              </Button>
                            )}
                            <ClientActionsMenu client={client} onAction={action => onAction(client, action)} />
                          </div>
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
    </div>
  )
}

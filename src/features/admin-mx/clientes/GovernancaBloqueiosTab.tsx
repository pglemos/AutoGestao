import { useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleHelp,
  PauseCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserX,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxSectionCard,
  MxSectionHeader,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import {
  clientStructureSummary,
  formatCityName,
  isActive,
  type PortfolioClient,
} from './clientPortfolio'
import {
  GOVERNANCE_FILTER_LABEL,
  GOVERNANCE_PRIORITY_LABEL,
  formatGovernanceReason,
  governanceCategoryRows,
  governanceImpact,
  governanceIssues,
  governanceNextAction,
  governancePriority,
  governanceReferenceLabel,
  governanceRowsForFilter,
  governanceSearchText,
  sortGovernanceRows,
  type GovernanceFilter,
  type GovernanceIssue,
  type GovernancePriority,
} from './clientGovernance'
import { ClientActionsMenu, type ClientAction } from './ClientActionsMenu'

export interface GovernancaBloqueiosTabProps {
  rows: PortfolioClient[]
  onAction: (client: PortfolioClient, action: ClientAction) => void
  onReactivate: (client: PortfolioClient) => Promise<boolean>
}

type PriorityFilter = 'todas' | GovernancePriority

const PRIORITY_FILTER_LABEL: Record<PriorityFilter, string> = {
  todas: 'Todas as prioridades',
  critica: 'Crítica',
  alta: 'Alta',
  atencao: 'Atenção',
}

const PRIORITY_VARIANT: Record<GovernancePriority, 'danger' | 'warning' | 'info'> = {
  critica: 'danger',
  alta: 'warning',
  atencao: 'info',
}

const PRIORITY_ICON: Record<GovernancePriority, LucideIcon> = {
  critica: ShieldAlert,
  alta: AlertTriangle,
  atencao: CircleAlert,
}

const LIFECYCLE_VARIANT: Record<'ativo' | 'suspenso' | 'inativo', 'success' | 'danger' | 'outline'> = {
  ativo: 'success',
  suspenso: 'danger',
  inativo: 'outline',
}

function resolveGovernanceFilter(value: string | null): GovernanceFilter {
  return value && value in GOVERNANCE_FILTER_LABEL ? value as GovernanceFilter : 'todos'
}

function lifecycleState(client: PortfolioClient): 'ativo' | 'suspenso' | 'inativo' {
  if (client.suspended_at) return 'suspenso'
  return isActive(client) ? 'ativo' : 'inativo'
}

function lifecycleLabel(client: PortfolioClient): string {
  const state = lifecycleState(client)
  return state === 'ativo' ? 'Ativo' : state === 'suspenso' ? 'Suspenso' : 'Inativo'
}

function primaryActionLabel(client: PortfolioClient): string {
  if (client.suspended_at) return 'Reativar cliente'
  if (isActive(client) && !client.implementation_owner_id) return 'Atribuir consultor'
  return 'Abrir Visão 360'
}

function primaryActionHint(client: PortfolioClient): string {
  if (client.suspended_at) return 'Confirmação necessária; a operação só volta após a reativação.'
  if (isActive(client) && !client.implementation_owner_id) return 'Abre Pessoas e Acessos para definir o responsável da jornada.'
  return 'Abre o diagnóstico completo, a jornada e os planos do cliente.'
}

function PriorityBadge({ priority }: { priority: GovernancePriority }) {
  const Icon = PRIORITY_ICON[priority]
  return <Badge variant={PRIORITY_VARIANT[priority]}><Icon size={14} aria-hidden="true" />{GOVERNANCE_PRIORITY_LABEL[priority]}</Badge>
}

function IssueList({ issues, compact = false }: { issues: GovernanceIssue[]; compact?: boolean }) {
  if (!issues.length) {
    return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 size={14} className="text-status-success-text" aria-hidden="true" />Sem exceção adicional</span>
  }

  return (
    <ul className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {issues.map(issue => (
        <li key={`${issue.key}-${issue.label}`} className="flex items-start gap-1.5 text-xs leading-5 text-foreground">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-status-warning-text" aria-hidden="true" />
          <span><strong>{issue.label}:</strong> {issue.detail}</span>
        </li>
      ))}
    </ul>
  )
}

function ClientIdentity({ client, onOpen }: { client: PortfolioClient; onOpen: (client: PortfolioClient) => void }) {
  const city = formatCityName(client.primary_store_city)
  const missingRegistration = !client.primary_store_city?.trim() || !client.cnpj?.trim()

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-warning-surface text-sm font-bold text-status-warning-text">
        {client.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => onOpen(client)}
          className="block max-w-full truncate text-left text-sm font-semibold text-foreground outline-none hover:text-brand-primary focus-visible:text-brand-primary focus-visible:underline"
        >
          {client.name}
        </button>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {clientStructureSummary(client)}
          {' · '}
          {city ?? 'Cidade pendente'}
        </p>
        {missingRegistration ? <p className="mt-1 text-xs leading-5 text-status-warning-text">Cadastro: {client.cnpj ? 'cidade pendente' : client.primary_store_city ? 'CNPJ pendente' : 'cidade e CNPJ pendentes'}</p> : null}
      </div>
    </div>
  )
}

function PrimaryAction({
  client,
  onOpen,
  onReactivateRequest,
}: {
  client: PortfolioClient
  onOpen: (client: PortfolioClient) => void
  onReactivateRequest: (client: PortfolioClient) => void
}) {
  const label = primaryActionLabel(client)
  return (
    <div className="space-y-1.5">
      <Button
        size="sm"
        variant={client.suspended_at ? 'success' : 'outline'}
        className="min-h-11 w-full sm:w-auto"
        onClick={() => client.suspended_at ? onReactivateRequest(client) : onOpen(client)}
        aria-label={`${label}: ${client.name}`}
      >
        {label}
      </Button>
      <p className="max-w-xs text-xs leading-4 text-muted-foreground">{primaryActionHint(client)}</p>
    </div>
  )
}

function MobileGovernanceCard({
  client,
  today,
  onOpen,
  onAction,
  onReactivateRequest,
}: {
  client: PortfolioClient
  today: Date
  onOpen: (client: PortfolioClient) => void
  onAction: (client: PortfolioClient, action: ClientAction) => void
  onReactivateRequest: (client: PortfolioClient) => void
}) {
  const priority = governancePriority(client, today)
  const issues = governanceIssues(client, today)
  const state = lifecycleState(client)

  return (
    <article className="border-b border-border-subtle px-4 py-5 last:border-b-0" aria-labelledby={`governance-client-${client.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div id={`governance-client-${client.id}`}><ClientIdentity client={client} onOpen={onOpen} /></div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <PriorityBadge priority={priority} />
          <Badge variant={LIFECYCLE_VARIANT[state]}>{lifecycleLabel(client)}</Badge>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-surface-alt p-3.5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diagnóstico</p>
        <IssueList issues={issues} compact />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <dt className="font-semibold text-muted-foreground">Responsável</dt>
          <dd className="mt-1 font-medium text-foreground">{client.implementation_owner_name ?? 'Não atribuído'}</dd>
        </div>
        <div>
          <dt className="font-semibold text-muted-foreground">Referência</dt>
          <dd className="mt-1 font-medium text-foreground">{governanceReferenceLabel(client, today)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="font-semibold text-muted-foreground">Impacto</dt>
          <dd className="mt-1 leading-5 text-foreground">{governanceImpact(client, today)}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-border-subtle pt-4">
        <p className="text-xs font-semibold text-muted-foreground">Próximo passo</p>
        <p className="mt-1 text-sm font-medium leading-5 text-foreground">{governanceNextAction(client, today)}</p>
        <div className="mt-3 flex flex-col gap-2">
          <PrimaryAction client={client} onOpen={onOpen} onReactivateRequest={onReactivateRequest} />
          <ClientActionsMenu client={client} compact onAction={action => onAction(client, action)} />
        </div>
      </div>
    </article>
  )
}

function DesktopGovernanceTable({
  rows,
  today,
  onOpen,
  onAction,
  onReactivateRequest,
}: {
  rows: PortfolioClient[]
  today: Date
  onOpen: (client: PortfolioClient) => void
  onAction: (client: PortfolioClient, action: ClientAction) => void
  onReactivateRequest: (client: PortfolioClient) => void
}) {
  return (
    <MxTableSurface aria-label="Fila de governança com rolagem horizontal no desktop">
      <Table className="min-w-[1080px]">
        <caption className="sr-only">Clientes ordenados por prioridade de governança</caption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-64">Cliente e contexto</TableHead>
            <TableHead className="w-40">Prioridade e status</TableHead>
            <TableHead className="w-[280px]">Diagnóstico e impacto</TableHead>
            <TableHead className="w-48">Responsável e referência</TableHead>
            <TableHead className="w-52">Próximo passo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(client => {
            const priority = governancePriority(client, today)
            const issues = governanceIssues(client, today)
            const state = lifecycleState(client)

            return (
              <TableRow key={client.id} className="align-top transition-colors hover:bg-surface-alt/50">
                <TableCell><ClientIdentity client={client} onOpen={onOpen} /></TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <PriorityBadge priority={priority} />
                    <Badge variant={LIFECYCLE_VARIANT[state]}>{lifecycleLabel(client)}</Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <IssueList issues={issues} />
                  <p className="mt-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Impacto:</strong> {governanceImpact(client, today)}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-foreground" title={client.implementation_owner_email ?? undefined}>{client.implementation_owner_name ?? 'Não atribuído'}</p>
                  {client.implementation_owner_email ? <p className="mt-1 truncate text-xs text-muted-foreground">{client.implementation_owner_email}</p> : null}
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{governanceReferenceLabel(client, today)}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm font-medium leading-5 text-foreground">{governanceNextAction(client, today)}</p>
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <PrimaryAction client={client} onOpen={onOpen} onReactivateRequest={onReactivateRequest} />
                    <ClientActionsMenu client={client} onAction={action => onAction(client, action)} />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </MxTableSurface>
  )
}

export function GovernancaBloqueiosTab({ rows, onAction, onReactivate }: GovernancaBloqueiosTabProps) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todas')
  const [reactivationTarget, setReactivationTarget] = useState<PortfolioClient | null>(null)
  const [reactivatingId, setReactivatingId] = useState<string | null>(null)
  const today = useMemo(() => new Date(), [])
  const filter = resolveGovernanceFilter(searchParams.get('governanca'))

  const categories = useMemo(() => governanceCategoryRows(rows, today), [rows, today])
  const categoryRows = governanceRowsForFilter(categories, filter)
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    const searched = categoryRows.filter(client => !term || governanceSearchText(client).includes(term))
    const prioritized = priorityFilter === 'todas'
      ? searched
      : searched.filter(client => governancePriority(client, today) === priorityFilter)
    return sortGovernanceRows(prioritized, today)
  }, [categoryRows, priorityFilter, search, today])

  const occurrenceCount = categories.semConsultor.length + categories.bloqueios.length + categories.renovacoes.length + categories.suspensos.length
  const incompleteRegistration = rows.filter(client => !client.primary_store_city?.trim() || !client.cnpj?.trim()).length
  const hasActiveFilters = filter !== 'todos' || Boolean(search.trim()) || priorityFilter !== 'todas'

  const setFilter = (nextFilter: GovernanceFilter) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous)
      if (nextFilter === 'todos') next.delete('governanca')
      else next.set('governanca', nextFilter)
      return next
    }, { replace: true })
  }

  const openClient = (client: PortfolioClient) => navigate(`/clientes/${client.slug || client.id}`)

  const clearFilters = () => {
    setFilter('todos')
    setSearch('')
    setPriorityFilter('todas')
  }

  const confirmReactivation = async () => {
    if (!reactivationTarget || reactivatingId) return
    setReactivatingId(reactivationTarget.id)
    try {
      const success = await onReactivate(reactivationTarget)
      if (success) setReactivationTarget(null)
    } finally {
      setReactivatingId(null)
    }
  }

  const filterCards: Array<{ key: GovernanceFilter; label: string; count: number; detail: string; icon: LucideIcon; className: string; activeClassName: string }> = [
    {
      key: 'sem_consultor',
      label: 'Sem consultor MX',
      count: categories.semConsultor.length,
      detail: 'Clientes ativos sem responsável',
      icon: UserX,
      className: 'border-status-warning/30 hover:border-status-warning/60',
      activeClassName: 'border-status-warning/70 bg-status-warning-surface ring-1 ring-status-warning/40',
    },
    {
      key: 'bloqueios',
      label: 'Bloqueios de ativação',
      count: categories.bloqueios.length,
      detail: 'Clientes inativos com pré-requisito ausente',
      icon: AlertTriangle,
      className: 'border-status-error/30 hover:border-status-error/60',
      activeClassName: 'border-status-error/70 bg-status-error-surface ring-1 ring-status-error/40',
    },
    {
      key: 'renovacoes',
      label: 'Renovações próximas',
      count: categories.renovacoes.length,
      detail: 'Vencimento dentro de 60 dias',
      icon: CalendarClock,
      className: 'border-status-info/30 hover:border-status-info/60',
      activeClassName: 'border-status-info/70 bg-status-info-surface ring-1 ring-status-info/40',
    },
    {
      key: 'suspensos',
      label: 'Clientes suspensos',
      count: categories.suspensos.length,
      detail: 'Aguardando revisão e reativação',
      icon: PauseCircle,
      className: 'border-border hover:border-border-subtle',
      activeClassName: 'border-border-subtle bg-surface-alt ring-1 ring-border',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filtros da governança">
        {filterCards.map(card => {
          const Icon = card.icon
          const selected = filter === card.key
          return (
            <button
              key={card.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(selected ? 'todos' : card.key)}
              className={`flex min-h-36 flex-col items-start justify-between rounded-xl border bg-card p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-status-success/30 ${selected ? card.activeClassName : card.className}`}
            >
              <div className="flex w-full items-center justify-between gap-3">
                <span className="text-sm font-semibold text-foreground">{card.label}</span>
                <Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>
              <span className="mt-3 text-3xl font-bold leading-none text-foreground">{card.count}</span>
              <span className="mt-2 text-xs leading-5 text-muted-foreground">{card.detail}</span>
            </button>
          )
        })}
      </div>

      <section aria-label="Resumo dos critérios de governança" className="rounded-xl border border-border-subtle bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-status-info-text" aria-hidden="true" />
          <div className="min-w-0 text-sm leading-6 text-foreground">
            <p><strong>{categories.todos.length} cliente(s) único(s)</strong> estão na fila, com <strong>{occurrenceCount} ocorrência(s)</strong> categorizada(s).</p>
            <p className="text-xs leading-5 text-muted-foreground">Um cliente pode aparecer em mais de uma categoria. A qualidade cadastral é acompanhada à parte: <strong className="text-foreground">{incompleteRegistration}</strong> cliente(s) têm cidade ou CNPJ ausente; isso não cria um bloqueio de ativação sozinho.</p>
          </div>
        </div>
        <details className="mt-3 border-t border-border-subtle pt-3">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-status-success/30">
            <CircleHelp size={16} className="text-status-info-text" aria-hidden="true" />
            Como esta fila é formada
          </summary>
          <div className="grid gap-2 pt-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
            <p><strong className="text-foreground">Bloqueio de ativação:</strong> falta loja principal, produto contratado, consultor ou módulo liberado no cadastro inativo.</p>
            <p><strong className="text-foreground">Continuidade:</strong> consultor sem responsável, suspensão ativa e contrato dentro da janela de renovação.</p>
            <p className="sm:col-span-2">A fila protege a continuidade da jornada consultiva MX. PPA, PMR e outros módulos são executados no contexto do cliente; aqui a decisão é identificar o dono e o próximo passo.</p>
          </div>
        </details>
      </section>

      <MxSectionCard>
        <MxSectionHeader
          title="Fila de decisão operacional"
          description={categories.todos.length === 0 ? 'Nenhuma pendência estrutural identificada na carteira.' : `${filtered.length} de ${categoryRows.length} cliente(s) na visão atual · ordenação fixa por prioridade`}
          actions={filter !== 'todos' ? <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setFilter('todos')}>Ver todas as pendências</Button> : null}
        />

        <div className="border-b border-border-subtle px-4 py-4 sm:px-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Buscar cliente, cidade ou consultor</span>
              <span className="relative block">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input aria-label="Buscar cliente, cidade ou consultor" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ex.: nome ou responsável" />
              </span>
            </label>
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Filtrar por prioridade</span>
              <Select aria-label="Filtrar por prioridade" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value as PriorityFilter)}>
                {Object.entries(PRIORITY_FILTER_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </label>
            {hasActiveFilters ? <Button type="button" variant="ghost" size="sm" className="min-h-11 self-end text-status-success-text" onClick={clearFilters}>Limpar filtros</Button> : null}
          </div>
          <p className="mt-3 text-xs text-muted-foreground" role="status" aria-live="polite">
            {hasActiveFilters ? `Filtros ativos · ${filtered.length} resultado(s)` : 'A fila começa pelos casos mais críticos e segue para atenção.'}
          </p>
        </div>

        {filtered.length === 0 ? (
          <MxEmptyState
            title={categories.todos.length === 0 ? 'Governança em dia' : 'Nenhum cliente encontrado'}
            description={categories.todos.length === 0 ? 'Não há bloqueios de ativação, ausência de responsável, suspensão ou renovação dentro da janela atual.' : 'Ajuste a busca ou remova os filtros para voltar à fila completa.'}
            icon={categories.todos.length === 0 ? CheckCircle2 : Search}
            action={categories.todos.length > 0 && hasActiveFilters ? <Button variant="outline" size="sm" className="min-h-11" onClick={clearFilters}>Limpar filtros</Button> : undefined}
          />
        ) : (
          <>
            <div className="hidden px-4 py-3 text-xs text-muted-foreground md:block sm:px-5">A tabela mostra a fila priorizada; ações com mudança de estado pedem confirmação antes de continuar.</div>
            <div className="hidden p-4 pt-0 md:block sm:p-5 sm:pt-0">
              <DesktopGovernanceTable rows={filtered} today={today} onOpen={openClient} onAction={onAction} onReactivateRequest={setReactivationTarget} />
            </div>
            <div className="px-4 py-3 text-xs text-muted-foreground md:hidden">No celular, cada registro reúne cliente, diagnóstico, responsável e ação no mesmo bloco.</div>
            <div className="mx-4 mb-4 rounded-xl border border-border-subtle bg-white md:hidden">
              {filtered.map(client => <MobileGovernanceCard key={client.id} client={client} today={today} onOpen={openClient} onAction={onAction} onReactivateRequest={setReactivationTarget} />)}
            </div>
          </>
        )}
      </MxSectionCard>

      <AlertDialog open={Boolean(reactivationTarget)} onOpenChange={open => { if (!open && !reactivatingId) setReactivationTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reativar {reactivationTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              A operação volta para Ativo, a suspensão e o motivo são removidos e a jornada pode voltar a ser executada. A ação fica registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {reactivationTarget ? <p className="text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Motivo atual:</strong> {formatGovernanceReason(reactivationTarget.suspended_reason)}</p> : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(reactivatingId)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={Boolean(reactivatingId)}
              onClick={event => { event.preventDefault(); void confirmReactivation() }}
            >
              {reactivatingId ? 'Reativando…' : 'Confirmar reativação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

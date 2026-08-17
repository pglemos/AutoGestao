import { useMemo, useState } from 'react'
import { AlertTriangle, Building2, CalendarClock, CheckCircle2, ClipboardList, Plus, RefreshCw, Rocket } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxInput,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxTableSurface,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { ClientActionsMenu, CLIENT_ACTION_LABELS, type ClientAction } from './clientes/ClientActionsMenu'
import { EnrollmentLinkModal } from './clientes/EnrollmentLinkModal'
import { ScheduleActivationModal } from './clientes/ScheduleActivationModal'
import { SuspendClientModal } from './clientes/SuspendClientModal'
import { createEnrollmentLink } from './clientes/enrollmentMutations'
import type { EnrollmentLinkDraft } from './clientes/enrollmentLink'
import { reactivateClient, scheduleActivation, suspendClient } from './clientes/lifecycleMutations'
import {
  EMPTY_PORTFOLIO_FILTERS,
  PORTFOLIO_BUCKET_LABEL,
  activationBlockers,
  filterPortfolio,
  isActive,
  journeyLabel,
  nextAction,
  portfolioCounters,
  structureLabel,
  type PortfolioBucket,
  type PortfolioFilters,
} from './clientes/clientPortfolio'
import { useClientPortfolio } from './clientes/useClientPortfolio'
import { InscricoesPendentesPanel } from './clientes/InscricoesPendentesPanel'

const PHASE_LABEL: Record<string, string> = {
  ESTRUTURACAO: 'Estruturação',
  CRESCIMENTO: 'Crescimento',
  CONSOLIDACAO: 'Consolidação',
  EXPANSAO: 'Expansão',
  RECUPERACAO: 'Recuperação',
}

const CARDS: Array<{ bucket: PortfolioBucket; icon: typeof Building2; tone: 'brand' | 'success' | 'info' | 'danger' | 'warning' | 'violet'; detail: string }> = [
  { bucket: 'ativos', icon: CheckCircle2, tone: 'success', detail: 'Contratos em vigor' },
  { bucket: 'em_implantacao', icon: Rocket, tone: 'info', detail: 'Jornada em andamento' },
  { bucket: 'prontos_para_ativar', icon: ClipboardList, tone: 'brand', detail: 'Sem pendência para ativar' },
  { bucket: 'com_bloqueios', icon: AlertTriangle, tone: 'danger', detail: 'Falta item obrigatório' },
  { bucket: 'renovacoes_proximas', icon: CalendarClock, tone: 'warning', detail: 'Contrato vence em 60 dias' },
  { bucket: 'cadastros_pendentes', icon: Building2, tone: 'violet', detail: 'Onboarding em aberto' },
]

export function AdminClientesPage() {
  const { rows, loading, error, refetch } = useClientPortfolio()
  const [filters, setFilters] = useState<PortfolioFilters>(EMPTY_PORTFOLIO_FILTERS)
  const location = useLocation()
  const navigate = useNavigate()
  const { supabaseUser } = useAuth()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const [suspendTarget, setSuspendTarget] = useState<(typeof rows)[number] | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<(typeof rows)[number] | null>(null)
  const [linkTarget, setLinkTarget] = useState<(typeof rows)[number] | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const counters = useMemo(() => portfolioCounters(rows), [rows])
  const filtered = useMemo(() => filterPortfolio(rows, filters), [rows, filters])
  const phases = useMemo(() => [...new Set(rows.map(row => row.business_phase).filter((v): v is string => Boolean(v)))].sort(), [rows])
  const products = useMemo(() => [...new Set(rows.map(row => row.product_name).filter((v): v is string => Boolean(v)))].sort(), [rows])
  const owners = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) {
      if (row.implementation_owner_id) map.set(row.implementation_owner_id, row.implementation_owner_name ?? 'Sem nome')
    }
    return [...map.entries()]
  }, [rows])

  const patch = (values: Partial<PortfolioFilters>) => setFilters(current => ({ ...current, ...values }))

  const handleAction = (client: (typeof rows)[number], action: ClientAction) => {
    const base = `/clientes/${client.slug || client.id}`
    switch (action) {
      case 'abrir_visao360':
        navigate(base)
        break
      case 'continuar_onboarding':
        navigate(`/clientes/novo?continue=${client.id}`)
        break
      case 'gerar_link_autocadastro':
        setLinkTarget(client)
        break
      case 'adicionar_pessoa':
        navigate(`${base}?tab=pessoas`)
        break
      case 'abrir_jornada':
        navigate(`${base}?tab=jornada`)
        break
      case 'abrir_auditoria':
        navigate(`${base}?tab=historico`)
        break
      case 'programar_ativacao':
        setScheduleTarget(client)
        break
      case 'suspender':
        setSuspendTarget(client)
        break
      case 'validar_cadastros':
        navigate(`${base}?tab=pessoas`)
        break
    }
  }

  const doSuspend = async (reason: string) => {
    if (!suspendTarget || !supabaseUser) return null
    setSubmitting(true)
    const result = await suspendClient({ clientId: suspendTarget.id, reason, suspendedBy: supabaseUser.id })
    setSubmitting(false)
    if (result.error) return result.error
    toast.success('Cliente suspenso.')
    setSuspendTarget(null)
    await refetch()
    return null
  }

  const doSchedule = async (scheduledFor: string) => {
    if (!scheduleTarget || !supabaseUser) return null
    setSubmitting(true)
    const result = await scheduleActivation({ clientId: scheduleTarget.id, scheduledFor, scheduledBy: supabaseUser.id })
    setSubmitting(false)
    if (result.error) return result.error
    toast.success('Ativação programada.')
    setScheduleTarget(null)
    await refetch()
    return null
  }

  const doReactivate = async (client: (typeof rows)[number]) => {
    if (!supabaseUser) return
    setSubmitting(true)
    const result = await reactivateClient({ clientId: client.id, activatedBy: supabaseUser.id })
    setSubmitting(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Cliente reativado.')
    await refetch()
  }

  const doCreateEnrollmentLink = async (draft: EnrollmentLinkDraft) => {
    if (!linkTarget || !supabaseUser) return null
    const result = await createEnrollmentLink(linkTarget.id, linkTarget.slug || '', location.pathname, draft, supabaseUser.id)
    if (result.error) {
      toast.error(result.error)
      return null
    }
    return result.url
  }

  return (
    <MxModulePage id="admin-mx-clientes" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Building2}
          eyebrow="Administração MX"
          title="Clientes MX"
          description="Carteira administrativa: fase, estrutura, jornada, responsável e a próxima ação de cada cliente."
          actions={<>
            <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
            <Button asChild><Link to="/clientes/novo"><Plus size={16} />Novo cliente</Link></Button>
          </>}
        />

        {loading ? <MxLoadingState label="Carregando carteira" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <MxMetricGrid>
              {CARDS.map(card => (
                <MxMetricCard
                  key={card.bucket}
                  title={PORTFOLIO_BUCKET_LABEL[card.bucket]}
                  value={counters[card.bucket]}
                  detail={card.detail}
                  icon={card.icon}
                  tone={card.tone}
                  actionLabel={filters.bucket === card.bucket ? 'Limpar filtro' : 'Filtrar'}
                  onAction={() => patch({ bucket: filters.bucket === card.bucket ? 'todos' : card.bucket })}
                />
              ))}
            </MxMetricGrid>

            <InscricoesPendentesPanel />

            <MxToolbar>
              <MxInput
                value={filters.search}
                onChange={event => patch({ search: event.target.value })}
                placeholder="Buscar por nome, CNPJ, cidade, contato, produto ou responsável"
                aria-label="Buscar cliente na carteira"
              />
              <MxSelect aria-label="Filtrar por situação" value={filters.bucket} onChange={event => patch({ bucket: event.target.value as PortfolioFilters['bucket'] })}>
                <option value="todos">Todas as situações</option>
                {CARDS.map(card => <option key={card.bucket} value={card.bucket}>{PORTFOLIO_BUCKET_LABEL[card.bucket]}</option>)}
              </MxSelect>
              <MxSelect aria-label="Filtrar por fase empresarial" value={filters.phase} onChange={event => patch({ phase: event.target.value })}>
                <option value="todas">Todas as fases</option>
                {phases.map(phase => <option key={phase} value={phase}>{PHASE_LABEL[phase] ?? phase}</option>)}
              </MxSelect>
              <MxSelect aria-label="Filtrar por produto" value={filters.product} onChange={event => patch({ product: event.target.value })}>
                <option value="todos">Todos os produtos</option>
                {products.map(product => <option key={product} value={product}>{product}</option>)}
              </MxSelect>
              <MxSelect aria-label="Filtrar por responsável MX" value={filters.owner} onChange={event => patch({ owner: event.target.value })}>
                <option value="todos">Todos os responsáveis</option>
                {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </MxSelect>
            </MxToolbar>

            <MxSectionCard>
              <MxSectionHeader
                title="Carteira de clientes"
                description={`${filtered.length} de ${rows.length} cliente(s).`}
                actions={filters !== EMPTY_PORTFOLIO_FILTERS ? <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_PORTFOLIO_FILTERS)}>Limpar filtros</Button> : null}
              />
              <div className="p-5">
                {filtered.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[1100px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Programa</TableHead>
                          <TableHead>Fase</TableHead>
                          <TableHead>Estrutura</TableHead>
                          <TableHead>Jornada</TableHead>
                          <TableHead>Pessoas</TableHead>
                          <TableHead>Responsável MX</TableHead>
                          <TableHead>Próxima ação</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(client => {
                          const blockers = activationBlockers(client)
                          return (
                            <TableRow key={client.id}>
                              <TableCell>
                                <div className="font-semibold text-foreground">{client.name}</div>
                                <div className="text-xs text-muted-foreground">{client.cnpj || 'Sem CNPJ'}</div>
                              </TableCell>
                              <TableCell>{client.product_name || 'Não definido'}</TableCell>
                              <TableCell>{PHASE_LABEL[client.business_phase ?? ''] ?? '—'}</TableCell>
                              <TableCell>{structureLabel(client)}</TableCell>
                              <TableCell>{journeyLabel(client)}</TableCell>
                              <TableCell>{client.users}</TableCell>
                              <TableCell>{client.implementation_owner_name || '—'}</TableCell>
                              <TableCell>
                                <div className="text-sm text-foreground">{nextAction(client)}</div>
                                {blockers.length > 1 ? <div className="text-xs text-muted-foreground">{`+${blockers.length - 1} pendência(s)`}</div> : null}
                              </TableCell>
                              <TableCell>{isActive(client) ? 'Ativo' : 'Inativo'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {client.suspended_at ? (
                                    <Button variant="outline" size="sm" onClick={() => void doReactivate(client)} disabled={submitting}>Reativar</Button>
                                  ) : null}
                                  <ClientActionsMenu client={client} onAction={action => handleAction(client, action)} />
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : (
                  <MxEmptyState
                    variant="filter"
                    title="Nenhum cliente nesta visão"
                    description="Ajuste a busca ou o filtro de situação para ver outros clientes."
                    action={<Button variant="outline" onClick={() => setFilters(EMPTY_PORTFOLIO_FILTERS)}>Limpar filtros</Button>}
                  />
                )}
              </div>
            </MxSectionCard>
          </>
        )}
      </div>

      <SuspendClientModal
        open={Boolean(suspendTarget)}
        clientName={suspendTarget?.name ?? ''}
        submitting={submitting}
        onSubmit={doSuspend}
        onClose={() => setSuspendTarget(null)}
      />
      <ScheduleActivationModal
        open={Boolean(scheduleTarget)}
        clientName={scheduleTarget?.name ?? ''}
        submitting={submitting}
        onSubmit={doSchedule}
        onClose={() => setScheduleTarget(null)}
      />
      <EnrollmentLinkModal
        open={Boolean(linkTarget)}
        submitting={submitting}
        onSubmit={doCreateEnrollmentLink}
        onClose={() => setLinkTarget(null)}
      />
    </MxModulePage>
  )
}

export default AdminClientesPage

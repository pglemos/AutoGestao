import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Copy,
  ExternalLink,
  LayoutGrid,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  TableProperties,
  Users,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
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
import { useStores, useStoresStats, type StoreUpdateFields } from '@/hooks/useStores'
import { toast } from '@/lib/toast'
import { getPreRegistrationLink } from '@/lib/utils'
import type { Store } from '@/types/database'
import { CreateStoreModal, type NewStoreDraft } from '@/components/organisms/CreateStoreModal'
import { StoreEditModal } from '@/features/admin/components/StoreEditModal'
import { HardDeleteStoreModal } from '@/features/lojas/modals/HardDeleteStoreModal'
import { ClientActionsMenu, type ClientAction } from './clientes/ClientActionsMenu'
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

const CARDS: Array<{
  bucket: PortfolioBucket
  icon: typeof Building2
  tone: 'brand' | 'success' | 'info' | 'danger' | 'warning' | 'violet'
  detail: string
}> = [
  { bucket: 'ativos', icon: CheckCircle2, tone: 'success', detail: 'Contratos & Lojas em vigor' },
  { bucket: 'em_implantacao', icon: Rocket, tone: 'info', detail: 'Jornada em andamento' },
  { bucket: 'prontos_para_ativar', icon: ClipboardList, tone: 'brand', detail: 'Sem pendência para ativar' },
  { bucket: 'com_bloqueios', icon: AlertTriangle, tone: 'danger', detail: 'Falta item obrigatório' },
  { bucket: 'renovacoes_proximas', icon: CalendarClock, tone: 'warning', detail: 'Contrato vence em 60 dias' },
  { bucket: 'cadastros_pendentes', icon: Building2, tone: 'violet', detail: 'Onboarding em aberto' },
]

export function AdminClientesPage() {
  const { rows, loading: portfolioLoading, error: portfolioError, refetch: refetchPortfolio } = useClientPortfolio()
  const {
    lojas,
    refetch: refetchStores,
    createStore,
    updateStore,
    deleteStore,
  } = useStores()
  const { stats, refetch: refetchStats } = useStoresStats()

  const [filters, setFilters] = useState<PortfolioFilters>(EMPTY_PORTFOLIO_FILTERS)
  const [viewMode, setViewMode] = useState<'tabela' | 'cards'>('tabela')
  const location = useLocation()
  const navigate = useNavigate()
  const { supabaseUser } = useAuth()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newStore, setNewStore] = useState<NewStoreDraft>({ name: '', manager_email: '' })
  const [creatingStore, setCreatingStore] = useState(false)

  const [editingStore, setEditingStore] = useState<Store | null>(null)
  const [savingStore, setSavingStore] = useState(false)

  const [hardDeleteStore, setHardDeleteStore] = useState<Store | null>(null)
  const [hardDeleteConfirmation, setHardDeleteConfirmation] = useState('')
  const [hardDeleting, setHardDeleting] = useState(false)

  const [suspendTarget, setSuspendTarget] = useState<(typeof rows)[number] | null>(null)
  const [scheduleTarget, setScheduleTarget] = useState<(typeof rows)[number] | null>(null)
  const [linkTarget, setLinkTarget] = useState<(typeof rows)[number] | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const refetchAll = async () => {
    await Promise.all([refetchPortfolio(), refetchStores(), refetchStats()])
  }

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

  const handleCopyLink = (name: string) => {
    const link = getPreRegistrationLink(name)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link)
      toast.success('Link de pré-cadastro de vendedores copiado!')
    } else {
      toast.info(`Link de cadastro: ${link}`)
    }
  }

  const handleAction = (client: (typeof rows)[number], action: ClientAction) => {
    const base = `/clientes/${client.slug || client.id}`
    const storeSlug = client.slug || client.id
    switch (action) {
      case 'abrir_visao360':
        navigate(base)
        break
      case 'acessar_workspace':
        navigate(`/lojas/${storeSlug}`)
        break
      case 'gerenciar_equipe':
        navigate(`/lojas/${storeSlug}/equipe`)
        break
      case 'copiar_link_cadastro':
        handleCopyLink(client.name)
        break
      case 'editar_loja': {
        const storeMatch = (lojas || []).find(s => s.id === client.id) || ({
          id: client.id,
          name: client.name,
          manager_email: null,
          legal_name: client.name,
          cnpj: client.cnpj,
          address: '',
          administrative_phone: '',
          partners: [],
          active: isActive(client),
        } as unknown as Store)
        setEditingStore(storeMatch)
        break
      }
      case 'arquivar_loja': {
        const storeMatch = (lojas || []).find(s => s.id === client.id) || ({
          id: client.id,
          name: client.name,
        } as unknown as Store)
        setHardDeleteStore(storeMatch)
        break
      }
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

  const handleCreateStoreSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newStore.name.trim()) {
      toast.error('Informe o nome da loja.')
      return
    }
    setCreatingStore(true)
    const result = await createStore(newStore.name, newStore.manager_email)
    setCreatingStore(false)
    if (result && !result.error) {
      toast.success('Loja criada com sucesso!')
      setIsCreateModalOpen(false)
      setNewStore({ name: '', manager_email: '' })
      await refetchAll()
    }
  }

  const handleStoreEditSubmit = async (id: string, updates: Partial<StoreUpdateFields>) => {
    setSavingStore(true)
    const result = await updateStore(id, updates)
    setSavingStore(false)
    if (!result?.error) {
      toast.success('Loja atualizada com sucesso!')
      setEditingStore(null)
      await refetchAll()
    }
  }

  const handleHardDeleteConfirm = async () => {
    if (!hardDeleteStore) return
    setHardDeleting(true)
    const result = await deleteStore(hardDeleteStore.id)
    setHardDeleting(false)
    if (!result?.error) {
      toast.success('Loja excluída com sucesso.')
      setHardDeleteStore(null)
      setHardDeleteConfirmation('')
      await refetchAll()
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
    await refetchAll()
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
    await refetchAll()
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
    await refetchAll()
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
          eyebrow="Administração MX & Rede"
          title="Clientes & Lojas MX"
          description="Central unificada de gestão: Carteira 360, Consultoria PMR, Rede de Lojas, Metas e Força de Vendas."
          actions={
            <>
              <Button asChild variant="outline">
                <Link to="/agenda">
                  <CalendarDays size={16} />
                  Agenda MX
                </Link>
              </Button>
              <Button variant="outline" onClick={() => void refetchAll()}>
                <RefreshCw size={16} />
                Atualizar
              </Button>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>
                <Plus size={16} />
                Cadastro Rápido
              </Button>
              <Button asChild>
                <Link to="/clientes/novo">
                  <Plus size={16} />
                  Novo Cliente
                </Link>
              </Button>
            </>
          }
        />

        {portfolioLoading ? (
          <MxLoadingState label="Carregando carteira e rede de lojas" />
        ) : portfolioError ? (
          <MxErrorState description={portfolioError} retry={() => void refetchAll()} />
        ) : (
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
                title="Gestão Consolidada de Lojas & Clientes"
                description={`${filtered.length} de ${rows.length} unidade(s) encontrada(s).`}
                actions={
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
                      <Button
                        variant={viewMode === 'tabela' ? 'primary' : 'ghost'}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => setViewMode('tabela')}
                      >
                        <TableProperties size={14} className="mr-1.5" />
                        Tabela 360
                      </Button>
                      <Button
                        variant={viewMode === 'cards' ? 'primary' : 'ghost'}
                        size="sm"
                        className="h-8 px-2.5 text-xs"
                        onClick={() => setViewMode('cards')}
                      >
                        <LayoutGrid size={14} className="mr-1.5" />
                        Cards Operacionais
                      </Button>
                    </div>
                    {filters !== EMPTY_PORTFOLIO_FILTERS ? (
                      <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_PORTFOLIO_FILTERS)}>
                        Limpar filtros
                      </Button>
                    ) : null}
                  </div>
                }
              />

              <div className="p-5">
                {filtered.length === 0 ? (
                  <MxEmptyState
                    variant="filter"
                    title="Nenhuma loja ou cliente encontrado nesta visão"
                    description="Ajuste a busca ou o filtro de situação para ver outras unidades cadastradas."
                    action={<Button variant="outline" onClick={() => setFilters(EMPTY_PORTFOLIO_FILTERS)}>Limpar filtros</Button>}
                  />
                ) : viewMode === 'tabela' ? (
                  <MxTableSurface>
                    <Table className="min-w-[1200px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente / Loja</TableHead>
                          <TableHead>Programa & Metodologia</TableHead>
                          <TableHead>Fase</TableHead>
                          <TableHead>Estrutura</TableHead>
                          <TableHead>Jornada Consultiva</TableHead>
                          <TableHead>Força de Vendas</TableHead>
                          <TableHead>Responsável MX</TableHead>
                          <TableHead>Próxima Ação</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.map(client => {
                          const blockers = activationBlockers(client)
                          const stat = stats[client.id]
                          const storeSlug = client.slug || client.id
                          const storeMatch = (lojas || []).find(s => s.id === client.id) || ({
                            id: client.id,
                            name: client.name,
                            manager_email: null,
                            legal_name: client.name,
                            cnpj: client.cnpj,
                            address: '',
                            administrative_phone: '',
                            partners: [],
                            active: isActive(client),
                          } as unknown as Store)

                          return (
                            <TableRow key={client.id}>
                              <TableCell>
                                <div className="font-semibold text-foreground">{client.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {client.cnpj ? `CNPJ: ${client.cnpj}` : 'Sem CNPJ'}
                                  {client.primary_store_city ? ` • ${client.primary_store_city}` : ''}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-foreground">{client.product_name || 'Consultoria PMR'}</div>
                                <div className="text-xs text-muted-foreground">{client.program_template_key || 'Padrão'}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{PHASE_LABEL[client.business_phase ?? ''] ?? 'Estruturação'}</Badge>
                              </TableCell>
                              <TableCell>{structureLabel(client)}</TableCell>
                              <TableCell>
                                <div className="font-medium text-foreground">{journeyLabel(client)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {client.visitsTotal > 0 ? `${client.visitsDone}/${client.visitsTotal} encontros` : 'Livre'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <Users size={14} className="text-muted-foreground" />
                                  <span className="font-medium text-foreground">{stat ? stat.sellers : client.users}</span>
                                  <span className="text-xs text-muted-foreground">vendedores</span>
                                </div>
                                {stat && stat.sellers > 0 ? (
                                  <div className="text-xs text-muted-foreground">{stat.disciplinePct}% presença hoje</div>
                                ) : null}
                              </TableCell>
                              <TableCell>{client.implementation_owner_name || '—'}</TableCell>
                              <TableCell>
                                <div className="text-sm text-foreground">{nextAction(client)}</div>
                                {blockers.length > 1 ? (
                                  <div className="text-xs text-muted-foreground">{`+${blockers.length - 1} pendência(s)`}</div>
                                ) : null}
                              </TableCell>
                              <TableCell>
                                <Badge variant={isActive(client) ? 'success' : 'outline'}>
                                  {isActive(client) ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Acessar Workspace da Loja"
                                    aria-label={`Acessar Workspace de ${client.name}`}
                                    onClick={() => navigate(`/lojas/${storeSlug}`)}
                                  >
                                    <ExternalLink size={14} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Gerenciar Equipe"
                                    aria-label={`Gerenciar Equipe de ${client.name}`}
                                    onClick={() => navigate(`/lojas/${storeSlug}/equipe`)}
                                  >
                                    <Users size={14} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Copiar link de pré-cadastro"
                                    aria-label={`Copiar link de pré-cadastro de ${client.name}`}
                                    onClick={() => handleCopyLink(client.name)}
                                  >
                                    <Copy size={14} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Editar Dados da Loja"
                                    aria-label={`Editar Loja ${client.name}`}
                                    onClick={() => setEditingStore(storeMatch)}
                                  >
                                    <Pencil size={14} />
                                  </Button>
                                  {client.suspended_at ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8"
                                      onClick={() => void doReactivate(client)}
                                      disabled={submitting}
                                    >
                                      Reativar
                                    </Button>
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
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map(client => {
                      const stat = stats[client.id]
                      const storeSlug = client.slug || client.id
                      const storeMatch = (lojas || []).find(s => s.id === client.id) || ({
                        id: client.id,
                        name: client.name,
                        manager_email: null,
                        legal_name: client.name,
                        cnpj: client.cnpj,
                        address: '',
                        administrative_phone: '',
                        partners: [],
                        active: isActive(client),
                      } as unknown as Store)

                      return (
                        <div
                          key={client.id}
                          className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-xs transition-shadow hover:shadow-md"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                                  <Building2 size={20} />
                                </span>
                                <div>
                                  <h3 className="font-semibold text-foreground">{client.name}</h3>
                                  <p className="text-xs text-muted-foreground">
                                    {client.cnpj ? `CNPJ: ${client.cnpj}` : 'Sem CNPJ'}
                                    {client.primary_store_city ? ` • ${client.primary_store_city}` : ''}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={isActive(client) ? 'success' : 'outline'}>
                                {isActive(client) ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3 text-xs">
                              <div>
                                <span className="text-muted-foreground">Estrutura:</span>{' '}
                                <span className="font-medium text-foreground">{structureLabel(client)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Fase:</span>{' '}
                                <span className="font-medium text-foreground">{PHASE_LABEL[client.business_phase ?? ''] ?? 'Estruturação'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Jornada:</span>{' '}
                                <span className="font-medium text-foreground">{journeyLabel(client)}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Responsável:</span>{' '}
                                <span className="font-medium text-foreground">{client.implementation_owner_name || '—'}</span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <Users size={14} className="text-primary" />
                                <span className="font-semibold text-foreground">{stat ? stat.sellers : client.users}</span>
                                <span className="text-muted-foreground">vendedores</span>
                              </div>
                              {stat ? (
                                <div className="font-medium text-foreground">
                                  {stat.disciplinePct}% <span className="text-muted-foreground font-normal">presença</span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
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
                                size="icon"
                                className="h-8 w-8"
                                title="Copiar link de pré-cadastro"
                                aria-label={`Copiar link de cadastro de ${client.name}`}
                                onClick={() => handleCopyLink(client.name)}
                              >
                                <Copy size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Editar dados da loja"
                                aria-label={`Editar ${client.name}`}
                                onClick={() => setEditingStore(storeMatch)}
                              >
                                <Pencil size={14} />
                              </Button>
                              <ClientActionsMenu client={client} onAction={action => handleAction(client, action)} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </MxSectionCard>
          </>
        )}
      </div>

      <CreateStoreModal
        open={isCreateModalOpen}
        newStore={newStore}
        setNewStore={setNewStore}
        creating={creatingStore}
        onSubmit={handleCreateStoreSubmit}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <StoreEditModal
        open={Boolean(editingStore)}
        store={editingStore}
        saving={savingStore}
        onClose={() => setEditingStore(null)}
        onSubmit={handleStoreEditSubmit}
      />

      <HardDeleteStoreModal
        store={hardDeleteStore}
        confirmation={hardDeleteConfirmation}
        deleting={hardDeleting}
        onConfirmationChange={setHardDeleteConfirmation}
        onClose={() => {
          setHardDeleteStore(null)
          setHardDeleteConfirmation('')
        }}
        onConfirm={handleHardDeleteConfirm}
      />

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

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MapPin,
  PackageOpen,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Target,
} from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { openCurrentStrategicPlanHref, resolveAdminEditableCycleId } from '@/features/strategic-plan/adminStrategicPlanHref'
import { getClientStrategicPlanPublicationSummary } from '@/features/strategic-plan/publicationSummary'
import { resolveRouteLayout } from '@/design-system/page'
import { getSafeUserFacingDataError } from '@/lib/errors/user-facing-error'
import { Badge, type BadgeProps } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import {
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSelect,
  MxStatusBanner,
  MxToolbar,
  MxInput,
} from '@/components/module/MxModuleVisualPrimitives'
import {
  CONSULTING_MODALITY_LABELS,
  CONSULTING_PERIOD_LABELS,
  CONSULTING_SORT_LABELS,
  CONSULTING_STATUS_LABELS,
  fetchConsultingOverview,
  filterConsultingOverviewRows,
  isConsultingOverviewRowOverdue,
  parseConsultingOverviewDate,
  summarizeConsultingOverview,
  type ConsultingOverviewFilters,
  type ConsultingOverviewModality,
  type ConsultingOverviewPeriod,
  type ConsultingOverviewRow,
  type ConsultingOverviewSort,
  type ConsultingOverviewStatus,
} from './consultingOverview'

const STATUS_BADGE_VARIANT: Record<ConsultingOverviewStatus, BadgeProps['variant']> = {
  nao_iniciado: 'danger',
  agendado: 'info',
  concluido: 'success',
  reagendado: 'warning',
  cancelado: 'outline',
}

const MODALITY_BADGE_VARIANT: Record<ConsultingOverviewModality, BadgeProps['variant']> = {
  online: 'info',
  presencial: 'success',
  a_definir: 'warning',
}

function formatDateTime(value: string | null) {
  if (!value) return 'Sem data definida'
  const date = parseConsultingOverviewDate(value)
  if (!date) return 'Data inválida'
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatLastUpdated(value: Date | null) {
  if (!value) return 'consultando dados'
  return `atualizados às ${value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
}

function deliverablesLabel(row: ConsultingOverviewRow) {
  if (!row.deliverables) return 'Sem entregáveis'
  return `${row.deliverablesDone}/${row.deliverables} entregas concluídas`
}

function rowStatusPresentation(row: ConsultingOverviewRow) {
  if (isConsultingOverviewRowOverdue(row)) return { label: 'Atrasado', variant: 'danger' as const }
  return { label: CONSULTING_STATUS_LABELS[row.status], variant: STATUS_BADGE_VARIANT[row.status] }
}

function hasEffectiveDateConflict(row: ConsultingOverviewRow) {
  return Boolean(row.effectiveVisitDate && ['agendado', 'reagendado'].includes(row.status))
}

export function AdminConsultingOverviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [rows, setRows] = useState<ConsultingOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ConsultingOverviewFilters['status']>('todos')
  const [modality, setModality] = useState<ConsultingOverviewFilters['modality']>('todas')
  const [period, setPeriod] = useState<ConsultingOverviewPeriod>('todos')
  const [sort, setSort] = useState<ConsultingOverviewSort>('prioridade')
  const [selected, setSelected] = useState<ConsultingOverviewRow | null>(null)
  const [actionLoading, setActionLoading] = useState<'strategic' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const result = await fetchConsultingOverview()
    setRows(result.rows)
    setError(result.error)
    setLastUpdated(new Date())
    setLoading(false)
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  useEffect(() => {
    const requestedClientId = searchParams.get('clientId')
    if (!requestedClientId || !rows.length || selected) return
    const match = rows.find(row => row.clientId === requestedClientId)
    if (match) setSelected(match)
  }, [rows, searchParams, selected])

  const filteredRows = useMemo(() => filterConsultingOverviewRows(rows, { search, status, modality, period, sort }), [modality, period, rows, search, sort, status])
  const metrics = useMemo(() => summarizeConsultingOverview(rows), [rows])
  const overdueCount = useMemo(() => rows.filter(row => isConsultingOverviewRowOverdue(row)).length, [rows])
  const metricCards = [
    { title: 'Agendados', value: metrics.agendados, detail: 'Encontros em agenda', icon: CalendarDays, tone: 'info' as const },
    { title: 'Concluídos', value: metrics.concluidos, detail: 'Encontros encerrados', icon: CheckCircle2, tone: 'success' as const },
    { title: 'Presenciais', value: metrics.presenciais, detail: 'Encontros presenciais', icon: MapPin, tone: 'violet' as const },
    { title: 'Não iniciados', value: metrics.naoIniciados, detail: 'Aguardando execução', icon: Target, tone: metrics.naoIniciados ? 'warning' as const : 'neutral' as const },
  ]
  const renderMetricGrid = (className?: string) => (
    <MxMetricGrid className={className}>
      {metricCards.map(card => <MxMetricCard key={card.title} {...card} className="min-h-32 p-3 sm:min-h-40 sm:p-4" />)}
    </MxMetricGrid>
  )

  const clearFilters = () => {
    setSearch('')
    setStatus('todos')
    setModality('todas')
    setPeriod('todos')
    setSort('prioridade')
  }

  const openClient360 = (row: ConsultingOverviewRow) => {
    navigate(`/clientes/${encodeURIComponent(row.clientSlug)}`)
  }

  const openVisit = (row: ConsultingOverviewRow) => {
    navigate(`/consultoria/clientes/${encodeURIComponent(row.clientSlug)}/visitas/${row.visitNumber}`)
  }

  const openStrategicPlan = async (row: ConsultingOverviewRow) => {
    setActionLoading('strategic')
    setActionError(null)
    try {
      const year = new Date().getFullYear()
      const { summary } = await getClientStrategicPlanPublicationSummary({
        clientAccountId: row.clientId,
        referenceYear: year,
      })
      const cycleId = resolveAdminEditableCycleId(summary)
      const href = openCurrentStrategicPlanHref({
        clientId: row.clientId,
        clientSlug: row.clientSlug,
        cycleId,
        year,
        storeId: row.primaryStoreId,
      })
      navigate(href)
    } catch (cause) {
      setActionError(getSafeUserFacingDataError(cause, 'Não foi possível abrir o Plano Estratégico. Tente novamente.'))
    } finally {
      setActionLoading(null)
    }
  }

  const openActionPlan = (row: ConsultingOverviewRow) => {
    const query = row.primaryStoreId ? `?storeId=${encodeURIComponent(row.primaryStoreId)}` : ''
    navigate(`/plano-acao${query}`)
  }

  const closeSelected = () => {
    setSelected(null)
    setActionError(null)
  }

  return (
    <MxModulePage id="admin-mx-consultoria-overview" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Sparkles}
          title="Consultoria"
          description="Acompanhe jornadas, encontros, entregas e evidências."
          actions={<Button variant="outline" onClick={() => void refetch()} disabled={loading} aria-label="Atualizar consultoria"><RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />Atualizar</Button>}
        />

        {loading ? <MxLoadingState label="Carregando encontros da consultoria" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
          <>
            <div className="sm:hidden">
              <details className="group rounded-2xl border border-border-subtle bg-white shadow-sm">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">Resumo da operação</span>
                    <span className="mt-0.5 block break-words text-xs text-muted-foreground">{metrics.agendados} agendados · {metrics.concluidos} concluídos · {metrics.presenciais} presenciais · {metrics.naoIniciados} não iniciados</span>
                  </span>
                  <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-border-subtle p-3">{renderMetricGrid('grid-cols-2 gap-3')}</div>
              </details>
            </div>
            <div className="hidden sm:block">{renderMetricGrid('xl:grid-cols-4')}</div>

            <MxToolbar aria-label="Filtros da consultoria" className="gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="relative min-w-0">
                  <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <MxInput
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Buscar cliente, encontro, consultor ou objetivo"
                    aria-label="Buscar cliente, encontro, consultor ou objetivo"
                    className="pl-10 pr-11"
                  />
                  {search ? <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2" onClick={() => setSearch('')} aria-label="Limpar busca"><span aria-hidden="true">×</span></Button> : null}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MxSelect value={period} onChange={event => setPeriod(event.target.value as ConsultingOverviewPeriod)} aria-label="Filtrar encontros por período">
                    {(Object.keys(CONSULTING_PERIOD_LABELS) as ConsultingOverviewPeriod[]).map(value => <option key={value} value={value}>{CONSULTING_PERIOD_LABELS[value]}</option>)}
                  </MxSelect>
                  <MxSelect value={status} onChange={event => setStatus(event.target.value as ConsultingOverviewFilters['status'])} aria-label="Filtrar encontros por status">
                    <option value="todos">Todos os status</option>
                    {(Object.keys(CONSULTING_STATUS_LABELS) as ConsultingOverviewStatus[]).map(value => <option key={value} value={value}>{CONSULTING_STATUS_LABELS[value]}</option>)}
                  </MxSelect>
                  <MxSelect value={modality} onChange={event => setModality(event.target.value as ConsultingOverviewFilters['modality'])} aria-label="Filtrar encontros por modalidade">
                    <option value="todas">Todas as modalidades</option>
                    {(Object.keys(CONSULTING_MODALITY_LABELS) as ConsultingOverviewModality[]).map(value => <option key={value} value={value}>{CONSULTING_MODALITY_LABELS[value]}</option>)}
                  </MxSelect>
                  <MxSelect value={sort} onChange={event => setSort(event.target.value as ConsultingOverviewSort)} aria-label="Ordenar encontros">
                    {(Object.keys(CONSULTING_SORT_LABELS) as ConsultingOverviewSort[]).map(value => <option key={value} value={value}>{CONSULTING_SORT_LABELS[value]}</option>)}
                  </MxSelect>
                </div>
              </div>
              {search || status !== 'todos' || modality !== 'todas' || period !== 'todos' || sort !== 'prioridade' ? <Button type="button" variant="ghost" className="shrink-0 justify-center sm:self-end" onClick={clearFilters}><RotateCcw size={16} />Limpar filtros</Button> : null}
            </MxToolbar>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm" aria-live="polite">
              <span className="font-semibold text-foreground">Exibindo {filteredRows.length} de {rows.length} encontros</span>
              {overdueCount ? <span className="inline-flex items-center gap-1.5 font-medium text-status-error-text"><AlertTriangle size={14} aria-hidden="true" />{overdueCount} atrasado{overdueCount === 1 ? '' : 's'} para revisar</span> : null}
              <span className="text-muted-foreground">Dados {formatLastUpdated(lastUpdated)} · horário local</span>
            </div>

            <MxSectionCard className="overflow-hidden">
              <div className="border-b border-border-subtle px-4 py-3 sm:px-5 sm:py-4">
                <h2 className="text-base font-semibold text-foreground">Encontros</h2>
                <p className="sr-only mt-1 text-sm text-muted-foreground sm:not-sr-only">Selecione um encontro para executar a próxima etapa ou abrir o contexto completo do cliente.</p>
              </div>
              <div className="divide-y divide-border">
                {filteredRows.length ? filteredRows.map(row => (
                  <button
                    key={row.id}
                    type="button"
                    className="group flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring sm:gap-4 sm:px-5"
                    onClick={() => { setSelected(row); setActionError(null) }}
                    aria-label={`${row.clientName}, Encontro ${row.visitNumber}, ${rowStatusPresentation(row).label}, ${formatDateTime(row.scheduledAt)}`}
                  >
                    <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-alt text-sm font-semibold text-muted-foreground sm:h-10 sm:w-10">
                      {row.visitNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="break-words font-semibold text-foreground">{row.clientName}</span>
                        <span className="text-xs text-muted-foreground">Encontro {row.visitNumber}</span>
                      </div>
                      <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">{row.title || row.objective}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Consultor: {row.consultantName}</span>
                        <span>{CONSULTING_MODALITY_LABELS[row.modality]}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground"><CalendarDays size={14} aria-hidden="true" />Agenda: {formatDateTime(row.scheduledAt)}</span>
                        {hasEffectiveDateConflict(row) ? <span className="font-medium text-status-warning-text">Data efetiva registrada</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 pt-0.5">
                      <Badge variant={rowStatusPresentation(row).variant} className="uppercase">{rowStatusPresentation(row).label}</Badge>
                      <ChevronRight size={16} aria-hidden="true" className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                )) : (
                  <div className="p-5">
                    <MxEmptyState variant={rows.length ? 'filter' : 'dataset'} icon={PackageOpen} title={rows.length ? 'Nenhum encontro encontrado' : 'Nenhum encontro cadastrado'} description={rows.length ? 'Ajuste os filtros para encontrar outro registro.' : 'Os encontros persistidos aparecerão aqui quando a jornada de consultoria for criada.'} />
                  </div>
                )}
              </div>
            </MxSectionCard>
          </>
        )}
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={closeSelected}
        title={selected ? `${selected.clientName} · Encontro ${selected.visitNumber}` : 'Detalhe do encontro'}
        description={selected?.title}
        size="lg"
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={rowStatusPresentation(selected).variant}>{rowStatusPresentation(selected).label}</Badge>
              <Badge variant={MODALITY_BADGE_VARIANT[selected.modality]}>{CONSULTING_MODALITY_LABELS[selected.modality]}</Badge>
              <span className="text-sm text-muted-foreground">{selected.productName}</span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border-subtle bg-surface-alt p-3"><dt className="text-xs text-muted-foreground">Objetivo</dt><dd className="mt-1 text-sm font-semibold text-foreground">{selected.objective}</dd></div>
              <div className="rounded-xl border border-border-subtle bg-surface-alt p-3"><dt className="text-xs text-muted-foreground">Agenda prevista</dt><dd className="mt-1 text-sm font-semibold text-foreground">{formatDateTime(selected.scheduledAt)}</dd></div>
              <div className="rounded-xl border border-border-subtle bg-surface-alt p-3"><dt className="text-xs text-muted-foreground">Data efetiva</dt><dd className="mt-1 text-sm font-semibold text-foreground">{selected.effectiveVisitDate ? formatDateTime(selected.effectiveVisitDate) : 'Ainda não registrada'}</dd></div>
              <div className="rounded-xl border border-border-subtle bg-surface-alt p-3"><dt className="text-xs text-muted-foreground">Consultor responsável</dt><dd className="mt-1 text-sm font-semibold text-foreground">{selected.consultantName}</dd></div>
              <div className="rounded-xl border border-border-subtle bg-surface-alt p-3"><dt className="text-xs text-muted-foreground">Entregáveis</dt><dd className="mt-1 text-sm font-semibold text-foreground">{deliverablesLabel(selected)}</dd></div>
            </dl>

            {hasEffectiveDateConflict(selected) ? <MxStatusBanner tone="warning"><strong>Revisar status do encontro.</strong> Há uma data efetiva registrada, mas o status persistido ainda é “{CONSULTING_STATUS_LABELS[selected.status]}”. Confirme a execução antes de encerrar o encontro.</MxStatusBanner> : null}

            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-info-surface text-status-info-text"><Target size={20} aria-hidden="true" /></div>
                <div><h3 className="text-sm font-semibold text-foreground">Próxima ação</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Abra a execução para registrar o encontro. A visão 360 mantém o contexto completo do cliente.</p></div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="primary" className="justify-start" onClick={() => openVisit(selected)}><Sparkles size={14} />Executar encontro</Button>
                <Button variant="outline" className="justify-start" onClick={() => openClient360(selected)}><ExternalLink size={14} />Visão 360 do cliente</Button>
              </div>
              {actionError ? <p className="mt-3 text-sm text-status-error-text" role="alert">{actionError}</p> : null}
              <details className="group mt-3 rounded-xl border border-border-subtle">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  <span>Mais ações</span><ChevronDown size={16} aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid gap-2 border-t border-border-subtle p-3 sm:grid-cols-2">
                  <Button variant="outline" className="justify-start" onClick={() => void openStrategicPlan(selected)} loading={actionLoading === 'strategic'}><Target size={14} />Plano Estratégico</Button>
                  <Button variant="outline" className="justify-start" onClick={() => openActionPlan(selected)}><ClipboardList size={14} />Plano de Ação</Button>
                </div>
              </details>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays size={14} aria-hidden="true" />
              <span>Horários exibidos no fuso local.</span>
            </div>
          </div>
        ) : null}
      </Modal>
    </MxModulePage>
  )
}

export default AdminConsultingOverviewPage

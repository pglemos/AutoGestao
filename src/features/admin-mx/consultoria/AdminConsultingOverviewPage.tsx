import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MapPin,
  PackageOpen,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { openCurrentStrategicPlanHref, resolveAdminEditableCycleId } from '@/features/strategic-plan/adminStrategicPlanHref'
import { getClientStrategicPlanPublicationSummary } from '@/features/strategic-plan/publicationSummary'
import { resolveRouteLayout } from '@/design-system/page'
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
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import {
  CONSULTING_MODALITY_LABELS,
  CONSULTING_STATUS_LABELS,
  fetchConsultingOverview,
  filterConsultingOverviewRows,
  summarizeConsultingOverview,
  type ConsultingOverviewFilters,
  type ConsultingOverviewModality,
  type ConsultingOverviewRow,
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
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data inválida'
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function deliverablesLabel(row: ConsultingOverviewRow) {
  if (!row.deliverables) return 'Sem entregáveis'
  return `${row.deliverablesDone}/${row.deliverables} entregas concluídas`
}

export function AdminConsultingOverviewPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [rows, setRows] = useState<ConsultingOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<ConsultingOverviewFilters['status']>('todos')
  const [modality, setModality] = useState<ConsultingOverviewFilters['modality']>('todas')
  const [selected, setSelected] = useState<ConsultingOverviewRow | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const result = await fetchConsultingOverview()
    setRows(result.rows)
    setError(result.error)
    setLoading(false)
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  useEffect(() => {
    const requestedClientId = searchParams.get('clientId')
    if (!requestedClientId || !rows.length || selected) return
    const match = rows.find(row => row.clientId === requestedClientId)
    if (match) setSelected(match)
  }, [rows, searchParams, selected])

  const filteredRows = useMemo(() => filterConsultingOverviewRows(rows, { search: '', status, modality }), [modality, rows, status])
  const metrics = useMemo(() => summarizeConsultingOverview(rows), [rows])

  const openClient360 = (row: ConsultingOverviewRow) => {
    navigate(`/clientes/${encodeURIComponent(row.clientSlug)}`)
  }

  const openVisit = (row: ConsultingOverviewRow) => {
    navigate(`/consultoria/clientes/${encodeURIComponent(row.clientSlug)}/visitas/${row.visitNumber}`)
  }

  const openStrategicPlan = async (row: ConsultingOverviewRow) => {
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
  }

  const openActionPlan = (row: ConsultingOverviewRow) => {
    const query = row.primaryStoreId ? `?storeId=${encodeURIComponent(row.primaryStoreId)}` : ''
    navigate(`/plano-acao${query}`)
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
            <MxMetricGrid>
              <MxMetricCard title="Agendados" value={metrics.agendados} detail="Encontros em agenda" icon={CalendarDays} tone="info" />
              <MxMetricCard title="Concluídos" value={metrics.concluidos} detail="Encontros encerrados" icon={CheckCircle2} tone="success" />
              <MxMetricCard title="Presenciais" value={metrics.presenciais} detail="Encontros presenciais" icon={MapPin} tone="violet" />
              <MxMetricCard title="Não iniciados" value={metrics.naoIniciados} detail="Aguardando execução" icon={Target} tone={metrics.naoIniciados ? 'warning' : 'neutral'} />
            </MxMetricGrid>

            <MxToolbar aria-label="Filtros da consultoria">
              <MxSelect value={status} onChange={event => setStatus(event.target.value as ConsultingOverviewFilters['status'])} aria-label="Filtrar encontros por status">
                <option value="todos">Todos os status</option>
                {(Object.keys(CONSULTING_STATUS_LABELS) as ConsultingOverviewStatus[]).map(value => <option key={value} value={value}>{CONSULTING_STATUS_LABELS[value]}</option>)}
              </MxSelect>
              <MxSelect value={modality} onChange={event => setModality(event.target.value as ConsultingOverviewFilters['modality'])} aria-label="Filtrar encontros por modalidade">
                <option value="todas">Todas as modalidades</option>
                {(Object.keys(CONSULTING_MODALITY_LABELS) as ConsultingOverviewModality[]).map(value => <option key={value} value={value}>{CONSULTING_MODALITY_LABELS[value]}</option>)}
              </MxSelect>
            </MxToolbar>

            <MxSectionCard className="overflow-hidden">
              <div className="divide-y divide-border">
                {filteredRows.length ? filteredRows.map(row => (
                  <button
                    key={row.id}
                    type="button"
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                    onClick={() => setSelected(row)}
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-alt text-sm font-semibold text-muted-foreground">
                      {row.visitNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-foreground">{row.clientName} — Encontro {row.visitNumber}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {[row.title, row.objective, row.consultantName].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className={
                      row.modality === 'online'
                        ? 'shrink-0 text-xs font-semibold text-status-info-text'
                        : row.modality === 'presencial'
                        ? 'shrink-0 text-xs font-semibold text-status-warning-text'
                        : 'shrink-0 text-xs font-semibold text-muted-foreground'
                    }>
                      {CONSULTING_MODALITY_LABELS[row.modality]}
                    </span>
                    <Badge variant={STATUS_BADGE_VARIANT[row.status]} className="shrink-0 uppercase">
                      {CONSULTING_STATUS_LABELS[row.status]}
                    </Badge>
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
        onClose={() => setSelected(null)}
        title={selected ? `${selected.clientName} · Encontro ${selected.visitNumber}` : 'Detalhe do encontro'}
        description={selected?.title}
        size="lg"
        footer={selected ? (
          <>
            <Button variant="outline" onClick={() => openClient360(selected)}><ExternalLink size={14} />Visão 360 do cliente</Button>
            <Button variant="outline" onClick={() => openVisit(selected)}><Sparkles size={14} />Abrir Consultoria</Button>
          </>
        ) : undefined}
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_BADGE_VARIANT[selected.status]}>{CONSULTING_STATUS_LABELS[selected.status]}</Badge>
              <Badge variant={MODALITY_BADGE_VARIANT[selected.modality]}>{CONSULTING_MODALITY_LABELS[selected.modality]}</Badge>
              <span className="text-sm text-muted-foreground">{selected.productName}</span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border-subtle bg-surface-alt p-3"><dt className="text-xs text-muted-foreground">Objetivo</dt><dd className="mt-1 text-sm font-semibold text-foreground">{selected.objective}</dd></div>
              <div className="rounded-xl border border-border-subtle bg-surface-alt p-3"><dt className="text-xs text-muted-foreground">Agenda</dt><dd className="mt-1 text-sm font-semibold text-foreground">{formatDateTime(selected.scheduledAt)}</dd></div>
              <div className="rounded-xl border border-border-subtle bg-surface-alt p-3"><dt className="text-xs text-muted-foreground">Consultor responsável</dt><dd className="mt-1 text-sm font-semibold text-foreground">{selected.consultantName}</dd></div>
              <div className="rounded-xl border border-border-subtle bg-surface-alt p-3"><dt className="text-xs text-muted-foreground">Entregáveis</dt><dd className="mt-1 text-sm font-semibold text-foreground">{deliverablesLabel(selected)}</dd></div>
            </dl>

            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-info-surface text-status-info-text"><Target size={20} aria-hidden="true" /></div>
                <div><h3 className="text-sm font-semibold text-foreground">Próximos destinos operacionais</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Continue o acompanhamento sem perder o contexto do cliente ou do encontro selecionado.</p></div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="justify-start" onClick={() => openStrategicPlan(selected)}><Target size={14} />Plano Estratégico</Button>
                <Button variant="outline" className="justify-start" onClick={() => openActionPlan(selected)}><ClipboardList size={14} />Plano de Ação</Button>
                <Button variant="outline" className="justify-start" onClick={() => openClient360(selected)}><ExternalLink size={14} />Dados e jornada 360</Button>
                <Button variant="outline" className="justify-start" onClick={() => openVisit(selected)}><Sparkles size={14} />Execução do encontro</Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays size={14} aria-hidden="true" />
              <span>Data efetiva: {selected.effectiveVisitDate ? formatDateTime(selected.effectiveVisitDate) : 'ainda não registrada'}</span>
            </div>
          </div>
        ) : null}
      </Modal>
    </MxModulePage>
  )
}

export default AdminConsultingOverviewPage

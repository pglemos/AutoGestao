import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Eye, FileClock, Plus, RefreshCw, Search, X } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxField,
  MxInput,
  MxMetricCard,
  MxMetricGrid,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxStatusBanner,
  MxTableSurface,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { PLAN_CYCLE_STATUS_LABEL } from '@/features/strategic-plan/planCycle'
import {
  filterHistoryRows,
  filterStrategicPlanRows,
  type HistoryCategory,
  type HistoryFilters,
  type IndicatorHistoryRow,
  type PlanStatusFilter,
  type StrategicPlanAdminFilters,
  type StrategicPlanClientOption,
  type StrategicPlanAdminRow,
} from './strategicPlanAdmin'

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

function statusVariant(status: string): 'secondary' | 'warning' | 'success' | 'info' | 'outline' {
  if (status === 'publicado') return 'success'
  if (status === 'em_validacao') return 'warning'
  if (status === 'rascunho') return 'secondary'
  if (status === 'revisado') return 'info'
  return 'outline'
}

function historyCategoryLabel(category: HistoryCategory) {
  return {
    todas: 'Todas',
    catalogo: 'Catálogo',
    indicador: 'Indicador',
    parametro: 'Parâmetro',
    plano: 'Plano',
    meta: 'Meta',
  }[category]
}

export function StrategicPlanListPanel(props: {
  rows: StrategicPlanAdminRow[]
  loading: boolean
  filters: StrategicPlanAdminFilters
  onFiltersChange: (filters: StrategicPlanAdminFilters) => void
  onCreate: () => void
  onRefresh: () => void
  onOpen: (row: StrategicPlanAdminRow) => void
  onPreview: (row: StrategicPlanAdminRow) => void
}) {
  const { rows, filters } = props
  const filtered = useMemo(() => filterStrategicPlanRows(rows, filters), [rows, filters])
  const years = useMemo(() => [...new Set(rows.map(row => row.year))].sort((a, b) => b - a), [rows])
  const metrics = useMemo(() => ({
    total: rows.length,
    currentYear: rows.filter(row => row.year === new Date().getFullYear()).length,
    published: rows.filter(row => row.status === 'publicado').length,
    drafts: rows.filter(row => row.status === 'rascunho').length,
    validation: rows.filter(row => row.status === 'em_validacao').length,
    pending: rows.filter(row => row.status !== 'publicado' && row.status !== 'revisado').length,
  }), [rows])

  const update = (patch: Partial<StrategicPlanAdminFilters>) => props.onFiltersChange({ ...filters, ...patch })
  const clear = () => props.onFiltersChange({ search: '', year: 'todos', status: 'todos' })

  return (
    <div className="space-y-5">
      <MxMetricGrid>
        <MxMetricCard title="Planos" value={metrics.total} detail="Ciclos cadastrados" icon={CalendarDays} />
        <MxMetricCard title={`Planos de ${new Date().getFullYear()}`} value={metrics.currentYear} detail="Ano corrente" icon={CalendarDays} tone="info" />
        <MxMetricCard title="Publicados" value={metrics.published} detail="Versões oficiais" icon={CalendarDays} tone="success" />
        <MxMetricCard title="Em validação" value={metrics.validation} detail="Aguardando revisão" icon={CalendarDays} tone="warning" />
        <MxMetricCard title="Rascunhos" value={metrics.drafts} detail="Em construção" icon={CalendarDays} tone="info" />
        <MxMetricCard title="Com pendência" value={metrics.pending} detail="Ainda não publicados" icon={CalendarDays} tone="warning" />
      </MxMetricGrid>

      <MxSectionCard>
        <MxSectionHeader
          title="Planos por cliente"
          description={`${filtered.length} plano(s) encontrado(s).`}
          actions={<><Button variant="outline" onClick={props.onRefresh}><RefreshCw size={16} />Atualizar</Button><Button onClick={props.onCreate}><Plus size={16} />Criar Plano Estratégico</Button></>}
        />
        <div className="space-y-4 p-5">
          <MxToolbar className="shadow-none">
            <div className="relative min-w-0 flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <MxInput className="pl-9" value={filters.search} onChange={event => update({ search: event.target.value })} placeholder="Buscar cliente, responsável ou ano" aria-label="Buscar planos" />
            </div>
            <MxSelect aria-label="Filtrar planos por ano" value={filters.year} onChange={event => update({ year: event.target.value })}>
              <option value="todos">Todos os anos</option>
              {years.map(year => <option key={year} value={String(year)}>{year}</option>)}
            </MxSelect>
            <MxSelect aria-label="Filtrar planos por status" value={filters.status} onChange={event => update({ status: event.target.value as PlanStatusFilter })}>
              <option value="todos">Todos os status</option>
              {(Object.keys(PLAN_CYCLE_STATUS_LABEL) as PlanStatusFilter[]).filter(item => item !== 'todos').map(status => <option key={status} value={status}>{PLAN_CYCLE_STATUS_LABEL[status]}</option>)}
            </MxSelect>
            {(filters.search || filters.year !== 'todos' || filters.status !== 'todos') ? <Button variant="ghost" size="sm" onClick={clear}><X size={16} />Limpar filtros</Button> : null}
          </MxToolbar>

          {props.loading ? <div className="h-48 animate-pulse rounded-2xl bg-surface-alt" aria-label="Carregando planos" /> : filtered.length ? (
            <MxTableSurface aria-label="Planos estratégicos por cliente">
              <Table className="min-w-[1060px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Indicadores</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(row => (
                    <TableRow key={row.cycleId}>
                      <TableCell>
                        <div className="font-semibold text-foreground">{row.clientName}</div>
                        <div className="text-xs text-muted-foreground">Versão {row.versionNumber}{row.packageName ? ` · ${row.packageName}` : ''}</div>
                      </TableCell>
                      <TableCell className="tabular-nums">{row.year}</TableCell>
                      <TableCell className="tabular-nums">{row.indicatorCount}</TableCell>
                      <TableCell className="tabular-nums">{row.unitCount || '—'}</TableCell>
                      <TableCell>{row.responsibleName}</TableCell>
                      <TableCell><Badge variant={statusVariant(row.status)}>{PLAN_CYCLE_STATUS_LABEL[row.status as keyof typeof PLAN_CYCLE_STATUS_LABEL] ?? row.status}</Badge></TableCell>
                      <TableCell>{formatDate(row.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => props.onOpen(row)}>Abrir</Button>
                          <Button variant="outline" size="sm" onClick={() => props.onPreview(row)}><Eye size={16} />Preview Dono</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </MxTableSurface>
          ) : <MxEmptyState variant="filter" title="Nenhum plano encontrado" description="Ajuste a busca ou os filtros, ou crie um novo plano estratégico." action={<Button onClick={props.onCreate}><Plus size={16} />Criar Plano Estratégico</Button>} />}
        </div>
      </MxSectionCard>
    </div>
  )
}

export function IndicatorHistoryPanel(props: {
  rows: IndicatorHistoryRow[]
  loading: boolean
  error: string | null
  filters: HistoryFilters
  onFiltersChange: (filters: HistoryFilters) => void
  onRefresh: () => void
}) {
  const { rows, filters } = props
  const filtered = useMemo(() => filterHistoryRows(rows, filters), [rows, filters])
  const [detail, setDetail] = useState<IndicatorHistoryRow | null>(null)
  const update = (patch: Partial<HistoryFilters>) => props.onFiltersChange({ ...filters, ...patch })
  const clear = () => props.onFiltersChange({ search: '', category: 'todas' })

  return (
    <MxSectionCard>
      <MxSectionHeader title="Histórico" description="Auditoria consolidada do catálogo, indicadores, parâmetros, planos e metas." actions={<Button variant="outline" onClick={props.onRefresh}><FileClock size={16} />Atualizar histórico</Button>} />
      <div className="space-y-4 p-5">
        <MxToolbar className="shadow-none">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <MxInput className="pl-9" value={filters.search} onChange={event => update({ search: event.target.value })} placeholder="Buscar usuário, ação ou recurso" aria-label="Buscar no histórico" />
          </div>
          <MxSelect aria-label="Filtrar histórico por recurso" value={filters.category} onChange={event => update({ category: event.target.value as HistoryCategory })}>
            {(['todas', 'catalogo', 'indicador', 'parametro', 'plano', 'meta'] as HistoryCategory[]).map(category => <option key={category} value={category}>{historyCategoryLabel(category)}</option>)}
          </MxSelect>
          {(filters.search || filters.category !== 'todas') ? <Button variant="ghost" size="sm" onClick={clear}><X size={16} />Limpar filtros</Button> : null}
        </MxToolbar>
        {props.error ? <MxStatusBanner tone="warning">{props.error}</MxStatusBanner> : null}
        {props.loading ? <div className="h-48 animate-pulse rounded-2xl bg-surface-alt" aria-label="Carregando histórico" /> : filtered.length ? (
          <MxTableSurface aria-label="Histórico do plano estratégico">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow><TableHead>Data</TableHead><TableHead>Usuário</TableHead><TableHead>Ação</TableHead><TableHead>Recurso</TableHead><TableHead>Depois</TableHead><TableHead className="text-right">Ação</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(row => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{row.userName}</TableCell>
                    <TableCell><Badge variant="outline">{row.action}</Badge></TableCell>
                    <TableCell>{row.resource}</TableCell>
                    <TableCell className="max-w-[360px] truncate text-xs text-muted-foreground" title={row.after}>{row.after}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setDetail(row)}>Ver detalhes</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </MxTableSurface>
        ) : <MxEmptyState variant="filter" title="Nenhum evento encontrado" description="Ajuste a busca ou o tipo de recurso." />}
      </div>
      <Modal open={Boolean(detail)} onClose={() => setDetail(null)} title={detail ? `${detail.action} · ${detail.resource}` : 'Detalhe do histórico'} size="lg" footer={<Button variant="outline" onClick={() => setDetail(null)}>Fechar</Button>}>
        {detail ? <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Data</dt><dd className="font-semibold text-foreground">{formatDate(detail.createdAt)}</dd></div>
            <div className="rounded-xl border border-border p-3"><dt className="text-xs text-muted-foreground">Usuário</dt><dd className="font-semibold text-foreground">{detail.userName}</dd></div>
          </dl>
          <div><div className="text-xs font-semibold text-muted-foreground">Antes</div><pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-surface-alt p-3 text-xs text-foreground whitespace-pre-wrap">{detail.before}</pre></div>
          <div><div className="text-xs font-semibold text-muted-foreground">Depois</div><pre className="mt-1 max-h-48 overflow-auto rounded-xl border border-border bg-surface-alt p-3 text-xs text-foreground whitespace-pre-wrap">{detail.after}</pre></div>
        </div> : null}
      </Modal>
    </MxSectionCard>
  )
}

export function StrategicPlanPreviewModal(props: { row: StrategicPlanAdminRow | null; onClose: () => void; onOpen: (row: StrategicPlanAdminRow) => void }) {
  const row = props.row
  return (
    <Modal open={Boolean(row)} onClose={props.onClose} title={row ? `Preview Dono · ${row.clientName}` : 'Preview Dono'} size="xl" footer={row ? <><Button variant="outline" onClick={props.onClose}>Fechar</Button><Button onClick={() => props.onOpen(row)}>Abrir plano completo</Button></> : null}>
      {row ? <div className="space-y-5">
        <MxStatusBanner tone="info">Pré-visualização somente leitura com os mesmos dados persistidos do ciclo selecionado. Ações de meta e publicação ficam bloqueadas neste modo.</MxStatusBanner>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Ano', String(row.year)],
            ['Indicadores', String(row.indicatorCount)],
            ['Unidades', String(row.unitCount || '—')],
            ['Status', PLAN_CYCLE_STATUS_LABEL[row.status as keyof typeof PLAN_CYCLE_STATUS_LABEL] ?? row.status],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-border p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold text-foreground">{value}</div></div>)}
        </div>
        <div className="rounded-xl border border-border bg-surface-alt p-4 text-sm text-muted-foreground">
          <div className="font-semibold text-foreground">{row.packageName ?? 'Pacote de indicadores não informado'}</div>
          <p className="mt-1">Responsável: {row.responsibleName}. Última atualização: {formatDate(row.updatedAt)}.</p>
        </div>
      </div> : null}
    </Modal>
  )
}

export function StrategicPlanCreateModal(props: {
  open: boolean
  clients: StrategicPlanClientOption[]
  loadingClients: boolean
  submitting: boolean
  onCreate: (input: { clientId: string; year: number }) => void
  onClose: () => void
}) {
  const [clientId, setClientId] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!props.open) return
    setClientId(props.clients[0]?.id || '')
    setYear(new Date().getFullYear())
    setValidationError(null)
  }, [props.open, props.clients])

  const submit = () => {
    if (!clientId) {
      setValidationError('Selecione um cliente.')
      return
    }
    if (!Number.isInteger(year) || year < 2020 || year > 2100) {
      setValidationError('Informe um ano inteiro entre 2020 e 2100.')
      return
    }
    setValidationError(null)
    props.onCreate({ clientId, year })
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Criar Plano Estratégico"
      description="Abra um ciclo anual para um cliente. A criação é idempotente: cliente e ano só podem ter um ciclo vigente."
      size="md"
      closeOnEscape={!props.submitting}
      footer={<><Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button><Button onClick={submit} disabled={props.submitting || props.loadingClients || !clientId}>{props.submitting ? 'Criando...' : 'Criar plano'}</Button></>}
    >
      <div className="mt-5 space-y-4">
        <MxField label="Cliente" htmlFor="strategic-plan-client">
          <MxSelect id="strategic-plan-client" value={clientId} onChange={event => { setClientId(event.target.value); setValidationError(null) }} disabled={props.loadingClients || props.submitting}>
            <option value="">Selecione um cliente</option>
            {props.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </MxSelect>
        </MxField>
        <MxField label="Ano" htmlFor="strategic-plan-year" hint="O ano precisa estar entre 2020 e 2100.">
          <Input id="strategic-plan-year" type="number" min={2020} max={2100} value={year} onChange={event => { setYear(Number(event.target.value)); setValidationError(null) }} disabled={props.submitting} aria-invalid={Boolean(validationError)} />
        </MxField>
        {validationError ? <MxStatusBanner tone="danger">{validationError}</MxStatusBanner> : null}
        {props.clients.length === 0 && !props.loadingClients ? <MxEmptyState variant="dataset" title="Nenhum cliente disponível" description="Cadastre ou ative um cliente antes de abrir um ciclo estratégico." /> : null}
      </div>
    </Modal>
  )
}

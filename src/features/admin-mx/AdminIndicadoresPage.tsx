import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Calculator, ChevronDown, Eye, EyeOff, FileClock, Gauge, History, Plus, RefreshCw, RotateCcw, Save } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { TabNav } from '@/components/molecules/TabNav'
import { Modal } from '@/components/organisms/Modal'
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
  MxStatusBanner,
  MxTableSurface,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { CreateIndicatorWizard, fromIndicatorToWizard, toIndicatorInput } from './components/CreateIndicatorWizard'
import { FormulaTesterModal } from './components/FormulaTesterModal'
import { ParameterFormModal } from './components/ParameterFormModal'
import { ParameterPickerModal } from './components/ParameterPickerModal'
import { ClientOverridesSection } from './components/ClientOverridesSection'
import { MetasRealizadosTab } from './components/MetasRealizadosTab'
import { IndicatorDetailDrawer } from './indicadores/IndicatorDetailDrawer'
import {
  IndicatorHistoryPanel,
  StrategicPlanCreateModal,
  StrategicPlanListPanel,
  StrategicPlanPreviewModal,
} from './indicadores/StrategicPlanAdminPanels'
import {
  indicatorCalculationMode,
  indicatorHasParameter,
  indicatorIsCalculated,
  INDICATOR_CALCULATION_MODE_LABEL,
  INDICATOR_STATUSES,
  INDICATOR_STATUS_LABEL,
  changeIndicatorStatus,
  formatIndicatorValueType,
  fetchCatalogIndicators,
  fetchIndicatorParameters,
  indicatorMatchesFilter,
  persistIndicatorOrder,
  reorderIndicators,
  restoreDefaultOrder,
  toggleOwnerVisibility,
  validateThresholds,
  type CatalogIndicator,
  type CatalogFilterKey,
  type IndicatorParameter,
  type IndicatorStatus,
} from './indicadores/indicatorCatalog'
import { saveIndicator } from './hooks/useAdminMxLists'
import {
  dependentsOfParameter,
  fetchFormulaIndicators,
  fetchActiveParameterSet,
  fetchParameterValues,
  saveParameterValue,
  type FormulaAwareIndicator,
} from './indicadores/indicatorData'
import {
  ensureAdminStrategicPlan,
  fetchIndicatorHistory,
  fetchStrategicPlanAdminRows,
  fetchStrategicPlanClients,
  type HistoryFilters,
  type IndicatorHistoryRow,
  type StrategicPlanAdminFilters,
  type StrategicPlanAdminRow,
  type StrategicPlanClientOption,
} from './indicadores/strategicPlanAdmin'
import type { IndicatorWizardDraft } from './indicadores/indicatorWizard'

type CatalogTab = 'catalogo' | 'parametros' | 'metas' | 'planos' | 'historico'

const TABS = [
  { key: 'catalogo' as const, label: 'Catálogo de indicadores' },
  { key: 'parametros' as const, label: 'Parâmetros e fórmulas' },
  { key: 'metas' as const, label: 'Metas e realizados' },
  { key: 'planos' as const, label: 'Planos por cliente' },
  { key: 'historico' as const, label: 'Histórico' },
]

const DIRECTION_LABEL: Record<string, string> = { increase: 'Maior é melhor', decrease: 'Menor é melhor' }
const CALCULATION_FILTER_MODE: Record<Exclude<AdminIndicadoresPageCalculationFilter, 'todos'>, string> = {
  manual: 'MANUAL',
  calculado_bloqueado: 'CALCULATED_LOCKED',
  calculado_ajustavel: 'CALCULATED_ADJUSTABLE',
}
type AdminIndicadoresPageCalculationFilter = 'todos' | 'manual' | 'calculado_bloqueado' | 'calculado_ajustavel'
type CatalogQuickFilter = 'todos' | CatalogFilterKey

const QUICK_FILTERS: Array<{ key: CatalogQuickFilter; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'digitaveis', label: 'Digitáveis' },
  { key: 'calculaveis', label: 'Calculáveis' },
  { key: 'com_parametro', label: 'Com parâmetro' },
  { key: 'sem_parametro', label: 'Sem parâmetro' },
  { key: 'padrao_mx', label: 'Padrão MX' },
  { key: 'criados_mx', label: 'Criados pela MX' },
  { key: 'publicados', label: 'Publicados' },
  { key: 'rascunhos', label: 'Em rascunho' },
  { key: 'ocultos_dono', label: 'Ocultos no Dono' },
  { key: 'desabilitados', label: 'Desabilitados' },
  { key: 'arquivados', label: 'Arquivados' },
]

export function AdminIndicadoresPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [rows, setRows] = useState<CatalogIndicator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<CatalogTab>('catalogo')
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('todas')
  const [status, setStatus] = useState('todos')
  const [calculationFilter, setCalculationFilter] = useState<AdminIndicadoresPageCalculationFilter>('todos')
  const [valueTypeFilter, setValueTypeFilter] = useState('todos')
  const [originFilter, setOriginFilter] = useState<'todos' | 'mx_padrao' | 'criado_mx'>('todos')
  const [parameterFilter, setParameterFilter] = useState<'todos' | 'com_parametro' | 'sem_parametro'>('todos')
  const [quickFilter, setQuickFilter] = useState<CatalogQuickFilter>('todos')
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({})
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardInitial, setWizardInitial] = useState<Partial<IndicatorWizardDraft> | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [detail, setDetail] = useState<CatalogIndicator | null>(null)
  const [orderMode, setOrderMode] = useState(false)
  const [orderKeys, setOrderKeys] = useState<string[]>([])
  const [parameters, setParameters] = useState<IndicatorParameter[]>([])
  const [parameterSet, setParameterSet] = useState<string | null>(null)
  const [parameterSetId, setParameterSetId] = useState<string | null>(null)
  const [parameterError, setParameterError] = useState<string | null>(null)
  const [formulaIndicators, setFormulaIndicators] = useState<FormulaAwareIndicator[]>([])
  const [parameterSearch, setParameterSearch] = useState('')
  const [testerOpen, setTesterOpen] = useState(false)
  const [parameterModal, setParameterModal] = useState<{ indicator: CatalogIndicator; parameter: IndicatorParameter | null } | null>(null)
  const [parameterPickerOpen, setParameterPickerOpen] = useState(false)
  const [dependentsFor, setDependentsFor] = useState<{ indicator: CatalogIndicator; rows: Array<{ metric_key: string; label: string }> } | null>(null)
  const [planRows, setPlanRows] = useState<StrategicPlanAdminRow[]>([])
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planFilters, setPlanFilters] = useState<StrategicPlanAdminFilters>({ search: '', year: 'todos', status: 'todos' })
  const [planClients, setPlanClients] = useState<StrategicPlanClientOption[]>([])
  const [planClientsLoading, setPlanClientsLoading] = useState(false)
  const [createPlanOpen, setCreatePlanOpen] = useState(false)
  const [previewPlan, setPreviewPlan] = useState<StrategicPlanAdminRow | null>(null)
  const [historyRows, setHistoryRows] = useState<IndicatorHistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({ search: '', category: 'todas' })

  const refetch = useCallback(async () => {
    setLoading(true)
    const result = await fetchCatalogIndicators()
    setRows(result.rows)
    setError(result.error)
    setOrderKeys(result.rows.map(item => item.metric_key))
    setLoading(false)
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  useEffect(() => {
    let active = true
    void fetchIndicatorParameters().then(result => {
      if (!active) return
      setParameterError(result.error)
      if (!result.error) setParameters(result.rows)
    })
    return () => { active = false }
  }, [])

  const loadPlans = useCallback(async () => {
    setPlanLoading(true)
    const result = await fetchStrategicPlanAdminRows()
    setPlanRows(result.rows)
    setPlanError(result.error)
    setPlanLoading(false)
  }, [])

  const loadPlanClients = useCallback(async () => {
    setPlanClientsLoading(true)
    const result = await fetchStrategicPlanClients()
    setPlanClients(result.rows)
    if (result.error) toast.error(result.error)
    setPlanClientsLoading(false)
  }, [])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    const result = await fetchIndicatorHistory({ limit: 500 })
    setHistoryRows(result.rows)
    setHistoryError(result.error)
    setHistoryLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'planos') {
      void loadPlans()
      if (planClients.length === 0) void loadPlanClients()
    }
    if (tab === 'historico' && historyRows.length === 0) void loadHistory()
  }, [historyRows.length, loadHistory, loadPlanClients, loadPlans, planClients.length, tab])

  useEffect(() => {
    if (tab !== 'parametros' || parameterSetId !== null) return
    void (async () => {
      const [parameterResult, setResult] = await Promise.all([
        fetchIndicatorParameters(),
        fetchActiveParameterSet(),
      ])
      setParameters(parameterResult.rows)
      setParameterSet(parameterResult.setName)
      setParameterSetId(setResult.set?.id ?? null)
      const formulas = await fetchFormulaIndicators()
      setFormulaIndicators(formulas.rows)
      setParameterError(parameterResult.error || setResult.error || formulas.error)
    })()
  }, [tab, parameterSetId])

  const areas = useMemo(() => [...new Set(rows.map(item => item.area).filter(Boolean))].sort(), [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(item => {
      if (quickFilter !== 'todos' && !indicatorMatchesFilter(item, quickFilter)) return false
      if (area !== 'todas' && item.area !== area) return false
      if (status !== 'todos' && item.status !== status) return false
      if (calculationFilter !== 'todos' && indicatorCalculationMode(item) !== CALCULATION_FILTER_MODE[calculationFilter]) return false
      if (valueTypeFilter !== 'todos' && item.value_type !== valueTypeFilter) return false
      if (originFilter !== 'todos' && item.created_origin !== originFilter) return false
      if (parameterFilter !== 'todos' && indicatorHasParameter(item) !== (parameterFilter === 'com_parametro')) return false
      if (!term) return true
      return [item.label, item.metric_key, item.area].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [area, calculationFilter, originFilter, parameterFilter, quickFilter, rows, search, status, valueTypeFilter])

  const ordered = useMemo(() => {
    if (!orderMode) return filtered
    const byKey = new Map(rows.map(item => [item.metric_key, item]))
    return orderKeys.map(key => byKey.get(key)).filter((item): item is CatalogIndicator => Boolean(item))
  }, [orderMode, orderKeys, rows, filtered])

  const metrics = useMemo(() => ({
    total: rows.length,
    digitaveis: rows.filter(item => indicatorMatchesFilter(item, 'digitaveis')).length,
    calculaveis: rows.filter(item => indicatorMatchesFilter(item, 'calculaveis')).length,
    parameterized: rows.filter(item => indicatorMatchesFilter(item, 'com_parametro')).length,
    parameterCount: parameterError ? '—' : parameters.length,
    archived: rows.filter(item => indicatorMatchesFilter(item, 'arquivados')).length,
  }), [parameterError, parameters.length, rows])

  const grouped = useMemo(() => {
    const groups = new Map<string, CatalogIndicator[]>()
    for (const item of (orderMode ? ordered : filtered)) {
      const key = item.area || 'Sem área'
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    return [...groups.entries()].map(([areaName, items]) => ({ areaName, items }))
  }, [filtered, orderMode, ordered])

  const clearCatalogFilters = () => {
    setSearch('')
    setArea('todas')
    setStatus('todos')
    setCalculationFilter('todos')
    setValueTypeFilter('todos')
    setOriginFilter('todos')
    setParameterFilter('todos')
    setQuickFilter('todos')
  }

  const openNew = () => {
    setWizardInitial(undefined)
    setEditing(false)
    setWizardOpen(true)
  }

  const openEdit = (indicator: CatalogIndicator) => {
    setWizardInitial(fromIndicatorToWizard(indicator))
    setEditing(true)
    setWizardOpen(true)
  }

  const submitWizard = async (draft: IndicatorWizardDraft, willPublish: boolean): Promise<boolean> => {
    if (submitting) return false
    setSubmitting(true)
    try {
      const input = toIndicatorInput(draft)
      const result = await saveIndicator({ ...input, active: willPublish || input.active, created_origin: editing ? undefined : 'criado_mx' })
      if (result.error) {
        toast.error(result.error)
        return false
      }
      toast.success(editing ? 'Indicador atualizado.' : willPublish ? 'Indicador publicado.' : 'Indicador salvo como rascunho.')
      setWizardOpen(false)
      await refetch()
      return true
    } finally {
      setSubmitting(false)
    }
  }

  const transition = async (next: IndicatorStatus) => {
    if (!detail || submitting) return
    setSubmitting(true)
    try {
      const result = await changeIndicatorStatus(detail.metric_key, next)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Indicador: ${INDICATOR_STATUS_LABEL[next].toLowerCase()}.`)
      setDetail(null)
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const updateOwnerVisibility = async (metricKey: string, visible: boolean) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await toggleOwnerVisibility(metricKey, visible)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setDetail(current => current?.metric_key === metricKey ? { ...current, visivel_dono: visible } : current)
      toast.success(visible ? 'Indicador visível no Módulo Dono.' : 'Indicador ocultado no Módulo Dono.')
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const toggleVisibility = async (visible: boolean) => {
    if (!detail) return
    await updateOwnerVisibility(detail.metric_key, visible)
  }

  const openIndicatorHistory = (indicator: CatalogIndicator) => {
    setHistoryFilters({ search: indicator.metric_key, category: 'indicador' })
    setTab('historico')
  }

  const openTargetsTab = () => {
    setDetail(null)
    setTab('metas')
  }

  const openCreatePlan = () => {
    setCreatePlanOpen(true)
    if (planClients.length === 0) void loadPlanClients()
  }

  const openStrategicPlan = (row: StrategicPlanAdminRow) => {
    if (!row.primaryStoreId) {
      toast.error('Este cliente ainda não possui uma loja matriz selecionada para abrir o plano.')
      return
    }
    const params = new URLSearchParams({ storeId: row.primaryStoreId, year: String(row.year) })
    navigate(`/plano-estrategico?${params.toString()}`)
  }

  const createStrategicPlan = async (input: { clientId: string; year: number }) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await ensureAdminStrategicPlan(input)
      if (result.error || !result.cycle) {
        toast.error(result.error ?? 'Não foi possível criar o plano estratégico.')
        return
      }
      if (result.packageWarning) toast.error(`Plano criado sem pacote vinculado: ${result.packageWarning}`)
      else toast.success(result.created ? 'Plano estratégico criado.' : 'Plano estratégico já existia; ciclo aberto.')
      setCreatePlanOpen(false)
      await loadPlans()
      const client = planClients.find(item => item.id === input.clientId)
      if (client?.primaryStoreId) openStrategicPlan({
        cycleId: result.cycle.id,
        clientId: input.clientId,
        clientName: client.name,
        clientStatus: client.status,
        primaryStoreId: client.primaryStoreId,
        year: input.year,
        versionNumber: result.cycle.version_number,
        status: result.cycle.status,
        indicatorCount: 0,
        unitCount: 0,
        responsibleName: 'Não atribuído',
        packageName: result.packageName,
        publishedAt: result.cycle.published_at,
        updatedAt: result.cycle.created_at,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const move = (metricKey: string, direction: 'up' | 'down') => {
    setOrderKeys(current => reorderIndicators(current, metricKey, direction).map(item => item.metric_key))
  }

  const saveOrder = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await persistIndicatorOrder(orderKeys.map((key, index) => ({ metric_key: key, sort_order: (index + 1) * 10 })))
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Ordem oficial salva.')
      setOrderMode(false)
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const restoreDefault = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const result = await persistIndicatorOrder(restoreDefaultOrder(rows))
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Ordem padrão MX restaurada.')
      await refetch()
    } finally {
      setSubmitting(false)
    }
  }

  const parameterByKey = useMemo(() => new Map(parameters.map(item => [item.metric_key, item])), [parameters])
  const filteredParameterRows = useMemo(() => {
    const term = parameterSearch.trim().toLocaleLowerCase('pt-BR')
    if (!term) return rows
    return rows.filter(item => [item.label, item.metric_key, item.area].some(value => (value ?? '').toLocaleLowerCase('pt-BR').includes(term)))
  }, [parameterSearch, rows])
  const configuredParameterKeys = useMemo(() => new Set(parameters.map(parameter => parameter.metric_key)), [parameters])

  const saveParameter = async (values: {
    target_default: number | null
    market_average: number | null
    best_practice: number | null
    red_threshold: number | null
    yellow_threshold: number | null
    green_threshold: number | null
    notes: string | null
  }) => {
    if (!parameterModal || !parameterSetId) return
    setSubmitting(true)
    try {
      const result = await saveParameterValue({ ...values, parameterSetId, metric_key: parameterModal.indicator.metric_key })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Parâmetros salvos no conjunto ativo.')
      setParameterModal(null)
      const refreshed = await fetchParameterValues(parameterSetId)
      setParameters(refreshed.rows)
      setParameterError(refreshed.error)
    } finally {
      setSubmitting(false)
    }
  }

  const parameterDefaults = useMemo(() => {
    const map: Record<string, number> = {}
    for (const parameter of parameters) {
      if (parameter.target_default != null) map[parameter.metric_key] = parameter.target_default
    }
    return map
  }, [parameters])

  const indicatorTargets = useMemo(() => rows.map(item => ({
    code: item.metric_key,
    name: item.label,
    department: item.area,
    calculado: indicatorIsCalculated(item),
    value_type: item.value_type,
    casas_decimais: item.casas_decimais,
  })), [rows])

  const renderCatalogTable = (items: CatalogIndicator[], areaName: string) => (
    <MxTableSurface aria-label={`Indicadores da área ${areaName}`}>
      <Table className="min-w-[1480px]">
        <TableHeader>
          <TableRow>
            <TableHead>Ordem oficial</TableHead>
            <TableHead>Indicador</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Leitura</TableHead>
            <TableHead>Meta</TableHead>
            <TableHead>Total anual</TableHead>
            <TableHead>Dono</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => {
            const orderIndex = orderKeys.indexOf(item.metric_key)
            const orderLabel = item.status === 'arquivado' ? '999' : String(item.sort_order).padStart(2, '0')
            return (
              <TableRow key={item.metric_key}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="min-w-8 tabular-nums font-semibold text-foreground">{orderLabel}</span>
                    {orderMode ? (
                      <div className="flex gap-1">
                        <Button variant="outline" size="icon" aria-label={`Subir ${item.label}`} disabled={orderIndex <= 0} onClick={() => move(item.metric_key, 'up')}><ArrowUp size={14} /></Button>
                        <Button variant="outline" size="icon" aria-label={`Descer ${item.label}`} disabled={orderIndex < 0 || orderIndex === orderKeys.length - 1} onClick={() => move(item.metric_key, 'down')}><ArrowDown size={14} /></Button>
                      </div>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-semibold text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.metric_key}</div>
                </TableCell>
                <TableCell>{formatIndicatorValueType(item.value_type)}</TableCell>
                <TableCell>{DIRECTION_LABEL[item.direction] ?? item.direction}</TableCell>
                <TableCell>
                  <div>{INDICATOR_CALCULATION_MODE_LABEL[indicatorCalculationMode(item)]}</div>
                  <div className="text-xs text-muted-foreground">{item.targets} meta(s) cadastrada(s)</div>
                </TableCell>
                <TableCell className="tabular-nums">{item.annual_target == null ? '—' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(item.annual_target)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={item.visivel_dono ? 'Visível no Dono' : 'Oculto no Dono'}
                    aria-pressed={item.visivel_dono}
                    onClick={() => void updateOwnerVisibility(item.metric_key, !item.visivel_dono)}
                    disabled={submitting}
                    title={item.visivel_dono ? 'Ocultar no Módulo Dono' : 'Mostrar no Módulo Dono'}
                  >
                    {item.visivel_dono ? <Eye size={14} /> : <EyeOff size={14} />}{item.visivel_dono ? 'Visível' : 'Oculto'}
                  </Button>
                </TableCell>
                <TableCell>{item.created_origin === 'criado_mx' ? 'Criado pela MX' : 'Padrão MX'}</TableCell>
                <TableCell>{INDICATOR_STATUS_LABEL[item.status]}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDetail(item)}>Abrir</Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                    <Button variant="ghost" size="sm" onClick={() => openIndicatorHistory(item)} title={`Abrir histórico de ${item.label}`}><History size={14} />Histórico</Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </MxTableSurface>
  )

  return (
    <MxModulePage id="admin-mx-indicadores" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={Gauge}
          eyebrow="Administração MX"
          title="Indicadores e parâmetros"
          description="Catálogo oficial da consultoria: ciclo de vida, ordem, visibilidade no Módulo Dono e faixas de referência."
          actions={(
            <>
              <Button variant="outline" onClick={() => void (tab === 'planos' ? loadPlans() : tab === 'historico' ? loadHistory() : refetch())}><RefreshCw size={16} />Atualizar</Button>
              {tab === 'catalogo' ? (
                orderMode
                  ? <><Button variant="outline" onClick={() => { setOrderMode(false); setOrderKeys(rows.map(item => item.metric_key)) }}>Cancelar ordem</Button><Button onClick={() => void saveOrder()} disabled={submitting}><Save size={16} />Salvar ordem</Button></>
                  : <><Button variant="outline" onClick={() => setOrderMode(true)}>Editar ordem</Button><Button variant="outline" onClick={() => void restoreDefault()} disabled={submitting}><RotateCcw size={16} />Restaurar padrão MX</Button><Button onClick={openNew}><Plus size={16} />Novo indicador</Button></>
              ) : tab === 'parametros' ? (
                <><Button variant="outline" onClick={() => setTesterOpen(true)}><Calculator size={16} />Testar cálculo</Button><Button onClick={() => setParameterPickerOpen(true)} disabled={!parameterSetId}><Plus size={16} />Criar parâmetro</Button></>
              ) : tab === 'planos' ? (
                <Button onClick={openCreatePlan}><Plus size={16} />Criar Plano Estratégico</Button>
              ) : tab === 'historico' ? (
                <Button variant="outline" onClick={() => void loadHistory()}><FileClock size={16} />Atualizar histórico</Button>
              ) : null}
            </>
          )}
        />

        <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} scrollable />

        {loading ? <MxLoadingState label="Carregando indicadores" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : tab === 'catalogo' ? (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Indicadores" value={metrics.total} detail="No catálogo" icon={Gauge} actionLabel="Ver todos" onAction={clearCatalogFilters} />
              <MxMetricCard title="Digitáveis" value={metrics.digitaveis} detail="Entrada manual" icon={Gauge} tone="info" actionLabel="Filtrar digitáveis" onAction={() => setQuickFilter('digitaveis')} />
              <MxMetricCard title="Calculáveis" value={metrics.calculaveis} detail="Por fórmula" icon={Calculator} tone="violet" actionLabel="Filtrar calculáveis" onAction={() => setQuickFilter('calculaveis')} />
              <MxMetricCard title="Com parâmetro" value={metrics.parameterized} detail="Fórmulas parametrizadas" icon={Calculator} tone="success" actionLabel="Filtrar parâmetros" onAction={() => setQuickFilter('com_parametro')} />
              <MxMetricCard title="Parâmetros globais" value={metrics.parameterCount} detail="Conjunto ativo" icon={Gauge} tone="warning" actionLabel="Abrir parâmetros" onAction={() => setTab('parametros')} />
              <MxMetricCard title="Arquivados" value={metrics.archived} detail="Fora da operação" icon={FileClock} tone="warning" actionLabel="Filtrar arquivados" onAction={() => setQuickFilter('arquivados')} />
            </MxMetricGrid>
            {parameterError ? <MxStatusBanner tone="warning">Parâmetros globais indisponíveis: {parameterError}. Abra a aba “Parâmetros e fórmulas” para tentar novamente.</MxStatusBanner> : null}

            {orderMode ? <MxStatusBanner tone="info">Modo de ordenação: use as setas para reordenar e salve a ordem oficial. Os filtros ficam desativados.</MxStatusBanner> : null}

            {!orderMode ? (
              <MxToolbar>
                <MxInput className="min-w-[240px] flex-1" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome ou código..." aria-label="Buscar por nome ou código" />
                <div className="flex w-full flex-wrap gap-2" role="group" aria-label="Filtros rápidos do catálogo">
                  {QUICK_FILTERS.map(filter => (
                    <Button key={filter.key} variant={quickFilter === filter.key ? 'primary' : 'outline'} size="sm" aria-pressed={quickFilter === filter.key} onClick={() => setQuickFilter(filter.key)}>{filter.label}</Button>
                  ))}
                </div>
                <MxSelect value={area} onChange={event => setArea(event.target.value)} aria-label="Filtrar por área">
                  <option value="todas">Todas as áreas</option>
                  {areas.map(item => <option key={item} value={item}>{item}</option>)}
                </MxSelect>
                <MxSelect value={status} onChange={event => setStatus(event.target.value)} aria-label="Filtrar por status">
                  <option value="todos">Todos os status</option>
                  {INDICATOR_STATUSES.map(item => <option key={item} value={item}>{INDICATOR_STATUS_LABEL[item]}</option>)}
                </MxSelect>
                <MxSelect value={calculationFilter} onChange={event => setCalculationFilter(event.target.value as AdminIndicadoresPageCalculationFilter)} aria-label="Filtrar por cálculo">
                  <option value="todos">Todos os cálculos</option>
                  <option value="manual">{INDICATOR_CALCULATION_MODE_LABEL.MANUAL}</option>
                  <option value="calculado_bloqueado">{INDICATOR_CALCULATION_MODE_LABEL.CALCULATED_LOCKED}</option>
                  <option value="calculado_ajustavel">{INDICATOR_CALCULATION_MODE_LABEL.CALCULATED_ADJUSTABLE}</option>
                </MxSelect>
                <MxSelect value={valueTypeFilter} onChange={event => setValueTypeFilter(event.target.value)} aria-label="Filtrar por tipo de valor">
                  <option value="todos">Todos os tipos</option>
                  {[...new Set(rows.map(item => item.value_type))].sort().map(item => <option key={item} value={item}>{item}</option>)}
                </MxSelect>
                <MxSelect value={originFilter} onChange={event => setOriginFilter(event.target.value as typeof originFilter)} aria-label="Filtrar por origem">
                  <option value="todos">Todas as origens</option>
                  <option value="mx_padrao">Padrão MX</option>
                  <option value="criado_mx">Criados no MX</option>
                </MxSelect>
                <MxSelect value={parameterFilter} onChange={event => setParameterFilter(event.target.value as typeof parameterFilter)} aria-label="Filtrar por parâmetro">
                  <option value="todos">Todos os parâmetros</option>
                  <option value="com_parametro">Com parâmetro</option>
                  <option value="sem_parametro">Sem parâmetro</option>
                </MxSelect>
                {(search || area !== 'todas' || status !== 'todos' || calculationFilter !== 'todos' || valueTypeFilter !== 'todos' || originFilter !== 'todos' || parameterFilter !== 'todos' || quickFilter !== 'todos') ? <Button variant="ghost" size="sm" onClick={clearCatalogFilters}>Limpar filtros</Button> : null}
              </MxToolbar>
            ) : null}

            <MxSectionCard>
              <MxSectionHeader title="Catálogo de indicadores" description={`${(orderMode ? ordered : filtered).length} indicador(es) visível(is) em ${grouped.length} área(s).`} />
              <div className="space-y-4 p-5">
                {(orderMode ? ordered : filtered).length ? grouped.map(group => {
                  const collapsed = collapsedAreas[group.areaName] === true
                  return (
                    <section key={group.areaName} className="overflow-hidden rounded-xl border border-border-subtle bg-surface-alt">
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{group.areaName}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{group.items.length} indicador(es)</p>
                        </div>
                        <Button variant="ghost" size="sm" aria-expanded={!collapsed} onClick={() => setCollapsedAreas(current => ({ ...current, [group.areaName]: !collapsed }))}>
                          <ChevronDown size={16} className={collapsed ? '' : 'rotate-180'} />{collapsed ? 'Expandir' : 'Recolher'}
                        </Button>
                      </div>
                      {!collapsed ? <div className="border-t border-border-subtle bg-white p-3">{renderCatalogTable(group.items, group.areaName)}</div> : null}
                    </section>
                  )
                }) : <MxEmptyState variant="filter" title="Nenhum indicador encontrado" description="Ajuste a busca ou os filtros." />}
              </div>
            </MxSectionCard>
          </>
        ) : tab === 'parametros' ? (
          <>
            <MxSectionCard>
              <MxSectionHeader title="Parâmetros e fórmulas" description={parameterSet ? `Conjunto ativo: ${parameterSet}. Configure valores, dependências e faixas sem alterar o histórico.` : 'Nenhum conjunto de parâmetros ativo.'} />
              <div className="p-5">
                {parameterError ? <MxStatusBanner tone="warning" className="mb-4">{parameterError}</MxStatusBanner> : null}
                <MxToolbar className="mb-4 shadow-none">
                  <MxInput className="min-w-[240px] flex-1" value={parameterSearch} onChange={event => setParameterSearch(event.target.value)} placeholder="Buscar parâmetro ou indicador" aria-label="Buscar parâmetro" />
                  <span className="text-xs text-muted-foreground">{filteredParameterRows.length} indicador(es) · {parameters.length} parâmetro(s) configurado(s)</span>
                </MxToolbar>
                {filteredParameterRows.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[1180px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Indicador</TableHead>
                          <TableHead>Modo</TableHead>
                          <TableHead>Meta padrão</TableHead>
                          <TableHead>Média de mercado</TableHead>
                          <TableHead>Melhor prática</TableHead>
                          <TableHead>Vermelho</TableHead>
                          <TableHead>Amarelo</TableHead>
                          <TableHead>Verde</TableHead>
                          <TableHead>Consistência</TableHead>
                          <TableHead>Dependentes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredParameterRows.map(item => {
                          const parameter = parameterByKey.get(item.metric_key) as IndicatorParameter | undefined
                          const problem = parameter ? validateThresholds(parameter, item.direction) : null
                          const dependents = dependentsOfParameter(formulaIndicators, item.metric_key)
                          return (
                            <TableRow key={item.metric_key}>
                              <TableCell>
                                <div className="font-semibold text-foreground">{item.label}</div>
                                <div className="text-xs text-muted-foreground">{item.metric_key}</div>
                              </TableCell>
                              <TableCell>{INDICATOR_CALCULATION_MODE_LABEL[indicatorCalculationMode(item)]}</TableCell>
                              <TableCell>{parameter?.target_default ?? '—'}</TableCell>
                              <TableCell>{parameter?.market_average ?? '—'}</TableCell>
                              <TableCell>{parameter?.best_practice ?? '—'}</TableCell>
                              <TableCell>{parameter?.red_threshold ?? '—'}</TableCell>
                              <TableCell>{parameter?.yellow_threshold ?? '—'}</TableCell>
                              <TableCell>{parameter?.green_threshold ?? '—'}</TableCell>
                              <TableCell className="text-xs">{parameter ? (problem ?? 'OK') : '—'}</TableCell>
                              <TableCell className="tabular-nums">{dependents.length}</TableCell>
                              <TableCell>{parameter ? 'Ativo' : 'Não cadastrado'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" size="sm" onClick={() => setParameterModal({ indicator: item, parameter: parameter ?? null })}>{parameter ? 'Editar' : 'Criar'}</Button>
                                  <Button variant="ghost" size="sm" onClick={() => setDependentsFor({ indicator: item, rows: dependents })}>Dependentes</Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : <MxEmptyState title="Nenhum indicador encontrado" description="Cadastre indicadores no catálogo ou ajuste a busca para configurar os parâmetros." />}
              </div>
            </MxSectionCard>
            <ClientOverridesSection rows={rows} parameters={parameters} />
          </>
        ) : tab === 'metas' ? (
          <MetasRealizadosTab indicators={indicatorTargets} />
        ) : tab === 'planos' ? (
          planError ? <MxErrorState description={planError} retry={() => void loadPlans()} /> : <StrategicPlanListPanel
            rows={planRows}
            loading={planLoading}
            filters={planFilters}
            onFiltersChange={setPlanFilters}
            onCreate={openCreatePlan}
            onRefresh={() => void loadPlans()}
            onOpen={openStrategicPlan}
            onPreview={setPreviewPlan}
          />
        ) : (
          <IndicatorHistoryPanel
            rows={historyRows}
            loading={historyLoading}
            error={historyError}
            filters={historyFilters}
            onFiltersChange={setHistoryFilters}
            onRefresh={() => void loadHistory()}
          />
        )}

        <CreateIndicatorWizard
          open={wizardOpen}
          areas={areas}
          initial={wizardInitial}
          editing={editing}
          submitting={submitting}
          onSave={(draft, willPublish) => submitWizard(draft, willPublish)}
          onClose={() => setWizardOpen(false)}
        />
        <FormulaTesterModal
          open={testerOpen}
          indicators={formulaIndicators}
          parameterDefaults={parameterDefaults}
          onClose={() => setTesterOpen(false)}
        />
        {parameterModal ? (
          <ParameterFormModal
            open
            indicator={parameterModal.indicator}
            parameter={parameterModal.parameter}
            submitting={submitting}
            onSave={values => void saveParameter(values)}
            onClose={() => setParameterModal(null)}
          />
        ) : null}
        <ParameterPickerModal
          open={parameterPickerOpen}
          indicators={rows}
          configuredKeys={configuredParameterKeys}
          onSelect={indicator => { setParameterPickerOpen(false); setParameterModal({ indicator, parameter: parameterByKey.get(indicator.metric_key) ?? null }) }}
          onClose={() => setParameterPickerOpen(false)}
        />
        <Modal open={Boolean(dependentsFor)} onClose={() => setDependentsFor(null)} title={dependentsFor ? `Dependentes · ${dependentsFor.indicator.label}` : 'Dependentes'} size="md" footer={<Button variant="outline" onClick={() => setDependentsFor(null)}>Fechar</Button>}>
          {dependentsFor ? <div className="mt-5 space-y-3">
            <MxStatusBanner tone="info">Indicadores que declaram este código de parâmetro na fórmula. A alteração do parâmetro impacta esses cálculos.</MxStatusBanner>
            {dependentsFor.rows.length ? <ul className="space-y-2">{dependentsFor.rows.map(item => <li key={item.metric_key} className="rounded-xl border border-border p-3"><div className="font-semibold text-foreground">{item.label}</div><div className="text-xs text-muted-foreground">{item.metric_key}</div></li>)}</ul> : <MxEmptyState variant="dataset" title="Nenhum dependente encontrado" description="Este parâmetro não está referenciado pelas fórmulas carregadas." />}
          </div> : null}
        </Modal>
        <StrategicPlanCreateModal
          open={createPlanOpen}
          clients={planClients}
          loadingClients={planClientsLoading}
          submitting={submitting}
          onCreate={input => void createStrategicPlan(input)}
          onClose={() => setCreatePlanOpen(false)}
        />
        <StrategicPlanPreviewModal row={previewPlan} onClose={() => setPreviewPlan(null)} onOpen={row => { setPreviewPlan(null); openStrategicPlan(row) }} />
        <IndicatorDetailDrawer
          indicator={detail}
          busy={submitting}
          onTransition={next => void transition(next)}
          onToggleVisibility={visible => void toggleVisibility(visible)}
          onEdit={() => { if (detail) { openEdit(detail); setDetail(null) } }}
          onOpenTargets={openTargetsTab}
          onOpenFullHistory={() => { if (detail) { openIndicatorHistory(detail); setDetail(null) } }}
          onClose={() => setDetail(null)}
        />
      </div>
    </MxModulePage>
  )
}

export default AdminIndicadoresPage

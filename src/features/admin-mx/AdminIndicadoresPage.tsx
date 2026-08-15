import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Calculator, Gauge, Plus, RefreshCw, RotateCcw, Save } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import { TabNav } from '@/components/molecules/TabNav'
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
import { ClientOverridesSection } from './components/ClientOverridesSection'
import { MetasRealizadosTab } from './components/MetasRealizadosTab'
import { IndicatorDetailDrawer } from './indicadores/IndicatorDetailDrawer'
import {
  INDICATOR_STATUSES,
  INDICATOR_STATUS_LABEL,
  changeIndicatorStatus,
  fetchCatalogIndicators,
  fetchIndicatorParameters,
  isUsableIndicator,
  persistIndicatorOrder,
  reorderIndicators,
  restoreDefaultOrder,
  toggleOwnerVisibility,
  validateThresholds,
  type CatalogIndicator,
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
import type { IndicatorWizardDraft } from './indicadores/indicatorWizard'

type CatalogTab = 'catalogo' | 'parametros' | 'metas'

const TABS = [
  { key: 'catalogo' as const, label: 'Catálogo de indicadores' },
  { key: 'parametros' as const, label: 'Parâmetros e faixas' },
  { key: 'metas' as const, label: 'Metas e realizados' },
]

const DIRECTION_LABEL: Record<string, string> = { increase: 'Maior é melhor', decrease: 'Menor é melhor' }

export function AdminIndicadoresPage() {
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)
  const [rows, setRows] = useState<CatalogIndicator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<CatalogTab>('catalogo')
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('todas')
  const [status, setStatus] = useState('todos')
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
  const [formulaIndicators, setFormulaIndicators] = useState<FormulaAwareIndicator[]>([])
  const [testerOpen, setTesterOpen] = useState(false)
  const [parameterModal, setParameterModal] = useState<{ indicator: CatalogIndicator; parameter: IndicatorParameter | null } | null>(null)

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
    })()
  }, [tab, parameterSetId])

  const areas = useMemo(() => [...new Set(rows.map(item => item.area).filter(Boolean))].sort(), [rows])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return rows.filter(item => {
      if (area !== 'todas' && item.area !== area) return false
      if (status !== 'todos' && item.status !== status) return false
      if (!term) return true
      return [item.label, item.metric_key, item.area].some(value => (value ?? '').toLowerCase().includes(term))
    })
  }, [rows, search, area, status])

  const ordered = useMemo(() => {
    if (!orderMode) return filtered
    const byKey = new Map(rows.map(item => [item.metric_key, item]))
    return orderKeys.map(key => byKey.get(key)).filter((item): item is CatalogIndicator => Boolean(item))
  }, [orderMode, orderKeys, rows, filtered])

  const metrics = useMemo(() => ({
    total: rows.length,
    publicados: rows.filter(item => isUsableIndicator(item)).length,
    areas: areas.length,
    noDono: rows.filter(item => item.visivel_dono).length,
  }), [rows, areas])

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

  const submitWizard = async (draft: IndicatorWizardDraft, willPublish: boolean) => {
    if (submitting) return
    setSubmitting(true)
    try {
      const input = toIndicatorInput(draft)
      const result = await saveIndicator({ ...input, active: willPublish || input.active })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(editing ? 'Indicador atualizado.' : willPublish ? 'Indicador publicado.' : 'Indicador salvo como rascunho.')
      setWizardOpen(false)
      await refetch()
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

  const toggleVisibility = async (visible: boolean) => {
    if (!detail || submitting) return
    setSubmitting(true)
    try {
      const result = await toggleOwnerVisibility(detail.metric_key, visible)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setDetail({ ...detail, visivel_dono: visible })
      await refetch()
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
    calculado: Boolean(item.formula_expression) && item.target_calculation_mode !== 'MANUAL',
  })), [rows])

  return (
    <MxModulePage id="admin-mx-indicadores" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          eyebrow="Administração MX"
          title="Indicadores e parâmetros"
          description="Catálogo oficial da consultoria: ciclo de vida, ordem, visibilidade no Módulo Dono e faixas de referência."
          actions={(
            <>
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
              {tab === 'catalogo' ? (
                orderMode
                  ? <><Button variant="outline" onClick={() => { setOrderMode(false); setOrderKeys(rows.map(item => item.metric_key)) }}>Cancelar ordem</Button><Button onClick={() => void saveOrder()} disabled={submitting}><Save size={16} />Salvar ordem</Button></>
                  : <><Button variant="outline" onClick={() => setOrderMode(true)}>Editar ordem</Button><Button variant="outline" onClick={() => void restoreDefault()} disabled={submitting}><RotateCcw size={16} />Restaurar padrão MX</Button><Button onClick={openNew}><Plus size={16} />Novo indicador</Button></>
              ) : tab === 'parametros' ? (
                <Button variant="outline" onClick={() => setTesterOpen(true)}><Calculator size={16} />Testar cálculo</Button>
              ) : null}
            </>
          )}
        />

        <TabNav tabs={TABS} activeTab={tab} onTabChange={setTab} />

        {loading ? <MxLoadingState label="Carregando indicadores" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : tab === 'catalogo' ? (
          <>
            <MxMetricGrid>
              <MxMetricCard title="Indicadores" value={metrics.total} detail="No catálogo" icon={Gauge} />
              <MxMetricCard title="Publicados" value={metrics.publicados} detail="Disponíveis para uso" icon={Gauge} tone="success" />
              <MxMetricCard title="Áreas" value={metrics.areas} detail="Agrupamentos" icon={Gauge} tone="info" />
              <MxMetricCard title="No Módulo Dono" value={metrics.noDono} detail="Visíveis para o cliente" icon={Gauge} tone="violet" />
            </MxMetricGrid>

            {orderMode ? <MxStatusBanner tone="info">Modo de ordenação: use as setas para reordenar e salve a ordem oficial. Os filtros ficam desativados.</MxStatusBanner> : null}

            {!orderMode ? (
              <MxToolbar>
                <MxInput value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar indicador" aria-label="Buscar indicador" />
                <MxSelect value={area} onChange={event => setArea(event.target.value)} aria-label="Filtrar por área">
                  <option value="todas">Todas as áreas</option>
                  {areas.map(item => <option key={item} value={item}>{item}</option>)}
                </MxSelect>
                <MxSelect value={status} onChange={event => setStatus(event.target.value)} aria-label="Filtrar por status">
                  <option value="todos">Todos os status</option>
                  {INDICATOR_STATUSES.map(item => <option key={item} value={item}>{INDICATOR_STATUS_LABEL[item]}</option>)}
                </MxSelect>
              </MxToolbar>
            ) : null}

            <MxSectionCard>
              <MxSectionHeader title="Catálogo de indicadores" description={`${ordered.length} indicador(es) visível(is).`} />
              <div className="p-5">
                {ordered.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[980px]">
                      <TableHeader>
                        <TableRow>
                          {orderMode ? <TableHead>Ordem</TableHead> : null}
                          <TableHead>Indicador</TableHead>
                          <TableHead>Área</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Leitura</TableHead>
                          <TableHead>Metas</TableHead>
                          <TableHead>Dono</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ordered.map((item, index) => (
                          <TableRow key={item.metric_key}>
                            {orderMode ? (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="outline" size="sm" aria-label={`Subir ${item.label}`} disabled={index === 0} onClick={() => move(item.metric_key, 'up')}><ArrowUp size={14} /></Button>
                                  <Button variant="outline" size="sm" aria-label={`Descer ${item.label}`} disabled={index === ordered.length - 1} onClick={() => move(item.metric_key, 'down')}><ArrowDown size={14} /></Button>
                                </div>
                              </TableCell>
                            ) : null}
                            <TableCell>
                              <div className="font-semibold text-foreground">{item.label}</div>
                              <div className="text-xs text-muted-foreground">{item.metric_key}</div>
                            </TableCell>
                            <TableCell>{item.area}</TableCell>
                            <TableCell>{item.value_type}</TableCell>
                            <TableCell>{DIRECTION_LABEL[item.direction] ?? item.direction}</TableCell>
                            <TableCell>{item.targets}</TableCell>
                            <TableCell>{item.visivel_dono ? 'Sim' : '—'}</TableCell>
                            <TableCell>{INDICATOR_STATUS_LABEL[item.status]}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setDetail(item)}>Abrir</Button>
                                <Button variant="outline" size="sm" onClick={() => openEdit(item)}>Editar</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : <MxEmptyState variant="filter" title="Nenhum indicador encontrado" description="Ajuste a busca ou os filtros." />}
              </div>
            </MxSectionCard>
          </>
        ) : tab === 'parametros' ? (
          <>
            <MxSectionCard>
              <MxSectionHeader title="Parâmetros e faixas" description={parameterSet ? `Conjunto ativo: ${parameterSet}.` : 'Nenhum conjunto de parâmetros ativo.'} />
              <div className="p-5">
                {parameters.length ? (
                  <MxTableSurface>
                    <Table className="min-w-[900px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Indicador</TableHead>
                          <TableHead>Meta padrão</TableHead>
                          <TableHead>Média de mercado</TableHead>
                          <TableHead>Melhor prática</TableHead>
                          <TableHead>Vermelho</TableHead>
                          <TableHead>Amarelo</TableHead>
                          <TableHead>Verde</TableHead>
                          <TableHead>Consistência</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map(item => {
                          const parameter = parameterByKey.get(item.metric_key) as IndicatorParameter | undefined
                          const problem = parameter ? validateThresholds(parameter, item.direction) : null
                          return (
                            <TableRow key={item.metric_key}>
                              <TableCell>
                                <div className="font-semibold text-foreground">{item.label}</div>
                                <div className="text-xs text-muted-foreground">{item.metric_key}</div>
                              </TableCell>
                              <TableCell>{parameter?.target_default ?? '—'}</TableCell>
                              <TableCell>{parameter?.market_average ?? '—'}</TableCell>
                              <TableCell>{parameter?.best_practice ?? '—'}</TableCell>
                              <TableCell>{parameter?.red_threshold ?? '—'}</TableCell>
                              <TableCell>{parameter?.yellow_threshold ?? '—'}</TableCell>
                              <TableCell>{parameter?.green_threshold ?? '—'}</TableCell>
                              <TableCell className="text-xs">{parameter ? (problem ?? 'OK') : '—'}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => setParameterModal({ indicator: item, parameter: parameter ?? null })}>
                                  {parameter ? 'Editar' : 'Criar'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </MxTableSurface>
                ) : <MxEmptyState title="Catálogo vazio" description="Cadastre indicadores no catálogo para configurar os parâmetros." />}
              </div>
            </MxSectionCard>
            <ClientOverridesSection rows={rows} parameters={parameters} />
          </>
        ) : (
          <MetasRealizadosTab indicators={indicatorTargets} />
        )}

        <CreateIndicatorWizard
          open={wizardOpen}
          areas={areas}
          initial={wizardInitial}
          submitting={submitting}
          onSave={(draft, willPublish) => void submitWizard(draft, willPublish)}
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
        <IndicatorDetailDrawer
          indicator={detail}
          busy={submitting}
          onTransition={next => void transition(next)}
          onToggleVisibility={visible => void toggleVisibility(visible)}
          onEdit={() => { if (detail) { openEdit(detail); setDetail(null) } }}
          onClose={() => setDetail(null)}
        />
      </div>
    </MxModulePage>
  )
}

export default AdminIndicadoresPage

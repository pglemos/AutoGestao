import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Layers3,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
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
import { TabNav, type TabNavItem } from '@/components/molecules/TabNav'
import { MONTHS, MONTH_LABELS, formatDisplay, getFormatConfig } from './indicatorFormulas'
import {
  editorAnnualTotal,
  filterEditorIndicators,
  groupEditorIndicatorsByArea,
  hydrateEditorGrid,
  recalculateEditorGrid,
  readEditorSeries,
  sortEditorIndicators,
  type EditorCellPatch,
  type EditorField,
  type EditorGrid,
  type EditorPlanningRow,
} from './strategicPlanEditor'
import {
  addCycleIndicator,
  fetchCycleHistory,
  fetchStrategicPlanEditorData,
  recalculateAndPersistCycle,
  restoreCycleHistory,
  saveIndicatorField,
  toggleCycleIndicatorVisibility,
  transitionEditorCycle,
  validateEditorCycle,
  type StrategicPlanEditorData,
  type StrategicPlanEditorIndicator,
  type StrategicPlanHistoryRow,
} from './strategicPlanEditorRepository'
import { matchCanonicalIndicator, officialCatalogCode } from './canonicalBase44Catalog'
import { isPlanningFieldEditable } from './metasRealizados'
import { PLAN_CYCLE_STATUS_LABEL, ADMIN_PLAN_CYCLE_STATUS_CODE, type PlanReadiness } from '@/features/strategic-plan/planCycle'
import { consolidateClientPlanning, resolvePolicies, type PlanningValueRow } from '@/features/strategic-plan/clientPlanningConsolidation'
import type { ConsolidationIndicator } from '@/features/strategic-plan/unitConsolidation'
import { UNIT_ENTRY_MODES, UNIT_ROLLUP_METHODS } from '@/features/strategic-plan/unitPolicy'
import { MetasRealizadosTab } from '@/features/admin-mx/components/MetasRealizadosTab'
import { ClientOverridesSection } from '@/features/admin-mx/components/ClientOverridesSection'
import { toast } from '@/lib/toast'

type EditorTab = 'rapido' | 'revisao' | 'realizado' | 'ano_anterior' | 'indicadores' | 'unidades' | 'consolidado' | 'historico'

const CLIENT_EDITOR_TAB_KEYS: EditorTab[] = ['rapido', 'revisao', 'realizado', 'ano_anterior']
const EXTRA_EDITOR_TAB_KEYS: EditorTab[] = ['indicadores', 'unidades', 'consolidado', 'historico']

const EDITOR_TABS: TabNavItem<EditorTab>[] = [
  { key: 'rapido', label: 'Metas', controls: 'rapido-panel' },
  { key: 'revisao', label: 'Revisão Completa', controls: 'revisao-panel' },
  { key: 'realizado', label: 'Realizado', controls: 'realizado-panel' },
  { key: 'ano_anterior', label: 'Ano Anterior', controls: 'ano-anterior-panel' },
  { key: 'indicadores', label: 'Indicadores', controls: 'indicadores-panel' },
  { key: 'unidades', label: 'Unidades', controls: 'unidades-panel' },
  { key: 'consolidado', label: 'Consolidado', controls: 'consolidado-panel' },
  { key: 'historico', label: 'Histórico', controls: 'historico-panel' },
]

const FIELD_OPTIONS: Array<{ value: EditorField; label: string }> = [
  { value: 'meta', label: 'Meta' },
  { value: 'realizado', label: 'Realizado' },
  { value: 'ano_anterior', label: 'Ano Anterior' },
]

function calculatedIndicator(indicator: StrategicPlanEditorIndicator) {
  const canon = matchCanonicalIndicator(indicator.metric_key)
  if (canon) return canon.target_calculation_mode !== 'MANUAL'
  return String(indicator.target_calculation_mode ?? '').toUpperCase().startsWith('CALCULATED')
    || String(indicator.target_calculation_mode ?? '').toLowerCase().startsWith('calculado')
}

function toTargetIndicator(indicator: StrategicPlanEditorIndicator) {
  return {
    code: indicator.metric_key,
    displayCode: officialCatalogCode(indicator.metric_key),
    name: indicator.label,
    department: indicator.area,
    calculado: calculatedIndicator(indicator),
    value_type: indicator.value_type,
    casas_decimais: indicator.casas_decimais,
  }
}

function companyScopedIndicator(indicator: StrategicPlanEditorIndicator) {
  return indicator.unit_entry_mode === 'COMPANY_ONLY' || indicator.unit_entry_mode === 'SHARED_COMPANY_VALUE'
}

function statusVariant(status: string): 'secondary' | 'warning' | 'success' | 'info' | 'outline' {
  if (status === 'publicado') return 'success'
  if (status === 'em_validacao') return 'warning'
  if (status === 'revisado') return 'info'
  if (status === 'rascunho') return 'secondary'
  return 'outline'
}

function readinessTone(readiness: PlanReadiness | null): 'success' | 'warning' | 'danger' | 'neutral' {
  if (!readiness) return 'neutral'
  return readiness.canPublish ? 'success' : readiness.issues.some(issue => issue.severity === 'critico') ? 'danger' : 'warning'
}

function consolidationTone(status: string): 'success' | 'warning' | 'danger' | 'outline' {
  if (status === 'COMPLETO') return 'success'
  if (status === 'PARCIAL') return 'warning'
  if (status === 'INCONSISTENTE' || status === 'ERRO_TECNICO') return 'danger'
  return 'outline'
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function fieldLabel(field: EditorField) {
  return FIELD_OPTIONS.find(option => option.value === field)?.label ?? field
}

function compactHistoryValues(
  values: Array<number | null>,
  indicator: StrategicPlanEditorIndicator | undefined,
) {
  const config = indicator ? getFormatConfig(indicator.value_type, indicator.casas_decimais) : null
  const filled = values
    .map((value, index) => value == null ? null : `${MONTH_LABELS[index]}: ${config ? formatDisplay(value, config) : value}`)
    .filter((value): value is string => Boolean(value))
  return filled.length ? filled.join(' · ') : 'Vazio'
}

function dirtyKey(patch: Pick<EditorCellPatch, 'unitId' | 'indicatorCode' | 'field'>) {
  return `${patch.unitId}|${patch.indicatorCode}|${patch.field}`
}

function parseDirtyKey(key: string): { unitId: string; indicatorCode: string; field: EditorField } | null {
  const [unitId, indicatorCode, field] = key.split('|')
  if (!unitId || !indicatorCode || !['meta', 'realizado', 'ano_anterior'].includes(field)) return null
  return { unitId, indicatorCode, field: field as EditorField }
}

export function AdminStrategicPlanEditor({
  cycleId,
  readOnly = false,
  embedded = false,
  onCycleChange,
}: {
  cycleId: string
  readOnly?: boolean
  embedded?: boolean
  onCycleChange?: (cycleId: string) => void
}) {
  const navigate = useNavigate()
  const [data, setData] = useState<StrategicPlanEditorData | null>(null)
  const [grid, setGrid] = useState<EditorGrid>({})
  const [readiness, setReadiness] = useState<PlanReadiness | null>(null)
  const [historyRows, setHistoryRows] = useState<StrategicPlanHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [tab, setTab] = useState<EditorTab>('rapido')
  const [field, setField] = useState<EditorField>('meta')
  const [unitId, setUnitId] = useState('')
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('todas')
  const [includeHidden, setIncludeHidden] = useState(true)
  const [sortMode, setSortMode] = useState<'ordem' | 'nome'>('ordem')
  const [historySearch, setHistorySearch] = useState('')
  const [historyField, setHistoryField] = useState<'todos' | EditorField>('todos')
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [addIndicatorOpen, setAddIndicatorOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [parametersOpen, setParametersOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [reviewDigitavel, setReviewDigitavel] = useState(true)
  const [reviewCalculado, setReviewCalculado] = useState(true)
  const [reviewSemBase, setReviewSemBase] = useState(true)
  const [collapsedReviewAreas, setCollapsedReviewAreas] = useState<Set<string>>(new Set())
  const [busyIndicator, setBusyIndicator] = useState<string | null>(null)
  const gridRef = useRef(grid)
  const saveQuickRef = useRef<() => Promise<void>>(async () => {})
  useEffect(() => { gridRef.current = grid }, [grid])

  const activeUnits = useMemo(() => data?.units.filter(unit => unit.active) ?? [], [data?.units])
  const allIndicators = useMemo(() => data?.indicators ?? [], [data?.indicators])
  const gridIndicators = useMemo(
    () => sortEditorIndicators(allIndicators.filter(indicator => indicator.enabled), sortMode),
    [allIndicators, sortMode],
  )
  const digitaveisIndicators = useMemo(
    () => gridIndicators.filter(indicator => !calculatedIndicator(indicator)),
    [gridIndicators],
  )
  const calculadosIndicators = useMemo(
    () => gridIndicators.filter(indicator => calculatedIndicator(indicator)),
    [gridIndicators],
  )
  const areas = useMemo(() => [...new Set(allIndicators.map(indicator => indicator.area).filter(Boolean))].sort(), [allIndicators])
  const filteredIndicators = useMemo(
    () => sortEditorIndicators(filterEditorIndicators(allIndicators, { search, area, includeHidden }), sortMode),
    [allIndicators, area, includeHidden, search, sortMode],
  )
  const effectiveReadOnly = readOnly || data?.cycle.status === 'revisado'

  const loadEditorData = useCallback(async () => {
    const result = await fetchStrategicPlanEditorData(cycleId)
    if (result.error || !result.data) {
      setError(result.error ?? 'Não foi possível carregar o ciclo do plano estratégico.')
      setData(null)
      return false
    }
    const next = result.data
    const unitIds = next.units.map(unit => unit.id)
    const indicatorCodes = next.indicators.map(indicator => indicator.metric_key)
    setData(next)
    setGrid(recalculateEditorGrid(
      hydrateEditorGrid(next.values, unitIds, indicatorCodes),
      unitIds,
      next.indicators,
    ))
    setUnitId(current => next.units.some(unit => unit.id === current && unit.active)
      ? current
      : unitIds.find(id => next.units.find(unit => unit.id === id)?.active) ?? unitIds[0] ?? '')
    setDirtyKeys(new Set())
    return true
  }, [cycleId])

  const loadReadiness = useCallback(async (): Promise<PlanReadiness | null> => {
    if (readOnly) return null
    setReadinessLoading(true)
    try {
      const result = await validateEditorCycle(cycleId)
      setReadiness(result.readiness)
      if (result.error) setError(result.error)
      return result.readiness
    } finally {
      setReadinessLoading(false)
    }
  }, [cycleId, readOnly])

  const loadHistory = useCallback(async () => {
    const result = await fetchCycleHistory({ cycleId, limit: 500 })
    setHistoryRows(result.rows)
    setHistoryError(result.error)
  }, [cycleId])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    const loaded = await loadEditorData()
    if (loaded) await loadReadiness()
    if (tab === 'historico') await loadHistory()
    setRefreshing(false)
  }, [loadEditorData, loadHistory, loadReadiness, tab])

  useEffect(() => {
    let active = true
    setLoading(true)
    void (async () => {
      const loaded = await loadEditorData()
      if (!active) return
      if (loaded) await loadReadiness()
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [loadEditorData, loadReadiness])

  useEffect(() => {
    if (tab === 'historico') void loadHistory()
  }, [loadHistory, tab])

  const canEdit = (
    indicator: StrategicPlanEditorIndicator,
    currentField: EditorField,
    targetUnitId = unitId,
  ) => {
    if (!data) return false
    if (effectiveReadOnly) return false
    if (!data.units.some(unit => unit.id === targetUnitId && unit.active)) return false
    if (data.cycle.status === 'publicado' && currentField !== 'realizado') return false
    if (companyScopedIndicator(indicator) && targetUnitId !== data.client.primaryStoreId) return false
    return isPlanningFieldEditable(
      { code: officialCatalogCode(indicator.metric_key), calculado: calculatedIndicator(indicator) },
      currentField,
    )
  }

  const saveChanges = async () => {
    if (effectiveReadOnly) return true
    if (dirtyKeys.size === 0) {
      toast.info('Não há alterações pendentes.')
      return true
    }
    setSaving(true)
    try {
      const latestGrid = gridRef.current
      const saved: Array<{ key: string; code: string; error: string | null; jan: number | null }> = []
      for (const key of dirtyKeys) {
        const parsed = parseDirtyKey(key)
        if (!parsed || !data) continue
        const indicator = allIndicators.find(item => item.metric_key === parsed.indicatorCode)
        if (!indicator || !canEdit(indicator, parsed.field, parsed.unitId)) continue
        const values = readEditorSeries(latestGrid, parsed.unitId, parsed.indicatorCode, parsed.field)
        const result = await saveIndicatorField({
          lojaId: parsed.unitId,
          indicatorCode: parsed.indicatorCode,
          year: data.cycle.year,
          field: parsed.field,
          values,
          note: 'Editor administrativo do Plano Estratégico',
          cicloId: data.cycle.id,
        })
        saved.push({ key, code: parsed.indicatorCode, error: result.error, jan: values[0] ?? null })
        if (result.error) {
          toast.error(result.error)
          return false
        }
      }

      // Persistir derivados oficiais após as digitáveis (prompt #20).
      if (data) {
        const unitIds = data.units.map(unit => unit.id)
        const planningRows: EditorPlanningRow[] = []
        for (const unit of unitIds) {
          for (const indicator of data.indicators) {
            for (const month of MONTHS) {
              const cell = latestGrid[unit]?.[indicator.metric_key]?.[month]
              planningRows.push({
                loja_id: unit,
                indicator_code: indicator.metric_key,
                month,
                meta: cell?.meta ?? null,
                realizado: cell?.realizado ?? null,
                ano_anterior: cell?.ano_anterior ?? null,
              })
            }
          }
        }
        const recalc = await recalculateAndPersistCycle({
          year: data.cycle.year,
          status: data.cycle.status,
          unitIds,
          indicators: data.indicators,
          values: planningRows,
          clientId: data.client.id,
        })
        if (recalc.error) {
          toast.error(recalc.error)
          return false
        }
      }

      setDirtyKeys(new Set())
      toast.success('Rascunho salvo com histórico por campo.')
      await refresh()
      return true
    } finally {
      setSaving(false)
    }
  }

  const updateCycle = (nextCycle: NonNullable<StrategicPlanEditorData>['cycle']) => {
    setData(current => current ? { ...current, cycle: nextCycle } : current)
  }

  const editorTabs = EDITOR_TABS

  useEffect(() => {
    if (![...CLIENT_EDITOR_TAB_KEYS, ...EXTRA_EDITOR_TAB_KEYS].includes(tab)) setTab('rapido')
  }, [tab])

  const validatePlan = async () => {
    if (dirtyKeys.size > 0) {
      toast.error('Há alterações não salvas. Salve o rascunho antes de validar — validar não grava o cadastro.')
      return
    }
    const next = await loadReadiness()
    if (!data || effectiveReadOnly) return
    if (data.cycle.status !== 'rascunho') {
      toast.success(next?.canPublish ? 'Validação ok. O plano pode ser publicado.' : 'Validação concluída. Há pendências que impedem a publicação.')
      return
    }
    setSaving(true)
    const result = await transitionEditorCycle({ cycle: data.cycle, to: 'em_validacao' })
    if (result.error || !result.cycle) toast.error(result.error ?? 'Não foi possível validar o plano.')
    else {
      updateCycle(result.cycle)
      toast.success(next?.canPublish
        ? 'Plano validado. Pronto para publicar.'
        : 'Validação concluída. Há pendências que impedem a publicação.')
      await loadReadiness()
    }
    setSaving(false)
  }

  const reviewCalculations = async () => {
    if (!data) return
    setSaving(true)
    const recalc = await recalculateAndPersistCycle({
      year: data.cycle.year,
      status: data.cycle.status,
      unitIds: activeUnits.map(unit => unit.id),
      indicators: data.indicators,
      values: data.values,
      clientId: data.client.id,
    })
    if (recalc.error) toast.error(recalc.error)
    else toast.success('Cálculos atualizados na Revisão Completa.')
    await refresh()
    setTab('revisao')
    setSaving(false)
  }

  const publish = async () => {
    if (!data || effectiveReadOnly) return
    const nextReadiness = await loadReadiness()
    if (!nextReadiness?.canPublish) {
      toast.error('Há pendências que impedem a publicação. Revise a lista de validação.')
      return
    }
    setSaving(true)
    const result = await transitionEditorCycle({ cycle: data.cycle, to: 'publicado' })
    if (result.error || !result.cycle) toast.error(result.error ?? 'Não foi possível publicar o plano.')
    else {
      updateCycle(result.cycle)
      toast.success('Plano estratégico publicado.')
      await loadReadiness()
      if (embedded) onCycleChange?.(result.cycle.id)
    }
    setSaving(false)
  }

  const revise = async () => {
    if (!data || effectiveReadOnly) return
    setSaving(true)
    const result = await transitionEditorCycle({ cycle: data.cycle, to: 'revisado' })
    if (result.error || !result.cycle) toast.error(result.error ?? 'Não foi possível abrir uma revisão.')
    else {
      toast.success('Revisão aberta em um novo ciclo.')
      if (embedded) onCycleChange?.(result.cycle.id)
      else navigate(`/plano-estrategico?cycleId=${encodeURIComponent(result.cycle.id)}`)
    }
    setSaving(false)
  }

  const toggleVisibility = async (indicator: StrategicPlanEditorIndicator) => {
    if (effectiveReadOnly || data?.cycle.status === 'publicado') return
    setBusyIndicator(indicator.metric_key)
    const result = await toggleCycleIndicatorVisibility(cycleId, indicator.metric_key, !indicator.visible_to_owner)
    if (result.error) toast.error(result.error)
    else {
      toast.success(indicator.visible_to_owner ? 'Indicador ocultado no Dono.' : 'Indicador visível no Dono.')
      await loadEditorData()
    }
    setBusyIndicator(null)
  }

  const addIndicator = async (metricKey: string) => {
    if (effectiveReadOnly) return
    setBusyIndicator(metricKey)
    const result = await addCycleIndicator(cycleId, metricKey)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Indicador adicionado ao roster deste ciclo.')
      setAddIndicatorOpen(false)
      setAddSearch('')
      await loadEditorData()
    }
    setBusyIndicator(null)
  }

  const restoreHistory = async (row: StrategicPlanHistoryRow) => {
    if (effectiveReadOnly) return
    if (data?.cycle.status === 'publicado' && row.field !== 'realizado') {
      toast.error('Metas e ano anterior de um plano publicado só podem ser restaurados após abrir uma revisão.')
      return
    }
    setBusyIndicator(row.id)
    const result = await restoreCycleHistory({ historyId: row.id, note: `Restauração pelo editor do ciclo ${cycleId}` })
    if (result.error) toast.error(result.error)
    else {
      toast.success(`Versão de ${fieldLabel(row.field)} restaurada.`)
      await refresh()
      await loadHistory()
    }
    setBusyIndicator(null)
  }

  const planningRows = useMemo<PlanningValueRow[]>(() => {
    if (!data) return []
    return data.units.flatMap(unit => gridIndicators.flatMap(indicator => MONTHS.map(month => ({
      loja_id: unit.id,
      indicator_code: indicator.metric_key,
      year: data.cycle.year,
      month,
      meta: grid[unit.id]?.[indicator.metric_key]?.[month]?.meta ?? null,
      realizado: grid[unit.id]?.[indicator.metric_key]?.[month]?.realizado ?? null,
      ano_anterior: grid[unit.id]?.[indicator.metric_key]?.[month]?.ano_anterior ?? null,
    }))))
  }, [data, grid, gridIndicators])

  const consolidated = useMemo(() => {
    if (!data || activeUnits.length < 2 || gridIndicators.length === 0) return null
    const indicators: ConsolidationIndicator[] = gridIndicators.map(indicator => ({
      code: indicator.metric_key,
      formula_expression: indicator.formula_expression,
      global_display_order: indicator.display_order,
    }))
    const defs = Object.fromEntries(gridIndicators.map(indicator => [indicator.metric_key, {
      unit_entry_mode: indicator.unit_entry_mode,
      unit_rollup_method: indicator.unit_rollup_method,
      weight_indicator_code: indicator.weight_indicator_code,
    }]))
    return consolidateClientPlanning({
      rows: planningRows,
      units: data.units,
      indicators,
      policies: resolvePolicies(indicators, defs),
    })
  }, [activeUnits.length, data, gridIndicators, planningRows])

  const filteredHistory = useMemo(() => {
    const term = historySearch.trim().toLocaleLowerCase('pt-BR')
    return historyRows.filter(row => {
      if (historyField !== 'todos' && row.field !== historyField) return false
      if (!term) return true
      return [row.indicatorCode, row.userName, row.note, row.lojaId, row.field]
        .some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
    })
  }, [historyField, historyRows, historySearch])

  const availableIndicators = useMemo(() => {
    const existing = new Set(allIndicators.map(indicator => indicator.metric_key))
    const term = addSearch.trim().toLocaleLowerCase('pt-BR')
    return data?.catalog.filter(indicator => {
      if (existing.has(indicator.metric_key) || indicator.active === false || indicator.status === 'arquivado') return false
      if (!matchCanonicalIndicator(indicator.metric_key)) return false
      if (!term) return true
      return [indicator.metric_key, indicator.label, indicator.area].some(value => String(value ?? '').toLocaleLowerCase('pt-BR').includes(term))
    }).slice(0, 100) ?? []
  }, [addSearch, allIndicators, data?.catalog])

  if (loading) {
    const loadingState = <MxLoadingState label="Carregando editor do Plano Estratégico" />
    return embedded ? loadingState : <MxModulePage id="admin-mx-plano-estrategico-editor" width="dashboard" bottomClearance="navigation">{loadingState}</MxModulePage>
  }
  if (error || !data) {
    const errorState = <MxErrorState description={error ?? 'Ciclo indisponível.'} retry={() => void refresh()} />
    return embedded ? errorState : <MxModulePage id="admin-mx-plano-estrategico-editor" width="dashboard" bottomClearance="navigation">{errorState}</MxModulePage>
  }

  const currentUnit = data.units.find(unit => unit.id === unitId) ?? data.units[0] ?? null
  const ownerStoreId = data.client.primaryStoreId ?? data.units.find(unit => unit.store_type === 'MATRIZ')?.id ?? data.units[0]?.id ?? null
  const cycleStatus = ADMIN_PLAN_CYCLE_STATUS_CODE[data.cycle.status] ?? PLAN_CYCLE_STATUS_LABEL[data.cycle.status] ?? data.cycle.status
  const readinessPercent = readiness && readiness.total > 0 ? Math.round((readiness.ready / readiness.total) * 100) : 0
  const readinessIssues = readiness?.issues.slice(0, 24) ?? []
  const quickField: EditorField = tab === 'realizado' ? 'realizado' : tab === 'ano_anterior' ? 'ano_anterior' : 'meta'
  const showQuickEntry = tab === 'rapido' || tab === 'realizado' || tab === 'ano_anterior'
  const saveDraft = async () => {
    if (showQuickEntry) {
      await saveQuickRef.current()
      return
    }
    await saveChanges()
  }
  const ownerPreviewHref = `/plano-estrategico?storeId=${encodeURIComponent(ownerStoreId ?? '')}&year=${data.cycle.year}&viewAs=dono`

  const editorBody = (
    <>
      {embedded ? null : (
      <MxModuleHeader
        icon={Layers3}
        eyebrow="Administração MX · Plano Estratégico"
        title={`${data.client.name} — ${data.cycle.year}`}
        description="Cadastro Rápido, Revisão Completa, Realizado e Ano Anterior do mesmo ciclo."
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/plano-estrategico')}><ArrowLeft size={16} />Voltar à gestão</Button>
            <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'animate-spin' : undefined} />Atualizar</Button>
          </div>
        )}
      />
      )}

      {readOnly ? <MxStatusBanner tone="info"><Eye size={16} className="mr-2 inline" />Preview somente leitura. As ações de edição, histórico e ciclo estão bloqueadas.</MxStatusBanner> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(data.cycle.status)} title={PLAN_CYCLE_STATUS_LABEL[data.cycle.status]}>{cycleStatus}</Badge>
          {data.cycle.status !== 'publicado' ? (
            <span className="text-sm text-status-error-text">Dono verá estado vazio (não publicado)</span>
          ) : null}
          <span className="text-sm text-muted-foreground">Versão {data.cycle.version_number}</span>
          <span className="text-sm text-muted-foreground">{activeUnits.length} unidade(s) ativa(s)</span>
          <span className="text-sm text-muted-foreground">{gridIndicators.length} indicador(es) no roster</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAddIndicatorOpen(true)} disabled={effectiveReadOnly || !['rascunho', 'em_validacao'].includes(data.cycle.status)}><Plus size={16} />Adicionar Indicador</Button>
          <Button variant="outline" size="sm" onClick={() => void validatePlan()} disabled={readinessLoading || saving}><FileCheck2 size={16} />{readinessLoading ? 'Validando...' : 'Validar'}</Button>
          {!effectiveReadOnly && data.cycle.status !== 'publicado' && data.cycle.status !== 'revisado' ? <Button variant="outline" size="sm" onClick={() => void saveDraft()} disabled={saving || (!showQuickEntry && dirtyKeys.size === 0)}><Save size={16} />Salvar rascunho</Button> : null}
          <Button variant="outline" size="sm" onClick={() => setParametersOpen(true)}><SlidersHorizontal size={16} />Parâmetros do Cliente</Button>
          <Button variant="outline" size="sm" disabled={!ownerStoreId} title={!ownerStoreId ? 'Cliente sem unidade vinculada' : undefined} onClick={() => navigate(ownerPreviewHref)}><Eye size={16} />Visualizar como Dono</Button>
          {!effectiveReadOnly && data.cycle.status !== 'publicado' && data.cycle.status !== 'revisado' ? <Button size="sm" onClick={() => void publish()} disabled={saving || readinessLoading || data.cycle.status !== 'em_validacao' || !readiness?.canPublish}><CheckCircle2 size={16} />Publicar</Button> : null}
          {!effectiveReadOnly && data.cycle.status === 'publicado' ? <Button variant="outline" size="sm" onClick={() => void revise()} disabled={saving}><RotateCcw size={16} />Abrir revisão</Button> : null}
        </div>
      </div>

      {readiness ? <MxStatusBanner tone={readinessTone(readiness)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span><ShieldCheck size={16} className="mr-2 inline" />Prontidão: {readiness.ready}/{readiness.total} indicadores completos ({readinessPercent}%). {readiness.canPublish ? 'O ciclo pode ser publicado.' : `${readiness.pending} pendência(s) bloqueiam a publicação.`}</span>
          {readiness.pending > readinessIssues.length ? <span className="text-xs">Mostrando {readinessIssues.length} de {readiness.pending}</span> : null}
        </div>
        {readinessIssues.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-normal">{readinessIssues.map((issue, index) => {
          const official = issue.indicatorCode ? officialCatalogCode(issue.indicatorCode) : ''
          const message = issue.indicatorCode && official && issue.message.includes(issue.indicatorCode)
            ? issue.message.replaceAll(issue.indicatorCode, official)
            : issue.message
          return <li key={`${issue.type}-${issue.indicatorCode ?? ''}-${issue.unitId ?? ''}-${issue.month ?? ''}-${index}`}>{message}</li>
        })}</ul> : null}
      </MxStatusBanner> : null}

      <TabNav tabs={editorTabs} activeTab={tab} onTabChange={setTab} scrollable />

      {showQuickEntry ? <section id="rapido-panel" role="tabpanel" aria-label="Cadastro Rápido" className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Cadastro Rápido de Metas</h2>
          <p className="text-sm text-muted-foreground">Preencha os {digitaveisIndicators.length} indicadores digitáveis. Os {calculadosIndicators.length} calculados atualizam em tempo real.</p>
        </div>
        <MetasRealizadosTab
          variant="quick"
          activeField={quickField}
          cicloId={data.cycle.id}
          clientId={data.client.id}
          clientName={data.client.name}
          indicators={digitaveisIndicators.map(toTargetIndicator)}
          importIndicators={gridIndicators.map(toTargetIndicator)}
          initialStoreId={unitId}
          initialYear={data.cycle.year}
          stores={data.units.map(unit => ({ id: unit.id, name: unit.name }))}
          onNavigateToParams={() => setParametersOpen(true)}
          onNavigateToHistory={() => { void loadHistory(); setHistoryOpen(true) }}
          onRegisterSave={save => { saveQuickRef.current = save }}
          onSaved={() => {
            void (async () => {
              const loaded = await fetchStrategicPlanEditorData(cycleId)
              if (loaded.data) {
                const unitIds = loaded.data.units.filter(unit => unit.active).map(unit => unit.id)
                const recalc = await recalculateAndPersistCycle({
                  year: loaded.data.cycle.year,
                  status: loaded.data.cycle.status,
                  unitIds,
                  indicators: loaded.data.indicators,
                  values: loaded.data.values,
                  clientId: loaded.data.client.id,
                })
                if (recalc.error) toast.error(recalc.error)
              }
              await refresh()
            })()
          }}
        />
        {!effectiveReadOnly ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => void saveDraft()} disabled={saving || (!showQuickEntry && dirtyKeys.size === 0)}><Save size={16} />Salvar Rascunho</Button>
            <Button variant="outline" onClick={() => void reviewCalculations()} disabled={saving}><Layers3 size={16} />Revisar Cálculos</Button>
            <Button onClick={() => void validatePlan()} disabled={saving || readinessLoading}><CheckCircle2 size={16} />Concluir Cadastro</Button>
          </div>
        ) : null}
      </section> : null}

      {tab === 'revisao' ? <section id="revisao-panel" role="tabpanel" aria-label="Revisão Completa" className="space-y-5">
        <MxSectionCard>
          <MxSectionHeader
            title="Revisão Completa"
            description={`${gridIndicators.length} indicadores na ordem oficial — valores calculados em tempo real`}
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                <MxSelect aria-label="Unidade da revisão" value={unitId} onChange={event => setUnitId(event.target.value)}>
                  {data.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} · {unit.store_type === 'MATRIZ' ? 'Matriz' : 'Filial'}{unit.active ? '' : ' · inativa'}</option>)}
                </MxSelect>
                <Button variant="outline" onClick={() => setCollapsedReviewAreas(new Set())}>Expandir todos</Button>
                <Button variant="outline" onClick={() => setCollapsedReviewAreas(new Set(groupEditorIndicatorsByArea(gridIndicators).map(group => group.area)))}>Recolher todos</Button>
                <Button onClick={() => setTab('rapido')}>Voltar para Cadastro</Button>
              </div>
            )}
          />
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={reviewDigitavel} onChange={event => setReviewDigitavel(event.target.checked)} />Digitável</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={reviewCalculado} onChange={event => setReviewCalculado(event.target.checked)} />Calculado</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={reviewSemBase} onChange={event => setReviewSemBase(event.target.checked)} />Sem base</label>
            </div>
            {!currentUnit ? <MxEmptyState title="Nenhuma unidade encontrada" description="O ciclo precisa de uma matriz e, quando aplicável, filiais ativas para receber valores." icon={Users} /> : (
              <MxTableSurface aria-label={`Revisão mensal da unidade ${currentUnit.name}`}>
                <Table className="min-w-[1420px]">
                  <TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead>Tipo</TableHead>{MONTH_LABELS.map(label => <TableHead key={label} className="text-right">{label}</TableHead>)}<TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {groupEditorIndicatorsByArea(gridIndicators).flatMap(group => {
                      const items = group.items.filter(indicator => {
                        const calculated = calculatedIndicator(indicator)
                        const values = MONTHS.map(month => grid[unitId]?.[indicator.metric_key]?.[month]?.meta ?? null)
                        const semBase = calculated && values.every(value => value == null)
                        if (!calculated) return reviewDigitavel
                        if (semBase) return reviewSemBase
                        return reviewCalculado
                      })
                      if (!items.length) return []
                      const digitaveis = group.items.filter(indicator => !calculatedIndicator(indicator)).length
                      const calculados = group.items.length - digitaveis
                      const collapsed = collapsedReviewAreas.has(group.area)
                      return [
                        <TableRow key={`area-${group.area}`}>
                          <TableCell colSpan={15} className="bg-surface-alt">
                            <button type="button" className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground" onClick={() => setCollapsedReviewAreas(current => {
                              const next = new Set(current)
                              if (next.has(group.area)) next.delete(group.area)
                              else next.add(group.area)
                              return next
                            })}>
                              <span>{group.area}</span>
                              <span className="font-normal normal-case">{group.items.length} indicadores · {digitaveis} digitáveis · {calculados} calculados</span>
                            </button>
                          </TableCell>
                        </TableRow>,
                        ...(collapsed ? [] : items.map(indicator => {
                          const config = getFormatConfig(indicator.value_type, indicator.casas_decimais)
                          const values = readEditorSeries(grid, unitId, indicator.metric_key, 'meta')
                          const calculated = calculatedIndicator(indicator)
                          return <TableRow key={indicator.metric_key}>
                            <TableCell className="sticky left-0 z-[var(--mx-z-sticky)] min-w-[240px] bg-background">
                              <div className="font-semibold text-foreground">{indicator.label}</div>
                              <div className="text-xs text-muted-foreground">{officialCatalogCode(indicator.metric_key)}</div>
                            </TableCell>
                            <TableCell>
                              {calculated ? <Badge variant="outline">Calculado</Badge> : (
                                <Button variant="outline" size="sm" onClick={() => setTab('rapido')}>Editar</Button>
                              )}
                            </TableCell>
                            {MONTHS.map(month => {
                              const value = grid[unitId]?.[indicator.metric_key]?.[month]?.meta ?? null
                              return <TableCell key={month} className="min-w-[92px] text-right tabular-nums text-muted-foreground">{formatDisplay(value, config)}</TableCell>
                            })}
                            <TableCell className="text-right font-semibold tabular-nums">{formatDisplay(editorAnnualTotal(values), config)}</TableCell>
                          </TableRow>
                        })),
                      ]
                    })}
                  </TableBody>
                </Table>
              </MxTableSurface>
            )}
          </div>
        </MxSectionCard>
      </section> : null}

      {tab === 'indicadores' ? <section id="indicadores-panel" role="tabpanel" aria-label="Indicadores" className="space-y-5">
        <MxSectionCard>
          <MxSectionHeader title="Roster de indicadores do ciclo" description="O pacote contratado é congelado por ciclo. A MX pode adicionar um indicador e controlar sua visibilidade no Módulo Dono sem alterar outros clientes." actions={<Button onClick={() => setAddIndicatorOpen(true)} disabled={effectiveReadOnly || !['rascunho', 'em_validacao'].includes(data.cycle.status)}><Plus size={16} />Adicionar indicador</Button>} />
          <div className="space-y-4 p-5">
            <MxToolbar className="shadow-none">
              <MxInput className="min-w-[240px] flex-1" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar indicador, código ou área" aria-label="Buscar indicadores do ciclo" />
              <MxSelect aria-label="Filtrar indicadores por área" value={area} onChange={event => setArea(event.target.value)}><option value="todas">Todas as áreas</option>{areas.map(item => <option key={item} value={item ?? ''}>{item}</option>)}</MxSelect>
              <MxSelect aria-label="Ordenar indicadores" value={sortMode} onChange={event => setSortMode(event.target.value as typeof sortMode)}><option value="ordem">Ordem do plano</option><option value="nome">Nome</option></MxSelect>
              <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={includeHidden} onChange={event => setIncludeHidden(event.target.checked)} />Mostrar ocultos</label>
            </MxToolbar>
            {data.cycle.status === 'publicado' ? <MxStatusBanner tone="info">O roster publicado é imutável. Abra uma revisão para adicionar indicadores ou alterar a visibilidade no Dono.</MxStatusBanner> : null}
            {filteredIndicators.length ? <MxTableSurface aria-label="Roster de indicadores do ciclo"><Table className="min-w-[1180px]"><TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead>Área</TableHead><TableHead>Entrada</TableHead><TableHead>Consolidação</TableHead><TableHead>Origem</TableHead><TableHead>Dono</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{filteredIndicators.map(indicator => <TableRow key={indicator.metric_key}><TableCell><div className="font-semibold">{indicator.label}</div><div className="text-xs text-muted-foreground">{officialCatalogCode(indicator.metric_key)} · ordem {indicator.display_order}</div></TableCell><TableCell>{indicator.area}</TableCell><TableCell>{calculatedIndicator(indicator) ? 'Calculado' : 'Digitável'}</TableCell><TableCell>{indicator.unit_rollup_method ? UNIT_ROLLUP_METHODS[indicator.unit_rollup_method as keyof typeof UNIT_ROLLUP_METHODS]?.short ?? indicator.unit_rollup_method : 'Sem política'}</TableCell><TableCell>{indicator.origin === 'adicionado_mx' ? <Badge variant="info">Adicionado MX</Badge> : <Badge variant="outline">Pacote</Badge>}</TableCell><TableCell><Badge variant={indicator.visible_to_owner ? 'success' : 'secondary'}>{indicator.visible_to_owner ? <><Eye size={14} />Visível</> : <><EyeOff size={14} />Oculto</>}</Badge></TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => void toggleVisibility(indicator)} disabled={effectiveReadOnly || data.cycle.status === 'publicado' || busyIndicator === indicator.metric_key} title={data.cycle.status === 'publicado' ? 'Abra uma revisão para alterar a visibilidade.' : undefined}>{indicator.visible_to_owner ? 'Ocultar no Dono' : 'Mostrar no Dono'}</Button></TableCell></TableRow>)}</TableBody></Table></MxTableSurface> : <MxEmptyState title="Nenhum indicador encontrado" description="Ajuste a busca ou os filtros, ou adicione um indicador ativo do catálogo." variant="filter" />}
          </div>
        </MxSectionCard>
      </section> : null}

      {tab === 'unidades' ? <section id="unidades-panel" role="tabpanel" aria-label="Unidades" className="space-y-5">
        <MxMetricGrid><MxMetricCard title="Unidades ativas" value={activeUnits.length} detail="Entram na validação e no consolidado" icon={Users} /><MxMetricCard title="Matriz" value={data.units.filter(unit => unit.store_type === 'MATRIZ').length} detail="Unidade principal do cliente" icon={Layers3} tone="info" /><MxMetricCard title="Filiais" value={data.units.filter(unit => unit.store_type === 'FILIAL').length} detail="Unidades vinculadas à matriz" icon={Users} tone="violet" /><MxMetricCard title="Células lançadas" value={planningRows.filter(row => row.meta != null || row.realizado != null || row.ano_anterior != null).length} detail="Valores presentes no ciclo" icon={CheckCircle2} tone="success" /></MxMetricGrid>
        <MxSectionCard><MxSectionHeader title="Unidades do cliente" description="Matriz e filiais permanecem distintas; todas as unidades ativas participam da prontidão e da consolidação." /><div className="p-5">{data.units.length ? <MxTableSurface aria-label="Unidades do cliente no plano estratégico"><Table className="min-w-[760px]"><TableHeader><TableRow><TableHead>Unidade</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Células lançadas</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{data.units.map(unit => { const count = planningRows.filter(row => row.loja_id === unit.id && (row.meta != null || row.realizado != null || row.ano_anterior != null)).length; return <TableRow key={unit.id}><TableCell className="font-semibold">{unit.name}</TableCell><TableCell>{unit.store_type === 'MATRIZ' ? 'Matriz' : 'Filial'}</TableCell><TableCell><Badge variant={unit.active ? 'success' : 'secondary'}>{unit.active ? 'Ativa' : 'Inativa'}</Badge></TableCell><TableCell className="tabular-nums">{count}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => { setUnitId(unit.id); setTab('rapido') }}>Abrir metas</Button></TableCell></TableRow>})}</TableBody></Table></MxTableSurface> : <MxEmptyState title="Nenhuma unidade vinculada" description="Cadastre uma matriz no cliente antes de lançar o plano." icon={Users} />}</div></MxSectionCard>
      </section> : null}

      {tab === 'consolidado' ? <section id="consolidado-panel" role="tabpanel" aria-label="Consolidado" className="space-y-5">
        {activeUnits.length < 2 ? <MxStatusBanner tone="info">Este cliente possui uma única unidade ativa. O consolidado só é exibido quando há matriz e filial ativas.</MxStatusBanner> : consolidated ? <MxSectionCard><MxSectionHeader title="Consolidado do cliente" description="Percentuais e médias são recalculados sobre as bases consolidadas; não são somados entre unidades." actions={<MxSelect aria-label="Série do consolidado" value={field} onChange={event => setField(event.target.value as EditorField)}>{FIELD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</MxSelect>} /><div className="p-5"><MxTableSurface aria-label="Consolidado mensal do cliente"><Table className="min-w-[1280px]"><TableHeader><TableRow><TableHead>Indicador</TableHead>{MONTH_LABELS.map(label => <TableHead key={label} className="text-right">{label}</TableHead>)}<TableHead>Política</TableHead></TableRow></TableHeader><TableBody>{gridIndicators.map(indicator => { const series = consolidated[field]; const config = getFormatConfig(indicator.value_type, indicator.casas_decimais); const policy = indicator.unit_rollup_method ? UNIT_ROLLUP_METHODS[indicator.unit_rollup_method as keyof typeof UNIT_ROLLUP_METHODS]?.short ?? indicator.unit_rollup_method : 'Sem política'; return <TableRow key={indicator.metric_key}><TableCell><div className="font-semibold">{indicator.label}</div><div className="text-xs text-muted-foreground">{officialCatalogCode(indicator.metric_key)}</div></TableCell>{MONTHS.map(month => { const value = series.valueMap[indicator.metric_key]?.[month] ?? null; const integrity = series.integrityByMonth[month]?.[indicator.metric_key]; return <TableCell key={month} className="text-right"><div className="tabular-nums">{formatDisplay(value, config)}</div>{integrity ? <Badge variant={consolidationTone(integrity.status)} className="mt-1">{integrity.status}</Badge> : null}</TableCell>})}<TableCell>{policy}{indicator.unit_entry_mode ? <div className="text-xs text-muted-foreground">{UNIT_ENTRY_MODES[indicator.unit_entry_mode as keyof typeof UNIT_ENTRY_MODES]?.short ?? indicator.unit_entry_mode}</div> : null}</TableCell></TableRow>})}</TableBody></Table></MxTableSurface></div></MxSectionCard> : <MxEmptyState title="Consolidado indisponível" description="Não foi possível calcular o consolidado deste ciclo." />}
      </section> : null}

      {tab === 'historico' || historyOpen ? (
      <div className={historyOpen ? 'fixed inset-0 z-[var(--mx-z-overlay)] flex justify-end' : undefined}>
        {historyOpen ? <button type="button" className="h-full flex-1 bg-foreground/30" aria-label="Fechar histórico" onClick={() => setHistoryOpen(false)} /> : null}
      <section id="historico-panel" role={historyOpen ? 'dialog' : 'tabpanel'} aria-modal={historyOpen || undefined} aria-label="Histórico" aria-labelledby={historyOpen ? 'historico-metas-title' : undefined} className={historyOpen ? 'flex h-full w-full max-w-5xl flex-col overflow-y-auto border-l border-border bg-white p-5 shadow-2xl' : 'space-y-5'} data-mx-scroll-region={historyOpen ? 'vertical' : undefined}>
        <MxSectionCard>
          <MxSectionHeader
            title={`Histórico de Importações — Metas ${data.cycle.year}`}
            description="Cada salvamento e importação registra unidade, indicador, campo, valores anteriores e novos."
            actions={(
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => void loadHistory()} disabled={!data || refreshing}><RefreshCw size={16} />Atualizar histórico</Button>
                {historyOpen ? <Button variant="ghost" onClick={() => setHistoryOpen(false)}>Fechar</Button> : null}
              </div>
            )}
          />
          <div className="space-y-4 p-5">
            <MxToolbar className="shadow-none">
              <MxInput
                className="min-w-[260px] flex-1"
                value={historySearch}
                onChange={event => setHistorySearch(event.target.value)}
                placeholder="Buscar unidade, indicador, usuário ou observação"
                aria-label="Buscar no histórico do ciclo"
              />
              <MxSelect aria-label="Filtrar histórico por campo" value={historyField} onChange={event => setHistoryField(event.target.value as typeof historyField)}>
                <option value="todos">Todos os campos</option>
                {FIELD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </MxSelect>
              {(historySearch || historyField !== 'todos') ? <Button variant="ghost" size="sm" onClick={() => { setHistorySearch(''); setHistoryField('todos') }}>Limpar filtros</Button> : null}
            </MxToolbar>
            {historyError ? <MxStatusBanner tone="warning">{historyError}</MxStatusBanner> : null}
            {filteredHistory.length ? <MxTableSurface aria-label="Histórico versionado do ciclo">
              <Table className="min-w-[1460px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Indicador</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Antes</TableHead>
                    <TableHead>Depois</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map(row => {
                    const indicator = allIndicators.find(item => item.metric_key === row.indicatorCode)
                    const unit = data.units.find(item => item.id === row.lojaId)
                    const publishedFieldBlocked = data.cycle.status === 'publicado' && row.field !== 'realizado'
                    const restoreBlocked = effectiveReadOnly || publishedFieldBlocked
                    return <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">{formatDate(row.createdAt)}</TableCell>
                      <TableCell>{row.userName}</TableCell>
                      <TableCell><div className="font-medium">{unit?.name ?? row.lojaId}</div><div className="text-xs text-muted-foreground">{unit?.store_type === 'MATRIZ' ? 'Matriz' : unit?.store_type === 'FILIAL' ? 'Filial' : 'Unidade'}</div></TableCell>
                      <TableCell><div className="font-semibold">{indicator?.label ?? row.indicatorCode}</div><div className="text-xs text-muted-foreground">{row.indicatorCode}</div></TableCell>
                      <TableCell><Badge variant="outline">{fieldLabel(row.field)}</Badge></TableCell>
                      <TableCell className="max-w-xs text-xs tabular-nums text-muted-foreground" title={compactHistoryValues(row.previousValues, indicator)}>{compactHistoryValues(row.previousValues, indicator)}</TableCell>
                      <TableCell className="max-w-xs text-xs tabular-nums" title={compactHistoryValues(row.newValues, indicator)}>{compactHistoryValues(row.newValues, indicator)}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={row.note ?? undefined}>{row.note ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void restoreHistory(row)}
                          disabled={restoreBlocked || busyIndicator === row.id}
                          title={publishedFieldBlocked ? 'Abra uma revisão para restaurar Meta ou Ano anterior.' : effectiveReadOnly ? 'Histórico bloqueado no modo somente leitura.' : 'Restaurar esta versão'}
                        >
                          <RotateCcw size={14} />{publishedFieldBlocked ? 'Bloqueado' : 'Restaurar'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  })}
                </TableBody>
              </Table>
            </MxTableSurface> : <MxEmptyState title="Nenhum evento de valores neste ciclo" description="Salvamentos e restaurações aparecerão aqui com a unidade, o campo e os valores comparados." />}
          </div>
        </MxSectionCard>
      </section>
      </div>
      ) : null}

      <Modal open={addIndicatorOpen} onClose={() => setAddIndicatorOpen(false)} title="Adicionar indicador ao ciclo" description="A inclusão altera somente este roster. O catálogo global e outros clientes permanecem intactos." size="lg" footer={<Button variant="outline" onClick={() => setAddIndicatorOpen(false)}>Fechar</Button>}>
        <div className="space-y-4"><MxInput value={addSearch} onChange={event => setAddSearch(event.target.value)} placeholder="Buscar no catálogo ativo" aria-label="Buscar indicador para adicionar" />{availableIndicators.length ? <MxTableSurface aria-label="Indicadores disponíveis para adicionar"><Table><TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead>Área</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{availableIndicators.map(indicator => <TableRow key={indicator.metric_key}><TableCell><div className="font-semibold">{indicator.label}</div><div className="text-xs text-muted-foreground">{officialCatalogCode(indicator.metric_key)}</div></TableCell><TableCell>{indicator.area}</TableCell><TableCell className="text-right"><Button size="sm" onClick={() => void addIndicator(indicator.metric_key)} disabled={busyIndicator === indicator.metric_key}><Plus size={14} />Adicionar</Button></TableCell></TableRow>)}</TableBody></Table></MxTableSurface> : <MxEmptyState title="Nenhum indicador disponível" description="Todos os indicadores ativos já fazem parte deste ciclo ou não correspondem à busca." variant="filter" />}</div>
      </Modal>
      {parametersOpen ? (
        <div className="fixed inset-0 z-[var(--mx-z-overlay)] flex justify-end">
          <button type="button" className="h-full flex-1 bg-foreground/30" aria-label="Fechar parâmetros" onClick={() => setParametersOpen(false)} />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="parametros-cliente-title"
            className="flex h-full w-full max-w-lg flex-col border-l border-border bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h2 id="parametros-cliente-title" className="text-lg font-semibold text-foreground">Parâmetros do Cliente</h2>
                <p className="text-sm text-muted-foreground">Personalize os parâmetros dos cálculos — {data.cycle.year}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Fechar parâmetros do cliente" onClick={() => setParametersOpen(false)}>
                <X size={16} />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <ClientOverridesSection
                rows={data.catalog}
                parameters={[]}
                parameterSetId={null}
                lockedClientId={data.client.id}
                lockedYear={data.cycle.year}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )

  return embedded
    ? <div className="space-y-5">{editorBody}</div>
    : <MxModulePage id="admin-mx-plano-estrategico-editor" width="dashboard" bottomClearance="navigation">{editorBody}</MxModulePage>
}

export default AdminStrategicPlanEditor

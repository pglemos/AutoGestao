import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eraser,
  Eye,
  EyeOff,
  FileCheck2,
  History,
  Layers3,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Target,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxField,
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
import { MONTHS, MONTH_LABELS, formatDisplay, formatEditableInput, getFormatConfig, parseStrategicInput } from './indicatorFormulas'
import {
  applyEditorMonthToUnits,
  applyEditorMonthToYear,
  clearEditorMonth,
  copyEditorMonth,
  editorAnnualTotal,
  filterEditorIndicators,
  groupEditorIndicatorsByArea,
  hydrateEditorGrid,
  recalculateEditorGrid,
  patchEditorGrid,
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
import { resolveLastClosedCompetence } from '@/features/strategic-plan/competence'
import { PLAN_CYCLE_STATUS_LABEL, type PlanReadiness } from '@/features/strategic-plan/planCycle'
import { consolidateClientPlanning, resolvePolicies, type PlanningValueRow } from '@/features/strategic-plan/clientPlanningConsolidation'
import type { ConsolidationIndicator } from '@/features/strategic-plan/unitConsolidation'
import { UNIT_ENTRY_MODES, UNIT_ROLLUP_METHODS } from '@/features/strategic-plan/unitPolicy'
import { MetasRealizadosTab } from '@/features/admin-mx/components/MetasRealizadosTab'
import { toast } from '@/lib/toast'

type EditorTab = 'matriz' | 'rapido' | 'indicadores' | 'unidades' | 'consolidado' | 'historico'

const EDITOR_TABS: TabNavItem<EditorTab>[] = [
  { key: 'rapido', label: 'Cadastro rápido', controls: 'rapido-panel' },
  { key: 'matriz', label: 'Revisão completa', controls: 'matriz-panel' },
  { key: 'indicadores', label: 'Indicadores', controls: 'indicadores-panel' },
  { key: 'unidades', label: 'Unidades', controls: 'unidades-panel' },
  { key: 'consolidado', label: 'Consolidado', controls: 'consolidado-panel' },
  { key: 'historico', label: 'Histórico', controls: 'historico-panel' },
]

const FIELD_OPTIONS: Array<{ value: EditorField; label: string }> = [
  { value: 'meta', label: 'Meta' },
  { value: 'realizado', label: 'Realizado' },
  { value: 'ano_anterior', label: 'Ano anterior' },
]

function calculatedIndicator(indicator: StrategicPlanEditorIndicator) {
  return String(indicator.target_calculation_mode ?? '').toUpperCase().startsWith('CALCULATED')
    || String(indicator.target_calculation_mode ?? '').toLowerCase().startsWith('calculado')
    || Boolean(indicator.formula_expression)
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

export function AdminStrategicPlanEditor({ cycleId, readOnly = false }: { cycleId: string; readOnly?: boolean }) {
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
  const [sourceMonth, setSourceMonth] = useState(1)
  const [targetMonth, setTargetMonth] = useState(2)
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('todas')
  const [includeHidden, setIncludeHidden] = useState(true)
  const [sortMode, setSortMode] = useState<'ordem' | 'nome'>('ordem')
  const [historySearch, setHistorySearch] = useState('')
  const [historyField, setHistoryField] = useState<'todos' | EditorField>('todos')
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set())
  const [addIndicatorOpen, setAddIndicatorOpen] = useState(false)
  const [addSearch, setAddSearch] = useState('')
  const [busyIndicator, setBusyIndicator] = useState<string | null>(null)
  const gridRef = useRef(grid)
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
  const editableCodes = useMemo(
    () => new Set(gridIndicators.filter(indicator => {
      if (readOnly || data?.cycle.status === 'revisado') return false
      if (!data?.units.some(unit => unit.id === unitId && unit.active)) return false
      if (data?.cycle.status === 'publicado' && field !== 'realizado') return false
      if (companyScopedIndicator(indicator) && unitId !== data?.client.primaryStoreId) return false
      if (field === 'meta') return !calculatedIndicator(indicator)
      return isPlanningFieldEditable(
        { code: officialCatalogCode(indicator.metric_key), calculado: calculatedIndicator(indicator) },
        field,
      )
    }).map(indicator => indicator.metric_key)),
    [data?.client.primaryStoreId, data?.cycle.status, data?.units, field, gridIndicators, readOnly, unitId],
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

  const markPatches = (patches: EditorCellPatch[]) => {
    if (patches.length === 0) return
    setDirtyKeys(current => {
      const next = new Set(current)
      for (const patch of patches) next.add(dirtyKey(patch))
      return next
    })
  }

  const applyPatches = (patches: EditorCellPatch[]) => {
    if (patches.length === 0) return
    setGrid(current => {
      const patched = patches.reduce((next, patch) => patchEditorGrid(next, patch), current)
      if (!data) return patched
      const unitIds = data.units.map(unit => unit.id)
      const next = recalculateEditorGrid(patched, unitIds, data.indicators)
      return next
    })
    markPatches(patches)
  }

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


  useEffect(() => {
    if (!data || field === 'meta') return
    const closed = resolveLastClosedCompetence(data.cycle.year)
    const month = field === 'ano_anterior'
      ? (closed.previousYearMonth ?? closed.lastClosedMonth)
      : (closed.targetActualMonth ?? closed.lastClosedMonth)
    setSourceMonth(month)
    setTargetMonth(month === 12 ? 11 : month + 1)
  }, [data, field])

  useEffect(() => {
    if (!data) return
    const codes = gridIndicators.map(indicator => officialCatalogCode(indicator.metric_key))
  }, [data, field, gridIndicators, tab])

  const updateCell = (indicator: StrategicPlanEditorIndicator, month: number, raw: string) => {
    if (!canEdit(indicator, field)) return
    const config = getFormatConfig(indicator.value_type, indicator.casas_decimais)
    const value = parseStrategicInput(raw, config)
    if (raw.trim() !== '' && value === null) return
    const patch: EditorCellPatch = { unitId, indicatorCode: indicator.metric_key, month, field, value }
    applyPatches([patch])
  }

  const copyMonth = () => {
    if (!data || !unitId || effectiveReadOnly || sourceMonth === targetMonth) return
    const result = copyEditorMonth(grid, {
      unitId,
      sourceMonth: sourceMonth as (typeof MONTHS)[number],
      targetMonth: targetMonth as (typeof MONTHS)[number],
      field,
      indicatorCodes: gridIndicators.map(indicator => indicator.metric_key),
      editableCodes,
    })
    applyPatches(result.patches)
    toast.info(`${result.patches.length} célula(s) preparadas para copiar ${fieldLabel(field)}.`)
  }

  const applyMonthToUnits = () => {
    if (!data || !unitId || effectiveReadOnly || !activeUnits.some(unit => unit.id === unitId)) return
    const targetUnitIds = activeUnits.filter(unit => unit.id !== unitId).map(unit => unit.id)
    const transferableCodes = new Set(
      gridIndicators
        .filter(indicator => targetUnitIds.every(targetId => canEdit(indicator, field, targetId)))
        .map(indicator => indicator.metric_key),
    )
    const result = applyEditorMonthToUnits(grid, {
      sourceUnitId: unitId,
      targetUnitIds: activeUnits.map(unit => unit.id),
      month: sourceMonth as (typeof MONTHS)[number],
      field,
      indicatorCodes: gridIndicators.map(indicator => indicator.metric_key),
      editableCodes: transferableCodes,
    })
    applyPatches(result.patches)
    toast.info(`${result.patches.length} célula(s) preparadas nas demais unidades.`)
  }

  const applyMonthToYear = () => {
    if (!data || !unitId || effectiveReadOnly || field !== 'meta') return
    const result = applyEditorMonthToYear(grid, {
      unitId,
      sourceMonth: sourceMonth as (typeof MONTHS)[number],
      field: 'meta',
      indicatorCodes: gridIndicators.map(indicator => indicator.metric_key),
      editableCodes,
    })
    applyPatches(result.patches)
    toast.info(`${result.patches.length} célula(s) preparadas (mês ${MONTH_LABELS[sourceMonth - 1]} → ano). Salve o rascunho para persistir.`)
  }

  const clearMonth = () => {
    if (!unitId || effectiveReadOnly) return
    const result = clearEditorMonth(grid, {
      unitId,
      month: sourceMonth as (typeof MONTHS)[number],
      field,
      indicatorCodes: gridIndicators.map(indicator => indicator.metric_key),
      editableCodes,
    })
    applyPatches(result.patches)
    toast.info(`${result.patches.length} célula(s) preparadas para limpeza.`)
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

  const submitForValidation = async () => {
    if (!data || effectiveReadOnly) return
    if (!(await saveChanges())) return
    setSaving(true)
    const result = await transitionEditorCycle({ cycle: data.cycle, to: 'em_validacao' })
    if (result.error || !result.cycle) toast.error(result.error ?? 'Não foi possível enviar o ciclo para validação.')
    else {
      updateCycle(result.cycle)
      toast.success('Plano enviado para validação.')
      await loadReadiness()
    }
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
      navigate(`/plano-estrategico?cycleId=${encodeURIComponent(result.cycle.id)}`)
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

  if (loading) return <MxModulePage id="admin-mx-plano-estrategico-editor" width="dashboard" bottomClearance="navigation"><MxLoadingState label="Carregando editor do Plano Estratégico" /></MxModulePage>
  if (error || !data) return <MxModulePage id="admin-mx-plano-estrategico-editor" width="dashboard" bottomClearance="navigation"><MxErrorState description={error ?? 'Ciclo indisponível.'} retry={() => void refresh()} /></MxModulePage>

  const currentUnit = data.units.find(unit => unit.id === unitId) ?? data.units[0] ?? null
  const ownerStoreId = data.client.primaryStoreId ?? data.units.find(unit => unit.store_type === 'MATRIZ')?.id ?? data.units[0]?.id ?? null
  const cycleStatus = PLAN_CYCLE_STATUS_LABEL[data.cycle.status] ?? data.cycle.status
  const readinessPercent = readiness && readiness.total > 0 ? Math.round((readiness.ready / readiness.total) * 100) : 0
  const readinessIssues = readiness?.issues.slice(0, 24) ?? []

  return (
    <MxModulePage id="admin-mx-plano-estrategico-editor" width="dashboard" bottomClearance="navigation">
      <MxModuleHeader
        icon={Layers3}
        eyebrow="Administração MX · Plano Estratégico"
        title={`${data.client.name} · ${data.cycle.year}`}
        description="Editor por ciclo com matriz mensal, roster de indicadores, unidades, consolidação e histórico versionado."
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/plano-estrategico')}><ArrowLeft size={16} />Voltar à gestão</Button>
            <Button variant="outline" onClick={() => void refresh()} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'animate-spin' : undefined} />Atualizar</Button>
            <Button variant="outline" disabled={!ownerStoreId} title={!ownerStoreId ? 'Cliente sem unidade vinculada' : undefined} onClick={() => navigate(`/plano-estrategico?storeId=${encodeURIComponent(ownerStoreId ?? '')}&year=${data.cycle.year}&viewAs=dono`)}><Eye size={16} />Visualizar como Dono</Button>
            {!effectiveReadOnly && data.cycle.status !== 'publicado' && data.cycle.status !== 'revisado' ? <Button onClick={() => void saveChanges()} disabled={saving || dirtyKeys.size === 0}><Save size={16} />Salvar rascunho{dirtyKeys.size ? ` (${dirtyKeys.size})` : ''}</Button> : null}
          </div>
        )}
      />

      {readOnly ? <MxStatusBanner tone="info"><Eye size={16} className="mr-2 inline" />Preview somente leitura. As ações de edição, histórico e ciclo estão bloqueadas.</MxStatusBanner> : null}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusVariant(data.cycle.status)}>{cycleStatus}</Badge>
          <span className="text-sm text-muted-foreground">Versão {data.cycle.version_number}</span>
          <span className="text-sm text-muted-foreground">{activeUnits.length} unidade(s) ativa(s)</span>
          <span className="text-sm text-muted-foreground">{gridIndicators.length} indicador(es) no roster</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadReadiness()} disabled={readinessLoading}><FileCheck2 size={16} />{readinessLoading ? 'Validando...' : 'Validar plano'}</Button>
          {!effectiveReadOnly && data.cycle.status === 'rascunho' ? <Button variant="outline" size="sm" onClick={() => void submitForValidation()} disabled={saving}><Send size={16} />Enviar para validação</Button> : null}
          {!effectiveReadOnly && data.cycle.status === 'em_validacao' ? <Button size="sm" onClick={() => void publish()} disabled={saving || readinessLoading || !readiness?.canPublish}><CheckCircle2 size={16} />Publicar plano</Button> : null}
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

      <TabNav tabs={EDITOR_TABS} activeTab={tab} onTabChange={setTab} scrollable />

      {tab === 'matriz' ? <section id="matriz-panel" role="tabpanel" aria-label="Matriz do plano" className="space-y-5">
        <MxSectionCard>
          <MxSectionHeader title="Matriz mensal" description="Edite Meta, Realizado e Ano anterior por unidade. Indicadores calculados ficam protegidos e os totais anuais são derivados da série." actions={(
            <div className="flex flex-wrap items-center gap-2">
              <MxSelect aria-label="Campo da matriz" value={field} onChange={event => setField(event.target.value as EditorField)}>
                {FIELD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </MxSelect>
              <MxSelect aria-label="Unidade da matriz" value={unitId} onChange={event => setUnitId(event.target.value)}>
                {data.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name} · {unit.store_type === 'MATRIZ' ? 'Matriz' : 'Filial'}{unit.active ? '' : ' · inativa'}</option>)}
              </MxSelect>
            </div>
          )} />
          <div className="space-y-4 p-5">
            <MxToolbar className="shadow-none">
              <MxField label="Mês de origem"><MxSelect aria-label="Mês de origem" value={sourceMonth} onChange={event => setSourceMonth(Number(event.target.value))}>{MONTH_LABELS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</MxSelect></MxField>
              <MxField label="Mês de destino"><MxSelect aria-label="Mês de destino" value={targetMonth} onChange={event => setTargetMonth(Number(event.target.value))}>{MONTH_LABELS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}</MxSelect></MxField>
              <div className="flex flex-wrap items-end gap-2">
                <Button variant="outline" onClick={copyMonth} disabled={effectiveReadOnly || !unitId || sourceMonth === targetMonth}><Copy size={16} />Copiar mês</Button>
                {field === 'meta' ? <Button variant="outline" onClick={applyMonthToYear} disabled={effectiveReadOnly || !unitId}><Copy size={16} />Aplicar {MONTH_LABELS[sourceMonth - 1]} a todos</Button> : null}
                <Button variant="outline" onClick={applyMonthToUnits} disabled={effectiveReadOnly || activeUnits.length < 2 || field !== 'meta'}><Users size={16} />Aplicar entre unidades</Button>
                <Button variant="outline" onClick={clearMonth} disabled={effectiveReadOnly || !unitId}><Eraser size={16} />Limpar mês</Button>
              </div>
            </MxToolbar>
            {field !== 'meta' ? <MxStatusBanner tone="info">Realizado e Ano anterior são por competência mensal (padrão M-1 = {MONTH_LABELS[sourceMonth - 1]}). Não há preenchimento anual automático.</MxStatusBanner> : null}
            {field === 'realizado' && data && resolveLastClosedCompetence(data.cycle.year).actualHasNoClosedMonth ? (
              <MxStatusBanner tone="warning">Nenhuma competência do exercício atual foi encerrada. Lançamento de Realizado fica disponível após o fechamento do primeiro mês.</MxStatusBanner>
            ) : null}
            {data.cycle.status === 'publicado' && field !== 'realizado' ? <MxStatusBanner tone="info">O ciclo publicado é imutável para metas e ano anterior. Abra uma revisão para alterar esses campos; o Realizado continua lançável.</MxStatusBanner> : null}
            {!currentUnit ? <MxEmptyState title="Nenhuma unidade encontrada" description="O ciclo precisa de uma matriz e, quando aplicável, filiais ativas para receber valores." icon={Users} /> : (
              <MxTableSurface aria-label={`Matriz mensal da unidade ${currentUnit.name}`}>
                <Table className="min-w-[1420px]">
                  <TableHeader><TableRow><TableHead>Indicador</TableHead>{MONTH_LABELS.map((label, index) => <TableHead key={label} className={`text-right${field !== 'meta' && index + 1 === sourceMonth ? ' bg-status-info-surface text-status-info-text' : ''}`}>{label}</TableHead>)}<TableHead className="text-right">Total anual</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {groupEditorIndicatorsByArea(gridIndicators).flatMap(group => [
                      <TableRow key={`area-${group.area}`}>
                        <TableCell colSpan={14} className="bg-surface-alt text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.area}</TableCell>
                      </TableRow>,
                      ...group.items.map(indicator => {
                      const config = getFormatConfig(indicator.value_type, indicator.casas_decimais)
                      const editable = canEdit(indicator, field)
                      const values = readEditorSeries(grid, unitId, indicator.metric_key, field)
                      return <TableRow key={indicator.metric_key}>
                          <TableCell className="sticky left-0 z-[var(--mx-z-sticky)] min-w-[240px] bg-background">
                          <div className="font-semibold text-foreground">{indicator.label}</div>
                          <div className="text-xs text-muted-foreground">{officialCatalogCode(indicator.metric_key)} · {calculatedIndicator(indicator) ? 'Calculado' : 'Digitável'}</div>
                        </TableCell>
                        {MONTHS.map(month => {
                          const value = grid[unitId]?.[indicator.metric_key]?.[month]?.[field] ?? null
                          return <TableCell key={month} className="min-w-[92px] text-right">
                            {editable ? <Input
                              aria-label={`${indicator.label} ${fieldLabel(field)} ${MONTH_LABELS[month - 1]}`}
                              inputMode="decimal"
                              value={formatEditableInput(value, config)}
                              onChange={event => updateCell(indicator, month, event.target.value)}
                              className="min-w-[80px] text-right tabular-nums"
                            /> : <span className="tabular-nums text-muted-foreground" title={calculatedIndicator(indicator) ? 'Indicador calculado pelo sistema' : effectiveReadOnly ? 'Modo somente leitura' : 'Campo bloqueado no ciclo publicado'}>{formatDisplay(value, config)}</span>}
                          </TableCell>
                        })}
                        <TableCell className="text-right font-semibold tabular-nums">{formatDisplay(editorAnnualTotal(values), config)}</TableCell>
                      </TableRow>
                      }),
                    ])}
                  </TableBody>
                </Table>
              </MxTableSurface>
            )}
          </div>
        </MxSectionCard>
      </section> : null}

      {tab === 'rapido' ? <section id="rapido-panel" role="tabpanel" aria-label="Cadastro rápido" className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Cadastro Rápido de Metas</h2>
          <p className="text-sm text-muted-foreground">Preencha somente os indicadores que dependem da definição do consultor. Os demais serão calculados automaticamente.</p>
        </div>
        <MxMetricGrid>
          <MxMetricCard title="Metas digitáveis" value={digitaveisIndicators.length} detail="Entrada manual no cadastro rápido" icon={Target} tone="info" />
          <MxMetricCard title="Indicadores calculados" value={calculadosIndicators.length} detail="Derivados na revisão completa" icon={Layers3} />
          <MxMetricCard title="Roster do ciclo" value={gridIndicators.length} detail="Pacote Base44 completo" icon={CheckCircle2} tone="success" />
        </MxMetricGrid>
        <MetasRealizadosTab
          indicators={digitaveisIndicators.map(indicator => ({
            code: indicator.metric_key,
            displayCode: officialCatalogCode(indicator.metric_key),
            name: indicator.label,
            department: indicator.area,
            calculado: false,
            value_type: indicator.value_type,
            casas_decimais: indicator.casas_decimais,
          }))}
          initialStoreId={unitId}
          initialYear={data.cycle.year}
          stores={data.units.map(unit => ({ id: unit.id, name: unit.name }))}
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
                })
              }
              await refresh()
            })()
          }}
        />
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
        <MxSectionCard><MxSectionHeader title="Unidades do cliente" description="Matriz e filiais permanecem distintas; todas as unidades ativas participam da prontidão e da consolidação." /><div className="p-5">{data.units.length ? <MxTableSurface aria-label="Unidades do cliente no plano estratégico"><Table className="min-w-[760px]"><TableHeader><TableRow><TableHead>Unidade</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Células lançadas</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{data.units.map(unit => { const count = planningRows.filter(row => row.loja_id === unit.id && (row.meta != null || row.realizado != null || row.ano_anterior != null)).length; return <TableRow key={unit.id}><TableCell className="font-semibold">{unit.name}</TableCell><TableCell>{unit.store_type === 'MATRIZ' ? 'Matriz' : 'Filial'}</TableCell><TableCell><Badge variant={unit.active ? 'success' : 'secondary'}>{unit.active ? 'Ativa' : 'Inativa'}</Badge></TableCell><TableCell className="tabular-nums">{count}</TableCell><TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => { setUnitId(unit.id); setTab('matriz') }}>Abrir matriz</Button></TableCell></TableRow>})}</TableBody></Table></MxTableSurface> : <MxEmptyState title="Nenhuma unidade vinculada" description="Cadastre uma matriz no cliente antes de lançar o plano." icon={Users} />}</div></MxSectionCard>
      </section> : null}

      {tab === 'consolidado' ? <section id="consolidado-panel" role="tabpanel" aria-label="Consolidado" className="space-y-5">
        {activeUnits.length < 2 ? <MxStatusBanner tone="info">Este cliente possui uma única unidade ativa. O consolidado só é exibido quando há matriz e filial ativas.</MxStatusBanner> : consolidated ? <MxSectionCard><MxSectionHeader title="Consolidado do cliente" description="Percentuais e médias são recalculados sobre as bases consolidadas; não são somados entre unidades." actions={<MxSelect aria-label="Série do consolidado" value={field} onChange={event => setField(event.target.value as EditorField)}>{FIELD_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</MxSelect>} /><div className="p-5"><MxTableSurface aria-label="Consolidado mensal do cliente"><Table className="min-w-[1280px]"><TableHeader><TableRow><TableHead>Indicador</TableHead>{MONTH_LABELS.map(label => <TableHead key={label} className="text-right">{label}</TableHead>)}<TableHead>Política</TableHead></TableRow></TableHeader><TableBody>{gridIndicators.map(indicator => { const series = consolidated[field]; const config = getFormatConfig(indicator.value_type, indicator.casas_decimais); const policy = indicator.unit_rollup_method ? UNIT_ROLLUP_METHODS[indicator.unit_rollup_method as keyof typeof UNIT_ROLLUP_METHODS]?.short ?? indicator.unit_rollup_method : 'Sem política'; return <TableRow key={indicator.metric_key}><TableCell><div className="font-semibold">{indicator.label}</div><div className="text-xs text-muted-foreground">{officialCatalogCode(indicator.metric_key)}</div></TableCell>{MONTHS.map(month => { const value = series.valueMap[indicator.metric_key]?.[month] ?? null; const integrity = series.integrityByMonth[month]?.[indicator.metric_key]; return <TableCell key={month} className="text-right"><div className="tabular-nums">{formatDisplay(value, config)}</div>{integrity ? <Badge variant={consolidationTone(integrity.status)} className="mt-1">{integrity.status}</Badge> : null}</TableCell>})}<TableCell>{policy}{indicator.unit_entry_mode ? <div className="text-xs text-muted-foreground">{UNIT_ENTRY_MODES[indicator.unit_entry_mode as keyof typeof UNIT_ENTRY_MODES]?.short ?? indicator.unit_entry_mode}</div> : null}</TableCell></TableRow>})}</TableBody></Table></MxTableSurface></div></MxSectionCard> : <MxEmptyState title="Consolidado indisponível" description="Não foi possível calcular o consolidado deste ciclo." />}
      </section> : null}

      {tab === 'historico' ? <section id="historico-panel" role="tabpanel" aria-label="Histórico" className="space-y-5">
        <MxSectionCard>
          <MxSectionHeader
            title="Histórico versionado"
            description="Cada salvamento registra unidade, indicador, campo, valores anteriores e novos para auditoria e restauração controlada."
            actions={<Button variant="outline" onClick={() => void loadHistory()} disabled={!data || refreshing}><RefreshCw size={16} />Atualizar histórico</Button>}
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
                      <TableCell className="max-w-[260px] text-xs tabular-nums text-muted-foreground" title={compactHistoryValues(row.previousValues, indicator)}>{compactHistoryValues(row.previousValues, indicator)}</TableCell>
                      <TableCell className="max-w-[260px] text-xs tabular-nums" title={compactHistoryValues(row.newValues, indicator)}>{compactHistoryValues(row.newValues, indicator)}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground" title={row.note ?? undefined}>{row.note ?? '—'}</TableCell>
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
      </section> : null}

      <Modal open={addIndicatorOpen} onClose={() => setAddIndicatorOpen(false)} title="Adicionar indicador ao ciclo" description="A inclusão altera somente este roster. O catálogo global e outros clientes permanecem intactos." size="lg" footer={<Button variant="outline" onClick={() => setAddIndicatorOpen(false)}>Fechar</Button>}>
        <div className="space-y-4"><MxInput value={addSearch} onChange={event => setAddSearch(event.target.value)} placeholder="Buscar no catálogo ativo" aria-label="Buscar indicador para adicionar" />{availableIndicators.length ? <MxTableSurface aria-label="Indicadores disponíveis para adicionar"><Table><TableHeader><TableRow><TableHead>Indicador</TableHead><TableHead>Área</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{availableIndicators.map(indicator => <TableRow key={indicator.metric_key}><TableCell><div className="font-semibold">{indicator.label}</div><div className="text-xs text-muted-foreground">{officialCatalogCode(indicator.metric_key)}</div></TableCell><TableCell>{indicator.area}</TableCell><TableCell className="text-right"><Button size="sm" onClick={() => void addIndicator(indicator.metric_key)} disabled={busyIndicator === indicator.metric_key}><Plus size={14} />Adicionar</Button></TableCell></TableRow>)}</TableBody></Table></MxTableSurface> : <MxEmptyState title="Nenhum indicador disponível" description="Todos os indicadores ativos já fazem parte deste ciclo ou não correspondem à busca." variant="filter" />}</div>
      </Modal>
    </MxModulePage>
  )
}

export default AdminStrategicPlanEditor

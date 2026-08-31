import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, History, RefreshCw, Save, Search, SlidersHorizontal, Target, Upload } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import {
  MxEmptyState,
  MxErrorState,
  MxField,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { BASE44_STANDARD_INDICATORS, matchCanonicalIndicator } from '../indicadores/canonicalBase44Catalog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import { toast } from '@/lib/toast'
import { MONTH_LABELS, getFormatConfig, formatDisplay, decideStrategicCellInput } from '../indicadores/indicatorFormulas'
import { resolveLastClosedCompetence } from '@/features/strategic-plan/competence'
import { diagnoseEmptyImport, readIndicatorCodeFromRow } from '../indicadores/importDiagnosis'
import {
  buildImportSaveBatches,
  buildOfficialMonthlyGrid,
  readOfficialMonthValue,
  buildTargetWorkbookSheets,
  buildStoreCopyMutations,
  clearMonthSeries,
  copyPreviousMonthSeries,
  countQuickEntryProgress,
  normalizeQuickEntrySeries,
  isPlanningFieldEditable,
  januaryReplicationSeries,
  monthSeries,
  processTargetImport,
  previewStoreTargetsCopy,
  resolvePlanningPersistenceCode,
  type CopyConflictPolicy,
  type CopyPreview,
  type StoreTargetValue,
  type TargetIndicator,
  type TargetImportChange,
} from '../indicadores/metasRealizados'
import {
  applyStoreCopyMutations,
  fetchFormulaIndicators,
  fetchPlanningHistory,
  fetchStorePlanningValues,
  restorePlanningHistory,
  saveIndicatorActuals,
  saveIndicatorTargets,
  type PlanningHistoryRow,
} from '../indicadores/indicatorData'
import { saveIndicatorField } from '../indicadores/strategicPlanEditorRepository'
import {
  CONSOLIDATED_SCOPE,
  CONSOLIDATION_STATUS,
  formatPartialUnitsLabel,
  resolveStoreScopedValue,
  useClientScope,
  type ConsolidationIndicator,
  type IndicatorIntegrity,
} from '@/features/strategic-plan'
import { PlanningMonthInput, planningCellDraftKey, planningYearDraftKey } from './PlanningMonthInput'
import { StrategicPlanQuickEntry } from './StrategicPlanQuickEntry'

type StoreOption = { id: string; name: string }

const DEFAULT_YEAR = new Date().getFullYear()

function partialMark(integrity?: IndicatorIntegrity): string {
  if (integrity?.status !== CONSOLIDATION_STATUS.PARCIAL) return ''
  return ` ${formatPartialUnitsLabel(integrity.unitsWithData, integrity.totalUnits) ?? '*'}`
}

export function MetasRealizadosTab(props: {
  indicators: TargetIndicator[]
  /** Catálogo usado na importação (o roster completo). A grade pode ser só digitáveis. */
  importIndicators?: TargetIndicator[]
  onNavigateToParams?: () => void
  onNavigateToHistory?: () => void
  initialStoreId?: string
  initialYear?: number
  stores?: StoreOption[]
  onSaved?: () => void
  cicloId?: string | null
  clientId?: string
  clientName?: string
  variant?: 'matrix' | 'quick'
  activeField?: 'meta' | 'realizado' | 'ano_anterior'
  planStatusLabel?: string
  onQuickProgress?: (progress: { digitaveisFilled: number; digitaveisTotal: number; calculadosComBase: number; calculadosTotal: number }) => void
  onRegisterSave?: (save: () => Promise<void>) => void
}) {
  const [stores, setStores] = useState<StoreOption[]>(props.stores ?? [])
  const [storeId, setStoreId] = useState(props.initialStoreId ?? '')
  const [year, setYear] = useState(props.initialYear ?? DEFAULT_YEAR)
  const [rows, setRows] = useState<StoreTargetValue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [scope, setScope] = useState<string>('')
  const [scopeNotice, setScopeNotice] = useState<string | null>(null)
  const [formulas, setFormulas] = useState<Record<string, string | null>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('todos')
  const [selectedType, setSelectedType] = useState<'todos' | 'digitaveis' | 'calculados'>('digitaveis')
  const [savingAll, setSavingAll] = useState(false)
  const [cellDrafts, setCellDrafts] = useState<Record<string, string>>({})
  const [entryMonth, setEntryMonth] = useState(1)
  const importCatalog = props.importIndicators ?? props.indicators
  const isQuick = props.variant === 'quick'
  const activeField = props.activeField ?? 'meta'

  const resolvePlanningIndicator = useCallback((code: string) => {
    const officialCode = matchCanonicalIndicator(code)?.code ?? code
    return props.indicators.find(item => item.code === code || matchCanonicalIndicator(item.code)?.code === officialCode)
      ?? importCatalog.find(item => item.code === code || matchCanonicalIndicator(item.code)?.code === officialCode)
  }, [importCatalog, props.indicators])

  const refetch = useCallback(async () => {
    if (!storeId) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    const result = await fetchStorePlanningValues(storeId, year)
    setRows(result.rows)
    setError(result.error)
    setLoading(false)
  }, [storeId, year])

  useEffect(() => {
    const boundStores = props.stores
    if (boundStores?.length) {
      setStores(boundStores)
      setStoreId(current => current || props.initialStoreId || boundStores[0].id)
      return
    }
    let active = true
    void (async () => {
      const supabase = (await import('@/lib/supabase')).supabase
      const { data, error: storeError } = await supabase
        .from('lojas')
        .select('id, name')
        .order('name', { ascending: true })
      if (!active) return
      let nextStores = (data ?? []) as StoreOption[]
      if (storeError || nextStores.length === 0) {
        const units = await supabase.from('unidades_cliente_consultoria').select('id, name, store_id').order('name', { ascending: true })
        if (!active) return
        if (units.error && storeError) {
          setError(storeError.message)
          setLoading(false)
          return
        }
        nextStores = ((units.data ?? []) as Array<{ id: string; name: string | null; store_id: string | null }>).map(unit => ({
          id: unit.store_id || unit.id,
          name: unit.name || unit.id,
        }))
      }
      setStores(nextStores)
      if (nextStores.length) setStoreId(current => current || props.initialStoreId || nextStores[0].id)
    })()
    return () => { active = false }
  }, [props.initialStoreId, props.stores])

  useEffect(() => { void refetch() }, [refetch])

  useEffect(() => {
    let active = true
    void (async () => {
      const result = await fetchFormulaIndicators()
      if (!active) return
      const byCode: Record<string, string | null> = {}
      for (const row of result.rows) byCode[row.metric_key] = row.formula_expression
      setFormulas(byCode)
    })()
    return () => { active = false }
  }, [])

  /** Digitáveis + calculados do catálogo — motor único para tempo real / consolidado. */
  const calculationIndicators = useMemo(() => {
    const byCode = new Map<string, { code: string; formula_expression: string | null }>()
    for (const indicator of props.indicators) {
      const canon = matchCanonicalIndicator(indicator.code)?.code ?? indicator.code
      byCode.set(canon, {
        code: indicator.code,
        formula_expression: formulas[indicator.code]
          ?? matchCanonicalIndicator(indicator.code)?.formula_expression
          ?? null,
      })
    }
    for (const indicator of BASE44_STANDARD_INDICATORS) {
      if (indicator.target_calculation_mode === 'MANUAL') continue
      if (byCode.has(indicator.code)) continue
      byCode.set(indicator.code, {
        code: indicator.code,
        formula_expression: formulas[indicator.code] ?? indicator.formula_expression ?? null,
      })
    }
    return [...byCode.values()]
  }, [formulas, props.indicators])

  // Sem a fórmula, um indicador derivado não tem como ser recalculado sobre as
  // bases consolidadas — sairia como "sem base" no consolidado do cliente.
  const consolidationIndicators = useMemo<ConsolidationIndicator[]>(
    () => calculationIndicators,
    [calculationIndicators],
  )

  const clientScope = useClientScope(storeId, year, consolidationIndicators)
  const isConsolidated = scope === CONSOLIDATED_SCOPE && clientScope.supportsConsolidated

  // Trocar de loja invalida um escopo consolidado que talvez não exista no cliente novo.
  // A troca é visível: sem aviso o usuário pensaria que ainda está no consolidado.
  useEffect(() => {
    if (scope === '' && clientScope.supportsConsolidated) {
      setScope(CONSOLIDATED_SCOPE)
    }
  }, [clientScope.supportsConsolidated, scope])

  useEffect(() => {
    if (scope === CONSOLIDATED_SCOPE && !clientScope.loading && !clientScope.supportsConsolidated) {
      setScope('')
      setScopeNotice('Consolidado indisponível: este cliente tem uma única unidade. Exibindo a unidade selecionada.')
    }
    if (scope === CONSOLIDATED_SCOPE && clientScope.supportsConsolidated) setScopeNotice(null)
  }, [scope, clientScope.loading, clientScope.supportsConsolidated])

  const grid = useMemo(() => buildOfficialMonthlyGrid(
    rows,
    calculationIndicators,
    storeId,
  ), [calculationIndicators, rows, storeId])
  const gridRef = useRef(grid)
  gridRef.current = grid

  const conferenceMonth = useMemo(() => {
    const closed = resolveLastClosedCompetence(year)
    if (closed.actualHasNoClosedMonth) return closed.previousYearMonth ?? 12
    return closed.targetActualMonth ?? closed.lastClosedMonth ?? 1
  }, [year])
  const RESUMO_CALCULADO = useMemo(() => ([
    { code: 'SALES_TOTAL', label: 'Vendas Total' },
    { code: 'LEADS_RECEIVED', label: 'Volume de Leads' },
    { code: 'APPOINTMENTS_VOLUME', label: 'Volume de Agendamentos' },
    { code: 'VISITS_VOLUME', label: 'Volume de Visitas' },
    { code: 'INVENTORY_TOTAL', label: 'Estoque Total' },
    { code: 'NET_PROFIT', label: 'Lucro Líquido' },
  ]), [])

  const summaryMonth = isQuick ? entryMonth : conferenceMonth

  const resumoCalculado = useMemo(() => RESUMO_CALCULADO.map(item => {
    const monthValue = readOfficialMonthValue(grid, calculationIndicators, item.code, summaryMonth, 'meta')
    const annual = Array.from({ length: 12 }, (_, index) => (
      readOfficialMonthValue(grid, calculationIndicators, item.code, index + 1, 'meta')
    )).reduce<number | null>((sum, value) => {
      if (value == null) return sum
      return (sum ?? 0) + value
    }, null)
    return { ...item, monthValue, annual }
  }), [RESUMO_CALCULADO, calculationIndicators, grid, summaryMonth])

  useEffect(() => {
    const sales = resumoCalculado.find(item => item.code === 'SALES_TOTAL')
    const closed = resolveLastClosedCompetence(year)
  }, [calculationIndicators.length, conferenceMonth, props.indicators.length, resumoCalculado, storeId, year])

  const consolidatedGrid = clientScope.consolidated?.meta.valueMap ?? {}
  const consolidatedActualGrid = clientScope.consolidated?.realizado.valueMap ?? {}
  const consolidatedPreviousGrid = clientScope.consolidated?.ano_anterior.valueMap ?? {}
  const consolidatedIntegrity = clientScope.consolidated?.meta.integrityByMonth ?? {}
  const consolidatedActualIntegrity = clientScope.consolidated?.realizado.integrityByMonth ?? {}

  const partialMonths = useMemo(() => {
    if (!isConsolidated) return 0
    const months = new Set<number>()
    for (const [month, byCode] of Object.entries(consolidatedIntegrity)) {
      const partial = Object.values(byCode).some(item => item.status === CONSOLIDATION_STATUS.PARCIAL)
      if (partial) months.add(Number(month))
    }
    return months.size
  }, [isConsolidated, consolidatedIntegrity])

  const saveIndicator = async (code: string, field: 'meta' | 'realizado' | 'ano_anterior') => {
    const indicator = resolvePlanningIndicator(code)
    if (!indicator || !isPlanningFieldEditable(indicator, field)) return
    setSavingKey(`${field}:${code}`)
    const values = Array.from({ length: 12 }, (_, index) => grid[code]?.[index + 1]?.[field] ?? null)
    const persistenceCode = resolvePlanningPersistenceCode(indicator.code)
    const result = field === 'meta'
      ? await saveIndicatorTargets({ lojaId: storeId, indicatorCode: persistenceCode, year, values, cicloId: props.cicloId })
      : field === 'realizado'
        ? await saveIndicatorActuals({ lojaId: storeId, indicatorCode: persistenceCode, year, values, cicloId: props.cicloId })
        : await saveIndicatorField({ lojaId: storeId, indicatorCode: persistenceCode, year, field: 'ano_anterior', values })
    if (result.error) toast.error(result.error)
    else {
      toast.success(field === 'meta' ? 'Metas salvas.' : field === 'realizado' ? 'Realizado salvo.' : 'Ano anterior salvo.')
      props.onSaved?.()
    }
    setSavingKey(null)
    await refetch()
    clientScope.reload()
  }

  const updateCell = (code: string, month: number, field: 'meta' | 'realizado' | 'ano_anterior', raw: string) => {
    const indicator = resolvePlanningIndicator(code)
    if (!indicator || !isPlanningFieldEditable(indicator, field)) return
    const config = getFormatConfig(indicator.value_type ?? 'number', indicator.casas_decimais ?? 0)
    const key = planningCellDraftKey(field, code, month)
    setCellDrafts(current => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    const decision = decideStrategicCellInput(raw, config)
    if (decision.action === 'preserve') return
    if (decision.action === 'reject') {
      toast.error(decision.message)
      return
    }
    const value = decision.action === 'clear' ? null : decision.value
    setRows(current => {
      const next = [...current]
      const index = next.findIndex(row => row.indicator_code === code && row.month === month)
      if (index >= 0) {
        next[index] = { ...next[index], [field]: value }
      } else {
        next.push({
          loja_id: storeId,
          indicator_code: code,
          year,
          month,
          meta: field === 'meta' ? value : null,
          realizado: field === 'realizado' ? value : null,
          ano_anterior: field === 'ano_anterior' ? value : null,
        })
      }
      return next
    })
  }

  const commitCell = async (code: string, month: number, field: 'meta' | 'realizado' | 'ano_anterior', raw: string) => {
    const indicator = resolvePlanningIndicator(code)
    if (!indicator || !isPlanningFieldEditable(indicator, field) || !storeId || isConsolidated) return
    const config = getFormatConfig(indicator.value_type ?? 'number', indicator.casas_decimais ?? 0)
    const key = planningCellDraftKey(field, code, month)
    setCellDrafts(current => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    const decision = decideStrategicCellInput(raw, config)
    if (decision.action === 'preserve') return
    if (decision.action === 'reject') {
      toast.error(decision.message)
      return
    }
    const value = decision.action === 'clear' ? null : decision.value
    const values = Array.from({ length: 12 }, (_, index) => {
      if (index + 1 === month) return value
      return gridRef.current[code]?.[index + 1]?.[field] ?? null
    })
    writeYear(code, field, values)
    setSavingKey(`${field}:${code}`)
    try {
      const result = await persistIndicatorYearValues(code, field, values)
      if (result.error) {
        toast.error(`${indicator.name}: ${result.error}`)
        return
      }
      props.onSaved?.()
      await refetch()
      clientScope.reload()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível salvar a meta.')
    } finally {
      setSavingKey(null)
    }
  }

  const persistIndicatorYearValues = async (
    code: string,
    field: 'meta' | 'realizado' | 'ano_anterior',
    values: Array<number | null>,
  ) => {
    const indicator = resolvePlanningIndicator(code)
    if (!indicator || !isPlanningFieldEditable(indicator, field) || !storeId || isConsolidated) {
      return { error: 'Não foi possível salvar este indicador.' }
    }
    const normalized = isQuick ? normalizeQuickEntrySeries(values) : values
    const saveCode = resolvePlanningPersistenceCode(indicator.code)
    return field === 'meta'
      ? saveIndicatorTargets({ lojaId: storeId, indicatorCode: saveCode, year, values: normalized, cicloId: props.cicloId })
      : field === 'realizado'
        ? saveIndicatorActuals({ lojaId: storeId, indicatorCode: saveCode, year, values: normalized, cicloId: props.cicloId })
        : saveIndicatorField({ lojaId: storeId, indicatorCode: saveCode, year, field: 'ano_anterior', values: normalized, cicloId: props.cicloId })
  }

  const writeYear = (code: string, field: 'meta' | 'realizado' | 'ano_anterior', values: Array<number | null>) => {
    setRows(current => {
      const next = [...current]
      for (let month = 1; month <= 12; month++) {
        const value = values[month - 1] ?? null
        const index = next.findIndex(row => row.indicator_code === code && row.month === month)
        if (index >= 0) next[index] = { ...next[index], [field]: value }
        else {
          next.push({
            loja_id: storeId,
            indicator_code: code,
            year,
            month,
            meta: field === 'meta' ? value : null,
            realizado: field === 'realizado' ? value : null,
            ano_anterior: field === 'ano_anterior' ? value : null,
          })
        }
      }
      return next
    })
  }

  const commitYear = async (code: string, raw: string) => {
    const indicator = resolvePlanningIndicator(code)
    if (!indicator || !isPlanningFieldEditable(indicator, activeField)) return
    const config = getFormatConfig(indicator.value_type ?? 'number', indicator.casas_decimais ?? 0)
    const yearKey = planningYearDraftKey(activeField, code)
    setCellDrafts(current => {
      if (!(yearKey in current)) return current
      const next = { ...current }
      delete next[yearKey]
      return next
    })
    const decision = decideStrategicCellInput(raw, config)
    if (decision.action === 'preserve') return
    if (decision.action === 'reject') {
      toast.error(decision.message)
      return
    }
    const value = decision.action === 'clear' ? null : decision.value
    const values = Array.from({ length: 12 }, () => value)
    writeYear(code, activeField, values)
    setSavingKey(`${activeField}:${code}`)
    try {
      const result = await persistIndicatorYearValues(code, activeField, values)
      if (result.error) {
        toast.error(`${indicator.name}: ${result.error}`)
        return
      }
      toast.success(`Meta aplicada nos 12 meses de ${indicator.name}.`)
      props.onSaved?.()
      await refetch()
      clientScope.reload()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível salvar a meta.')
    } finally {
      setSavingKey(null)
    }
  }

  const replicateMonthToAll = async (code: string, field: 'meta' | 'realizado' | 'ano_anterior', sourceMonth: number = entryMonth) => {
    const indicator = resolvePlanningIndicator(code)
    if (!indicator || !isPlanningFieldEditable(indicator, field)) return
    const persistenceCode = resolvePlanningPersistenceCode(indicator.code)
    const sourceValue = grid[code]?.[sourceMonth]?.[field] ?? null
    const values = januaryReplicationSeries(sourceValue)
    if (!values) {
      toast.error(`Informe ${MONTH_LABELS[sourceMonth - 1]} antes de replicar. Célula vazia não copia para o restante do ano.`)
      return
    }
    setRows(current => {
      const next = [...current]
      for (let m = 1; m <= 12; m++) {
        const index = next.findIndex(row => row.indicator_code === code && row.month === m)
        if (index >= 0) {
          next[index] = { ...next[index], [field]: sourceValue }
        } else {
          next.push({
            loja_id: storeId,
            indicator_code: code,
            year,
            month: m,
            meta: field === 'meta' ? sourceValue : null,
            realizado: field === 'realizado' ? sourceValue : null,
            ano_anterior: field === 'ano_anterior' ? sourceValue : null,
          })
        }
      }
      return next
    })
    setSavingKey(`${field}:${code}`)
    try {
      const result = field === 'meta'
        ? await saveIndicatorTargets({ lojaId: storeId, indicatorCode: persistenceCode, year, values, cicloId: props.cicloId })
        : field === 'realizado'
          ? await saveIndicatorActuals({ lojaId: storeId, indicatorCode: persistenceCode, year, values, cicloId: props.cicloId })
          : await saveIndicatorField({ lojaId: storeId, indicatorCode: persistenceCode, year, field: 'ano_anterior', values, cicloId: props.cicloId })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${MONTH_LABELS[sourceMonth - 1]} replicado e salvo em ${indicator.name}.`)
      props.onSaved?.()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível salvar a replicação.')
    } finally {
      setSavingKey(null)
    }
  }

  const replicateAllJanToAllMonths = async (field: 'meta' | 'realizado' | 'ano_anterior' = 'meta') => {
    const editableIndicators = props.indicators.filter(ind => !ind.calculado && isPlanningFieldEditable(ind, field))
    if (!editableIndicators.length) return
    const withJanuary = editableIndicators.filter(ind => januaryReplicationSeries(grid[ind.code]?.[1]?.[field] ?? null))
    if (!withJanuary.length) {
      toast.error(field === 'meta'
        ? 'Preencha Janeiro nas metas digitáveis antes de replicar.'
        : 'Janeiro está vazio neste campo. A replicação não altera realizado nem ano anterior vazios.')
      return
    }
    setRows(current => {
      const next = [...current]
      for (const ind of withJanuary) {
        const janVal = grid[ind.code]?.[1]?.[field] ?? null
        if (janVal == null) continue
        for (let m = 1; m <= 12; m++) {
          const index = next.findIndex(row => row.indicator_code === ind.code && row.month === m)
          if (index >= 0) {
            next[index] = { ...next[index], [field]: janVal }
          } else {
            next.push({
              loja_id: storeId,
              indicator_code: ind.code,
              year,
              month: m,
              meta: field === 'meta' ? janVal : null,
              realizado: field === 'realizado' ? janVal : null,
              ano_anterior: field === 'ano_anterior' ? janVal : null,
            })
          }
        }
      }
      return next
    })
    setSavingAll(true)
    try {
      let savedCount = 0
      const failures: string[] = []
      for (const ind of withJanuary) {
        const janVal = grid[ind.code]?.[1]?.[field] ?? null
        const values = januaryReplicationSeries(janVal)
        if (!values) continue
        const persistenceCode = resolvePlanningPersistenceCode(ind.code)
        const result = field === 'meta'
          ? await saveIndicatorTargets({ lojaId: storeId, indicatorCode: persistenceCode, year, values, cicloId: props.cicloId })
          : field === 'realizado'
            ? await saveIndicatorActuals({ lojaId: storeId, indicatorCode: persistenceCode, year, values, cicloId: props.cicloId })
            : await saveIndicatorField({ lojaId: storeId, indicatorCode: persistenceCode, year, field: 'ano_anterior', values, cicloId: props.cicloId })
        if (result.error) failures.push(`${ind.name}: ${result.error}`)
        else savedCount += 1
      }
      if (failures.length) toast.error(failures[0] ?? 'Falha ao replicar Janeiro.')
      else toast.success(`Janeiro replicado e salvo em ${savedCount} indicador(es).`)
      props.onSaved?.()
      await refetch()
      clientScope.reload()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Falha ao replicar Janeiro.')
    } finally {
      setSavingAll(false)
    }
  }

  const saveAllChanges = async () => {
    if (!storeId || isConsolidated) return
    setSavingAll(true)
    try {
      const editableIndicators = props.indicators.filter(ind => !ind.calculado && isPlanningFieldEditable(ind, activeField))
      let savedCount = 0
      const failures: string[] = []
      for (const ind of editableIndicators) {
        const liveGrid = gridRef.current
        const rawValues = Array.from({ length: 12 }, (_, index) => liveGrid[ind.code]?.[index + 1]?.[activeField] ?? null)
        const values = isQuick ? normalizeQuickEntrySeries(rawValues) : rawValues
        if (!isQuick && activeField === 'meta' && values.every(value => value == null)) continue
        const persistenceCode = resolvePlanningPersistenceCode(ind.code)
        const result = activeField === 'meta'
          ? await saveIndicatorTargets({ lojaId: storeId, indicatorCode: persistenceCode, year, values, cicloId: props.cicloId })
          : activeField === 'realizado'
            ? await saveIndicatorActuals({ lojaId: storeId, indicatorCode: persistenceCode, year, values, cicloId: props.cicloId })
            : await saveIndicatorField({ lojaId: storeId, indicatorCode: persistenceCode, year, field: 'ano_anterior', values, cicloId: props.cicloId })
        if (result.error) failures.push(`${ind.name}: ${result.error}`)
        else savedCount++
      }
      if (failures.length) toast.error(failures[0] ?? 'Não foi possível salvar o cadastro.')
      else toast.success(savedCount ? `${savedCount} indicador(es) salvos.` : 'Nada para salvar.')
      props.onSaved?.()
      await refetch()
      clientScope.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar metas.')
    } finally {
      setSavingAll(false)
    }
  }

  useEffect(() => {
    props.onRegisterSave?.(() => saveAllChanges())
  })

  const departmentCounts = useMemo(() => {
    const counts: Record<string, { total: number; filled: number }> = {}
    for (const ind of props.indicators) {
      const dept = ind.department || 'Outros'
      if (!counts[dept]) counts[dept] = { total: 0, filled: 0 }
      counts[dept].total++
      const hasMeta = Array.from({ length: 12 }, (_, i) => grid[ind.code]?.[i + 1]?.meta).some(v => v != null)
      if (hasMeta) counts[dept].filled++
    }
    return counts
  }, [props.indicators, grid])

  const filteredIndicators = useMemo(() => {
    return props.indicators.filter(indicator => {
      if (selectedDepartment !== 'todos') {
        const deptNorm = (indicator.department ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const selNorm = selectedDepartment.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        if (!deptNorm.includes(selNorm) && !selNorm.includes(deptNorm)) return false
      }
      if (selectedType === 'digitaveis' && indicator.calculado) return false
      if (selectedType === 'calculados' && !indicator.calculado) return false
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const nameMatch = indicator.name.toLowerCase().includes(query)
        const codeMatch = indicator.code.toLowerCase().includes(query)
        const displayMatch = (indicator.displayCode ?? '').toLowerCase().includes(query)
        if (!nameMatch && !codeMatch && !displayMatch) return false
      }
      return true
    })
  }, [props.indicators, searchTerm, selectedDepartment, selectedType])

  const quickProgress = useMemo(() => countQuickEntryProgress({
    indicators: props.indicators,
    valuesFor: code => monthSeries(Array.from({ length: 12 }, (_, index) => grid[code]?.[index + 1]?.[activeField] ?? null)),
  }), [activeField, grid, props.indicators])

  const calculadosRoster = (props.importIndicators ?? props.indicators).filter(indicator => indicator.calculado)
  const calculadosComBase = calculadosRoster.filter(indicator => (
    readOfficialMonthValue(grid, calculationIndicators, indicator.code, summaryMonth, 'meta') != null
  )).length

  useEffect(() => {
    if (!isQuick || !props.onQuickProgress) return
    props.onQuickProgress({
      digitaveisFilled: quickProgress.digitaveisFilled,
      digitaveisTotal: quickProgress.digitaveisTotal,
      calculadosComBase,
      calculadosTotal: calculadosRoster.length,
    })
  }, [calculadosComBase, calculadosRoster.length, isQuick, props.onQuickProgress, quickProgress.digitaveisFilled, quickProgress.digitaveisTotal])

  const exportXlsx = async () => {
    try {
      const { generateStoreTargetTemplateBuffer, downloadExcelBuffer } = await import('@/lib/excelTargetTemplateGenerator')
      const targetIndicators = props.importIndicators ?? props.indicators
      const activeFieldName = activeField === 'realizado' ? 'ACTUAL' : activeField === 'ano_anterior' ? 'PRIOR_YEAR' : 'TARGET'
      const storeName = stores.find(store => store.id === storeId)?.name
      const values = Object.fromEntries(targetIndicators.map(indicator => [
        indicator.code,
        Array.from({ length: 12 }, (_, index) => grid[indicator.code]?.[index + 1]?.[activeField] ?? null),
      ]))
      const { buffer, fileName } = generateStoreTargetTemplateBuffer({
        clientName: props.clientName,
        clientId: props.clientId,
        cycleId: props.cicloId,
        referenceYear: year,
        storeId,
        storeName,
        scopeType: isConsolidated ? 'CONSOLIDATED' : 'STORE',
        viewType: activeFieldName,
        indicators: targetIndicators,
        values,
        isBlankModel: false,
      })
      downloadExcelBuffer(buffer, fileName)
      toast.success('Metas preenchidas exportadas.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível exportar.')
    }
  }

  const downloadBlankTemplate = async () => {
    try {
      const { generateStoreTargetTemplateBuffer, downloadExcelBuffer } = await import('@/lib/excelTargetTemplateGenerator')
      const targetIndicators = props.importIndicators ?? props.indicators
      const activeFieldName = activeField === 'realizado' ? 'ACTUAL' : activeField === 'ano_anterior' ? 'PRIOR_YEAR' : 'TARGET'
      const storeName = stores.find(store => store.id === storeId)?.name
      const { buffer, fileName } = generateStoreTargetTemplateBuffer({
        clientName: props.clientName,
        clientId: props.clientId,
        cycleId: props.cicloId,
        referenceYear: year,
        storeId,
        storeName,
        scopeType: isConsolidated ? 'CONSOLIDATED' : 'STORE',
        viewType: activeFieldName,
        indicators: targetIndicators,
        isBlankModel: true,
      })
      downloadExcelBuffer(buffer, fileName)
      toast.success('Modelo em branco baixado.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível gerar o modelo.')
    }
  }

  return (
    <div className="space-y-5">
      <MxSectionCard>
        <MxSectionHeader
          title={isQuick ? 'Cadastro Rápido' : 'Metas e realizados por loja'}
          description={isQuick
            ? 'Importação da planilha de 46 indicadores, histórico e parâmetros do cliente.'
            : 'Cadastro Rápido, importação/exportação de planilha, histórico com reversão e cópia entre lojas.'}
          actions={(
            <div className="flex flex-wrap items-end gap-2">
              {isQuick ? (
                <MxField label="Mês de conferência">
                  <MxSelect aria-label="Mês de conferência do cadastro rápido" value={String(entryMonth)} onChange={event => setEntryMonth(Number(event.target.value))}>
                    {MONTH_LABELS.map((label, index) => <option key={label} value={String(index + 1)}>{label}</option>)}
                  </MxSelect>
                </MxField>
              ) : null}
              {isQuick ? null : (
                <>
                  <Button variant="primary" onClick={() => void saveAllChanges()} disabled={!storeId || isConsolidated || savingAll}>
                    <Save size={16} />{savingAll ? 'Salvando tudo...' : activeField === 'realizado' ? 'Salvar todo o realizado' : activeField === 'ano_anterior' ? 'Salvar todo o ano anterior' : 'Salvar todas as metas'}
                  </Button>
                  <Button variant="outline" onClick={() => void replicateAllJanToAllMonths(activeField)} disabled={!storeId || isConsolidated || savingAll} title="Replicar valor de Janeiro para os demais meses em todos os indicadores">
                    <Copy size={16} />Replicar Jan em todos os meses
                  </Button>
                  <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
                  <Button variant="outline" onClick={() => void exportXlsx()} disabled={!storeId || props.indicators.length === 0}><Download size={16} />{activeField === 'realizado' ? 'Exportar realizado preenchido' : activeField === 'ano_anterior' ? 'Exportar ano anterior preenchido' : 'Exportar metas preenchidas'}</Button>
                </>
              )}
              <Button variant="outline" onClick={() => void downloadBlankTemplate()} disabled={!storeId || props.indicators.length === 0}><Download size={16} />Baixar Tabela Modelo</Button>
              {isQuick ? null : <Button variant="outline" onClick={() => setCopyOpen(true)} disabled={!storeId || isConsolidated}><Copy size={16} />Copiar entre lojas</Button>}
              <Button variant="outline" onClick={() => setImportOpen(true)} disabled={!storeId || isConsolidated}><Upload size={16} />Importar Tabela</Button>
              {props.onNavigateToHistory ? <Button variant="outline" onClick={props.onNavigateToHistory}><History size={16} />Histórico</Button> : null}
              {props.onNavigateToParams ? <Button variant="outline" onClick={props.onNavigateToParams}><SlidersHorizontal size={16} />Parâmetros</Button> : null}
            </div>
          )}
        />

        <div className="p-5">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <MxField label="Loja">
              <MxSelect aria-label="Loja" value={storeId} onChange={event => setStoreId(event.target.value)}>
                {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
              </MxSelect>
            </MxField>
            {isQuick ? null : (
              <MxField label="Ano">
                <MxSelect aria-label="Ano" value={String(year)} onChange={event => setYear(Number(event.target.value))}>
                  {[year - 1, year, year + 1].map(item => <option key={item} value={String(item)}>{item}</option>)}
                </MxSelect>
              </MxField>
            )}
            {!isQuick && clientScope.supportsConsolidated ? (
              <MxField label="Escopo">
                <MxSelect aria-label="Escopo" value={scope} onChange={event => setScope(event.target.value)}>
                  <option value="">Somente esta unidade</option>
                  <option value={CONSOLIDATED_SCOPE}>
                    Consolidado do cliente ({clientScope.units.filter(unit => unit.active).length} unidades)
                  </option>
                </MxSelect>
              </MxField>
            ) : null}
          </div>

          {scopeNotice ? <MxStatusBanner tone="warning">{scopeNotice}</MxStatusBanner> : null}

          {isConsolidated ? (
            <MxStatusBanner tone={partialMonths > 0 ? 'warning' : 'neutral'}>
              {partialMonths > 0
                ? `Consolidado de ${clientScope.units.filter(unit => unit.active).length} unidades. ${partialMonths} ${partialMonths === 1 ? 'mês tem' : 'meses têm'} unidade sem lançamento — o total mostra apenas o que foi cadastrado.`
                : `Consolidado de ${clientScope.units.filter(unit => unit.active).length} unidades. Percentuais e médias são recalculados sobre as bases, não somados.`}
              {' '}A edição de metas continua sendo por unidade.
            </MxStatusBanner>
          ) : null}

          {isQuick ? (
            <div className="space-y-5">
              <MxMetricGrid>
                <MxMetricCard title="Metas digitáveis" value={`${quickProgress.digitaveisFilled} de ${quickProgress.digitaveisTotal}`} detail="Ano completo no campo ativo" icon={Target} tone="info" />
                <MxMetricCard title="Calculados com base" value={`${calculadosComBase} de ${calculadosRoster.length}`} detail="Derivados com entrada suficiente" icon={Target} tone="success" />
                <MxMetricCard title="Sem base" value={Math.max(calculadosRoster.length - calculadosComBase, 0)} detail="Falta lançamento nos digitáveis" icon={Target} />
                {props.planStatusLabel ? <MxMetricCard title="Status do Plano" value={props.planStatusLabel} detail="Ciclo do plano estratégico" icon={Target} /> : null}
              </MxMetricGrid>
              <StrategicPlanQuickEntry
                indicators={filteredIndicators}
                importIndicators={importCatalog}
                field={activeField}
                entryMonth={entryMonth}
                grid={grid}
                readMonthValue={(code, month) => (
                  isConsolidated
                    ? (activeField === 'realizado' ? consolidatedActualGrid[code]?.[month] : activeField === 'ano_anterior' ? consolidatedPreviousGrid[code]?.[month] : consolidatedGrid[code]?.[month]) ?? null
                    : resolveStoreScopedValue(
                      activeField === 'meta'
                        ? readOfficialMonthValue(grid, calculationIndicators, code, month, 'meta')
                        : grid[code]?.[month]?.[activeField] ?? null,
                    )
                )}
                drafts={cellDrafts}
                onDraft={(key, raw) => setCellDrafts(current => ({ ...current, [key]: raw }))}
                onCommit={(code, month, raw) => void (isQuick ? commitCell(code, month, activeField, raw) : updateCell(code, month, activeField, raw))}
                onCommitYear={commitYear}
                onCopyPrevious={code => writeYear(code, activeField, copyPreviousMonthSeries(monthSeries(Array.from({ length: 12 }, (_, index) => grid[code]?.[index + 1]?.[activeField] ?? null))))}
                onClearYear={code => { void (async () => {
                  writeYear(code, activeField, clearMonthSeries())
                  await persistIndicatorYearValues(code, activeField, clearMonthSeries())
                  await refetch()
                  clientScope.reload()
                })() }}
                loading={loading}
                error={error}
                onRetry={() => void refetch()}
                readOnly={isConsolidated}
                draftKey={(code, month) => planningCellDraftKey(activeField, code, month)}
                resumo={resumoCalculado}
              />
            </div>
          ) : null}

          {isQuick ? (
            <div className="mt-8 space-y-4 border-t border-border-subtle pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Metas e realizadas por loja</h3>
                  <p className="text-sm text-muted-foreground">{props.clientName ? `${props.clientName} · ${year}` : `Ano ${year}`}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
                  <Button variant="outline" onClick={() => void exportXlsx()} disabled={!storeId || props.indicators.length === 0}><Download size={16} />{activeField === 'realizado' ? 'Exportar realizado preenchido' : activeField === 'ano_anterior' ? 'Exportar ano anterior preenchido' : 'Exportar metas preenchidas'}</Button>
                </div>
              </div>
            </div>
          ) : null}

          {!isQuick ? (
            <div className="mb-5">
            <MxSectionCard>
              <MxSectionHeader
                title="Resumo Calculado"
                description={`Resultados derivados em tempo real · mês de conferência: ${MONTH_LABELS[conferenceMonth - 1]}`}
              />
              <div className="p-5">
                <MxMetricGrid>
                  {resumoCalculado.map(item => (
                    <MxMetricCard
                      key={item.code}
                      title={item.label}
                      value={formatDisplay(item.monthValue, getFormatConfig('number', 0))}
                      detail={item.annual == null ? 'Sem base anual' : `Anual ${formatDisplay(item.annual, getFormatConfig('number', 0))}`}
                      icon={Target}
                      tone={item.monthValue == null ? 'neutral' : 'info'}
                    />
                  ))}
                </MxMetricGrid>
              </div>
            </MxSectionCard>
          </div>
          ) : null}

          {/* Barra de Filtros e Departamentos estilo Base44 */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2 max-w-md">
                <div className="relative w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou código..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9"
                    aria-label="Buscar indicadores"
                  />
                </div>
                {searchTerm ? (
                  <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>Limpar</Button>
                ) : null}
              </div>

              <div className="flex items-center gap-1 rounded-md border border-border p-1 bg-background-muted/30">
                {props.indicators.some(indicator => indicator.calculado) ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedType('todos')}
                      className={`px-3 py-1 text-xs font-medium rounded ${selectedType === 'todos' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Todos ({props.indicators.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('digitaveis')}
                      className={`px-3 py-1 text-xs font-medium rounded ${selectedType === 'digitaveis' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Digitáveis ({props.indicators.filter(i => !i.calculado).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('calculados')}
                      className={`px-3 py-1 text-xs font-medium rounded ${selectedType === 'calculados' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Calculados ({props.indicators.filter(i => i.calculado).length})
                    </button>
                  </>
                ) : (
                  <span className="px-3 py-1 text-xs font-medium text-muted-foreground">
                    {props.indicators.length} indicadores digitáveis
                  </span>
                )}
              </div>
            </div>

            {/* Departamentos */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-border/50">
              <button
                type="button"
                onClick={() => setSelectedDepartment('todos')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                  selectedDepartment === 'todos'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-muted'
                }`}
              >
                Todos os Departamentos
              </button>
              {['Comercial', 'Marketing', 'Produto e Estoque', 'Financeiro', 'Operações', 'Pessoas - RH'].map(dept => {
                const count = departmentCounts[dept]
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDepartment(dept)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all flex items-center gap-1.5 ${
                      selectedDepartment === dept
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <span>{dept}</span>
                    {count ? (
                      <span className={`text-caption px-1.5 py-0.5 rounded-full ${selectedDepartment === dept ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {count.filled}/{count.total}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          {loading ? <MxLoadingState label="Carregando metas" /> : error ? <MxErrorState description={error} retry={() => void refetch()} /> : (
            <div className="overflow-x-auto">
              <MxTableSurface>
                <Table className="min-w-[1100px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Indicador</TableHead>
                      {MONTH_LABELS.map(label => <TableHead key={label} className="text-right">{label}</TableHead>)}
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIndicators.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={14} className="text-center py-8 text-muted-foreground text-sm">
                          Nenhum indicador encontrado para os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : filteredIndicators.map(indicator => {
                      const config = getFormatConfig(indicator.value_type ?? 'number', indicator.casas_decimais ?? 0)
                      const metaKey = `meta:${indicator.code}`
                      const actualKey = `realizado:${indicator.code}`
                      const previousKey = `ano-anterior:${indicator.code}`
                      return (
                        <Fragment key={indicator.code}>
                          <TableRow key={metaKey}>
                            <TableCell>
                              <div className="font-semibold text-foreground">{indicator.name}</div>
                              <div className="text-xs text-muted-foreground">{indicator.displayCode ?? indicator.code}{indicator.calculado ? ' · calculado' : ''} · Meta</div>
                            </TableCell>
                            {MONTH_LABELS.map((_label, index) => {
                              const month = index + 1
                              const value = isConsolidated
                                ? consolidatedGrid[indicator.code]?.[month] ?? null
                                : resolveStoreScopedValue(readOfficialMonthValue(grid, calculationIndicators, indicator.code, month, 'meta'))
                              const integrity = isConsolidated ? consolidatedIntegrity[month]?.[indicator.code] : undefined
                              return (
                                <TableCell key={month} className="text-right">
                                  {isConsolidated || indicator.calculado ? (
                                    <span
                                      className="text-xs text-muted-foreground"
                                      title={integrity?.explanation || undefined}
                                    >
                                      {formatDisplay(value, config)}
                                      {partialMark(integrity)}
                                    </span>
                                  ) : (
                                    <PlanningMonthInput
                                      ariaLabel={`${indicator.name} — Meta — ${MONTH_LABELS[index]}`}
                                      displayValue={value}
                                      config={config}
                                      draft={cellDrafts[planningCellDraftKey('meta', indicator.code, month)]}
                                      onDraft={raw => setCellDrafts(current => ({ ...current, [planningCellDraftKey('meta', indicator.code, month)]: raw }))}
                                      onCommit={raw => updateCell(indicator.code, month, 'meta', raw)}
                                    />
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {!indicator.calculado && !isConsolidated ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Replicar Jan em todos os meses para ${indicator.name}`}
                                    title="Replicar valor de Janeiro para os demais meses (Fev-Dez)"
                                    onClick={() => void replicateMonthToAll(indicator.code, 'meta', 1)}
                                  >
                                    <Copy size={14} className="mr-1" /> Replicar Jan
                                  </Button>
                                ) : null}
                                <Button variant="outline" size="sm" aria-label={`Abrir histórico de ${indicator.name}`} title={`Abrir histórico de ${indicator.name}`} onClick={() => setHistoryFor(indicator.code)} disabled={savingKey === metaKey}><History size={14} /></Button>
                                {!indicator.calculado && !isConsolidated ? (
                                  <Button variant="outline" size="sm" aria-label={`Salvar metas de ${indicator.name}`} title={`Salvar metas de ${indicator.name}`} onClick={() => void saveIndicator(indicator.code, 'meta')} disabled={savingKey === metaKey}>
                                    {savingKey === metaKey ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                  </Button>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow key={actualKey} className="bg-background-muted/40">
                            <TableCell>
                              <div className="text-xs font-medium text-muted-foreground">Realizado</div>
                            </TableCell>
                            {MONTH_LABELS.map((_label, index) => {
                              const month = index + 1
                              const editable = !isConsolidated && isPlanningFieldEditable(indicator, 'realizado')
                              const value = isConsolidated
                                ? consolidatedActualGrid[indicator.code]?.[month] ?? null
                                : resolveStoreScopedValue(
                                  editable
                                    ? grid[indicator.code]?.[month]?.realizado
                                    : readOfficialMonthValue(grid, calculationIndicators, indicator.code, month, 'realizado'),
                                )
                              const integrity = isConsolidated ? consolidatedActualIntegrity[month]?.[indicator.code] : undefined
                              return (
                                <TableCell key={month} className="text-right">
                                  {!editable ? (
                                    <span className="text-xs text-muted-foreground" aria-label={`${indicator.name} — Realizado — ${MONTH_LABELS[index]}`} title={integrity?.explanation || undefined}>
                                      {formatDisplay(value, config)}
                                      {partialMark(integrity)}
                                    </span>
                                  ) : (
                                    <PlanningMonthInput
                                      ariaLabel={`${indicator.name} — Realizado — ${MONTH_LABELS[index]}`}
                                      displayValue={value}
                                      config={config}
                                      draft={cellDrafts[planningCellDraftKey('realizado', indicator.code, month)]}
                                      onDraft={raw => setCellDrafts(current => ({ ...current, [planningCellDraftKey('realizado', indicator.code, month)]: raw }))}
                                      onCommit={raw => updateCell(indicator.code, month, 'realizado', raw)}
                                    />
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right">
                              {!isConsolidated && isPlanningFieldEditable(indicator, 'realizado') ? (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Replicar Jan em todos os meses para realizado de ${indicator.name}`}
                                    title="Replicar realizado de Janeiro para os demais meses"
                                    onClick={() => void replicateMonthToAll(indicator.code, 'realizado', 1)}
                                  >
                                    <Copy size={14} className="mr-1" /> Replicar Jan
                                  </Button>
                                  <Button variant="outline" size="sm" aria-label={`Salvar realizado de ${indicator.name}`} title={`Salvar realizado de ${indicator.name}`} onClick={() => void saveIndicator(indicator.code, 'realizado')} disabled={savingKey === actualKey}>
                                    {savingKey === actualKey ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                  </Button>
                                </div>
                              ) : <span className="text-xs text-muted-foreground">Somente leitura</span>}
                            </TableCell>
                          </TableRow>
                          <TableRow key={previousKey} className="bg-background-muted/20">
                            <TableCell>
                              <div className="text-xs font-medium text-muted-foreground">Ano anterior</div>
                            </TableCell>
                            {MONTH_LABELS.map((_label, index) => {
                              const month = index + 1
                              const editable = !isConsolidated && isPlanningFieldEditable(indicator, 'ano_anterior')
                              const value = isConsolidated
                                ? consolidatedPreviousGrid[indicator.code]?.[month] ?? null
                                : resolveStoreScopedValue(
                                  editable
                                    ? grid[indicator.code]?.[month]?.ano_anterior
                                    : readOfficialMonthValue(grid, calculationIndicators, indicator.code, month, 'ano_anterior'),
                                )
                              return (
                                <TableCell key={month} className="text-right">
                                  {editable ? (
                                    <PlanningMonthInput
                                      ariaLabel={`${indicator.name} — Ano anterior — ${MONTH_LABELS[index]}`}
                                      displayValue={value}
                                      config={config}
                                      draft={cellDrafts[planningCellDraftKey('ano_anterior', indicator.code, month)]}
                                      onDraft={raw => setCellDrafts(current => ({ ...current, [planningCellDraftKey('ano_anterior', indicator.code, month)]: raw }))}
                                      onCommit={raw => updateCell(indicator.code, month, 'ano_anterior', raw)}
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground">{formatDisplay(value, config)}</span>
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right">
                              {!isConsolidated && isPlanningFieldEditable(indicator, 'ano_anterior') ? (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    aria-label={`Replicar Jan em todos os meses para ano anterior de ${indicator.name}`}
                                    title="Replicar ano anterior de Janeiro para os demais meses"
                                    onClick={() => void replicateMonthToAll(indicator.code, 'ano_anterior', 1)}
                                  >
                                    <Copy size={14} className="mr-1" /> Replicar Jan
                                  </Button>
                                  <Button variant="outline" size="sm" aria-label={`Salvar ano anterior de ${indicator.name}`} title={`Salvar ano anterior de ${indicator.name}`} onClick={() => void saveIndicator(indicator.code, 'ano_anterior')} disabled={savingKey === previousKey}>
                                    {savingKey === previousKey ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                  </Button>
                                </div>
                              ) : <span className="text-xs text-muted-foreground">Somente leitura</span>}
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </MxTableSurface>
            </div>
          )}
        </div>
      </MxSectionCard>

      {copyOpen ? (
        <CopyStoreTargetsModal
          open
          indicators={props.indicators}
          rows={rows}
          storeId={storeId}
          year={year}
          stores={stores}
          onClose={() => setCopyOpen(false)}
          onApplied={async () => { await refetch(); clientScope.reload(); props.onSaved?.() }}
        />
      ) : null}

      {historyFor ? (
        <PlanningHistoryDrawer
          open
          lojaId={storeId}
          indicatorCode={historyFor}
          year={year}
          onClose={() => setHistoryFor(null)}
          onRestored={async () => { await refetch(); props.onSaved?.() }}
        />
      ) : null}

      <TargetImportModal
        open={importOpen}
        lojaId={storeId}
        indicators={importCatalog}
        currentValues={rows.map(row => ({ indicator_code: row.indicator_code, month: row.month, value: row.meta }))}
        year={year}
        clientName={props.clientName}
        onClose={() => setImportOpen(false)}
        onImported={async () => { setImportOpen(false); await refetch(); clientScope.reload(); props.onSaved?.() }}
      />
    </div>
  )
}

function CopyStoreTargetsModal(props: {
  open: boolean
  indicators: TargetIndicator[]
  rows: StoreTargetValue[]
  storeId: string
  year: number
  stores: StoreOption[]
  onClose: () => void
  onApplied: () => void
}) {
  const [targetStoreIds, setTargetStoreIds] = useState<string[]>([])
  const [conflictPolicy, setConflictPolicy] = useState<CopyConflictPolicy>('FILL_EMPTY_ONLY')
  const [preview, setPreview] = useState<CopyPreview | null>(null)
  const [includedRows, setIncludedRows] = useState<Record<string, boolean>>({})
  const [applying, setApplying] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  const targets = props.stores.filter(store => store.id !== props.storeId)

  const loadPreview = async () => {
    if (targetStoreIds.length === 0) return
    setPreviewLoading(true)
    try {
      const results = await Promise.all(targetStoreIds.map(async targetStoreId => ({
        targetStoreId,
        result: await fetchStorePlanningValues(targetStoreId, props.year),
      })))
      const failed = results.find(item => item.result.error)
      if (failed) {
        setPreview(null)
        toast.error(`Não foi possível carregar ${props.stores.find(store => store.id === failed.targetStoreId)?.name ?? 'a loja destino'}: ${failed.result.error}`)
        return
      }

      const targetValues = results.flatMap(item => item.result.rows)
      const result = previewStoreTargetsCopy({
        sourceValues: props.rows,
        targetValues,
        indicators: props.indicators,
        targetStores: targets.filter(store => targetStoreIds.includes(store.id)),
        selectedMonths: [],
        selectedIndicatorCodes: [],
        conflictPolicy,
      })
      setPreview(result)
      const included: Record<string, boolean> = {}
      for (const row of result.rows) {
        included[`${row.indicatorCode}|${row.month}|${row.storeId}`] = row.included
      }
      setIncludedRows(included)
    } finally {
      setPreviewLoading(false)
    }
  }

  const apply = async () => {
    if (!preview) return
    setApplying(true)
    const mutations = buildStoreCopyMutations({
      preview,
      year: props.year,
      conflictPolicy,
      includedRows: conflictPolicy === 'CELL_BY_CELL' ? includedRows : undefined,
    })
    const result = await applyStoreCopyMutations(mutations)
    if (result.error) toast.error(result.error)
    else {
      toast.success(`${result.applied} células copiadas.`)
      props.onApplied()
      props.onClose()
    }
    setApplying(false)
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Copiar metas entre lojas"
      size="xl"
      closeOnEscape={!applying}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={applying}>Fechar</Button>
          {!preview ? (
            <Button onClick={() => void loadPreview()} disabled={targetStoreIds.length === 0 || previewLoading}>{previewLoading ? 'Carregando...' : 'Ver prévia'}</Button>
          ) : (
            <Button onClick={() => void apply()} disabled={applying}>{applying ? 'Copiando...' : 'Confirmar cópia'}</Button>
          )}
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <MxStatusBanner tone="info">Origem: {props.stores.find(store => store.id === props.storeId)?.name ?? 'Loja'} · {props.year}. Indicadores calculados serão recalculados no destino; empresariais não são copiados.</MxStatusBanner>

        <MxField label="Loja(s) de destino">
          <div className="space-y-2">
            {targets.map(store => (
              <label key={store.id} className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  checked={targetStoreIds.includes(store.id)}
                  onChange={() => {
                    setTargetStoreIds(current => current.includes(store.id) ? current.filter(id => id !== store.id) : [...current, store.id])
                    setPreview(null)
                    setIncludedRows({})
                  }}
                />
                <span>{store.name}</span>
              </label>
            ))}
            {targets.length === 0 ? <MxEmptyState variant="dataset" title="Sem outras lojas" description="Não há outras lojas para copiar." /> : null}
          </div>
        </MxField>

        <MxField label="Política de conflito">
          <MxSelect aria-label="Política de conflito" value={conflictPolicy} onChange={event => { setConflictPolicy(event.target.value as CopyConflictPolicy); setPreview(null) }}>
            <option value="FILL_EMPTY_ONLY">Preencher somente campos vazios</option>
            <option value="REPLACE_SELECTED">Substituir os valores selecionados</option>
            <option value="CELL_BY_CELL">Revisar célula por célula</option>
          </MxSelect>
        </MxField>

        {preview ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {[
                ['A preencher', preview.counters.toFill, 'bg-success/10'],
                ['A substituir', preview.counters.toReplace, 'bg-warning/10'],
                ['Preservados', preview.counters.preserved, 'bg-background-muted'],
                ['Ignorados', preview.counters.ignored, 'bg-background-muted'],
              ].map(([label, value, className]) => (
                <div key={String(label)} className={`rounded-lg border border-border p-2.5 ${className}`}>
                  <div className="text-muted-foreground">{label}</div>
                  <div className="text-lg font-bold text-foreground">{value}</div>
                </div>
              ))}
            </div>
            <div className="max-h-72 overflow-auto rounded-lg border border-border">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    {conflictPolicy === 'CELL_BY_CELL' ? <TableHead className="w-8" /> : null}
                    <TableHead>Indicador</TableHead>
                    <TableHead>Mês</TableHead>
                    <TableHead>Loja destino</TableHead>
                    <TableHead className="text-right">Origem</TableHead>
                    <TableHead className="text-right">Atual</TableHead>
                    <TableHead className="text-right">Novo</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.filter(row => row.action !== 'IGNORAR').map(row => {
                    const key = `${row.indicatorCode}|${row.month}|${row.storeId}`
                    return (
                      <TableRow key={key}>
                        {conflictPolicy === 'CELL_BY_CELL' ? (
                          <TableCell>
                            <input type="checkbox" checked={includedRows[key] ?? false} onChange={() => setIncludedRows(current => ({ ...current, [key]: !current[key] }))} />
                          </TableCell>
                        ) : null}
                        <TableCell className="text-xs">{row.indicatorName}</TableCell>
                        <TableCell className="text-xs">{MONTH_LABELS[row.month - 1]}</TableCell>
                        <TableCell className="text-xs">{row.storeName}</TableCell>
                        <TableCell className="text-right text-xs">{formatDisplay(row.sourceValue, getFormatConfig(props.indicators.find(item => item.code === row.indicatorCode)?.value_type ?? 'number', props.indicators.find(item => item.code === row.indicatorCode)?.casas_decimais ?? 0))}</TableCell>
                        <TableCell className="text-right text-xs">{formatDisplay(row.targetCurrent, getFormatConfig(props.indicators.find(item => item.code === row.indicatorCode)?.value_type ?? 'number', props.indicators.find(item => item.code === row.indicatorCode)?.casas_decimais ?? 0))}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{formatDisplay(row.newValue, getFormatConfig(props.indicators.find(item => item.code === row.indicatorCode)?.value_type ?? 'number', props.indicators.find(item => item.code === row.indicatorCode)?.casas_decimais ?? 0))}</TableCell>
                        <TableCell className="text-xs">{row.action}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function PlanningHistoryDrawer(props: {
  open: boolean
  lojaId: string
  indicatorCode: string
  year: number
  onClose: () => void
  onRestored: () => void
}) {
  const [rows, setRows] = useState<PlanningHistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    let active = true
    void fetchPlanningHistory(props.lojaId, props.indicatorCode, props.year).then(result => {
      if (!active) return
      setRows(result.rows)
      setLoading(false)
    })
    return () => { active = false }
  }, [props.lojaId, props.indicatorCode, props.year])

  const restore = async (id: string) => {
    setRestoring(true)
    const result = await restorePlanningHistory(id, 'Restaurado pelo Administrador MX')
    if (result.error) toast.error(result.error)
    else {
      toast.success('Versão restaurada.')
      props.onRestored()
      props.onClose()
    }
    setRestoring(false)
  }

  const parseValues = (values: unknown): Array<number | null> => {
    if (Array.isArray(values)) return values.map(value => typeof value === 'number' ? value : null)
    return []
  }

  return (
    <Modal open={props.open} onClose={props.onClose} title={`Histórico — ${props.indicatorCode}`} size="lg" closeOnEscape={!restoring}>
      <div className="mt-5 space-y-3">
        {loading ? <MxLoadingState label="Carregando histórico" /> : rows.length === 0 ? (
          <MxEmptyState variant="dataset" title="Sem histórico" description="Nenhuma alteração registrada para este indicador neste ano." />
        ) : (
          rows.map(row => (
            <div key={row.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="rounded bg-background-muted px-1.5 py-0.5 text-caption font-medium uppercase text-muted-foreground">
                    {row.field === 'realizado' ? 'Realizado' : 'Meta'}
                  </span>
                  {new Date(row.created_at).toLocaleString('pt-BR')}
                </span>
                <Button variant="outline" size="sm" onClick={() => void restore(row.id)} disabled={restoring}><Check size={14} />Restaurar</Button>
              </div>
              {row.note ? <div className="mt-1 text-xs text-muted-foreground">{row.note}</div> : null}
              <div className="mt-2 flex flex-wrap gap-1">
                {parseValues(row.previous_values).map((value, index) => (
                  <span key={index} className="rounded bg-background-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {MONTH_LABELS[index]}: {value ?? '—'}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}

function TargetImportModal(props: {
  open: boolean
  lojaId: string
  indicators: TargetIndicator[]
  currentValues: Array<{ indicator_code: string; month: number; value: number | null }>
  year: number
  clientName?: string
  onClose: () => void
  onImported: () => void
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [changes, setChanges] = useState<TargetImportChange[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [validating, setValidating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const steps = ['Arquivo', 'Validação', 'Prévia', 'Confirmar'] as const

  const reset = useCallback(() => {
    setSelectedFile(null)
    setChanges([])
    setProblem(null)
    setStep(1)
    setValidating(false)
    setImporting(false)
  }, [])

  useEffect(() => {
    if (!props.open) {
      reset()
      return
    }
    reset()
  }, [props.open, reset])

  const validateFile = useCallback(async (file: File) => {
    setValidating(true)
    setProblem(null)
    setChanges([])
    try {
      const { readXlsxTable } = await import('@/lib/xlsx-reader')
      const buffer = await file.arrayBuffer()
      const { headers, rows: matrix } = readXlsxTable(buffer)
      const importRows = matrix.map(row => ({
        code: readIndicatorCodeFromRow(row),
        months: MONTH_LABELS.map(label => {
          const value = row[label]
          return value === undefined || value === null ? null : value as number | string
        }),
        total: (row['Total'] ?? null) as number | string | null,
        observation: (row['Observação'] ?? row['Observacao'] ?? null) as string | null,
      }))
      const next = processTargetImport({
        rows: importRows,
        indicators: props.indicators,
        currentValues: props.currentValues,
        isPercentage: code => {
          const indicator = props.indicators.find(item => item.code === code)
          return getFormatConfig(indicator?.value_type ?? 'number', indicator?.casas_decimais ?? 0).value_format === 'PERCENTAGE'
        },
      })
      const codesInFile = importRows.map(row => row.code).filter(Boolean)
      const invalid = next.filter(change => change.action === 'INVALID')
      const actionable = next.filter(change => change.action === 'UPDATE' || change.action === 'CLEAR')
      setChanges(next)
      setProblem(invalid.length > 0
        ? `${invalid.length} célula(s) precisam de correção. ${invalid[0]?.error ?? ''}`
        : actionable.length > 0
          ? null
          : diagnoseEmptyImport({ headers, matrix, codesInFile, indicators: props.indicators }))
      setStep(2)
    } catch (cause) {
      setChanges([])
      setProblem(cause instanceof Error ? cause.message : 'Não foi possível ler a planilha.')
      setStep(2)
    } finally {
      setValidating(false)
    }
  }, [props.currentValues, props.indicators])

  const pickFile = (file: File | null) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Selecione um arquivo .xlsx gerado pelo modelo MX Performance.')
      return
    }
    setSelectedFile(file)
    void validateFile(file)
  }

  const apply = async () => {
    if (!props.lojaId) {
      toast.error('Selecione a loja antes de importar.')
      return
    }
    const invalid = changes.filter(change => change.action === 'INVALID')
    const actionable = changes.filter(change => change.action === 'UPDATE' || change.action === 'CLEAR')
    if (invalid.length > 0) {
      toast.error(invalid[0]?.error ?? 'Corrija os valores inválidos antes de importar.')
      return
    }
    if (actionable.length === 0) {
      toast.error('Nenhuma alteração válida para importar.')
      return
    }
    setImporting(true)
    const batches = buildImportSaveBatches({
      changes: actionable,
      currentValues: props.currentValues,
    })
    let appliedCells = 0
    const failures: string[] = []
    for (const batch of batches) {
      const result = await saveIndicatorTargets({
        lojaId: props.lojaId,
        indicatorCode: resolvePlanningPersistenceCode(batch.indicatorCode),
        year: props.year,
        values: batch.values,
      })
      if (result.error) failures.push(`${batch.indicatorCode}: ${result.error}`)
      else appliedCells += actionable.filter(change => change.indicatorCode === batch.indicatorCode).length
    }
    setImporting(false)
    if (failures.length === 0) {
      toast.success(`${appliedCells} células importadas.`)
      props.onImported()
    } else {
      toast.error(`${failures.length} indicador(es) não importado(s). ${failures[0]}`)
    }
  }

  const actionableChanges = changes.filter(change => change.action === 'UPDATE' || change.action === 'CLEAR')
  const invalidChanges = changes.filter(change => change.action === 'INVALID')

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Importar Tabela — Metas"
      size="lg"
      closeOnEscape={!importing}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={importing}>Cancelar</Button>
          {step === 1 ? (
            <Button onClick={() => fileInputRef.current?.click()} disabled={validating}>
              Escolher arquivo .xlsx
            </Button>
          ) : null}
          {step === 2 ? (
            <Button onClick={() => setStep(problem ? 1 : 3)} disabled={validating || !selectedFile}>
              {problem ? 'Voltar ao arquivo' : 'Ver prévia'}
            </Button>
          ) : null}
          {step === 3 ? (
            <>
              <Button variant="outline" onClick={() => setStep(2)} disabled={importing}>Voltar à validação</Button>
              <Button onClick={() => setStep(4)} disabled={actionableChanges.length === 0 || invalidChanges.length > 0}>
                Revisar confirmação
              </Button>
            </>
          ) : null}
          {step === 4 ? (
            <>
              <Button variant="outline" onClick={() => setStep(3)} disabled={importing}>Voltar à prévia</Button>
              <Button onClick={() => void apply()} disabled={importing || actionableChanges.length === 0 || invalidChanges.length > 0}>
                {importing ? 'Importando...' : 'Confirmar importação'}
              </Button>
            </>
          ) : null}
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <ol className="flex flex-wrap gap-2 text-xs font-medium">
          {steps.map((label, index) => {
            const current = index + 1
            const active = step === current
            const done = step > current
            return (
              <li key={label} className={`rounded-full px-3 py-1 ${active ? 'bg-primary text-primary-foreground' : done ? 'bg-muted text-foreground' : 'bg-background-muted text-muted-foreground'}`}>
                {current}. {label}
              </li>
            )
          })}
        </ol>
        <MxStatusBanner tone="neutral">
          Cliente: {props.clientName ?? '—'} · Visão: Metas · Ano: {props.year} · Unidade: {props.lojaId ? 'selecionada' : '—'}
        </MxStatusBanner>
        {step === 1 ? (
          <div
            className="space-y-4 rounded-xl border border-dashed border-border bg-surface-alt p-6 text-center"
            onDragOver={event => { event.preventDefault(); event.stopPropagation() }}
            onDrop={event => {
              event.preventDefault()
              event.stopPropagation()
              pickFile(event.dataTransfer.files?.[0] ?? null)
            }}
          >
            <Upload size={24} className="mx-auto text-muted-foreground" aria-hidden />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">1. Arquivo</p>
              <p className="text-sm text-muted-foreground">Arraste a planilha .xlsx do modelo MX Performance ou escolha no computador. A validação começa no próximo passo.</p>
            </div>
            {selectedFile ? (
              <p className="text-xs text-muted-foreground">Selecionado: {selectedFile.name}</p>
            ) : null}
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={validating}>
              {validating ? 'Validando...' : 'Escolher arquivo .xlsx'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              tabIndex={-1}
              onChange={event => {
                pickFile(event.target.files?.[0] ?? null)
                event.currentTarget.value = ''
              }}
            />
          </div>
        ) : null}
        {step === 2 ? (
          <div className="space-y-3 rounded-xl border border-border bg-surface-alt p-4">
            <p className="text-sm font-semibold text-foreground">2. Validação</p>
            <MxStatusBanner tone={problem ? 'warning' : validating ? 'neutral' : 'info'}>
              {validating
                ? 'Validando arquivo...'
                : problem
                  ? `${selectedFile?.name ?? 'Arquivo'} · ${problem}`
                  : `${selectedFile?.name ?? 'Arquivo'} · ${actionableChanges.length} célula(s) pronta(s) para importar.`}
            </MxStatusBanner>
            {!validating && invalidChanges.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                {invalidChanges.slice(0, 12).map((change, index) => (
                  <p key={index}>{change.indicatorCode} · {MONTH_LABELS[change.month - 1]} · {change.error ?? 'inválido'}</p>
                ))}
                {invalidChanges.length > 12 ? <p>… e mais {invalidChanges.length - 12} célula(s).</p> : null}
              </div>
            ) : null}
            {!validating && !problem ? (
              <p className="text-xs text-muted-foreground">Célula vazia preserva o valor atual; LIMPAR apaga; Realizado e Ano Anterior não são alterados.</p>
            ) : null}
          </div>
        ) : null}
        {step >= 3 ? (
          <MxStatusBanner tone={problem ? 'warning' : 'info'}>
            {`${selectedFile?.name ?? 'Arquivo'} · ${actionableChanges.length} alteração(ões) na prévia.`}
          </MxStatusBanner>
        ) : null}
        {step >= 3 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">3. Prévia</p>
        <div className="max-h-72 overflow-auto rounded-lg border border-border">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Ação / detalhe</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change, index) => (
                <TableRow key={index}>
                  <TableCell className="text-xs">{change.indicatorCode}</TableCell>
                  <TableCell className="text-xs">{MONTH_LABELS[change.month - 1]}</TableCell>
                  <TableCell className="text-right text-xs">
                    {change.action === 'CLEAR'
                      ? 'LIMPAR'
                      : formatDisplay(change.newValue, getFormatConfig(
                        props.indicators.find(item => item.code === change.indicatorCode)?.value_type ?? 'number',
                        props.indicators.find(item => item.code === change.indicatorCode)?.casas_decimais ?? 0,
                      ))}
                  </TableCell>
                  <TableCell className="text-xs">{change.error ?? change.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        </div>
        ) : null}
        {step === 4 ? (
          <div className="space-y-2 rounded-xl border border-border bg-surface-alt p-4">
            <p className="text-sm font-semibold text-foreground">4. Confirmar</p>
            <p className="text-sm text-muted-foreground">
              Confirme a importação de {actionableChanges.length} alteração(ões) de meta para o ano {props.year}.
            </p>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

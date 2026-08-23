import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, History, RefreshCw, Save, Target, Upload } from 'lucide-react'
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
import { MONTH_LABELS, getFormatConfig, formatDisplay, formatEditableInput, parseStrategicInput } from '../indicadores/indicatorFormulas'
import { resolveLastClosedCompetence } from '@/features/strategic-plan/competence'
import { diagnoseEmptyImport } from '../indicadores/importDiagnosis'
import {
  buildImportSaveBatches,
  buildOfficialMonthlyGrid,
  readOfficialMonthValue,
  buildTargetWorkbookSheets,
  buildStoreCopyMutations,
  isPlanningFieldEditable,
  processTargetImport,
  previewStoreTargetsCopy,
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

type StoreOption = { id: string; name: string }

const DEFAULT_YEAR = new Date().getFullYear()

function partialMark(integrity?: IndicatorIntegrity): string {
  if (integrity?.status !== CONSOLIDATION_STATUS.PARCIAL) return ''
  return ` ${formatPartialUnitsLabel(integrity.unitsWithData, integrity.totalUnits) ?? '*'}`
}

export function MetasRealizadosTab(props: {
  indicators: TargetIndicator[]
  onNavigateToParams?: () => void
  initialStoreId?: string
  initialYear?: number
  stores?: StoreOption[]
  onSaved?: () => void
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
  const [file, setFile] = useState<File | null>(null)
  const [scope, setScope] = useState<string>('')
  const [scopeNotice, setScopeNotice] = useState<string | null>(null)
  const [formulas, setFormulas] = useState<Record<string, string | null>>({})

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

  const resumoCalculado = useMemo(() => RESUMO_CALCULADO.map(item => {
    const monthValue = readOfficialMonthValue(grid, calculationIndicators, item.code, conferenceMonth, 'meta')
    const annual = Array.from({ length: 12 }, (_, index) => (
      readOfficialMonthValue(grid, calculationIndicators, item.code, index + 1, 'meta')
    )).reduce<number | null>((sum, value) => {
      if (value == null) return sum
      return (sum ?? 0) + value
    }, null)
    return { ...item, monthValue, annual }
  }), [RESUMO_CALCULADO, calculationIndicators, conferenceMonth, grid])

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
    const indicator = props.indicators.find(item => item.code === code)
    if (!indicator || !isPlanningFieldEditable(indicator, field)) return
    setSavingKey(`${field}:${code}`)
    const values = Array.from({ length: 12 }, (_, index) => grid[code]?.[index + 1]?.[field] ?? null)
    const result = field === 'meta'
      ? await saveIndicatorTargets({ lojaId: storeId, indicatorCode: code, year, values })
      : field === 'realizado'
        ? await saveIndicatorActuals({ lojaId: storeId, indicatorCode: code, year, values })
        : await saveIndicatorField({ lojaId: storeId, indicatorCode: code, year, field: 'ano_anterior', values })
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
    const indicator = props.indicators.find(item => item.code === code)
    if (!indicator || !isPlanningFieldEditable(indicator, field)) return
    const config = getFormatConfig(indicator.value_type ?? 'number', indicator.casas_decimais ?? 0)
    const value = parseStrategicInput(raw, config)
    if (raw.trim() !== '' && value === null) return
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

  const exportXlsx = async () => {
    try {
      const { exportWorkbookToExcel } = await import('@/lib/export')
      const values = Object.fromEntries(props.indicators.map(indicator => [
        indicator.code,
        Array.from({ length: 12 }, (_, index) => grid[indicator.code]?.[index + 1]?.meta ?? null),
      ]))
      const exported = exportWorkbookToExcel(buildTargetWorkbookSheets({
        indicators: props.indicators,
        year,
        storeId,
        storeName: stores.find(store => store.id === storeId)?.name,
        values,
      }), `METAS_${year}_${storeId.slice(0, 8)}`)
      if (!exported) throw new Error('Não foi possível exportar.')
      toast.success('Metas preenchidas exportadas.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível exportar.')
    }
  }

  const downloadBlankTemplate = async () => {
    try {
      const { exportWorkbookToExcel } = await import('@/lib/export')
      const exported = exportWorkbookToExcel(buildTargetWorkbookSheets({
        indicators: props.indicators,
        year,
        storeId,
        storeName: stores.find(store => store.id === storeId)?.name,
      }), `MODELO_METAS_${year}_${storeId.slice(0, 8)}`)
      if (!exported) throw new Error('Não foi possível gerar o modelo.')
      toast.success('Modelo em branco baixado.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível gerar o modelo.')
    }
  }

  return (
    <div className="space-y-5">
      <MxSectionCard>
        <MxSectionHeader
          title="Metas e realizados por loja"
          description="Cadastro rápido, importação/exportação de planilha, histórico com reversão e cópia entre lojas."
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void refetch()}><RefreshCw size={16} />Atualizar</Button>
              <Button variant="outline" onClick={() => void exportXlsx()} disabled={!storeId || props.indicators.length === 0}><Download size={16} />Exportar metas preenchidas</Button>
              <Button variant="outline" onClick={() => void downloadBlankTemplate()} disabled={!storeId || props.indicators.length === 0}><Download size={16} />Baixar modelo em branco</Button>
              <Button variant="outline" onClick={() => setCopyOpen(true)} disabled={!storeId || isConsolidated}><Copy size={16} />Copiar entre lojas</Button>
              <Button variant="outline" onClick={() => document.getElementById('metas-import-file')?.click()} disabled={!storeId || isConsolidated}><Upload size={16} />Importar tabela</Button>
              <input id="metas-import-file" type="file" accept=".xlsx" className="hidden" onChange={event => { setFile(event.target.files?.[0] ?? null); event.currentTarget.value = '' }} />
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
            <MxField label="Ano">
              <MxSelect aria-label="Ano" value={String(year)} onChange={event => setYear(Number(event.target.value))}>
                {[year - 1, year, year + 1].map(item => <option key={item} value={String(item)}>{item}</option>)}
              </MxSelect>
            </MxField>
            {clientScope.supportsConsolidated ? (
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
                    {props.indicators.map(indicator => {
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
                                    <Input
                                      className="w-20 text-right"
                                      value={formatEditableInput(value, config)}
                                      aria-label={`${indicator.name} — Meta — ${MONTH_LABELS[index]}`}
                                      onChange={event => updateCell(indicator.code, month, 'meta', event.target.value)}
                                    />
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
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
                                    <Input
                                      className="w-20 text-right"
                                      value={formatEditableInput(value, config)}
                                      aria-label={`${indicator.name} — Realizado — ${MONTH_LABELS[index]}`}
                                      onChange={event => updateCell(indicator.code, month, 'realizado', event.target.value)}
                                    />
                                  )}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-right">
                              {!isConsolidated && isPlanningFieldEditable(indicator, 'realizado') ? (
                                <div className="flex justify-end gap-1">
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
                                    <Input
                                      className="w-20 text-right"
                                      value={formatEditableInput(value, config)}
                                      aria-label={`${indicator.name} — Ano anterior — ${MONTH_LABELS[index]}`}
                                      onChange={event => updateCell(indicator.code, month, 'ano_anterior', event.target.value)}
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

      {file ? (
        <TargetImportModal
          open
          file={file}
          lojaId={storeId}
          indicators={props.indicators}
          currentValues={rows.map(row => ({ indicator_code: row.indicator_code, month: row.month, value: row.meta }))}
          year={year}
          onClose={() => setFile(null)}
          onImported={async () => { setFile(null); await refetch(); clientScope.reload(); props.onSaved?.() }}
        />
      ) : null}
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
  file: File
  lojaId: string
  indicators: TargetIndicator[]
  currentValues: Array<{ indicator_code: string; month: number; value: number | null }>
  year: number
  onClose: () => void
  onImported: () => void
}) {
  const [changes, setChanges] = useState<TargetImportChange[]>([])
  const [problem, setProblem] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { readXlsxTable } = await import('@/lib/xlsx-reader')
        const buffer = await props.file.arrayBuffer()
        const { headers, rows: matrix } = readXlsxTable(buffer)
        const importRows = matrix.map(row => ({
          code: String(row['Código'] ?? '').trim(),
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
        if (!active) return
        setChanges(next)
        setProblem(invalid.length > 0
          ? `${invalid.length} célula(s) precisam de correção. ${invalid[0]?.error ?? ''}`
          : actionable.length > 0
            ? null
            : diagnoseEmptyImport({ headers, matrix, codesInFile, indicators: props.indicators }))
      } catch (cause) {
        if (active) {
          setChanges([])
          setProblem(cause instanceof Error ? cause.message : 'Não foi possível ler a planilha.')
        }
      }
    })()
    return () => { active = false }
  }, [props.file, props.indicators])

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
        indicatorCode: batch.indicatorCode,
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

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Importar planilha de metas"
      size="lg"
      closeOnEscape={!importing}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={importing}>Cancelar</Button>
          <Button onClick={() => void apply()} disabled={importing || changes.length === 0 || changes.some(change => change.action === 'INVALID')}>{importing ? 'Importando...' : 'Confirmar importação'}</Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <MxStatusBanner tone={problem ? 'warning' : 'info'}>
          {problem
            ? `${props.file.name} · ${problem}`
            : `${props.file.name} · ${changes.length} célula(s) de meta detectada(s).`}
        </MxStatusBanner>
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
    </Modal>
  )
}

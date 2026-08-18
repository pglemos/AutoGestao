import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Download, History, RefreshCw, Save, Upload } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import {
  MxEmptyState,
  MxErrorState,
  MxField,
  MxLoadingState,
  MxSectionCard,
  MxSectionHeader,
  MxSelect,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import { toast } from '@/lib/toast'
import { MONTH_LABELS, buildDependentsMap, computeValueMap, getFormatConfig, formatDisplay } from '../indicadores/indicatorFormulas'
import {
  buildMonthlyGrid,
  buildStoreCopyMutations,
  previewStoreTargetsCopy,
  type CopyConflictPolicy,
  type CopyPreview,
  type StoreTargetValue,
  type TargetIndicator,
} from '../indicadores/metasRealizados'
import {
  applyStoreCopyMutations,
  canManageStoreTargets,
  fetchPlanningHistory,
  fetchStorePlanningValues,
  restorePlanningHistory,
  saveIndicatorTargets,
  type PlanningHistoryRow,
} from '../indicadores/indicatorData'

type StoreOption = { id: string; name: string }

const DEFAULT_YEAR = new Date().getFullYear()

export function MetasRealizadosTab(props: {
  indicators: TargetIndicator[]
  onNavigateToParams?: () => void
}) {
  const [stores, setStores] = useState<StoreOption[]>([])
  const [storeId, setStoreId] = useState('')
  const [year, setYear] = useState(DEFAULT_YEAR)
  const [rows, setRows] = useState<StoreTargetValue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

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
    let active = true
    void (async () => {
      const { data, error: storeError } = await (await import('@/lib/supabase')).supabase
        .from('lojas')
        .select('id, name')
        .order('name', { ascending: true })
      if (!active) return
      if (storeError) {
        setError(storeError.message)
        setLoading(false)
        return
      }
      setStores((data ?? []) as StoreOption[])
      if (data?.length) setStoreId(current => current || String(data[0].id))
    })()
    return () => { active = false }
  }, [])

  useEffect(() => { void refetch() }, [refetch])

  const grid = useMemo(() => buildMonthlyGrid(rows, props.indicators.map(item => item.code)), [rows, props.indicators])

  const saveIndicator = async (code: string) => {
    setSavingKey(code)
    const values = props.indicators
      .find(indicator => indicator.code === code)
      ? Array.from({ length: 12 }, (_, index) => grid[code]?.[index + 1]?.meta ?? null)
      : []
    const result = await saveIndicatorTargets({ lojaId: storeId, indicatorCode: code, year, values })
    if (result.error) toast.error(result.error)
    else toast.success('Metas salvas.')
    setSavingKey(null)
    await refetch()
  }

  const updateCell = (code: string, month: number, raw: string) => {
    const value = raw === '' ? null : Number(raw)
    if (raw !== '' && Number.isNaN(value)) return
    setRows(current => {
      const next = [...current]
      const index = next.findIndex(row => row.indicator_code === code && row.month === month)
      if (index >= 0) {
        next[index] = { ...next[index], meta: value }
      } else {
        next.push({ loja_id: storeId, indicator_code: code, year, month, meta: value, realizado: null, ano_anterior: null })
      }
      return next
    })
  }

  const exportXlsx = async () => {
    try {
      const { exportWorkbookToExcel } = await import('@/lib/export')
      const matrix = props.indicators.map(indicator => {
        const values = Array.from({ length: 12 }, (_, index) => grid[indicator.code]?.[index + 1]?.meta ?? null)
        return {
          'Código': indicator.code,
          'Indicador': indicator.name,
          'Departamento': indicator.department ?? '',
          'Tipo': indicator.calculado ? 'Calculado' : 'Digitável',
          ...Object.fromEntries(MONTH_LABELS.map((label, index) => [label, values[index]])),
        }
      })
      const exported = exportWorkbookToExcel(
        [
          {
            name: 'METAS',
            headers: ['Código', 'Indicador', 'Departamento', 'Tipo', ...MONTH_LABELS],
            rows: matrix,
          },
          {
            name: 'MX_CONFIG',
            headers: ['Chave', 'Valor'],
            rows: [
              { Chave: 'view_type', Valor: 'TARGET' },
              { Chave: 'reference_year', Valor: String(year) },
            ],
          },
        ],
        `METAS_${year}_${storeId.slice(0, 8)}`,
      )
      if (!exported) throw new Error('Não foi possível exportar.')
      toast.success('Planilha exportada.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível exportar.')
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
              <Button variant="outline" onClick={() => void exportXlsx()}><Download size={16} />Exportar planilha</Button>
              <Button variant="outline" onClick={() => setCopyOpen(true)}><Copy size={16} />Copiar entre lojas</Button>
              <Button variant="outline" onClick={() => document.getElementById('metas-import-file')?.click()}><Upload size={16} />Importar planilha</Button>
              <input id="metas-import-file" type="file" accept=".xlsx" className="hidden" onChange={event => setFile(event.target.files?.[0] ?? null)} />
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
                    {props.indicators.map(indicator => {
                      const config = getFormatConfig(indicator.calculado ? 'number' : 'number')
                      return (
                        <TableRow key={indicator.code}>
                          <TableCell>
                            <div className="font-semibold text-foreground">{indicator.name}</div>
                            <div className="text-xs text-muted-foreground">{indicator.code}{indicator.calculado ? ' · calculado' : ''}</div>
                          </TableCell>
                          {MONTH_LABELS.map((_label, index) => {
                            const month = index + 1
                            const value = grid[indicator.code]?.[month]?.meta ?? null
                            return (
                              <TableCell key={month} className="text-right">
                                {indicator.calculado ? (
                                  <span className="text-xs text-muted-foreground">{formatDisplay(value, config)}</span>
                                ) : (
                                  <Input
                                    className="w-20 text-right"
                                    value={value === null ? '' : String(value)}
                                    onChange={event => updateCell(indicator.code, month, event.target.value)}
                                  />
                                )}
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="outline" size="sm" onClick={() => setHistoryFor(indicator.code)} disabled={savingKey === indicator.code}><History size={14} /></Button>
                              {!indicator.calculado ? (
                                <Button variant="outline" size="sm" onClick={() => void saveIndicator(indicator.code)} disabled={savingKey === indicator.code}>
                                  {savingKey === indicator.code ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
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
          onApplied={async () => { await refetch() }}
        />
      ) : null}

      {historyFor ? (
        <PlanningHistoryDrawer
          open
          lojaId={storeId}
          indicatorCode={historyFor}
          year={year}
          onClose={() => setHistoryFor(null)}
          onRestored={async () => { await refetch() }}
        />
      ) : null}

      {file ? (
        <TargetImportModal
          open
          file={file}
          indicators={props.indicators}
          currentValues={rows.map(row => ({ indicator_code: row.indicator_code, month: row.month, value: row.meta }))}
          year={year}
          onClose={() => setFile(null)}
          onImported={async () => { setFile(null); await refetch() }}
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

  const targets = props.stores.filter(store => store.id !== props.storeId)

  const loadPreview = () => {
    const targetValues = props.rows.filter(row => targetStoreIds.includes(row.loja_id))
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
            <Button onClick={loadPreview} disabled={targetStoreIds.length === 0}>Ver prévia</Button>
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
                  onChange={() => setTargetStoreIds(current =>
                    current.includes(store.id) ? current.filter(id => id !== store.id) : [...current, store.id],
                  )}
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
                        <TableCell className="text-right text-xs">{row.sourceValue ?? '—'}</TableCell>
                        <TableCell className="text-right text-xs">{row.targetCurrent ?? '—'}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{row.newValue ?? '—'}</TableCell>
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
                <span className="text-sm font-semibold text-foreground">
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
  indicators: TargetIndicator[]
  currentValues: Array<{ indicator_code: string; month: number; value: number | null }>
  year: number
  onClose: () => void
  onImported: () => void
}) {
  const [changes, setChanges] = useState<Array<{ indicatorCode: string; month: number; newValue: number | null; action: string }>>([])
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { readXlsxRows } = await import('@/lib/xlsx-reader')
        const buffer = await props.file.arrayBuffer()
        const matrix = readXlsxRows(buffer)
        const monthKeys = MONTH_LABELS.map((label, index) => ({ label, month: index + 1 }))
        const next: Array<{ indicatorCode: string; month: number; newValue: number | null; action: string }> = []
        for (const row of matrix) {
          const code = String(row['Código'] ?? '').trim()
          const indicator = props.indicators.find(item => item.code === code)
          if (!indicator || indicator.calculado) continue
          for (const { label, month } of monthKeys) {
            const raw = row[label]
            if (raw === undefined || raw === null || raw === '') continue
            const value = Number(raw)
            if (Number.isNaN(value)) continue
            next.push({ indicatorCode: code, month, newValue: value, action: 'UPDATE' })
          }
        }
        if (active) setChanges(next)
      } catch (cause) {
        if (active) toast.error(cause instanceof Error ? cause.message : 'Não foi possível ler a planilha.')
      }
    })()
    return () => { active = false }
  }, [props.file, props.indicators])

  const apply = async () => {
    setImporting(true)
    let applied = 0
    for (const change of changes) {
      if (change.action !== 'UPDATE') continue
      const result = await saveIndicatorTargets({
        lojaId: '',
        indicatorCode: change.indicatorCode,
        year: props.year,
        values: Array.from({ length: 12 }, (_, index) => index + 1 === change.month ? change.newValue : null),
      })
      if (!result.error) applied++
    }
    if (applied === changes.length) toast.success(`${applied} células importadas.`)
    else toast.error('Algumas células não puderam ser importadas.')
    setImporting(false)
    props.onImported()
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
          <Button onClick={() => void apply()} disabled={importing || changes.length === 0}>{importing ? 'Importando...' : 'Confirmar importação'}</Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <MxStatusBanner tone="info">{props.file.name} · {changes.length} célula(s) de meta detectada(s).</MxStatusBanner>
        <div className="max-h-72 overflow-auto rounded-lg border border-border">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>Indicador</TableHead>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.map((change, index) => (
                <TableRow key={index}>
                  <TableCell className="text-xs">{change.indicatorCode}</TableCell>
                  <TableCell className="text-xs">{MONTH_LABELS[change.month - 1]}</TableCell>
                  <TableCell className="text-right text-xs">{change.newValue}</TableCell>
                  <TableCell className="text-xs">{change.action}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Modal>
  )
}

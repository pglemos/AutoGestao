// Tabela dos 13 parâmetros estratégicos da metodologia MX.
//
// Paridade com o Base44 `/indicadores` → aba "Parâmetros e Fórmulas":
// Parâmetro | Valor | Unidade | Ajuste cliente | Dependentes | Status | Ações.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'
import {
  MxEmptyState,
  MxErrorState,
  MxField,
  MxInput,
  MxLoadingState,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { fetchFormulaIndicators, type FormulaAwareIndicator } from '../indicadores/indicatorData'
import {
  applyPersistedParameterValues,
  fetchStrategicParameterValues,
  parameterDependents,
  restoreStrategicParameterDefault,
  saveStrategicParameterValue,
  strategicParameterDefinitions,
} from '../indicadores/strategicParameters'
import { validateParameterValue, type ParameterDefinition } from '../indicadores/parameterCatalog'

const CURRENT_YEAR = new Date().getFullYear()

function formatParameterValue(value: number | null, unit: string) {
  if (value == null || Number.isNaN(value)) return '—'
  if (unit === '%') {
    return `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value * 100)}%`
  }
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(value)
}

/** Converte o texto digitado (20 ou 20,00 em "%") para o valor armazenado. */
function parseParameterInput(raw: string, unit: string): number | null {
  const normalized = raw.trim().replace(/\./g, '').replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  if (Number.isNaN(parsed)) return null
  return unit === '%' ? parsed / 100 : parsed
}

function inputValue(value: number | null, unit: string) {
  if (value == null) return ''
  const shown = unit === '%' ? value * 100 : value
  return String(shown).replace('.', ',')
}

export function StrategicParametersSection(props: { parameterSetId: string | null }) {
  const { parameterSetId } = props
  const [definitions, setDefinitions] = useState<ParameterDefinition[]>(strategicParameterDefinitions())
  const [indicators, setIndicators] = useState<FormulaAwareIndicator[]>([])
  const [overrideCount, setOverrideCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ParameterDefinition | null>(null)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const base = strategicParameterDefinitions()
    const [formulas, overrides] = await Promise.all([
      fetchFormulaIndicators(),
      supabase
        .from('overrides_parametros_cliente')
        .select('metric_key, client_id')
        .eq('status', 'ativo')
        .eq('reference_year', CURRENT_YEAR)
        .in('metric_key', base.map(item => item.code)),
    ])
    setIndicators(formulas.rows)

    const counts: Record<string, number> = {}
    const seen = new Set<string>()
    for (const row of (overrides.data ?? []) as Array<{ metric_key: string; client_id: string }>) {
      const key = `${row.metric_key}::${row.client_id}`
      if (seen.has(key)) continue
      seen.add(key)
      counts[row.metric_key] = (counts[row.metric_key] ?? 0) + 1
    }
    setOverrideCount(counts)

    if (!parameterSetId) {
      setDefinitions(base)
      setError(formulas.error ?? overrides.error?.message ?? null)
      setLoading(false)
      return
    }
    const persisted = await fetchStrategicParameterValues(parameterSetId)
    setDefinitions(applyPersistedParameterValues(base, persisted))
    setError(persisted.error ?? formulas.error ?? overrides.error?.message ?? null)
    setLoading(false)
  }, [parameterSetId])

  useEffect(() => { void load() }, [load])

  const dependentsByCode = useMemo(() => {
    const map: Record<string, Array<{ code: string; name: string }>> = {}
    for (const definition of definitions) {
      map[definition.code] = parameterDependents(indicators, definition.code)
    }
    return map
  }, [definitions, indicators])

  const openEdit = (definition: ParameterDefinition) => {
    setModal(definition)
    setDraft(inputValue(definition.default_value, definition.unit))
  }

  const save = async () => {
    if (!modal || !parameterSetId) return
    const value = parseParameterInput(draft, modal.unit)
    const invalid = validateParameterValue(value)
    if (invalid) {
      toast.error(invalid)
      return
    }
    setSubmitting(true)
    try {
      const result = await saveStrategicParameterValue({ parameterSetId, code: modal.code, value: value as number })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Parâmetro atualizado. Os indicadores dependentes usam o novo valor no próximo cálculo.')
      setModal(null)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  const restore = async (definition: ParameterDefinition) => {
    if (!parameterSetId) return
    setSubmitting(true)
    try {
      const result = await restoreStrategicParameterDefault({ parameterSetId, code: definition.code })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Padrão da metodologia MX restaurado.')
      setModal(null)
      await load()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <MxSectionCard>
      <MxSectionHeader
        title="Parâmetros estratégicos"
        description="Valores da metodologia MX usados pelas fórmulas dos indicadores calculados. O ajuste por cliente é feito na seção de personalização abaixo."
        actions={<Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : undefined} />Atualizar</Button>}
      />
      <div className="p-5">
        {!parameterSetId ? <MxStatusBanner tone="warning" className="mb-4">Nenhum conjunto de parâmetros ativo: os valores abaixo são os padrões da metodologia e não podem ser editados.</MxStatusBanner> : null}
        {error ? <MxStatusBanner tone="warning" className="mb-4">{error}</MxStatusBanner> : null}
        {loading ? <MxLoadingState label="Carregando parâmetros estratégicos" /> : definitions.length === 0 ? (
          <MxEmptyState title="Nenhum parâmetro estratégico" description="A metodologia MX não tem parâmetros cadastrados." />
        ) : (
          <MxTableSurface aria-label="Parâmetros estratégicos da metodologia MX">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Parâmetro</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Ajuste cliente</TableHead>
                  <TableHead>Dependentes</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {definitions.map(definition => {
                  const dependents = dependentsByCode[definition.code] ?? []
                  const clients = overrideCount[definition.code] ?? 0
                  return (
                    <TableRow key={definition.code}>
                      <TableCell>
                        <div className="font-semibold text-foreground">{definition.name}</div>
                        <div className="font-mono text-xs text-muted-foreground">{definition.code}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatParameterValue(definition.default_value, definition.unit)}
                        {definition.monthly_defaults ? <div className="text-xs text-muted-foreground">Valores mensais</div> : null}
                      </TableCell>
                      <TableCell>{definition.unit}</TableCell>
                      <TableCell>
                        {clients > 0
                          ? <Badge variant="info">{clients} cliente(s)</Badge>
                          : <span className="text-muted-foreground">Não</span>}
                      </TableCell>
                      <TableCell>
                        {dependents.length
                          ? <span title={dependents.map(item => item.name).join(', ')}>{dependents.length} indicador(es)</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell><Badge variant="success">Ativo</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openEdit(definition)} disabled={!parameterSetId || submitting}>
                          <SlidersHorizontal size={14} />Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </MxTableSurface>
        )}
      </div>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal ? `Editar ${modal.name}` : 'Editar parâmetro'}
        description="O valor vale para todos os clientes que não têm ajuste próprio. Os indicadores calculados que dependem dele passam a usar o novo valor."
        footer={modal ? (
          <>
            <Button variant="outline" onClick={() => void restore(modal)} disabled={submitting}><RotateCcw size={16} />Restaurar padrão MX</Button>
            <Button variant="outline" onClick={() => setModal(null)} disabled={submitting}>Cancelar</Button>
            <Button onClick={() => void save()} disabled={submitting}>Salvar</Button>
          </>
        ) : null}
      >
        {modal ? (
          <div className="space-y-4">
            <MxField label={`Valor${modal.unit === '%' ? ' (%)' : ''}`}>
              <MxInput
                value={draft}
                onChange={event => setDraft(event.target.value)}
                aria-label={`Valor de ${modal.name}`}
                inputMode="decimal"
              />
            </MxField>
            <div className="text-sm text-muted-foreground">
              <div className="font-mono text-xs">{modal.code} · {modal.unit}</div>
              <div className="mt-2 font-semibold text-foreground">Indicadores dependentes</div>
              {(dependentsByCode[modal.code] ?? []).length ? (
                <ul className="mt-1 list-disc pl-5">
                  {(dependentsByCode[modal.code] ?? []).map(item => <li key={item.code}>{item.name}</li>)}
                </ul>
              ) : <p className="mt-1">Nenhum indicador calculado usa este parâmetro hoje.</p>}
            </div>
          </div>
        ) : null}
      </Modal>
    </MxSectionCard>
  )
}

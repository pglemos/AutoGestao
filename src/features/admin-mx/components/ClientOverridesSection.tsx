import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxEmptyState, MxErrorState, MxField, MxLoadingState, MxSectionCard, MxSelect } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { ClientOverrideModal } from './ClientOverrideModal'
import {
  fetchClientOverrides,
  fetchFormulaIndicators,
  restoreParameterToDefault,
  saveClientOverride,
  type ClientOverrideRow,
} from '../indicadores/indicatorData'
import { evaluateFormula } from '../indicadores/indicatorFormulas'
import { expandOverrideToRows, type OverrideDraft, type ParameterDefinition } from '../indicadores/parameterCatalog'
import {
  applyPersistedParameterValues,
  fetchStrategicParameterValues,
  strategicParameterDefinitions,
} from '../indicadores/strategicParameters'
import type { CatalogIndicator } from '../indicadores/indicatorCatalog'
import type { IndicatorParameter } from '../indicadores/indicatorCatalog'

type ClientOption = { id: string; name: string }

const CURRENT_YEAR = new Date().getFullYear()

export function ClientOverridesSection(props: {
  rows: CatalogIndicator[]
  parameters: IndicatorParameter[]
  parameterSetId: string | null
  lockedClientId?: string
  lockedYear?: number
}) {
  const [strategicParameters, setStrategicParameters] = useState<ParameterDefinition[]>(strategicParameterDefinitions())
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState('')
  const [overrides, setOverrides] = useState<ClientOverrideRow[]>([])
  const [indicators, setIndicators] = useState<Array<{ code: string; formula_expression: string | null }>>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
    const [modal, setModal] = useState<{ param: ParameterDefinition; existing: ClientOverrideRow[] } | null>(null)
  const year = props.lockedYear ?? CURRENT_YEAR
  const locked = Boolean(props.lockedClientId)

  const loadClients = useCallback(async () => {
    const { supabase } = await import('@/lib/supabase')
    const { data, error: loadError } = await supabase
      .from('clientes_consultoria')
      .select('id, name')
      .order('name', { ascending: true })
    if (loadError) {
      setError(loadError.message)
      setLoading(false)
      return
    }
    setClients((data ?? []) as ClientOption[])
    if (data?.length) setClientId(current => current || String(data[0].id))
  }, [])

  useEffect(() => {
    if (props.lockedClientId) setClientId(props.lockedClientId)
    else void loadClients()
    void fetchFormulaIndicators().then(result => setIndicators(result.rows.map(item => ({ code: item.metric_key, formula_expression: item.formula_expression }))))
  }, [loadClients, props.lockedClientId])

  useEffect(() => {
    if (!props.parameterSetId) {
      setStrategicParameters(strategicParameterDefinitions())
      return
    }
    void fetchStrategicParameterValues(props.parameterSetId).then(persisted => {
      setStrategicParameters(applyPersistedParameterValues(strategicParameterDefinitions(), persisted))
    })
  }, [props.parameterSetId])

  useEffect(() => {
    if (!clientId) {
      setOverrides([])
      setLoading(false)
      return
    }
    setLoading(true)
    void fetchClientOverrides(clientId, year).then(result => {
      setOverrides(result.rows)
      setError(result.error)
      setLoading(false)
    })
  }, [clientId, year])

  const parameterDefinitions = useMemo<ParameterDefinition[]>(() => {
    const byKey = new Map(props.parameters.map(parameter => [parameter.metric_key, parameter]))
    // Os 13 parâmetros estratégicos vêm primeiro: são eles que o Base44 permite
    // ajustar por cliente (coluna "Ajuste cliente" da aba de parâmetros).
    const indicatorDefinitions = props.rows.map(indicator => {
      const parameter = byKey.get(indicator.metric_key)
      return {
        id: indicator.metric_key,
        code: indicator.metric_key,
        name: indicator.label,
        unit: indicator.value_type,
        default_value: parameter?.target_default ?? null,
        allows_client_override: true,
        department: indicator.area,
        indicator_codes: [indicator.metric_key],
      }
    })
    return [...strategicParameters, ...indicatorDefinitions]
  }, [props.rows, props.parameters, strategicParameters])

  const overrideCountByCode = useMemo(() => {
    const map: Record<string, number> = {}
    for (const override of overrides) {
      if (override.status === 'encerrado') continue
      map[override.metric_key] = (map[override.metric_key] ?? 0) + 1
    }
    return map
  }, [overrides])

  const saveOverride = async (draft: OverrideDraft) => {
    setSubmitting(true)
    try {
      const param = parameterDefinitions.find(item => item.code === draft.parameter_code)
      const rows = expandOverrideToRows(draft, param ?? { id: draft.parameter_code, code: draft.parameter_code, name: draft.parameter_code, unit: '', default_value: null })
      const result = await saveClientOverride({
        clientId,
        parameterSetId: null,
        metricKey: draft.parameter_code,
        referenceYear: draft.reference_year,
        rows,
        defaultValueSnapshot: param?.default_value ?? null,
        createdBy: null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Parâmetro personalizado para o cliente.')
      setModal(null)
      const refreshed = await fetchClientOverrides(clientId, year)
      setOverrides(refreshed.rows)
    } finally {
      setSubmitting(false)
    }
  }

  const restore = async (metricKey: string) => {
    setSubmitting(true)
    try {
      const result = await restoreParameterToDefault(clientId, metricKey, year)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Padrão MX restaurado para o cliente.')
      const refreshed = await fetchClientOverrides(clientId, year)
      setOverrides(refreshed.rows)
    } finally {
      setSubmitting(false)
    }
  }

  const valueMap = useMemo(() => {
    const map: Record<string, Record<number, number | null>> = {}
    for (const parameter of props.parameters) {
      if (parameter.target_default != null) {
        map[parameter.metric_key] = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [index + 1, parameter.target_default]))
      }
    }
    return map
  }, [props.parameters])

  return (
    <MxSectionCard>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {locked ? null : (
            <MxField label="Cliente">
              <MxSelect aria-label="Cliente" value={clientId} onChange={event => setClientId(event.target.value)}>
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </MxSelect>
            </MxField>
          )}
          <MxField label="Ano de referência">
            <MxSelect aria-label="Ano de referência" value={String(year)} disabled>
              <option value={String(year)}>{year}</option>
            </MxSelect>
          </MxField>
          <Button variant="outline" onClick={() => {
            if (locked && clientId) {
              setLoading(true)
              void fetchClientOverrides(clientId, year).then(result => {
                setOverrides(result.rows)
                setError(result.error)
                setLoading(false)
              })
              return
            }
            void loadClients()
          }}><RefreshCw size={16} />Atualizar</Button>
        </div>

        {loading ? <MxLoadingState label="Carregando overrides" /> : error ? <MxErrorState description={error} retry={() => void fetchClientOverrides(clientId, year).then(result => setOverrides(result.rows))} /> : parameterDefinitions.length === 0 ? (
          <MxEmptyState variant="dataset" title="Sem parâmetros" description="Cadastre parâmetros no conjunto ativo para personalizar por cliente." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {parameterDefinitions.map(parameter => {
              const custom = (overrideCountByCode[parameter.code] ?? 0) > 0
              const existing = overrides.filter(override => override.metric_key === parameter.code && override.status !== 'encerrado')
              return (
                <div key={parameter.code} className={`flex items-center justify-between gap-3 rounded-lg border border-border p-3 ${custom ? 'bg-warning/5' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <SlidersHorizontal size={14} />
                      <span className="truncate">{parameter.name}</span>
                      {custom ? <span className="rounded-full bg-warning/20 px-2 py-0.5 text-caption font-medium">Personalizado</span> : null}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      Padrão MX: {parameter.default_value ?? '—'}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {custom ? (
                      <Button variant="outline" size="sm" onClick={() => void restore(parameter.code)} disabled={submitting}>Restaurar</Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => setModal({ param: parameter, existing })} disabled={submitting}>Editar</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {modal ? (
        <ClientOverrideModal
          open
          clientId={clientId}
          referenceYear={year}
          param={modal.param}
          existingOverrides={modal.existing.map(override => ({
            id: override.id,
            parameter_code: override.metric_key,
            reference_year: override.reference_year,
            month: override.month,
            override_value: override.override_value,
            reason: override.reason,
            status: override.status as 'ativo' | 'encerrado',
          }))}
          indicators={indicators}
          valueMap={valueMap}
          submitting={submitting}
          onSave={draft => void saveOverride(draft)}
          onRestore={() => void restore(modal.param.code)}
          onClose={() => setModal(null)}
        />
      ) : null}
    </MxSectionCard>
  )
}

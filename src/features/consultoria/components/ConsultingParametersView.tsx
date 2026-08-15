import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BarChart3, RefreshCw, Save } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import {
  MxErrorState,
  MxField,
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { useConsultingParameters } from '@/hooks/useConsultingParameters'
import { toast } from '@/lib/toast'

function toInputValue(value?: number | null) {
  return value == null ? '' : String(value)
}

function parseOptionalNumber(value: string) {
  if (value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function ConsultingParametersView() {
  const {
    catalog,
    valueByMetric,
    activeSet,
    loading,
    error,
    accessMode,
    canManage,
    readOnlyMessage,
    updateParameterValue,
    refetch,
  } = useConsultingParameters()
  const [metricKey, setMetricKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [form, setForm] = useState({
    market_average: '',
    best_practice: '',
    target_default: '',
    red_threshold: '',
    yellow_threshold: '',
    green_threshold: '',
    notes: '',
  })

  const selectedMetric = useMemo(
    () => catalog.find((metric) => metric.metric_key === (metricKey || catalog[0]?.metric_key)),
    [catalog, metricKey],
  )

  useEffect(() => {
    if (!selectedMetric) return
    const value = valueByMetric.get(selectedMetric.metric_key)
    setForm({
      market_average: toInputValue(value?.market_average),
      best_practice: toInputValue(value?.best_practice),
      target_default: toInputValue(value?.target_default),
      red_threshold: toInputValue(value?.red_threshold),
      yellow_threshold: toInputValue(value?.yellow_threshold),
      green_threshold: toInputValue(value?.green_threshold),
      notes: value?.notes || '',
    })
  }, [selectedMetric, valueByMetric])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
    toast.success('Parâmetros PMR atualizados.')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedMetric) return
    if (!canManage) {
      toast.error(readOnlyMessage)
      return
    }

    const parsed = {
      market_average: parseOptionalNumber(form.market_average),
      best_practice: parseOptionalNumber(form.best_practice),
      target_default: parseOptionalNumber(form.target_default),
      red_threshold: parseOptionalNumber(form.red_threshold),
      yellow_threshold: parseOptionalNumber(form.yellow_threshold),
      green_threshold: parseOptionalNumber(form.green_threshold),
    }

    if (Object.values(parsed).some((value) => typeof value === 'undefined')) {
      toast.error('Revise os campos numéricos antes de salvar o parâmetro PMR.')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await updateParameterValue({
      metric_key: selectedMetric.metric_key,
      market_average: parsed.market_average ?? null,
      best_practice: parsed.best_practice ?? null,
      target_default: parsed.target_default ?? null,
      red_threshold: parsed.red_threshold ?? null,
      yellow_threshold: parsed.yellow_threshold ?? null,
      green_threshold: parsed.green_threshold ?? null,
      notes: form.notes,
    })
    setSubmitting(false)

    if (updateError) toast.error(updateError)
    else toast.success('Parâmetro PMR atualizado.')
  }

  if (loading) {
    return (
      <MxModulePage accessMode={accessMode === 'manage' ? 'manage' : 'read-only'} width="focused">
        <MxModuleHeader title="Parâmetros PMR" description="Carregando catálogo, benchmarks e limites da consultoria." />
        <MxSectionCard><MxLoadingState label="Carregando parâmetros PMR" /></MxSectionCard>
      </MxModulePage>
    )
  }

  if (error) {
    return (
      <MxModulePage accessMode={accessMode === 'manage' ? 'manage' : 'read-only'} width="focused">
        <MxModuleHeader title="Parâmetros PMR" description="Catálogo de indicadores e benchmarks da consultoria." />
        <MxSectionCard><MxErrorState description={error} retry={() => void refetch()} /></MxSectionCard>
      </MxModulePage>
    )
  }

  return (
    <MxModulePage accessMode={accessMode === 'manage' ? 'manage' : 'read-only'} width="focused">
      <MxModuleHeader
        eyebrow="Metodologia consultiva"
        title="Parâmetros PMR"
        description="Consulte indicadores, benchmarks, metas padrão e limites de diagnóstico em uma única composição."
        actions={(
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              aria-label="Atualizar parâmetros PMR"
            >
              <RefreshCw size={17} className={refreshing ? 'animate-spin' : undefined} aria-hidden="true" />
            </Button>
            <Badge variant="outline">{activeSet ? `${activeSet.name} ${activeSet.version}` : 'Sem conjunto ativo'}</Badge>
            {!canManage ? <Badge variant="outline">Somente leitura</Badge> : null}
          </>
        )}
      />

      {!canManage ? <MxStatusBanner tone="info">{readOnlyMessage}</MxStatusBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <MxSectionCard>
          <MxSectionHeader
            title="Catálogo de indicadores"
            description="Selecione uma métrica para consultar seus valores e editar quando seu perfil permitir."
            actions={<BarChart3 size={18} className="text-status-success-text" aria-hidden="true" />}
          />
          <MxTableSurface className="rounded-none border-0 shadow-none">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Área</th>
                  <th>Mercado</th>
                  <th>Boa prática</th>
                  <th>Fonte</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((metric) => {
                  const value = valueByMetric.get(metric.metric_key)
                  const selected = selectedMetric?.metric_key === metric.metric_key
                  return (
                    <tr key={metric.metric_key} className={selected ? 'bg-status-success-surface/60' : undefined}>
                      <td>
                        <button type="button" className="text-left" onClick={() => setMetricKey(metric.metric_key)}>
                          <Typography variant="h4" className="text-sm">{metric.label}</Typography>
                          <Typography variant="tiny" tone="muted">{metric.metric_key}</Typography>
                        </button>
                      </td>
                      <td>{metric.area}</td>
                      <td>{value?.market_average ?? '—'}</td>
                      <td>{value?.best_practice ?? '—'}</td>
                      <td>{metric.source_scope}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </MxTableSurface>
        </MxSectionCard>

        <MxSectionCard>
          <MxSectionHeader
            title={selectedMetric ? `Parâmetro: ${selectedMetric.label}` : 'Editar parâmetro'}
            description={canManage ? 'Alterações ficam vinculadas ao conjunto PMR ativo.' : 'Consulta segura, sem permissão de gravação.'}
          />
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <MxField label="Indicador" htmlFor="pmr-metric">
              <Select
                id="pmr-metric"
                value={selectedMetric?.metric_key || ''}
                onChange={(event) => setMetricKey(event.target.value)}
                aria-label="Indicador PMR"
              >
                {catalog.map((metric) => <option key={metric.metric_key} value={metric.metric_key}>{metric.label}</option>)}
              </Select>
            </MxField>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Média de mercado', 'market_average'],
                ['Boa prática', 'best_practice'],
                ['Meta padrão', 'target_default'],
                ['Limite vermelho', 'red_threshold'],
                ['Limite amarelo', 'yellow_threshold'],
                ['Limite verde', 'green_threshold'],
              ].map(([label, key]) => (
                <MxField key={key} label={label} htmlFor={`pmr-${key}`}>
                  <Input
                    id={`pmr-${key}`}
                    type="number"
                    step="0.01"
                    value={form[key as keyof typeof form]}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    disabled={!canManage}
                    aria-label={label}
                  />
                </MxField>
              ))}
            </div>

            <MxField label="Observações" htmlFor="pmr-notes">
              <Textarea
                id="pmr-notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                disabled={!canManage}
                aria-label="Observações do parâmetro PMR"
              />
            </MxField>

            <Button
              data-mx-requires-manage=""
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!canManage || submitting || !selectedMetric}
              loading={submitting}
            >
              {!submitting && <Save size={17} aria-hidden="true" />}
              Salvar parâmetro
            </Button>
          </form>
        </MxSectionCard>
      </div>
    </MxModulePage>
  )
}

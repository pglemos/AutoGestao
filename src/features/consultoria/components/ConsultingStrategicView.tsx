import type React from 'react'
import { useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { FileText } from 'lucide-react'
import {
  buildPmrMetricViews,
  buildPmrStrategicPlan,
  mapRecommendationsToInsert,
  type PmrMetricStatus,
} from '@/lib/consultoria/pmr-engine'
import { useConsultingActionPlan } from '@/hooks/useConsultingActionPlan'
import { useConsultingMetrics } from '@/hooks/useConsultingMetrics'
import { useConsultingParameters } from '@/hooks/useConsultingParameters'
import { useConsultingStrategicPlan } from '@/hooks/useConsultingStrategicPlan'
import { usePmrDiagnostics } from '@/hooks/usePmrDiagnostics'
import type { ConsultingGeneratedArtifact } from '@/lib/schemas/consulting-client.schema'
import {
  buildLatestTargetByMetric,
  buildPreviousYearResultByMetric,
  getPmrMvpIndicator,
  isPmrMvpIndicator,
  sortByPmrMvpOrder,
} from '@/lib/consultoria/pmr-mvp-indicators'

type Props = {
  clientId: string
  clientName?: string
}

function formatMetricValue(value: number, valueType?: string) {
  if (valueType === 'percent') return `${(value * 100).toFixed(1)}%`
  if (valueType === 'currency') return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return value.toLocaleString('pt-BR')
}

function formatOptionalMetricValue(value: number | null, valueType?: string) {
  return value == null ? '-' : formatMetricValue(value, valueType)
}

type MetricStatus = PmrMetricStatus

const statusVariant: Record<MetricStatus, 'outline' | 'warning' | 'success' | 'danger'> = {
  outline: 'outline',
  warning: 'warning',
  success: 'success',
  danger: 'danger',
}

function parseFiniteNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function listFromTextarea(value: string) {
  return value
    .split(/\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildSwotOverride(swot: { strengths: string; weaknesses: string; opportunities: string; threats: string }) {
  return {
    strengths: listFromTextarea(swot.strengths),
    weaknesses: listFromTextarea(swot.weaknesses),
    opportunities: listFromTextarea(swot.opportunities),
    threats: listFromTextarea(swot.threats),
  }
}

function artifactTypeLabel(type: string) {
  return type.replaceAll('_', ' ')
}

export function ConsultingStrategicView({ clientId, clientName = 'Cliente PMR' }: Props) {
  const metrics = useConsultingMetrics(clientId)
  const parameters = useConsultingParameters()
  const strategic = useConsultingStrategicPlan(clientId)
  const diagnostics = usePmrDiagnostics(clientId)
  const actionPlan = useConsultingActionPlan(clientId)
  const [metricKey, setMetricKey] = useState('')
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().slice(0, 10))
  const [resultValue, setResultValue] = useState('')
  const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7))
  const [targetValue, setTargetValue] = useState('')
  const [planSummary, setPlanSummary] = useState('')
  const [swot, setSwot] = useState({
    strengths: '',
    weaknesses: '',
    opportunities: '',
    threats: '',
  })
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedMetric = metrics.catalog.find((metric) => metric.metric_key === metricKey) || metrics.catalog[0]
  const targetByMetric = useMemo(() => buildLatestTargetByMetric(metrics.targets), [metrics.targets])
  const previousYearByMetric = useMemo(() => (
    buildPreviousYearResultByMetric([...metrics.results, ...metrics.derivedResults])
  ), [metrics.derivedResults, metrics.results])
  const strategicRows = useMemo(() => {
    const rows = buildPmrMetricViews({
      catalog: metrics.catalog,
      latestResults: metrics.latestResults,
      targetByMetric,
      previousYearByMetric,
      parameterByMetric: parameters.valueByMetric,
      includeEmpty: true,
    }).filter((row) => isPmrMvpIndicator(row.metric_key))

    return sortByPmrMvpOrder(rows)
  }, [metrics.catalog, metrics.latestResults, parameters.valueByMetric, previousYearByMetric, targetByMetric])

  const swotOverride = useMemo(() => buildSwotOverride(swot), [swot])
  const planDraft = useMemo(() => buildPmrStrategicPlan({
    clientName,
    metricRows: strategicRows,
    diagnostics: diagnostics.responses,
    existingActions: actionPlan.items,
    summaryOverride: planSummary || undefined,
    swotOverride,
  }), [actionPlan.items, clientName, diagnostics.responses, planSummary, strategicRows, swotOverride])
  const selectedArtifact = useMemo<ConsultingGeneratedArtifact | null>(() => {
    return strategic.artifacts.find((artifact) => artifact.id === selectedArtifactId) || strategic.artifacts[0] || null
  }, [selectedArtifactId, strategic.artifacts])

  const handleSaveResult = async (event: React.FormEvent) => {
    event.preventDefault()
    const currentMetricKey = selectedMetric?.metric_key || metricKey
    if (!currentMetricKey || resultValue === '') {
      toast.error('Informe indicador e valor realizado.')
      return
    }
    const parsedResult = parseFiniteNumber(resultValue)
    if (parsedResult == null) {
      toast.error('Informe um valor realizado numerico valido.')
      return
    }

    setSubmitting(true)
    const { error } = await metrics.upsertResult({
      metric_key: currentMetricKey,
      reference_date: referenceDate,
      result_value: parsedResult,
      source: 'manual',
    })
    setSubmitting(false)

    if (error) {
      toast.error(error)
      return
    }

    toast.success('Resultado atualizado.')
    setMetricKey(currentMetricKey)
    setResultValue('')
  }

  const handleSaveTarget = async (event: React.FormEvent) => {
    event.preventDefault()
    const currentMetricKey = selectedMetric?.metric_key || metricKey
    if (!currentMetricKey || targetValue === '') {
      toast.error('Informe indicador e meta.')
      return
    }
    const parsedTarget = parseFiniteNumber(targetValue)
    if (parsedTarget == null) {
      toast.error('Informe uma meta numerica valida.')
      return
    }

    setSubmitting(true)
    const { error } = await metrics.upsertTarget({
      metric_key: currentMetricKey,
      reference_month: `${targetMonth}-01`,
      target_value: parsedTarget,
      source: 'manual',
    })
    setSubmitting(false)

    if (error) {
      toast.error(error)
      return
    }

    toast.success('Meta atualizada.')
    setTargetValue('')
  }

  const handleCreatePlan = async () => {
    const payload = {
      ...planDraft.payload,
      swot: planDraft.swot,
      generated_from: 'ui_autonomous',
    }
    const shouldCreateActions = actionPlan.items.length === 0

    setSubmitting(true)
    const { error } = await strategic.createPlan({
      title: planDraft.title,
      diagnosis_summary: planDraft.diagnosisSummary,
      market_comparison: { metrics: planDraft.metricRows, critical_gaps: planDraft.criticalGaps },
      generated_payload: payload,
      artifact: {
        artifact_type: 'strategic_plan_markdown',
        title: `Planejamento Estratégico PMR - ${clientName}`,
        content_md: planDraft.markdown,
        payload,
      },
      action_items: shouldCreateActions ? mapRecommendationsToInsert(planDraft.actions) : [],
    })
    setSubmitting(false)

    if (error) {
      toast.error(error)
      return
    }

    toast.success('Planejamento estrategico criado.')
    if (shouldCreateActions) await actionPlan.refetch()
    setPlanSummary('')
    setSwot({ strengths: '', weaknesses: '', opportunities: '', threats: '' })
  }

  if (metrics.loading || parameters.loading || strategic.loading || diagnostics.loading || actionPlan.loading) {
    return (
      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="p">Carregando dados estrategicos...</Typography>
      </Card>
    )
  }

  const error = metrics.error || parameters.error || strategic.error || diagnostics.error || actionPlan.error
  if (error) {
    return (
      <Card className="p-mx-lg border-none bg-white">
        <Typography variant="h3" tone="error">Estrategico indisponivel</Typography>
        <Typography variant="p" tone="muted">{error}</Typography>
      </Card>
    )
  }

  return (
    <section className="space-y-mx-lg">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-mx-lg">
        <Card className="p-mx-lg border-none bg-white xl:col-span-2">
          <div className="flex items-start justify-between gap-mx-md mb-mx-md">
            <div>
              <Typography variant="h3">ESTRATEGICO PMR</Typography>
              <Typography variant="caption" tone="muted">
                Recorte MVP com planejado, realizado, realizacao e comparativo.
              </Typography>
            </div>
            <Badge variant="outline" className="rounded-mx-full px-3 py-1">
              {parameters.activeSet?.version || 'SEM VERSAO'}
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-mx-sm pr-mx-md"><Typography variant="tiny" tone="muted">INDICADOR</Typography></th>
                  <th className="py-mx-sm pr-mx-md"><Typography variant="tiny" tone="muted">PLANEJADO</Typography></th>
                  <th className="py-mx-sm pr-mx-md"><Typography variant="tiny" tone="muted">REALIZADO</Typography></th>
                  <th className="py-mx-sm pr-mx-md"><Typography variant="tiny" tone="muted">% REAL.</Typography></th>
                  <th className="py-mx-sm pr-mx-md"><Typography variant="tiny" tone="muted">ANO ANT.</Typography></th>
                  <th className="py-mx-sm"><Typography variant="tiny" tone="muted">STATUS</Typography></th>
                </tr>
              </thead>
              <tbody>
                {strategicRows.map((row) => {
                  const status = row.status
                  return (
                    <tr key={row.metric_key} className="border-b border-border-subtle">
                      <td className="py-mx-sm pr-mx-md">
                        <Typography variant="p" className="">{row.label}</Typography>
                        <Typography variant="tiny" tone="muted">{getPmrMvpIndicator(row.metric_key)?.group || row.area}</Typography>
                      </td>
                      <td className="py-mx-sm pr-mx-md">
                        <Typography variant="p">{formatOptionalMetricValue(row.target_value, row.value_type)}</Typography>
                      </td>
                      <td className="py-mx-sm pr-mx-md">
                        <Typography variant="p">{formatOptionalMetricValue(row.latest_result, row.value_type)}</Typography>
                      </td>
                      <td className="py-mx-sm pr-mx-md">
                        <Typography variant="p">{formatOptionalMetricValue(row.achievement_rate, 'percent')}</Typography>
                      </td>
                      <td className="py-mx-sm pr-mx-md">
                        <Typography variant="p">{formatOptionalMetricValue(row.previous_year_result, row.value_type)}</Typography>
                        {row.yoy_delta != null && (
                          <Typography variant="tiny" tone={row.yoy_delta >= 0 ? 'success' : 'error'}>
                            {row.yoy_delta >= 0 ? '+' : ''}{formatMetricValue(row.yoy_delta, 'percent')}
                          </Typography>
                        )}
                      </td>
                      <td className="py-mx-sm">
                        <Badge variant={statusVariant[status]} className="rounded-mx-full px-3 py-1">
                          {status === 'success' ? 'DENTRO/ACIMA' : status === 'warning' ? 'ATENCAO' : status === 'danger' ? 'ABAIXO' : 'SEM DADO'}
                        </Badge>
                        {getPmrMvpIndicator(row.metric_key)?.mvp_status === 'backlog' && (
                          <Typography variant="tiny" tone="muted" className="block mt-1">fonte pendente</Typography>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-mx-md grid grid-cols-1 md:grid-cols-3 gap-mx-sm">
            {strategicRows.filter((row) => row.status === 'danger' || row.status === 'warning').slice(0, 3).map((row) => (
              <div key={row.metric_key} className="rounded-xl border border-border bg-surface-alt p-mx-sm">
                <Typography variant="tiny" tone="muted" className="">Alerta</Typography>
                <Typography variant="p" className="text-sm">{row.label}</Typography>
                <Typography variant="tiny" tone="muted">
                  Realizado {formatOptionalMetricValue(row.latest_result, row.value_type)} contra planejado {formatOptionalMetricValue(row.target_value, row.value_type)}.
                </Typography>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-mx-lg border-none bg-white">
          <Typography variant="h3" className="mb-mx-md">PLANEJAMENTO</Typography>
          {strategic.latestPlan ? (
            <div className="p-mx-md rounded-xl bg-surface-alt border border-border mb-mx-md">
              <Typography variant="p" className="">{strategic.latestPlan.title}</Typography>
              <Typography variant="tiny" tone="muted">
                Gerado em {new Date(strategic.latestPlan.generated_at).toLocaleDateString('pt-BR')}
              </Typography>
              <Typography variant="p" className="mt-mx-sm text-sm">{strategic.latestPlan.diagnosis_summary || 'Sem resumo.'}</Typography>
            </div>
          ) : (
            <Typography variant="p" tone="muted" className="mb-mx-md">Nenhum planejamento gerado ainda.</Typography>
          )}

          <div className="space-y-mx-md mb-mx-md pt-4 border-t border-border">
            <Typography variant="h3" className="text-xs">Entregáveis Disponíveis</Typography>
            {strategic.artifacts.length === 0 && (
                <Typography variant="tiny" tone="muted">Nenhum arquivo gerado via CLI ainda.</Typography>
            )}
            {strategic.artifacts.map(art => (
                <div key={art.id} className="flex items-center justify-between p-mx-xs rounded-lg border border-border-subtle bg-surface-alt/50">
                    <div className="min-w-0">
                        <Typography variant="p" className="text-xs font-bold truncate">{art.title}</Typography>
                        <Typography variant="tiny" tone="muted" className="block capitalize">{artifactTypeLabel(art.artifact_type)}</Typography>
                    </div>
                    <Button
                      type="button"
                      variant={selectedArtifact?.id === art.id ? 'outline' : 'ghost'}
                      size="icon"
                      className="h-mx-8 w-mx-8"
                      title="Ver Markdown"
                      onClick={() => setSelectedArtifactId(art.id)}
                    >
                      <FileText size={14} />
                    </Button>
                </div>
            ))}
            {selectedArtifact?.content_md && (
              <div className="rounded-xl border border-border bg-white p-mx-sm">
                <div className="flex items-center justify-between gap-mx-sm mb-mx-xs">
                  <Typography variant="tiny" tone="muted" className="">
                    {selectedArtifact.title}
                  </Typography>
                  <Badge variant="outline" className="rounded-mx-full px-2 py-0.5">
                    MD
                  </Badge>
                </div>
                <pre className="max-h-mx-64 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground font-mono">
                  {selectedArtifact.content_md}
                </pre>
              </div>
            )}
          </div>

          <Textarea
            value={planSummary}
            onChange={(event) => setPlanSummary(event.target.value)}
            placeholder="Complemento manual opcional. Se ficar vazio, o sistema gera a síntese automaticamente."
            className="min-h-mx-28 mb-mx-md"
          />

          <div className="space-y-mx-sm mb-mx-md p-mx-md rounded-xl bg-surface-alt border border-border">
            <Typography variant="h3" className="text-xs">Prévia autônoma</Typography>
            <Typography variant="p" className="text-sm">{planDraft.diagnosisSummary}</Typography>
            <div className="flex flex-wrap gap-mx-xs">
              <Badge variant={planDraft.criticalGaps.length ? 'danger' : 'success'} className="rounded-mx-full px-3 py-1">
                {planDraft.criticalGaps.length} GARGALOS
              </Badge>
              <Badge variant="outline" className="rounded-mx-full px-3 py-1">
                {planDraft.actions.length} AÇÕES
              </Badge>
              <Badge variant="outline" className="rounded-mx-full px-3 py-1">
                {diagnostics.responses.length} DIAGNÓSTICOS
              </Badge>
            </div>
          </div>

          <div className="space-y-mx-md mb-mx-md pt-4 border-t border-border">
            <Typography variant="h3" className="text-xs">Análise SWOT (Forças e Fraquezas)</Typography>
            <div className="grid grid-cols-1 gap-mx-sm">
                <div className="space-y-mx-xs">
                  <Typography as="label" variant="caption">Forças (Pontos Fortes)</Typography>
                  <Textarea 
                      value={swot.strengths} 
                      onChange={e => setSwot(prev => ({ ...prev, strengths: e.target.value }))}
                      placeholder="Experiência do sócio, qualidade do estoque..."
                  />
                </div>
                <div className="space-y-mx-xs">
                  <Typography as="label" variant="caption">Fraquezas (Pontos de Melhoria)</Typography>
                  <Textarea 
                      value={swot.weaknesses} 
                      onChange={e => setSwot(prev => ({ ...prev, weaknesses: e.target.value }))}
                      placeholder="Falta de clareza nos processos, baixo foco em vendas..."
                  />
                </div>
                <div className="space-y-mx-xs">
                  <Typography as="label" variant="caption">Oportunidades (Crescimento)</Typography>
                  <Textarea 
                      value={swot.opportunities} 
                      onChange={e => setSwot(prev => ({ ...prev, opportunities: e.target.value }))}
                      placeholder="Aumento do ticket médio, diversificação de canais..."
                  />
                </div>
                <div className="space-y-mx-xs">
                  <Typography as="label" variant="caption">Ameaças (Riscos)</Typography>
                  <Textarea 
                      value={swot.threats} 
                      onChange={e => setSwot(prev => ({ ...prev, threats: e.target.value }))}
                      placeholder="Aumento de custos, volatilidade econômica..."
                  />
                </div>
            </div>
          </div>

          <Button type="button" className="w-full" onClick={handleCreatePlan} disabled={submitting}>
            GERAR PLANEJAMENTO
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-mx-lg">
        <Card className="p-mx-lg border-none bg-white">
          <Typography variant="h3" className="mb-mx-md">LANÇAR REALIZADO</Typography>
          <form onSubmit={handleSaveResult} className="grid grid-cols-1 md:grid-cols-2 gap-mx-md">
            <Select
              label="Indicador"
              value={selectedMetric?.metric_key || ''}
              onChange={(event) => setMetricKey(event.target.value)}
            >
              {metrics.catalog.map((metric) => (
                <option key={metric.metric_key} value={metric.metric_key}>{metric.label}</option>
              ))}
            </Select>
            <div className="space-y-mx-xs">
              <Typography as="label" htmlFor="pmr-result-date" variant="caption">Data</Typography>
              <Input aria-label="Data" id="pmr-result-date" type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} />
            </div>
            <div className="space-y-mx-xs md:col-span-2">
              <Typography as="label" htmlFor="pmr-result-value" variant="caption">Valor realizado</Typography>
              <Input aria-label="Valor realizado" id="pmr-result-value" type="number" step="0.01" value={resultValue} onChange={(event) => setResultValue(event.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={submitting}>SALVAR REALIZADO</Button>
            </div>
          </form>
        </Card>

        <Card className="p-mx-lg border-none bg-white">
          <Typography variant="h3" className="mb-mx-md">LANÇAR META</Typography>
          <form onSubmit={handleSaveTarget} className="grid grid-cols-1 md:grid-cols-2 gap-mx-md">
            <Select
              label="Indicador"
              value={selectedMetric?.metric_key || ''}
              onChange={(event) => setMetricKey(event.target.value)}
            >
              {metrics.catalog.map((metric) => (
                <option key={metric.metric_key} value={metric.metric_key}>{metric.label}</option>
              ))}
            </Select>
            <div className="space-y-mx-xs">
              <Typography as="label" htmlFor="pmr-target-month" variant="caption">Mes</Typography>
              <Input aria-label="Mes" id="pmr-target-month" type="month" value={targetMonth} onChange={(event) => setTargetMonth(event.target.value)} />
            </div>
            <div className="space-y-mx-xs md:col-span-2">
              <Typography as="label" htmlFor="pmr-target-value" variant="caption">Meta</Typography>
              <Input aria-label="Meta" id="pmr-target-value" type="number" step="0.01" value={targetValue} onChange={(event) => setTargetValue(event.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={submitting}>SALVAR META</Button>
            </div>
          </form>
        </Card>
      </div>
    </section>
  )
}

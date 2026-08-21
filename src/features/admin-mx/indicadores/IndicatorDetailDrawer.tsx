import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Badge } from '@/components/atoms/Badge'
import { TabNav } from '@/components/molecules/TabNav'
import { Modal } from '@/components/organisms/Modal'
import { MxEmptyState, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import {
  INDICATOR_CALCULATION_MODE_LABEL,
  INDICATOR_FREQUENCY_LABEL,
  INDICATOR_STATUS_LABEL,
  allowedIndicatorTransitions,
  indicatorCalculationMode,
  indicatorHasParameter,
  isUsableIndicator,
  type CatalogIndicator,
  type IndicatorStatus,
} from './indicatorCatalog'
import { fetchIndicatorHistory, type IndicatorHistoryRow } from './strategicPlanAdmin'

type DetailTab = 'definicao' | 'meta' | 'formula' | 'realizado' | 'visualizacao' | 'historico'

const DETAIL_TABS: Array<{ key: DetailTab; label: string }> = [
  { key: 'definicao', label: 'Definição' },
  { key: 'meta', label: 'Meta' },
  { key: 'formula', label: 'Fórmula' },
  { key: 'realizado', label: 'Realizado' },
  { key: 'visualizacao', label: 'Visualização' },
  { key: 'historico', label: 'Histórico' },
]

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

function parameterCodes(formula: string | null) {
  return [...(formula ?? '').matchAll(/PAR\(\s*["']([^"']+)["']\s*\)/gi)].map(match => match[1])
}

function DefinitionTab({ indicator }: { indicator: CatalogIndicator }) {
  return (
    <div className="space-y-4">
      {isUsableIndicator(indicator)
        ? <MxStatusBanner tone="success">Indicador disponível para planos estratégicos e para o Módulo Dono.</MxStatusBanner>
        : <MxStatusBanner tone="warning">Só indicador publicado entra em plano estratégico e no Módulo Dono.</MxStatusBanner>}
      <dl className="grid gap-3 sm:grid-cols-2">
        {[
          ['Chave', indicator.metric_key],
          ['Área', indicator.area],
          ['Tipo de valor', indicator.value_type],
          ['Leitura', indicator.direction === 'increase' ? 'Maior é melhor' : 'Menor é melhor'],
          ['Escopo da fonte', indicator.source_scope],
          ['Frequência', INDICATOR_FREQUENCY_LABEL[indicator.frequencia]],
          ['Casas decimais', String(indicator.casas_decimais)],
          ['Vigência', `${indicator.ano_inicial ?? '—'} a ${indicator.ano_final ?? 'sem fim'}`],
          ['Origem', indicator.created_origin === 'criado_mx' ? 'Criado pelo MX' : 'Padrão MX'],
          ['Ordem oficial', String(indicator.sort_order)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {indicator.descricao ? <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Descrição</div><p className="text-sm text-foreground">{indicator.descricao}</p></div> : null}
    </div>
  )
}

function MetaTab({ indicator, onOpenTargets }: { indicator: CatalogIndicator; onOpenTargets?: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Metas cadastradas</div><div className="mt-1 text-2xl font-semibold text-foreground">{indicator.targets}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Meta anual acumulada</div><div className="mt-1 text-2xl font-semibold text-foreground">{indicator.annual_target ?? '—'}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Modo da meta</div><div className="mt-1 text-sm font-semibold text-foreground">{INDICATOR_CALCULATION_MODE_LABEL[indicatorCalculationMode(indicator)]}</div></div>
      </div>
      <MxStatusBanner tone="info">As metas mensais são persistidas por unidade e ciclo. Use a aba Metas e realizados para editar células liberadas, importar planilhas ou revisar o histórico.</MxStatusBanner>
      {onOpenTargets ? <Button variant="outline" onClick={onOpenTargets}>Abrir Metas e realizados</Button> : null}
    </div>
  )
}

function FormulaTab({ indicator }: { indicator: CatalogIndicator }) {
  const parameters = parameterCodes(indicator.formula_expression)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{INDICATOR_CALCULATION_MODE_LABEL[indicatorCalculationMode(indicator)]}</Badge>{indicatorHasParameter(indicator) ? <Badge variant="info">Parametrizado</Badge> : null}</div>
      {indicator.formula_expression ? <pre className="overflow-auto rounded-xl border border-border bg-surface-alt p-4 text-sm leading-6 text-foreground whitespace-pre-wrap">{indicator.formula_expression}</pre> : <MxEmptyState variant="dataset" title="Sem fórmula cadastrada" description="Este indicador recebe o valor manualmente ou ainda não teve sua fórmula definida." />}
      {parameters.length ? <div><div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parâmetros utilizados</div><div className="mt-2 flex flex-wrap gap-2">{parameters.map(code => <Badge key={code} variant="secondary">{code}</Badge>)}</div></div> : null}
    </div>
  )
}

function ActualTab({ indicator, onOpenTargets }: { indicator: CatalogIndicator; onOpenTargets?: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Fonte do realizado</div><div className="mt-1 font-semibold text-foreground">{indicator.source_scope || 'Não informada'}</div></div>
        <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">Indicador calculado</div><div className="mt-1 font-semibold text-foreground">{indicatorCalculationMode(indicator) === 'MANUAL' ? 'Não' : 'Sim'}</div></div>
      </div>
      <MxStatusBanner tone="neutral">O realizado e o ano anterior vêm das fontes operacionais do MX e podem ser conferidos por loja na tabela de Metas e realizados. Nenhum valor demonstrativo é criado nesta visão.</MxStatusBanner>
      {onOpenTargets ? <Button variant="outline" onClick={onOpenTargets}>Abrir Realizado por loja</Button> : null}
    </div>
  )
}

function VisualizationTab(props: { indicator: CatalogIndicator; busy: boolean; onToggleVisibility: (visible: boolean) => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface-alt p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prévia no Módulo Dono</div>
        <div className="mt-3 flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
          <div><div className="text-sm font-semibold text-foreground">{props.indicator.label}</div><div className="mt-1 text-xs text-muted-foreground">{props.indicator.area} · {props.indicator.value_type}</div></div>
          <div className="text-right"><div className="text-xs text-muted-foreground">Status</div><div className="mt-1 font-semibold text-foreground">{INDICATOR_STATUS_LABEL[props.indicator.status]}</div></div>
        </div>
      </div>
      <label className="flex items-center gap-3 rounded-xl border border-border p-4 text-sm text-foreground">
        <input type="checkbox" checked={props.indicator.visivel_dono} disabled={props.busy} onChange={event => props.onToggleVisibility(event.target.checked)} />
        <span><strong>Visível no Módulo Dono</strong><span className="mt-0.5 block text-xs text-muted-foreground">Controla a exibição para o cliente, sem apagar metas ou histórico.</span></span>
      </label>
    </div>
  )
}

function HistoryTab({ indicator, loading, error, rows, onOpenFullHistory }: { indicator: CatalogIndicator; loading: boolean; error: string | null; rows: IndicatorHistoryRow[]; onOpenFullHistory?: () => void }) {
  return (
    <div className="space-y-4">
      {error ? <MxStatusBanner tone="warning">{error}</MxStatusBanner> : null}
      {loading ? <div className="h-28 animate-pulse rounded-xl bg-surface-alt" aria-label="Carregando histórico do indicador" /> : rows.length ? <div className="space-y-2">{rows.slice(0, 8).map(row => <div key={row.id} className="rounded-xl border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-foreground">{row.action}</span><span className="text-xs text-muted-foreground">{formatDate(row.createdAt)} · {row.userName}</span></div><div className="mt-1 truncate text-xs text-muted-foreground" title={row.after}>{row.resource} · {row.after}</div></div>)}</div> : <MxEmptyState variant="dataset" title="Nenhum evento para este indicador" description="As alterações e metas futuras aparecerão nesta trilha quando forem persistidas." />}
      {onOpenFullHistory ? <Button variant="outline" onClick={onOpenFullHistory}>Abrir histórico completo</Button> : null}
      <span className="sr-only">Histórico filtrado para {indicator.metric_key}</span>
    </div>
  )
}

export function IndicatorDetailDrawer(props: {
  indicator: CatalogIndicator | null
  busy: boolean
  onTransition: (status: IndicatorStatus) => void
  onToggleVisibility: (visible: boolean) => void
  onEdit: () => void
  onOpenTargets?: () => void
  onOpenFullHistory?: () => void
  onClose: () => void
}) {
  const { indicator } = props
  const [tab, setTab] = useState<DetailTab>('definicao')
  const [history, setHistory] = useState<IndicatorHistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(() => {
    setTab('definicao')
    setHistory([])
    setHistoryError(null)
  }, [indicator?.metric_key])

  useEffect(() => {
    if (!indicator || tab !== 'historico') return
    let active = true
    setHistoryLoading(true)
    void fetchIndicatorHistory({ metricKey: indicator.metric_key, limit: 30 }).then(result => {
      if (!active) return
      setHistory(result.rows)
      setHistoryError(result.error)
      setHistoryLoading(false)
    })
    return () => { active = false }
  }, [indicator, tab])

  const content = useMemo(() => {
    if (!indicator) return null
    if (tab === 'definicao') return <DefinitionTab indicator={indicator} />
    if (tab === 'meta') return <MetaTab indicator={indicator} onOpenTargets={props.onOpenTargets} />
    if (tab === 'formula') return <FormulaTab indicator={indicator} />
    if (tab === 'realizado') return <ActualTab indicator={indicator} onOpenTargets={props.onOpenTargets} />
    if (tab === 'visualizacao') return <VisualizationTab indicator={indicator} busy={props.busy} onToggleVisibility={props.onToggleVisibility} />
    return <HistoryTab indicator={indicator} loading={historyLoading} error={historyError} rows={history} onOpenFullHistory={props.onOpenFullHistory} />
  }, [history, historyError, historyLoading, indicator, props, tab])

  if (!indicator) return null

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`${indicator.label} · ${INDICATOR_STATUS_LABEL[indicator.status]}`}
      description={`${indicator.metric_key} · ${indicator.area}`}
      size="xl"
      closeOnEscape={!props.busy}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.busy}>Fechar</Button>
          <Button variant="outline" onClick={props.onEdit} disabled={props.busy}>Editar</Button>
          {allowedIndicatorTransitions(indicator.status).map(status => <Button key={status} variant={status === 'publicado' ? 'primary' : 'outline'} onClick={() => props.onTransition(status)} disabled={props.busy}>{INDICATOR_STATUS_LABEL[status]}</Button>)}
        </>
      )}
    >
      <TabNav tabs={DETAIL_TABS} activeTab={tab} onTabChange={setTab} scrollable className="mt-4" />
      <div className="mt-5" role="tabpanel" aria-label={DETAIL_TABS.find(item => item.key === tab)?.label}>{content}</div>
    </Modal>
  )
}

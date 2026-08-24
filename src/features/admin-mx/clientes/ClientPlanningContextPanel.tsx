import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Building2, CheckCircle2, CircleAlert, RefreshCw, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import {
  MxEmptyState,
  MxLoadingState,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { consolidateClientPlanning, resolvePolicies, type PlanningValueRow } from '@/features/strategic-plan/clientPlanningConsolidation'
import {
  fetchClientProductPackage,
  fetchClientUnits,
  fetchCyclePlanningValues,
  fetchUnitsPlanningValues,
} from '@/features/strategic-plan/clientPlanningRepository'
import type { ClientUnit } from '@/features/strategic-plan/clientUnits'
import type { ProductPackageResolution } from '@/features/strategic-plan/clientProductPackage'
import { type PublicationCardSummary } from '@/features/strategic-plan/planCycle'
import { fetchCurrentCycle, validateCycleReadiness, type PlanCycle } from '@/features/strategic-plan/planCycleRepository'
import { getClientStrategicPlanPublicationSummary } from '@/features/strategic-plan/publicationSummary'
import { buildAdminStrategicPlanHref } from '@/features/strategic-plan/adminStrategicPlanHref'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/organisms/Table'

type PlanningState = {
  units: ClientUnit[]
  packageResolution: ProductPackageResolution | null
  cycle: PlanCycle | null
  readiness: { total: number; ready: number; pending: number; canPublish: boolean } | null
  values: PlanningValueRow[]
  publicationCard: PublicationCardSummary | null
  revisionInProgress: boolean
  error: string | null
}

const CYCLE_STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  em_validacao: 'Em validação',
  publicado: 'Publicado',
  revisado: 'Revisado',
}

function formatValue(value: number | null | undefined): string {
  return value == null ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function ClientPlanningContextPanel(props: {
  clientId: string
  clientSlug?: string | null
  primaryStoreId?: string | null
  /** Ciclo canônico da Visão 360 (prompt #09) — prevalece sobre fetch local. */
  cycleId?: string | null
  year?: number | null
}) {
  const year = props.year ?? new Date().getFullYear()
  const month = new Date().getMonth() + 1
  const [state, setState] = useState<PlanningState>({
    units: [], packageResolution: null, cycle: null, readiness: null, values: [],
    publicationCard: null, revisionInProgress: false, error: null,
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setState(current => ({ ...current, error: null }))
    const [unitsResult, packageResult, cycleResult, publicationResult] = await Promise.all([
      fetchClientUnits(props.clientId),
      fetchClientProductPackage(props.clientId),
      fetchCurrentCycle(props.clientId, year),
      getClientStrategicPlanPublicationSummary({
        clientAccountId: props.clientId,
        referenceYear: year,
      }),
    ])

    if (unitsResult.error) {
      setState(current => ({ ...current, error: unitsResult.error, units: [] }))
      setLoading(false)
      return
    }

    const units = unitsResult.units
    const activeUnitIds = units.filter(unit => unit.active).map(unit => unit.id)
    const valuesResult = cycleResult.cycle
      ? await fetchCyclePlanningValues(cycleResult.cycle.id)
      : await fetchUnitsPlanningValues(activeUnitIds, year)
    let readiness: PlanningState['readiness'] = null
    let readinessError: string | null = null
    if (cycleResult.cycle) {
      const result = await validateCycleReadiness(cycleResult.cycle.id)
      readiness = result.readiness
        ? { total: result.readiness.total, ready: result.readiness.ready, pending: result.readiness.pending, canPublish: result.readiness.canPublish }
        : null
      readinessError = result.error
    }

    setState({
      units,
      packageResolution: packageResult,
      cycle: cycleResult.cycle,
      readiness,
      values: valuesResult.rows,
      publicationCard: publicationResult.summary?.card ?? null,
      revisionInProgress: publicationResult.summary?.revisionInProgress ?? false,
      error: cycleResult.error ?? valuesResult.error ?? readinessError ?? publicationResult.error,
    })
    setLoading(false)
  }, [props.clientId, year])

  useEffect(() => { void load() }, [load])

  const resolution = state.packageResolution?.ok ? state.packageResolution.resolution : null
  const activeUnits = useMemo(() => state.units.filter(unit => unit.active), [state.units])
  const matrixId = activeUnits.find(unit => unit.store_type === 'MATRIZ')?.id ?? props.primaryStoreId ?? null
  const indicators = useMemo(
    () => (resolution?.items ?? []).map(item => ({ code: item.metric_key, global_display_order: item.ordem_snapshot })),
    [resolution?.items],
  )
  const policies = useMemo(
    () => resolvePolicies(indicators, Object.fromEntries((resolution?.items ?? []).map(item => [item.metric_key, {
      unit_entry_mode: item.unit_entry_mode_snapshot,
      unit_rollup_method: item.unit_rollup_method_snapshot,
      weight_indicator_code: item.weight_indicator_code_snapshot,
    }]))),
    [indicators, resolution?.items],
  )
  const consolidated = useMemo(() => {
    if (!resolution || !indicators.length || !activeUnits.length) return null
    return consolidateClientPlanning({ rows: state.values, units: activeUnits, indicators, policies })
  }, [activeUnits, indicators, policies, resolution, state.values])
  const currentIndicators = useMemo(() => {
    if (!resolution) return []
    return resolution.items.slice(0, 6).map(item => ({
      code: item.metric_key,
      label: item.label_snapshot || item.metric_key,
      meta: consolidated?.meta.valueMap[item.metric_key]?.[month] ?? null,
      realizado: consolidated?.realizado.valueMap[item.metric_key]?.[month] ?? null,
    }))
  }, [consolidated, month, resolution])
  const publicationCard = state.publicationCard
  const expectedCells = (resolution?.items.length ?? 0) * activeUnits.length
  const metasPreenchidas = state.values.filter(row => row.month === month && row.meta != null).length
  const realizadosPreenchidos = state.values.filter(row => row.month === month && row.realizado != null).length
  const strategicHref = buildAdminStrategicPlanHref({
    clientId: props.clientId,
    clientSlug: props.clientSlug,
    cycleId: props.cycleId ?? state.cycle?.id ?? null,
    year,
    storeId: matrixId || props.primaryStoreId || null,
  })

  if (loading) return <MxLoadingState label="Carregando Plano Estratégico do cliente" />

  return (
    <MxSectionCard>
      <MxSectionHeader
        title="Plano Estratégico"
        description="O planejamento fica no contexto do cliente, com pacote, ciclo e consolidado da matriz + filiais."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} aria-label="Atualizar Plano Estratégico">
              <RefreshCw size={14} />Atualizar
            </Button>
            <Button asChild size="sm">
              <Link to={strategicHref}><ArrowUpRight size={14} />Abrir plano completo</Link>
            </Button>
          </div>
        )}
      />

      <div className="space-y-4 p-5">
        {state.error ? <MxStatusBanner tone="warning">Leitura parcial do planejamento: {state.error}</MxStatusBanner> : null}
        {state.revisionInProgress ? (
          <MxStatusBanner tone="info">Há revisão em rascunho. O card acima mostra a versão publicada ao Dono.</MxStatusBanner>
        ) : null}
        {!activeUnits.length ? (
            <MxStatusBanner tone="warning"><Building2 size={16} className="mr-1 inline" />Cadastre a matriz operacional para iniciar o consolidado.</MxStatusBanner>
        ) : null}
        {state.packageResolution && !state.packageResolution.ok ? (
          <MxStatusBanner tone="warning">
            <CircleAlert size={16} className="mr-1 inline" />{state.packageResolution.message} <Link className="font-semibold underline" to="/produtos">Revisar produto</Link>
          </MxStatusBanner>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface-alt p-3"><div className="text-xs text-muted-foreground">Ciclo {year}</div><div className="mt-1 font-semibold text-foreground">{publicationCard ? publicationCard.statusLabel : state.cycle ? CYCLE_STATUS_LABEL[state.cycle.status] ?? state.cycle.status : 'Sem ciclo'}</div></div>
          <div className="rounded-lg border border-border bg-surface-alt p-3"><div className="text-xs text-muted-foreground">Indicadores do pacote</div><div className="mt-1 font-semibold text-foreground">{resolution?.items.length ?? 0}</div><div className="text-xs text-muted-foreground">{resolution ? `${resolution.manualCount} manuais · ${resolution.calculatedCount} calculados` : 'Produto sem roster'}</div></div>
          <div className="rounded-lg border border-border bg-surface-alt p-3"><div className="text-xs text-muted-foreground">Unidades consolidadas</div><div className="mt-1 font-semibold text-foreground">{activeUnits.length}</div><div className="text-xs text-muted-foreground">matriz + filiais ativas</div></div>
          <div className="rounded-lg border border-border bg-surface-alt p-3"><div className="text-xs text-muted-foreground">Indicadores com meta</div><div className="mt-1 font-semibold text-foreground">{publicationCard ? publicationCard.indicadoresComMeta : '—'}</div><div className="text-xs text-muted-foreground">{publicationCard ? `Metas publicadas: ${publicationCard.metasPublicadas} · Pendentes: ${publicationCard.metasPendentes}` : 'Validação ainda não iniciada'}</div></div>
        </div>

        {state.readiness && !state.readiness.canPublish ? (
          <MxStatusBanner tone="warning">O ciclo ainda tem {state.readiness.pending} pendência(s) antes da publicação.</MxStatusBanner>
        ) : state.readiness?.canPublish ? (
          <MxStatusBanner tone="success"><CheckCircle2 size={16} className="mr-1 inline" />Plano pronto para publicação.</MxStatusBanner>
        ) : null}

        {resolution && activeUnits.length ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Metas preenchidas · mês {month}</div><div className="mt-1 text-lg font-semibold text-foreground">{metasPreenchidas}/{expectedCells || '—'}</div></div>
              <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Realizados carregados · mês {month}</div><div className="mt-1 text-lg font-semibold text-foreground">{realizadosPreenchidos}/{expectedCells || '—'}</div></div>
            </div>
            {currentIndicators.length ? (
              <MxTableSurface>
                <Table className="min-w-[520px]">
                  <TableHeader><TableRow><TableHead>Indicador do pacote</TableHead><TableHead>Meta consolidada</TableHead><TableHead>Realizado consolidado</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {currentIndicators.map(indicator => <TableRow key={indicator.code}><TableCell className="font-semibold text-foreground">{indicator.label}</TableCell><TableCell>{formatValue(indicator.meta)}</TableCell><TableCell>{formatValue(indicator.realizado)}</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </MxTableSurface>
            ) : <MxEmptyState title="Sem valores no mês atual" description="O roster está vinculado, mas ainda não há metas ou realizados para esta competência." />}
          </>
        ) : null}

        {resolution && activeUnits.length ? <p className="text-xs text-muted-foreground"><Target size={16} className="mr-1 inline" />O consolidado recalcula indicadores derivados pelas bases das unidades; não soma percentuais diretamente.</p> : null}
      </div>
    </MxSectionCard>
  )
}

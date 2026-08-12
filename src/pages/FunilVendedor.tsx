import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'
import { PageCanvas } from '@/design-system/page'
import { useAuth } from '@/hooks/useAuth'
import { useOfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import { supabase } from '@/lib/supabase'
import { resolveIndividualGoal } from '@/lib/storeSalesRules'
import {
  buildCurrentMonthRange,
  buildFunnelDashboard,
  buildLastMonthRange,
  buildLastThreeMonthsRange,
  type ChannelFunnel,
  type FunnelKpis,
  type FunnelRow,
  type PeriodRange,
} from '@/features/crm/lib/funil-vendas-diagnostico'
import { resolveOfficialSellerKpis } from '@/features/crm/funil-vendedor/official-kpis'
import {
  BaseEstatisticaCard,
  EficienciaCanalCard,
  EsforcoNecessarioCard,
  EvolucaoCollapsible,
  StatusMetaCard,
} from '@/features/crm/funil-vendedor/FunilVendedorCards'
import type { Confidence, PeriodKey } from '@/features/crm/funil-vendedor/types'

type SourceRows = {
  events: FunnelRow[]
  customers: FunnelRow[]
  storeConfigs: FunnelRow[]
}

type ReadResult = {
  data: unknown
  error: { message?: string } | null
}

type ReadOnlyTable = {
  select: (columns: string) => {
    limit: (count: number) => Promise<ReadResult>
  }
}

const readOnlyDb = supabase as unknown as {
  from: (table: string) => ReadOnlyTable
}

const emptyRows: SourceRows = {
  events: [],
  customers: [],
  storeConfigs: [],
}

const periodLabels: Record<PeriodKey, string> = {
  current_month: 'Este mês',
  last_month: 'Mês passado',
  last_3_months: 'Últimos 3 meses',
}

async function readRows(table: string): Promise<{ rows: FunnelRow[]; error: string | null }> {
  try {
    const { data, error } = await readOnlyDb.from(table).select('*').limit(5000)
    if (error) return { rows: [], error: error.message || `Falha ao ler ${table}.` }
    return { rows: Array.isArray(data) ? (data as FunnelRow[]) : [], error: null }
  } catch (err) {
    return { rows: [], error: err instanceof Error ? err.message : `Falha ao ler ${table}.` }
  }
}

function resolvePeriod(period: PeriodKey): PeriodRange {
  if (period === 'last_month') return buildLastMonthRange()
  if (period === 'last_3_months') return buildLastThreeMonthsRange()
  return buildCurrentMonthRange()
}

function rowMatchesStore(row: FunnelRow, storeId: string | null) {
  if (!storeId) return true
  const value = row.store_id ?? row.loja_id
  return value === storeId
}

/** Resolve a seller goal from the active store rules and optional custom target. */
function resolveStoreMonthlyGoal(storeConfig: FunnelRow | null, activeSellersCount: number | null, customGoal: number | null): number | null {
  if (!storeConfig) return null
  return resolveIndividualGoal({
    mode: storeConfig.individual_goal_mode as string | null | undefined,
    storeMonthlyGoal: storeConfig.monthly_goal as number | null | undefined,
    activeSellersCount,
    customGoal,
  })
}

export default function FunilVendedor() {
  const { supabaseUser, profile, storeId, activeStoreId } = useAuth()
  const effectiveStoreId = activeStoreId || storeId || profile?.store_id || null
  const sellerIds = useMemo(() => [supabaseUser?.id, profile?.id].filter((id): id is string => Boolean(id)), [profile?.id, supabaseUser?.id])
  const [periodKey, setPeriodKey] = useState<PeriodKey>('current_month')
  const [rows, setRows] = useState<SourceRows>(emptyRows)
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<string[]>([])
  const [activeSellersCount, setActiveSellersCount] = useState<number | null>(null)
  const [customGoal, setCustomGoal] = useState<number | null>(null)
  const [chartAberto, setChartAberto] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [events, customers, storeConfigs] = await Promise.all([
      readRows('eventos_comerciais'),
      readRows('clientes_oportunidades'),
      readRows('regras_metas_loja'),
    ])
    setRows({ events: events.rows, customers: customers.rows, storeConfigs: storeConfigs.rows })
    setErrors([events.error, customers.error, storeConfigs.error].filter((error): error is string => Boolean(error)))
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // The seller cannot count colleagues through RLS, so the dedicated RPC owns
  // the active-seller count used by the even-goal rule.
  useEffect(() => {
    if (!effectiveStoreId) { setActiveSellersCount(null); return }
    let cancelled = false
    supabase.rpc('contar_vendedores_ativos_loja', { p_store_id: effectiveStoreId }).then(({ data, error }) => {
      if (!cancelled) setActiveSellersCount(error ? null : (typeof data === 'number' ? data : null))
    })
    return () => { cancelled = true }
  }, [effectiveStoreId])

  // Custom monthly targets are optional; the store rule remains the fallback.
  useEffect(() => {
    const sellerId = profile?.id
    if (!effectiveStoreId || !sellerId) { setCustomGoal(null); return }
    let cancelled = false
    const now = new Date()
    supabase
      .from('metas')
      .select('target')
      .eq('store_id', effectiveStoreId)
      .eq('user_id', sellerId)
      .eq('month', now.getMonth() + 1)
      .eq('year', now.getFullYear())
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        const target = !error && data ? Number((data as { target?: number }).target) : null
        setCustomGoal(Number.isFinite(target) && (target as number) > 0 ? (target as number) : null)
      })
    return () => { cancelled = true }
  }, [effectiveStoreId, profile?.id])

  const period = useMemo(() => resolvePeriod(periodKey), [periodKey])
  const periodStart = period.start.toISOString().slice(0, 10)
  const periodEnd = period.end.toISOString().slice(0, 10)
  const { performance: officialPerformance } = useOfficialSellerPerformance(periodStart, periodEnd, profile?.id, effectiveStoreId)
  const dashboard = useMemo(
    () => buildDashboard(rows, sellerIds, effectiveStoreId, period, activeSellersCount, customGoal),
    [effectiveStoreId, period, rows, sellerIds, activeSellersCount, customGoal],
  )
  const rollingPeriod = useMemo(() => buildLastThreeMonthsRange(), [])
  const rollingDashboard = useMemo(
    () => buildDashboard(rows, sellerIds, effectiveStoreId, rollingPeriod, activeSellersCount, customGoal),
    [effectiveStoreId, rollingPeriod, rows, sellerIds, activeSellersCount, customGoal],
  )
  const officialKpis = useMemo<FunnelKpis>(() => {
    return resolveOfficialSellerKpis(dashboard.kpis, officialPerformance)
  }, [dashboard.kpis, officialPerformance])

  if (loading) {
    return (
      <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex min-h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-blue-700" />
      </PageCanvas>
    )
  }

  const selectedHasBase = hasEnoughBase(dashboard)
  const rollingHasBase = hasEnoughBase(rollingDashboard)
  const confidence = getConfidence(selectedHasBase, rollingHasBase)
  const calculationDashboard = selectedHasBase ? dashboard : rollingDashboard
  const calculationPeriodLabel = selectedHasBase ? periodLabels[periodKey] : 'Últimos 3 meses'
  const hasAnyData = rows.events.length > 0 || rows.customers.length > 0

  return (
    <div className="min-h-full bg-surface-alt">
      <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-4">
        <SellerPageHeader
          icon={TrendingUp}
          title="Minha Meta"
          actions={(
            <div role="group" aria-label="Período" className="flex items-center gap-1 rounded-xl bg-muted p-1">
              {Object.entries(periodLabels).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={periodKey === value}
                  onClick={() => setPeriodKey(value as PeriodKey)}
                  className={`rounded-lg px-3 py-1.5 text-caption font-semibold transition-all ${periodKey === value ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        />

        {errors.length > 0 && (
          <div role="status" className="rounded-2xl border border-status-warning/20 bg-status-warning-surface p-mx-md text-sm font-semibold text-status-warning-text">
            Algumas fontes ainda não retornaram dados. A tela continua somente leitura e mostra vazio quando base não existe.
          </div>
        )}

        <StatusMetaCard kpis={officialKpis} periodKey={periodKey} />

        {!hasAnyData && (
          <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-sm">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-text-disabled" />
            <p className="mb-1 text-body font-bold text-foreground">Sem dados suficientes neste período.</p>
            <p className="text-body-sm text-muted-foreground">Registre atendimentos na Carteira ou no Fechamento Diário para alimentar o Funil.</p>
          </div>
        )}

        {hasAnyData && (
          <>
            {officialKpis.meta !== null && officialKpis.meta > 0 && officialKpis.faltam !== null && (
              <EsforcoNecessarioCard channels={calculationDashboard.channels} faltam={officialKpis.faltam} />
            )}
            <EficienciaCanalCard channels={dashboard.channels} />
            <BaseEstatisticaCard displayedPeriod={periodLabels[periodKey]} calculationPeriod={calculationPeriodLabel} confidence={confidence} />
            <EvolucaoCollapsible data={dashboard.evolution} chartAberto={chartAberto} onToggle={() => setChartAberto(value => !value)} />
          </>
        )}
      </PageCanvas>
    </div>
  )
}

function buildDashboard(rows: SourceRows, sellerIds: string[], storeId: string | null, period: PeriodRange, activeSellersCount: number | null, customGoal: number | null) {
  const storeConfig = rows.storeConfigs.find(row => rowMatchesStore(row, storeId)) || null
  const meta = resolveStoreMonthlyGoal(storeConfig, activeSellersCount, customGoal)
  return buildFunnelDashboard({
    events: rows.events,
    customers: rows.customers,
    period,
    sellerIds,
    storeId,
    meta,
    storeConfig,
  })
}

function hasEnoughChannel(channel: ChannelFunnel) {
  const first = channel.steps[0]?.value || 0
  const sales = channel.steps.find(step => step.key === 'venda')?.value || 0
  const atendimento = channel.steps.find(step => step.key === 'atendimento_comercial')?.value || 0
  if (channel.channel === 'Showroom') return first >= 5 || sales >= 1
  return first >= 5 && atendimento >= 1
}

function hasEnoughBase(dashboard: { channels: ChannelFunnel[] }) {
  return dashboard.channels.some(hasEnoughChannel)
}

function getConfidence(selectedHasBase: boolean, rollingHasBase: boolean): Confidence {
  if (selectedHasBase) return 'Alta'
  if (rollingHasBase) return 'Média'
  return 'Baixa'
}

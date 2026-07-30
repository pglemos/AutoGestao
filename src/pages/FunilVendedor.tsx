import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle, ChevronDown, ChevronUp, Target, TrendingUp } from 'lucide-react'
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'
import { useAuth } from '@/hooks/useAuth'
import { chartTokens } from '@/lib/charts/tokens'
import { supabase } from '@/lib/supabase'
import { useOfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import { resolveIndividualGoal } from '@/lib/storeSalesRules'
import {
  buildCurrentMonthRange,
  buildFunnelDashboard,
  buildLastMonthRange,
  buildLastThreeMonthsRange,
  type ChannelFunnel,
  type FunnelChannel,
  type FunnelKpis,
  type FunnelRow,
  type FunnelStepKey,
  type MonthlyEvolutionPoint,
  type PeriodRange,
} from '@/features/crm/lib/funil-vendas-diagnostico'

type PeriodKey = 'current_month' | 'last_month' | 'last_3_months'
type Confidence = 'Alta' | 'Média' | 'Baixa'

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

type EsforcoValues = { atendimentos?: number; agendamentos?: number; qualificados?: number; oportunidades?: number }

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

const VOLUME_LABEL: Record<FunnelChannel, string> = {
  Showroom: 'Atendimentos',
  Internet: 'Oportunidades',
  Carteira: 'Qualificados',
}

const EFFORT_PRINCIPAL_BG: Record<FunnelChannel, string> = {
  Carteira: 'bg-green-50 border-green-200',
  Internet: 'bg-blue-50 border-blue-200',
  Showroom: 'bg-orange-50 border-orange-200',
}

const EFICIENCIA_COR: Record<FunnelChannel, { header: string; badge: string; btn: string }> = {
  Showroom: { header: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', btn: 'text-orange-600 hover:text-orange-800' },
  Internet: { header: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', btn: 'text-blue-600 hover:text-blue-800' },
  Carteira: { header: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', btn: 'text-green-600 hover:text-green-800' },
}

const EFICIENCIA_ORDER: FunnelChannel[] = ['Showroom', 'Carteira', 'Internet']

const BASE_CONFIANCA_COR: Record<Confidence, string> = {
  Alta: 'text-green-600 bg-green-50 border-green-200',
  Média: 'text-amber-600 bg-amber-50 border-amber-200',
  Baixa: 'text-slate-500 bg-slate-50 border-slate-200',
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

/**
 * Meta do vendedor = regras_metas_loja.monthly_goal da loja ativa, rateada
 * conforme regras_metas_loja.individual_goal_mode:
 * - 'even': divide pelo numero de vendedores ativos da loja (via RPC
 *   contar_vendedores_ativos_loja, ja que RLS nao deixa o vendedor contar
 *   os colegas direto).
 * - 'custom': usa o valor individual configurado na tabela `metas`
 *   (store_id + user_id + month + year), quando existir.
 * - 'proportional': o schema atual nao tem fonte de peso/proporcao por
 *   vendedor (ver src/lib/storeSalesRules.ts) — cai no valor cheio da loja
 *   ate essa configuracao existir no banco.
 * A logica de rateio em si vive em resolveIndividualGoal (testada em
 * src/lib/storeSalesRules.test.ts); esta funcao so adapta o formato de
 * FunnelRow para o input dessa funcao pura.
 */
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

  // Rateio de meta individual (individual_goal_mode='even'): RLS de
  // vinculos_loja nao deixa um vendedor contar os colegas direto, por isso
  // usa RPC dedicada (contar_vendedores_ativos_loja).
  useEffect(() => {
    if (!effectiveStoreId) { setActiveSellersCount(null); return }
    let cancelled = false
    supabase.rpc('contar_vendedores_ativos_loja', { p_store_id: effectiveStoreId }).then(({ data, error }) => {
      if (!cancelled) setActiveSellersCount(error ? null : (typeof data === 'number' ? data : null))
    })
    return () => { cancelled = true }
  }, [effectiveStoreId])

  // Meta individual custom (individual_goal_mode='custom'): valor configurado
  // por vendedor/mes/ano na tabela `metas` (store_id + user_id + month + year).
  // Sem linha configurada, customGoal fica null e o rateio cai no valor cheio
  // da loja (ver resolveIndividualGoal em src/lib/storeSalesRules.ts).
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
    if (!officialPerformance) return dashboard.kpis
    // A RPC vendedor_performance_oficial (server-side) sempre rateia a meta
    // da loja igualmente entre vendedores ativos, sem consultar
    // individual_goal_mode. dashboard.kpis.meta (client, via
    // resolveIndividualGoal) honra 'custom'/'proportional' quando ha dado
    // disponivel — por isso ele tem prioridade aqui. So volta para o valor
    // da RPC se o client ainda nao tiver uma meta calculada (ex.: loading
    // parcial de regras_metas_loja).
    const clientMeta = dashboard.kpis.meta
    const meta = clientMeta !== null && clientMeta > 0 ? clientMeta : officialPerformance.meta
    const realizado = officialPerformance.vendas_realizadas
    return {
      ...dashboard.kpis,
      meta,
      realizado,
      faltam: Math.max(meta - realizado, 0),
      metaBatida: meta > 0 && realizado >= meta,
      probabilidade: meta > 0 ? Math.min(100, (officialPerformance.vendas_projetadas / meta) * 100) : null,
    }
  }, [dashboard.kpis, officialPerformance])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
      </div>
    )
  }

  const selectedHasBase = hasEnoughBase(dashboard)
  const rollingHasBase = hasEnoughBase(rollingDashboard)
  const confidence = getConfidence(selectedHasBase, rollingHasBase)
  const calculationDashboard = selectedHasBase ? dashboard : rollingDashboard
  const calculationPeriodLabel = selectedHasBase ? periodLabels[periodKey] : 'Últimos 3 meses'
  const hasAnyData = rows.events.length > 0 || rows.customers.length > 0
  const showEmptyState = !hasAnyData

  return (
    <main className="min-h-full bg-gray-50 px-mx-sm py-mx-md sm:px-mx-md lg:px-mx-lg">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
<SellerPageHeader icon={TrendingUp} title="Minha Meta" actions={(
<div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {Object.entries(periodLabels).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriodKey(value as PeriodKey)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-all ${periodKey === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {label}
              </button>
            ))}
</div>
)} />

        {errors.length > 0 && (
          <div role="status" className="rounded-2xl border border-status-warning/20 bg-status-warning-surface p-mx-md text-sm font-semibold text-status-warning">
            Algumas fontes ainda não retornaram dados. A tela continua somente leitura e mostra vazio quando base não existe.
          </div>
        )}

        <StatusMetaCard kpis={officialKpis} periodKey={periodKey} />

        {showEmptyState && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <TrendingUp className="mx-auto mb-3 h-10 w-10 text-slate-200" />
            <p className="mb-1 text-[15px] font-bold text-slate-900">Sem dados suficientes neste período.</p>
            <p className="text-[13px] text-slate-400">Registre atendimentos na Carteira ou no Fechamento Diário para alimentar o Funil.</p>
          </div>
        )}

        {!showEmptyState && (
          <>
            <EsforcoNecessarioCard channels={calculationDashboard.channels} faltam={dashboard.kpis.faltam ?? 0} />
            <EficienciaCanalCard channels={dashboard.channels} />
            <BaseEstatisticaCard displayedPeriod={periodLabels[periodKey]} calculationPeriod={calculationPeriodLabel} confidence={confidence} />
            <EvolucaoCollapsible data={dashboard.evolution} chartAberto={chartAberto} onToggle={() => setChartAberto(v => !v)} />
          </>
        )}
      </div>
    </main>
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

function StatusMetaCard({ kpis, periodKey }: { kpis: FunnelKpis; periodKey: PeriodKey }) {
  const { meta, realizado, faltam, diasUteisRestantes, necessarioPorDia, probabilidade } = kpis
  const metaBatida = faltam === 0 && meta !== null && meta > 0
  const pct = meta !== null && meta > 0 ? Math.min(100, Math.round((realizado / meta) * 100)) : 0
  const probPct = probabilidade === null ? null : Math.round(probabilidade)
  const probCor = probPct === null ? 'text-slate-400' : probPct >= 80 ? 'text-green-600' : probPct >= 50 ? 'text-amber-600' : 'text-red-500'
  const isCurrentMonth = periodKey === 'current_month'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Status da Meta</p>

      {!meta ? (
        <div className="flex items-center gap-3">
          <Target className="h-5 w-5 shrink-0 text-slate-300" />
          <div>
            <p className="text-[13px] text-slate-500">Meta mensal não configurada.</p>
            <Link to="/perfil" className="text-[12px] font-bold text-blue-700 hover:underline">Definir meta no perfil →</Link>
          </div>
        </div>
      ) : metaBatida ? (
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 shrink-0 text-green-500" />
          <div>
            <p className="text-[20px] font-bold text-green-600">Meta batida!</p>
            <p className="text-[13px] text-slate-500">{realizado} de {meta} vendas realizadas</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-3">
            <div>
              <p className="mb-0.5 text-[12px] text-slate-400">Realizado</p>
              <p className="text-[32px] font-bold leading-none tabular-nums text-slate-900">
                {realizado}
                <span className="ml-1 text-[16px] font-semibold text-slate-300">/ {meta}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">vendas realizadas</p>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-[11px] text-slate-400">
                <span>{pct}% da meta</span>
                <span>{realizado} / {meta}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-700 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="hidden w-px self-stretch bg-slate-100 sm:block" />

          <div className="grid flex-1 grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-400">Faltam</p>
              <p className="text-[22px] font-bold leading-none tabular-nums text-red-500">{faltam}</p>
              <p className="text-[11px] text-slate-400">vendas</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-400">Dias úteis restantes</p>
              <p className="text-[22px] font-bold leading-none tabular-nums text-slate-900">{isCurrentMonth ? diasUteisRestantes : '—'}</p>
              <p className="text-[11px] text-slate-400">seg–sáb</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-400">Ritmo necessário</p>
              {!isCurrentMonth || necessarioPorDia === null ? (
                <>
                  <p className="text-[22px] font-bold leading-none tabular-nums text-amber-600">—</p>
                  <p className="text-[11px] text-slate-400">sem dados</p>
                </>
              ) : faltam !== null && faltam <= 0 ? (
                <>
                  <p className="text-[18px] font-bold leading-tight text-green-600">Meta batida</p>
                  <p className="text-[11px] text-slate-400">Continue o ritmo.</p>
                </>
              ) : diasUteisRestantes <= 0 ? (
                <>
                  <p className="text-[18px] font-bold leading-tight text-red-500">Prazo encerrado</p>
                  <p className="text-[11px] text-slate-400">Revise o fechamento.</p>
                </>
              ) : necessarioPorDia >= 1 ? (
                <>
                  <p className="text-[22px] font-bold leading-none tabular-nums text-amber-600">
                    {necessarioPorDia % 1 === 0 ? necessarioPorDia : necessarioPorDia.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-400">vendas por dia útil</p>
                  <p className="mt-1 text-[10px] text-slate-400">≈ {Math.floor(necessarioPorDia * 6)}–{Math.ceil(necessarioPorDia * 6)} por semana</p>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-bold leading-tight text-amber-600">1 venda a cada</p>
                  <p className="text-[22px] font-bold leading-none tabular-nums text-amber-600">
                    {faltam && faltam > 0 ? (diasUteisRestantes / faltam).toFixed(1) : '—'} dias
                  </p>
                  <p className="mt-1 text-[10px] text-slate-400">≈ {Math.floor(necessarioPorDia * 6)}–{Math.ceil(necessarioPorDia * 6)} por semana</p>
                </>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-400">Probabilidade</p>
              <p className={`text-[22px] font-bold leading-none tabular-nums ${probCor}`}>{probPct !== null ? `${probPct}%` : '—'}</p>
              <p className="text-[11px] text-slate-400">com ritmo atual</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AlavancaItem({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0">
      <span className="text-[13px] text-slate-600">{label}</span>
      <span className="text-[18px] font-bold tabular-nums text-slate-900">{valor}</span>
    </div>
  )
}

function CanalSecundario({ titulo, semBase, children }: { titulo: string; semBase: boolean; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{titulo}</p>
      {semBase ? <p className="text-[12px] italic text-slate-300">Sem base suficiente para projeção.</p> : children}
    </div>
  )
}

function EsforcoNecessarioCard({ channels, faltam }: { channels: ChannelFunnel[]; faltam: number }) {
  if (faltam <= 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">O que preciso produzir para bater a meta?</p>
        <p className="text-[14px] font-bold text-green-600">Meta batida. Continue mantendo o ritmo! 🎯</p>
      </div>
    )
  }

  const byName = (name: FunnelChannel) => channels.find(c => c.channel === name)
  const showroom = byName('Showroom')
  const internet = byName('Internet')
  const carteira = byName('Carteira')

  const canalPrincipal = escolherCanalPrincipal(channels)
  const showCalc = showroom ? calcEsforcoShowroom(showroom, faltam) : null
  const inetCalc = internet ? calcEsforcoInternet(internet, faltam) : null
  const cartCalc = carteira ? calcEsforcoCarteira(carteira, faltam) : null
  const calcPrincipal = canalPrincipal === 'Carteira' ? cartCalc : canalPrincipal === 'Internet' ? inetCalc : showCalc

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">O que preciso produzir para bater a meta?</p>
      <p className="mb-4 text-[12px] text-slate-400">
        Com base na sua conversão registrada, esta é a produção estimada para buscar as {faltam} venda{faltam !== 1 ? 's' : ''} que faltam.
      </p>

      {!canalPrincipal ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p className="text-[13px] text-slate-500">Sem base suficiente para projeção confiável.</p>
          <p className="mt-1 text-[12px] text-slate-400">Registre atendimentos e vendas para habilitar esta análise.</p>
        </div>
      ) : (
        <>
          <div className={`mb-4 rounded-xl border p-4 ${EFFORT_PRINCIPAL_BG[canalPrincipal]}`}>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Sua melhor base hoje é <span className="font-bold text-slate-900">{canalPrincipal}</span>
            </p>
            <p className="mb-3 text-[12px] text-slate-500">
              Esses números mostram o esforço estimado em cada ponto do funil. Você pode acompanhar sua evolução por qualquer uma dessas alavancas.
            </p>
            {canalPrincipal === 'Showroom' && calcPrincipal?.atendimentos && (
              <AlavancaItem label="Atendimentos Comerciais" valor={calcPrincipal.atendimentos} />
            )}
            {canalPrincipal === 'Internet' && calcPrincipal && (
              <>
                {calcPrincipal.atendimentos && <AlavancaItem label="Atendimentos Comerciais" valor={calcPrincipal.atendimentos} />}
                {calcPrincipal.agendamentos && <AlavancaItem label="Agendamentos" valor={calcPrincipal.agendamentos} />}
                {calcPrincipal.qualificados && <AlavancaItem label="Qualificados" valor={calcPrincipal.qualificados} />}
                {calcPrincipal.oportunidades && <AlavancaItem label="Oportunidades" valor={calcPrincipal.oportunidades} />}
              </>
            )}
            {canalPrincipal === 'Carteira' && calcPrincipal && (
              <>
                {calcPrincipal.atendimentos && <AlavancaItem label="Atendimentos Comerciais" valor={calcPrincipal.atendimentos} />}
                {calcPrincipal.agendamentos && <AlavancaItem label="Agendamentos" valor={calcPrincipal.agendamentos} />}
                {calcPrincipal.qualificados && <AlavancaItem label="Qualificados" valor={calcPrincipal.qualificados} />}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {canalPrincipal !== 'Showroom' && (
              <CanalSecundario titulo="Showroom" semBase={!showCalc}>
                {showCalc?.atendimentos && <AlavancaItem label="Atendimentos Comerciais" valor={showCalc.atendimentos} />}
              </CanalSecundario>
            )}
            {canalPrincipal !== 'Internet' && (
              <CanalSecundario titulo="Internet" semBase={!inetCalc}>
                {inetCalc && (
                  <>
                    {inetCalc.atendimentos && <AlavancaItem label="Atendimentos Comerciais" valor={inetCalc.atendimentos} />}
                    {inetCalc.agendamentos && <AlavancaItem label="Agendamentos" valor={inetCalc.agendamentos} />}
                    {inetCalc.qualificados && <AlavancaItem label="Qualificados" valor={inetCalc.qualificados} />}
                  </>
                )}
              </CanalSecundario>
            )}
            {canalPrincipal !== 'Carteira' && (
              <CanalSecundario titulo="Carteira" semBase={!cartCalc}>
                {cartCalc && (
                  <>
                    {cartCalc.atendimentos && <AlavancaItem label="Atendimentos Comerciais" valor={cartCalc.atendimentos} />}
                    {cartCalc.agendamentos && <AlavancaItem label="Agendamentos" valor={cartCalc.agendamentos} />}
                    {cartCalc.qualificados && <AlavancaItem label="Qualificados" valor={cartCalc.qualificados} />}
                  </>
                )}
              </CanalSecundario>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function EficienciaCanalCard({ channels }: { channels: ChannelFunnel[] }) {
  const limitador = getLimitadorLabel(channels)
  const byName = (name: FunnelChannel) => channels.find(c => c.channel === name)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Eficiência por canal</p>
      <p className="mb-4 text-[12px] text-slate-500"><span className="font-semibold">Principal limitador:</span> {limitador}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {EFICIENCIA_ORDER.map(name => {
          const channel = byName(name)
          return channel ? <CanalCard key={name} channel={channel} /> : null
        })}
      </div>
    </div>
  )
}

function CanalCard({ channel }: { channel: ChannelFunnel }) {
  const [expandido, setExpandido] = useState(false)
  const cor = EFICIENCIA_COR[channel.channel]
  const steps = channel.steps
  const volume = steps[0]?.value ?? 0
  const vendas = steps[steps.length - 1]?.value ?? 0
  const semDados = volume === 0 && vendas === 0
  const conv = channel.generalConversion === null ? null : Math.round(channel.generalConversion)
  const etapas = buildEtapaLinhas(channel)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className={`flex items-center justify-between border-b px-4 py-2.5 ${cor.header}`}>
        <p className="text-[12px] font-bold uppercase tracking-wide text-slate-900">{channel.channel}</p>
        {conv !== null && !semDados ? (
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cor.badge}`}>{conv}% conv.</span>
        ) : (
          <span className="text-[10px] text-slate-300">Sem dados</span>
        )}
      </div>

      <div className="px-4 py-3">
        {semDados ? (
          <p className="text-[12px] italic text-slate-300">Sem base suficiente para projeção.</p>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-slate-400">{VOLUME_LABEL[channel.channel]}</p>
              <p className="text-[20px] font-bold tabular-nums text-slate-900">{volume}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400">Vendas</p>
              <p className="text-[20px] font-bold tabular-nums text-green-600">{vendas}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400">Conversão</p>
              <p className="text-[20px] font-bold tabular-nums text-slate-900">{conv !== null ? `${conv}%` : '—'}</p>
            </div>
          </div>
        )}

        {!semDados && etapas.length > 0 && (
          <button
            type="button"
            onClick={() => setExpandido(v => !v)}
            className={`mt-2.5 flex items-center gap-1 text-[11px] font-semibold transition-colors ${cor.btn}`}
          >
            {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expandido ? 'Ocultar etapas' : 'Ver etapas'}
          </button>
        )}
      </div>

      {expandido && (
        <div className="border-t border-slate-100 px-4 pb-3 pt-2">
          {etapas.map((etapa, index) => <EtapaLinha key={index} label={etapa.label} valor={etapa.value} conv={etapa.conv} />)}
        </div>
      )}
    </div>
  )
}

function EtapaLinha({ label, valor, conv }: { label: string; valor: number; conv: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-1.5 last:border-0">
      <div className="flex flex-col">
        <span className="text-[12px] text-slate-600">{label}</span>
        {conv && <span className="text-[10px] text-slate-400">→ {conv}</span>}
      </div>
      <span className="text-[14px] font-bold tabular-nums text-slate-900">{valor}</span>
    </div>
  )
}

function BaseEstatisticaCard({ displayedPeriod, calculationPeriod, confidence }: { displayedPeriod: string; calculationPeriod: string; confidence: Confidence }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Base do cálculo</p>
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-[12px]">
        <div><span className="text-slate-400">Período exibido:</span>{' '}<span className="font-semibold text-slate-600">{displayedPeriod}</span></div>
        <div><span className="text-slate-400">Período de cálculo:</span>{' '}<span className="font-semibold text-slate-600">{calculationPeriod}</span></div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Confiança:</span>
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${BASE_CONFIANCA_COR[confidence]}`}>{confidence}</span>
        </div>
        <div className="w-full text-[11px] text-slate-400">{confidenceReason(confidence)}</div>
      </div>
    </div>
  )
}

function EvolucaoCollapsible({ data, chartAberto, onToggle }: { data: MonthlyEvolutionPoint[]; chartAberto: boolean; onToggle: () => void }) {
  const semRegistros = data.every(item => item.oportunidades === 0 && item.atendimentos === 0 && item.vendas === 0)
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-5 py-3.5 transition-colors hover:bg-slate-50">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ver evolução dos últimos meses</p>
        {chartAberto ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>
      {chartAberto && (
        <div className="border-t border-slate-100 px-5 pb-4">
          {semRegistros ? (
            <p className="py-6 text-center text-[12px] text-slate-300">Sem registros nos últimos 6 meses.</p>
          ) : (
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTokens.axisTickMuted() }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: chartTokens.axisTickMuted() }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11, border: `1px solid ${chartTokens.gridStrong()}` }} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="oportunidades" name="Oportunidades" stroke={chartTokens.series.s5()} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="atendimentos" name="Atend. Comercial" stroke={chartTokens.series.s4()} strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="vendas" name="Vendas" stroke={chartTokens.accent()} strokeWidth={2} dot={{ r: 2, fill: chartTokens.accent() }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}

function ceilSafe(n: number) {
  return Math.ceil(n)
}

function stepValue(channel: ChannelFunnel, key: FunnelStepKey) {
  return channel.steps.find(step => step.key === key)?.value || 0
}

function temBaseParaEsforco(channel: ChannelFunnel) {
  const venda = stepValue(channel, 'venda')
  if (channel.channel === 'Showroom') return venda >= 1 && stepValue(channel, 'atendimento_comercial') >= 1
  return venda >= 1
}

function escolherCanalPrincipal(channels: ChannelFunnel[]): FunnelChannel | null {
  const byName = (name: FunnelChannel) => channels.find(c => c.channel === name)
  const carteira = byName('Carteira')
  const internet = byName('Internet')
  const showroom = byName('Showroom')
  if (carteira && temBaseParaEsforco(carteira)) return 'Carteira'
  if (internet && temBaseParaEsforco(internet)) return 'Internet'
  if (showroom && temBaseParaEsforco(showroom)) return 'Showroom'
  return null
}

function calcEsforcoShowroom(channel: ChannelFunnel, faltam: number): EsforcoValues | null {
  if (!temBaseParaEsforco(channel)) return null
  const venda = stepValue(channel, 'venda')
  const atendimento = stepValue(channel, 'atendimento_comercial')
  if (venda <= 0 || atendimento <= 0) return null
  return { atendimentos: ceilSafe(faltam / (venda / atendimento)) }
}

function calcEsforcoInternet(channel: ChannelFunnel, faltam: number): EsforcoValues | null {
  if (!temBaseParaEsforco(channel)) return null
  const venda = stepValue(channel, 'venda')
  const atendimento = stepValue(channel, 'atendimento_comercial')
  const agendamento = stepValue(channel, 'agendamento')
  const qualificados = stepValue(channel, 'qualificados')
  const oportunidades = stepValue(channel, 'oportunidades')
  const result: EsforcoValues = {}
  if (venda > 0 && atendimento > 0) result.atendimentos = ceilSafe(faltam / (venda / atendimento))
  if (venda > 0 && agendamento > 0) result.agendamentos = ceilSafe(faltam / (venda / agendamento))
  if (venda > 0 && qualificados > 0) result.qualificados = ceilSafe(faltam / (venda / qualificados))
  if (venda > 0 && oportunidades > 0) result.oportunidades = ceilSafe(faltam / (venda / oportunidades))
  return Object.keys(result).length ? result : null
}

function calcEsforcoCarteira(channel: ChannelFunnel, faltam: number): EsforcoValues | null {
  if (!temBaseParaEsforco(channel)) return null
  const venda = stepValue(channel, 'venda')
  const atendimento = stepValue(channel, 'atendimento_comercial')
  const agendamento = stepValue(channel, 'agendamento')
  const qualificados = stepValue(channel, 'qualificados')
  const result: EsforcoValues = {}
  if (venda > 0 && atendimento > 0) result.atendimentos = ceilSafe(faltam / (venda / atendimento))
  if (venda > 0 && agendamento > 0) result.agendamentos = ceilSafe(faltam / (venda / agendamento))
  if (venda > 0 && qualificados > 0) result.qualificados = ceilSafe(faltam / (venda / qualificados))
  return Object.keys(result).length ? result : null
}

function getLimitadorLabel(channels: ChannelFunnel[]) {
  const byName = (name: FunnelChannel) => channels.find(c => c.channel === name)
  const showroom = byName('Showroom')
  const internet = byName('Internet')
  const carteira = byName('Carteira')
  const vendaShow = showroom ? stepValue(showroom, 'venda') : 0
  const vendaInet = internet ? stepValue(internet, 'venda') : 0
  const vendaCart = carteira ? stepValue(carteira, 'venda') : 0
  const totalVendas = vendaShow + vendaInet + vendaCart
  if (totalVendas === 0) return 'Hoje ainda não há vendas suficientes para identificar o principal limitador.'

  const atendShow = showroom ? stepValue(showroom, 'atendimento_comercial') : 0
  const oppInet = internet ? stepValue(internet, 'oportunidades') : 0
  const qualCart = carteira ? stepValue(carteira, 'qualificados') : 0
  const convShow = atendShow > 0 ? vendaShow / atendShow : 0
  const convInet = oppInet > 0 ? vendaInet / oppInet : 0
  const convCart = qualCart > 0 ? vendaCart / qualCart : 0
  const melhor = Math.max(convShow, convInet, convCart)
  if (melhor === 0) return 'Ainda não há base suficiente para identificar o principal limitador.'
  if (convCart >= melhor - 0.001) return 'Carteira é o canal com melhor base para buscar a meta.'
  if (convInet >= melhor - 0.001) return 'Internet é o canal com melhor base para buscar a meta.'
  return 'Showroom é o canal com melhor base para buscar a meta.'
}

function pctSeguro(a: number, b: number): number | null {
  if (!b || b <= 0) return null
  const v = Math.round((a / b) * 100)
  if (v > 100) return null
  return v
}

function pctLabelStr(a: number, b: number): string | null {
  const v = pctSeguro(a, b)
  if (v === null) return b > 0 ? '—' : null
  return `${v}%`
}

function buildEtapaLinhas(channel: ChannelFunnel) {
  return channel.steps.map((step, index) => {
    const next = channel.steps[index + 1]
    if (!next) return { label: step.label, value: step.value, conv: null as string | null }
    const pct = pctLabelStr(next.value, step.value)
    return { label: step.label, value: step.value, conv: pct ? `${pct} → ${next.label}` : null }
  })
}

function hasEnoughChannel(channel: ChannelFunnel) {
  const first = channel.steps[0]?.value || 0
  const sales = stepValue(channel, 'venda')
  const atendimento = stepValue(channel, 'atendimento_comercial')
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

function confidenceReason(confidence: Confidence) {
  if (confidence === 'Alta') return 'Cálculo baseado nos dados deste período.'
  if (confidence === 'Média') return 'O período selecionado tem poucos dados; usamos os últimos 3 meses.'
  return 'Ainda há poucos registros para projetar com precisão.'
}

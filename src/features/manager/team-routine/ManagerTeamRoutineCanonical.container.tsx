import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { AlertTriangle, BarChart3, CheckCircle2, Eye, Megaphone, RefreshCw, Search, TrendingUp, Trophy, XCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { useAuth } from '@/hooks/useAuth'
import { useSellersByStore } from '@/hooks/useStores'
import { useNotifications } from '@/hooks/useData'
import { Skeleton } from '@/components/atoms/Skeleton'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { classifyRoutine } from '@/features/manager/shared/manager-metrics'
import { ManagerSectionCard } from '@/features/manager/shared/ManagerVisualPrimitives'
import { ManagerHomeReturnLink } from '@/features/manager/home/ManagerHomeReturnLink'
import { getManagerTeamSearch } from '@/features/manager/home/manager-home-parity'
import { chartTokens } from '@/lib/charts/tokens'
import { buildRoutineActionMetrics, getRoutineDateFromSearch, type OfficialRoutineScore } from './manager-team-routine'
import { buildOfficialScoreFromSnapshot, buildSnapshotTrend, latestSnapshotsBySellerAndDate, type SellerRoutineSnapshotRow } from './seller-routine-snapshot-adapter'
import { ManagerRoutineChargeModal } from './ManagerRoutineChargeModal'
import { ManagerRoutineDetailModal } from './ManagerRoutineDetailModal'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageCanvas } from '@/design-system/page'
import { ScrollableRegion } from '@/design-system/page/ScrollableRegion'

type ActionRow = { id: string; seller_id: string; status: string; due_at: string; title: string; updated_at: string; source_type: string; description: string | null; completed_at: string | null; justificativa: string | null; metadata: unknown }
type AppointmentRow = { id: string; seller_user_id: string }

type SnapshotBySeller = Record<string, SellerRoutineSnapshotRow>
type ScoreBySeller = Record<string, OfficialRoutineScore>
type ConsolidationResult = { data: unknown; error: { code?: string; message: string } | null }

const consolidationRequests = new Map<string, Promise<ConsolidationResult>>()

async function consolidateRoutineSnapshots(storeId: string, referenceDate: string): Promise<ConsolidationResult> {
  const key = `${storeId}:${referenceDate}`
  const activeRequest = consolidationRequests.get(key)
  if (activeRequest) return activeRequest

  const request = (async () => {
    const first = await supabase.rpc('consolidate_seller_routine_snapshots', {
      p_store_id: storeId,
      p_reference_date: referenceDate,
    })
    if (first.error?.code !== '23505') return first as ConsolidationResult

    // A second browser/tab can reach the same immutable version while the
    // first transaction is committing. Retry reads the version just stored.
    await new Promise(resolve => setTimeout(resolve, 120))
    return supabase.rpc('consolidate_seller_routine_snapshots', {
      p_store_id: storeId,
      p_reference_date: referenceDate,
    }) as unknown as Promise<ConsolidationResult>
  })()

  consolidationRequests.set(key, request)
  try {
    return await request
  } finally {
    if (consolidationRequests.get(key) === request) consolidationRequests.delete(key)
  }
}

export default function ManagerTeamRoutineCanonical() {
  const location = useLocation()
  const { storeId, membership } = useAuth()
  const [date, setDate] = useState(() => getRoutineDateFromSearch(location.search, new Date().toISOString().slice(0, 10)))
  const [actions, setActions] = useState<ActionRow[]>([])
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [selectedSnapshots, setSelectedSnapshots] = useState<SnapshotBySeller>({})
  const [historySnapshots, setHistorySnapshots] = useState<SellerRoutineSnapshotRow[]>([])
  const [officialScores, setOfficialScores] = useState<ScoreBySeller>({})
  const [historyRange, setHistoryRange] = useState<7 | 15 | 30>(15)
  const [networkComparison, setNetworkComparison] = useState<{ average: number | null; top: number | null }>({ average: null, top: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null)
  const [chargeSellerId, setChargeSellerId] = useState<string | null>(null)
  const chartSearch = getManagerTeamSearch(location.search)
  const [search, setSearch] = useState(chartSearch)
  const { sellers, loading: sellersLoading, refetch: refetchSellers } = useSellersByStore(storeId)
  const { sendNotification } = useNotifications()
  const sellerIds = useMemo(() => sellers.map(seller => seller.id), [sellers])
  const historyStart = format(subDays(parseISO(date), historyRange - 1), 'yyyy-MM-dd')

  const fetchRoutine = useCallback(async () => {
    if (!storeId) {
      setActions([])
      setAppointments([])
      setSelectedSnapshots({})
      setHistorySnapshots([])
      setOfficialScores({})
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    const selectedStart = `${date}T00:00:00-03:00`
    const selectedEnd = `${date}T23:59:59-03:00`

    const consolidation = await consolidateRoutineSnapshots(storeId, date)
    if (consolidation.error) {
      setError(`Não foi possível consolidar a pontuação oficial: ${consolidation.error.message}`)
      setLoading(false)
      return
    }

    const noRows = Promise.resolve({ data: [], error: null })
    const [actionsResult, appointmentsResult, snapshotsResult, benchmarkResult] = await Promise.all([
      supabase
        .from('execution_actions')
        .select('id,seller_id,status,due_at,title,updated_at,source_type,description,completed_at,justificativa,metadata')
        .eq('store_id', storeId)
        .gte('due_at', selectedStart)
        .lte('due_at', selectedEnd),
      supabase
        .from('agendamentos')
        .select('id,seller_user_id')
        .eq('loja_id', storeId)
        .gte('data_hora', selectedStart)
        .lte('data_hora', selectedEnd),
      sellerIds.length
        ? supabase
            .from('seller_routine_snapshots')
            .select('seller_user_id,reference_date,version,eligible,reliable_work_base,access_numerator,pending_resolved,pending_expected,attack_executed,attack_expected,prospecting_executed,prospecting_expected,updates_completed,updates_expected,access_points,pending_points,attack_points,prospecting_points,update_points,closing_points,execution_score,routine_status,score_denominator,source_payload')
            .eq('store_id', storeId)
            .gte('reference_date', historyStart)
            .lte('reference_date', date)
            .in('seller_user_id', sellerIds)
            .order('version', { ascending: false })
        : noRows,
      supabase
        .from('benchmark_snapshots')
        .select('peer_avg,peer_top')
        .eq('loja_id', storeId)
        .eq('metric_code', 'routine_execution')
        .eq('peer_group', 'mercado')
        .lte('period', date)
        .order('period', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const firstError = [actionsResult, appointmentsResult, snapshotsResult].find(result => result.error)
    if (firstError?.error) {
      setError(firstError.error.message || 'Falha ao carregar a rotina oficial.')
      setActions([])
      setAppointments([])
      setSelectedSnapshots({})
      setHistorySnapshots([])
      setOfficialScores({})
    } else {
      const snapshotRows = (snapshotsResult.data || []) as SellerRoutineSnapshotRow[]
      const latest = latestSnapshotsBySellerAndDate(snapshotRows)
      const currentBySeller: SnapshotBySeller = {}
      const scores: ScoreBySeller = {}
      for (const sellerId of sellerIds) {
        const snapshot = latest.get(`${date}:${sellerId}`)
        if (!snapshot) continue
        currentBySeller[sellerId] = snapshot
        scores[sellerId] = buildOfficialScoreFromSnapshot(snapshot)
      }
      setActions((actionsResult.data || []) as ActionRow[])
      setAppointments((appointmentsResult.data || []) as AppointmentRow[])
      setSelectedSnapshots(currentBySeller)
      setHistorySnapshots(Array.from(latest.values()))
      setOfficialScores(scores)
    }

    setNetworkComparison(benchmarkResult.error || !benchmarkResult.data
      ? { average: null, top: null }
      : {
          average: typeof benchmarkResult.data.peer_avg === 'number' ? Math.round(benchmarkResult.data.peer_avg) : null,
          top: typeof benchmarkResult.data.peer_top === 'number' ? Math.round(benchmarkResult.data.peer_top) : null,
        })
    setLoading(false)
  }, [date, historyStart, sellerIds, storeId])

  useEffect(() => { void fetchRoutine() }, [fetchRoutine])
  useEffect(() => { setSearch(chartSearch) }, [chartSearch])

  const rows = useMemo(() => sellers.map(seller => {
    const sellerActions = actions.filter(action => action.seller_id === seller.id)
    const fallbackMetrics = buildRoutineActionMetrics(sellerActions)
    const snapshot = selectedSnapshots[seller.id]
    const officialScore = officialScores[seller.id]
    const execution = officialScore?.score ?? null
    const generatedAppointments = appointments.filter(item => item.seller_user_id === seller.id).length
    const status = snapshot?.routine_status === 'nao_aplicavel'
      ? 'Não aplicável'
      : execution !== null
        ? classifyRoutine(execution)
        : 'Sem dados'
    return {
      seller,
      planned: snapshot?.attack_expected ?? fallbackMetrics.planned,
      completed: snapshot?.attack_executed ?? fallbackMetrics.completed,
      followUpsPlanned: snapshot?.attack_expected ?? fallbackMetrics.followUpsPlanned,
      followUpsCompleted: snapshot?.attack_executed ?? fallbackMetrics.followUpsCompleted,
      updatesRequired: snapshot?.updates_expected ?? fallbackMetrics.updatesRequired,
      updatesCompleted: snapshot?.updates_completed ?? fallbackMetrics.updatesCompleted,
      officialScore,
      execution,
      appointments: generatedAppointments,
      status,
    }
  }), [actions, appointments, officialScores, selectedSnapshots, sellers])

  const executionValues = rows.map(row => row.execution).filter((value): value is number => value !== null)
  const average = executionValues.length
    ? Math.round(executionValues.reduce((sum, value) => sum + value, 0) / executionValues.length)
    : null
  const filteredRows = rows.filter(row => row.seller.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR')))
  const selectedRow = rows.find(row => row.seller.id === selectedSellerId) || null
  const selectedActions = actions.filter(action => action.seller_id === selectedSellerId)
  const trend = useMemo(
    () => buildSnapshotTrend(historySnapshots, historyStart, date),
    [date, historySnapshots, historyStart],
  )

  const remind = async (sellerId: string, message: string) => {
    const { error: notificationError } = await sendNotification({ recipient_id: sellerId, store_id: storeId || undefined, title: 'Pendências na Rotina do Dia', message, type: 'routine', priority: 'high', link: '/central-execucao' })
    if (notificationError) toast.error('Não foi possível registrar a cobrança.')
    else toast.success('Cobrança registrada e enviada.')
  }

  if (loading || sellersLoading) return <RoutineSkeleton />
  const refresh = async () => { await Promise.all([fetchRoutine(), refetchSellers()]); toast.success('Rotina oficial da equipe atualizada.') }

  return <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex min-h-full flex-col gap-5">
    <ManagerHomeReturnLink />
    <header className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h1 className="text-xl font-bold text-foreground">Rotina da Equipe</h1><p className="mt-0.5 text-sm text-muted-foreground">Acompanhe a execução oficial das atividades comerciais da equipe.</p></div><div className="flex flex-wrap items-end gap-2"><label className="text-xs text-muted-foreground" htmlFor="manager-routine-date">Data<input id="manager-routine-date" type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1 block h-10 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-status-success"/></label><label className="text-xs text-muted-foreground">Buscar<div className="relative mt-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input aria-label="Vendedor..." value={search} onChange={event => setSearch(event.target.value)} placeholder="Vendedor..." className="h-10 w-40 rounded-xl border border-border pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-status-success"/></div></label><button type="button" className="flex h-10 items-center gap-1 rounded-xl bg-brand-primary px-4 text-sm font-medium text-white hover:bg-brand-primary-hover" onClick={refresh}><RefreshCw size={15}/>Atualizar</button></div></div></header>
    {error && <Card className="border border-status-error/30 bg-status-error-surface p-mx-md"><Typography variant="p" tone="error">Não foi possível carregar a rotina: {error}</Typography></Card>}
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Resumo da rotina"><RoutineSummaryCard label="Execução Média" value={average === null ? '—' : `${average}%`} icon={TrendingUp} tone="blue"/><RoutineSummaryCard label="Em Dia" value={rows.filter(row=>row.status==='Em dia').length} icon={CheckCircle2} tone="green"/><RoutineSummaryCard label="Em Atenção" value={rows.filter(row=>row.status==='Atenção').length} icon={AlertTriangle} tone="amber"/><RoutineSummaryCard label="Críticos" value={rows.filter(row=>row.status==='Crítico').length} icon={XCircle} tone="red"/></section>
    <ManagerSectionCard><div className="border-b border-border-subtle px-5 py-4"><h2 className="font-semibold text-foreground">Rotina — {(() => { try { return format(parseISO(date), 'dd/MM/yyyy') } catch { return date } })()}</h2><p className="mt-1 text-xs text-muted-foreground">Pontuação persistida e versionada; o Gerencial não recalcula fórmula concorrente.</p></div>{filteredRows.length === 0 ? <div className="px-5 py-16 text-center text-sm text-muted-foreground">{rows.length ? 'Nenhum vendedor corresponde à busca.' : 'Nenhum vendedor vinculado a este gerente.'}</div> : <ScrollableRegion axis="horizontal" label="Rotina da equipe" className=""><table className="w-full min-w-[960px] text-sm"><thead className="border-b border-border-subtle bg-surface-alt"><tr>{['Vendedor','Unidade','Execução','Follow-ups','Atualização','Agendamentos','Status','Ações'].map((label, index)=><th key={label} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground ${index === 7 ? 'text-right' : ''}`}>{label}</th>)}</tr></thead><tbody className="divide-y divide-border-subtle">{filteredRows.map(row=>{ const statusTone = row.status==='Em dia' ? 'bg-status-success-surface text-status-success-text' : row.status==='Atenção' ? 'bg-status-warning-surface text-status-warning-text' : row.status==='Sem dados' || row.status==='Não aplicável' ? 'bg-muted text-muted-foreground' : 'bg-status-error-surface text-status-error-text'; return <tr key={row.seller.id} className="transition-colors hover:bg-surface-alt"><td className="px-4 py-3 font-medium text-foreground">{row.seller.name}</td><td className="max-w-32 px-4 py-3 text-muted-foreground">{membership?.store?.name || 'Unidade vinculada'}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-2 w-24 overflow-hidden rounded-full bg-muted">{row.execution !== null && <div className={`h-full rounded-full ${row.execution >= 75 ? 'bg-status-success' : row.execution >= 50 ? 'bg-status-warning' : 'bg-status-error'}`} style={{width:`${Math.min(row.execution,100)}%`}}/>}</div><span className="text-xs font-medium text-foreground">{row.execution === null ? '—' : `${row.execution}%`}</span></div></td><td className="px-4 py-3 text-foreground">{row.followUpsCompleted}/{row.followUpsPlanned}</td><td className="px-4 py-3 text-foreground">{row.updatesCompleted}/{row.updatesRequired}</td><td className={`px-4 py-3 font-semibold ${row.appointments===0?'text-status-error-text':row.appointments===1?'text-status-warning':'text-status-success-text'}`}>{row.appointments}</td><td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-medium ${statusTone}`}>{row.status}</span></td><td className="px-4 py-3"><div className="flex flex-wrap items-center justify-end gap-1.5"><button type="button" onClick={()=>setSelectedSellerId(row.seller.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-status-success-surface hover:text-status-success-text"><Eye size={13}/>Ver rotina</button><button type="button" onClick={()=>setChargeSellerId(row.seller.id)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-status-warning-text hover:bg-status-warning-surface"><Megaphone size={13}/>Cobrar</button></div></td></tr>})}</tbody></table></ScrollableRegion>}</ManagerSectionCard>
    <RoutineTrendCard trend={trend} range={historyRange} onRange={setHistoryRange}/>
    <RoutineComparisonCard team={average} network={networkComparison.average} top={networkComparison.top}/>
    {selectedRow && <ManagerRoutineDetailModal open onClose={() => setSelectedSellerId(null)} sellerName={selectedRow.seller.name} date={date} actions={selectedActions} appointments={selectedRow.appointments} execution={selectedRow.execution} officialScore={selectedRow.officialScore}/>} 
    {chargeSellerId && (
      <ManagerRoutineChargeModal
        open
        sellerName={rows.find(row => row.seller.id === chargeSellerId)?.seller.name || 'Nome não informado'}
        date={(() => { try { return format(parseISO(date), 'dd/MM/yyyy') } catch { return date } })()}
        onClose={() => setChargeSellerId(null)}
        onSave={(message) => remind(chargeSellerId, message)}
      />
    )}
  </PageCanvas>
}

function RoutineTrendCard({ trend, range, onRange }: { trend: Array<{ date: string; label: string; value: number | null }>; range: 7 | 15 | 30; onRange: (range: 7 | 15 | 30) => void }) {
  const hasData = trend.some(point => point.value !== null)
  return <Card className="border bg-white p-mx-lg"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-2"><TrendingUp size={18} className="mt-0.5 text-status-success-text"/><div><Typography variant="h3">Evolução da Execução Média</Typography><Typography variant="tiny" tone="muted" className="mt-1 block">Snapshots oficiais em 7, 15 ou 30 dias; dias não aplicáveis ficam sem ponto.</Typography></div></div><div className="flex gap-1 rounded-xl bg-muted p-1">{([7,15,30] as const).map(option=><button key={option} type="button" onClick={()=>onRange(option)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${range===option?'bg-brand-primary text-white':'text-muted-foreground hover:text-foreground'}`}>{option} dias</button>)}</div></div>{!hasData?<div className="flex flex-col items-center justify-center py-10 text-center"><TrendingUp className="mb-2 h-10 w-10 text-text-disabled"/><p className="text-sm font-medium text-muted-foreground">Dados insuficientes para exibir a evolução da execução média.</p></div>:<div className="mt-4 h-[280px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{top:20,right:20,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke={chartTokens.grid()} vertical={false}/><XAxis dataKey="label" tick={{fontSize:10,fill:chartTokens.axisTick()}} axisLine={{stroke:chartTokens.grid()}} tickLine={false}/><YAxis domain={[0,100]} tick={{fontSize:11,fill:chartTokens.axisTick()}} axisLine={false} tickLine={false} tickFormatter={value=>`${value}%`}/><Tooltip formatter={value=>[typeof value==='number'?`${value}%`:'Sem dados','Execução Média']}/><Line type="monotone" dataKey="value" stroke={chartTokens.success()} strokeWidth={2.5} connectNulls={false} dot={{r:4,fill:chartTokens.success(),strokeWidth:0}} label={{position:'top',formatter:value=>typeof value==='number'?`${value}%`:'',fill:chartTokens.success(),fontSize:10}}/></LineChart></ResponsiveContainer></div>}</Card>
}

function RoutineComparisonCard({ team, network, top }: { team: number | null; network: number | null; top: number | null }) { return <Card className="border bg-white p-mx-lg"><div className="flex items-center gap-2"><BarChart3 size={18} className="text-status-success-text"/><Typography variant="h3">Comparativo de Execução Média</Typography></div><Typography variant="tiny" tone="muted" className="mt-1 block">Comparação agregada e anônima com a rede.</Typography><div className="mt-4 space-y-4"><RoutineComparisonBar label="Sua Equipe" value={team} color="bg-status-success"/><RoutineComparisonBar label="Média da Rede" value={network} color="bg-slate-400"/><RoutineComparisonBar label="Top 25% da Rede" value={top} color="bg-status-success" icon={Trophy}/></div></Card> }
function RoutineComparisonBar({ label, value, color, icon: Icon }: { label: string; value: number | null; color: string; icon?: typeof Trophy }) { return <div className="flex items-center gap-3"><div className="flex w-40 shrink-0 items-center gap-2 text-sm text-muted-foreground">{Icon&&<Icon size={14}/>} {label}</div><div className="relative h-6 flex-1 overflow-hidden rounded-full bg-muted">{value!==null&&<div className={`flex h-full items-center justify-end rounded-full pr-2 text-xs font-bold text-white ${color}`} style={{width:`${Math.min(value,100)}%`}}>{value}%</div>}{value===null&&<span className="absolute inset-y-0 right-2 grid place-items-center text-xs font-bold text-muted-foreground">—</span>}</div></div> }
function RoutineSkeleton(){return <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex min-h-full flex-col gap-mx-lg" aria-busy="true"><Skeleton className="h-mx-20"/><div className="grid grid-cols-4 gap-mx-md">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-mx-32"/>)}</div><Skeleton className="h-[420px]"/></PageCanvas>}
function RoutineSummaryCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: typeof TrendingUp; tone: 'blue' | 'green' | 'amber' | 'red' }) { const styles={blue:'bg-status-info-surface text-status-info-text',green:'bg-status-success-surface text-status-success-text',amber:'bg-status-warning-surface text-status-warning-text',red:'bg-status-error-surface text-status-error-text'}; return <article className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-white p-4 shadow-sm"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${styles[tone]}`}><Icon size={20}/></span><div><p className="text-2xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></article> }

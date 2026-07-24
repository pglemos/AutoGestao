import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Radio,
  RefreshCw,
  UsersRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  getClosingPresentation,
  summarizeLiveOverview,
  type StoreClosingStatus,
  type StoreLiveOverviewRow,
} from '../lib/admin-live-overview'

type Props = {
  storeId: string
  referenceDate: string
}

type RpcResponse = {
  data: unknown
  error: { message: string } | null
}

type RpcInvoker = (name: string, args: Record<string, unknown>) => Promise<RpcResponse>

const numberFields: Array<keyof StoreLiveOverviewRow> = [
  'discipline_score',
  'live_leads',
  'live_appointments',
  'live_attendances',
  'live_sales',
  'declared_leads',
  'declared_appointments',
  'declared_attendances',
  'declared_sales',
]

function normalizeRow(raw: Record<string, unknown>): StoreLiveOverviewRow {
  const normalized = { ...raw }
  for (const field of numberFields) {
    normalized[field] = raw[field] === null ? null : Number(raw[field] || 0)
  }
  return normalized as unknown as StoreLiveOverviewRow
}

function formatDateTime(value: string | null) {
  if (!value) return 'Sem atividade registrada'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Horário indisponível'
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusClass(status: StoreClosingStatus) {
  if (status === 'submitted_on_time') return 'bg-status-success-surface text-status-success'
  if (status === 'submitted_late' || status === 'draft') return 'bg-status-warning-surface text-status-warning'
  return 'bg-status-error-surface text-status-error'
}

function MetricSet({ row, declared = false }: { row: StoreLiveOverviewRow; declared?: boolean }) {
  const values = declared
    ? [row.declared_leads, row.declared_appointments, row.declared_attendances, row.declared_sales]
    : [row.live_leads, row.live_appointments, row.live_attendances, row.live_sales]
  const labels = ['Leads', 'Agd.', 'Atend.', 'Vendas']

  return (
    <div className="grid min-w-[230px] grid-cols-4 gap-mx-xs">
      {values.map((value, index) => (
        <div key={labels[index]} className="rounded-mx-md bg-surface-alt px-mx-sm py-mx-xs text-center">
          <div className="text-mx-lg font-black text-content-primary">{value}</div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-content-tertiary">{labels[index]}</div>
        </div>
      ))}
    </div>
  )
}

export function AdminLiveOperationsPanel({ storeId, referenceDate }: Props) {
  const [rows, setRows] = useState<StoreLiveOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRows = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const invokeRpc = supabase.rpc as unknown as RpcInvoker
      const { data, error: rpcError } = await invokeRpc('admin_store_live_overview', {
        p_store_id: storeId,
        p_reference_date: referenceDate,
      })
      if (rpcError) throw new Error(rpcError.message)
      const normalized = Array.isArray(data)
        ? data.map(item => normalizeRow(item as Record<string, unknown>))
        : []
      setRows(normalized)
      setLastSyncAt(new Date())
    } catch (fetchError) {
      console.error('Audit Error [AdminLiveOperationsPanel]: fetch fail ->', fetchError)
      setError('Não foi possível carregar o monitor operacional em tempo real.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [referenceDate, storeId])

  useEffect(() => {
    void fetchRows()
  }, [fetchRows])

  useEffect(() => {
    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { void fetchRows() }, 350)
    }

    const channel = supabase
      .channel(`admin-live-store-${storeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_diarios', filter: `store_id=eq.${storeId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos_comerciais', filter: `loja_id=eq.${storeId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: `loja_id=eq.${storeId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: `loja_id=eq.${storeId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atendimentos', filter: `loja_id=eq.${storeId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oportunidades', filter: `loja_id=eq.${storeId}` }, scheduleRefresh)
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Realtime indisponível. Use o botão Atualizar antes de tomar uma decisão.')
        }
      })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      supabase.removeChannel(channel)
    }
  }, [fetchRows, storeId])

  const summary = useMemo(() => summarizeLiveOverview(rows), [rows])
  const cards = [
    { label: 'Fechamentos feitos', value: summary.completed, icon: CheckCircle2 },
    { label: 'Fechamentos pendentes', value: summary.pending, icon: Clock3 },
    { label: 'Divergências', value: summary.divergences, icon: AlertTriangle },
    { label: 'Vendas reais', value: summary.sales, icon: CalendarCheck2 },
  ]

  return (
    <section className="mb-mx-lg overflow-hidden rounded-mx-xl border border-border-subtle bg-surface-card shadow-mx-sm">
      <header className="flex flex-col gap-mx-md border-b border-border-subtle px-mx-lg py-mx-lg lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-mx-xs flex flex-wrap items-center gap-mx-sm">
            <h2 className="text-mx-xl font-black text-content-primary">Operação da equipe em tempo real</h2>
            <span className="inline-flex items-center gap-mx-xs rounded-full bg-status-success-surface px-mx-sm py-mx-xs text-mx-xs font-black uppercase text-status-success">
              <Radio className="h-3.5 w-3.5" /> Supabase Realtime
            </span>
          </div>
          <p className="text-mx-sm text-content-secondary">
            Números reais do CRM comparados ao que cada vendedor declarou no fechamento diário.
          </p>
        </div>
        <div className="flex items-center gap-mx-md">
          <span className="text-mx-xs font-semibold text-content-tertiary">
            {lastSyncAt ? `Atualizado às ${lastSyncAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Sincronizando'}
          </span>
          <button
            type="button"
            onClick={() => { void fetchRows(true) }}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center gap-mx-sm rounded-mx-md border border-border-subtle bg-surface-card px-mx-md text-mx-sm font-black text-content-primary transition hover:bg-surface-alt disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-mx-lg mt-mx-md rounded-mx-md bg-status-error-surface px-mx-md py-mx-sm text-mx-sm font-bold text-status-error">
          {error}
        </div>
      )}

      <div className="grid gap-mx-sm p-mx-lg sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-mx-lg border border-border-subtle bg-surface-alt p-mx-md">
            <div className="mb-mx-sm flex items-center justify-between">
              <span className="text-mx-xs font-black uppercase tracking-wide text-content-tertiary">{label}</span>
              <Icon className="h-4 w-4 text-brand-primary" />
            </div>
            <div className="text-mx-2xl font-black text-content-primary">{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto border-t border-border-subtle">
        <table className="w-full min-w-[1120px] border-collapse">
          <thead className="bg-surface-alt text-left text-mx-xs font-black uppercase tracking-wide text-content-tertiary">
            <tr>
              <th className="px-mx-lg py-mx-md">Vendedor</th>
              <th className="px-mx-lg py-mx-md">Fechamento</th>
              <th className="px-mx-lg py-mx-md">Real no sistema</th>
              <th className="px-mx-lg py-mx-md">Declarado</th>
              <th className="px-mx-lg py-mx-md">Conferência</th>
              <th className="px-mx-lg py-mx-md">Última atividade</th>
            </tr>
          </thead>
          <tbody>
            {!loading && rows.map(row => {
              const presentation = getClosingPresentation(row.closing_status)
              return (
                <tr key={row.seller_user_id} className="border-t border-border-subtle align-middle">
                  <td className="px-mx-lg py-mx-md">
                    <div className="flex items-center gap-mx-sm">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
                        <UsersRound className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="font-black text-content-primary">{row.seller_name}</div>
                        <div className="text-mx-xs text-content-tertiary">Disciplina: {row.discipline_score ?? '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-mx-lg py-mx-md">
                    <span className={`inline-flex rounded-full px-mx-sm py-mx-xs text-mx-xs font-black uppercase ${statusClass(row.closing_status)}`}>
                      {presentation.label}
                    </span>
                    <div className="mt-mx-xs text-mx-xs text-content-tertiary">{formatDateTime(row.submitted_at)}</div>
                  </td>
                  <td className="px-mx-lg py-mx-md"><MetricSet row={row} /></td>
                  <td className="px-mx-lg py-mx-md"><MetricSet row={row} declared /></td>
                  <td className="px-mx-lg py-mx-md">
                    <span className={`inline-flex rounded-full px-mx-sm py-mx-xs text-mx-xs font-black uppercase ${row.has_divergence ? 'bg-status-error-surface text-status-error' : 'bg-status-success-surface text-status-success'}`}>
                      {row.has_divergence ? 'Revisar divergência' : 'Sem divergência'}
                    </span>
                  </td>
                  <td className="px-mx-lg py-mx-md text-mx-sm font-semibold text-content-secondary">
                    {formatDateTime(row.last_activity_at)}
                  </td>
                </tr>
              )
            })}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} className="px-mx-lg py-mx-2xl text-center text-content-secondary">Nenhum vendedor ativo encontrado para esta loja.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={6} className="px-mx-lg py-mx-2xl text-center text-content-secondary">Carregando operação da equipe...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default AdminLiveOperationsPanel

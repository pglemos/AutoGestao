import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShoppingCart,
  UsersRound,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  getClosingPresentation,
  loadAdminStoreLiveOverview,
  summarizeLiveOverview,
  type AdminLiveOverviewRpcClient,
  type StoreClosingStatus,
  type StoreLiveOverviewRow,
} from '../lib/admin-live-overview'

type Props = {
  storeId: string
  referenceDate: string
}

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

function formatReferenceDate(value: string) {
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}/${month}/${year}` : value
}

function formatDateTime(value: string | null, emptyLabel: string) {
  if (!value) return emptyLabel
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
  if (status === 'submitted_on_time') return 'bg-status-success-surface text-status-success-text'
  if (status === 'submitted_late' || status === 'draft') return 'bg-status-warning-surface text-status-warning-text'
  return 'bg-status-error-surface text-status-error-text'
}

function MetricCell({
  label,
  real,
  declared,
  declaredAvailable,
}: {
  label: string
  real: number
  declared: number
  declaredAvailable: boolean
}) {
  const differs = declaredAvailable && real !== declared
  return (
    <td className={`px-4 py-3 ${differs ? 'bg-status-warning-surface/60' : ''}`}>
      <p className="text-base font-bold text-foreground">{real}</p>
      <p className={`mt-0.5 text-caption ${differs ? 'font-semibold text-status-warning-text' : 'text-muted-foreground'}`}>
        {declaredAvailable ? `Declarado: ${declared}` : `${label}: aguardando fechamento`}
      </p>
    </td>
  )
}

export function AdminLiveOperationsPanel({ storeId, referenceDate }: Props) {
  const [rows, setRows] = useState<StoreLiveOverviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncWarning, setSyncWarning] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchRows = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    else if (rows.length === 0) setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await loadAdminStoreLiveOverview(
        supabase as unknown as AdminLiveOverviewRpcClient,
        storeId,
        referenceDate,
      )
      if (rpcError) throw new Error(rpcError.message)
      const normalized = Array.isArray(data)
        ? data.map(item => normalizeRow(item as Record<string, unknown>))
        : []
      setRows(normalized)
      setLastSyncAt(new Date())
      setSyncWarning(null)
    } catch (fetchError) {
      console.error('Audit Error [AdminLiveOperationsPanel]: fetch fail ->', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Falha inesperada ao carregar a equipe.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [referenceDate, rows.length, storeId])

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
          setSyncWarning('A atualização automática foi interrompida. Use Atualizar para consultar os dados mais recentes.')
        }
      })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      void supabase.removeChannel(channel)
    }
  }, [fetchRows, storeId])

  const summary = useMemo(() => summarizeLiveOverview(rows), [rows])
  const cards = [
    {
      label: 'Fechamentos feitos',
      value: summary.completed,
      helper: `${rows.length} vendedor${rows.length === 1 ? '' : 'es'} ativo${rows.length === 1 ? '' : 's'}`,
      icon: CheckCircle2,
      tone: 'green' as const,
    },
    {
      label: 'Fechamentos pendentes',
      value: summary.pending,
      helper: `${summary.notStarted} não iniciado${summary.notStarted === 1 ? '' : 's'} · ${summary.drafts} rascunho${summary.drafts === 1 ? '' : 's'}`,
      icon: Clock3,
      tone: 'amber' as const,
    },
    {
      label: 'Vendas registradas',
      value: summary.sales,
      helper: `${summary.attendances} atendimento${summary.attendances === 1 ? '' : 's'} no período`,
      icon: ShoppingCart,
      tone: 'blue' as const,
    },
    {
      label: 'Divergências',
      value: summary.divergences,
      helper: summary.divergences ? 'Exigem conferência' : 'Nenhuma diferença encontrada',
      icon: AlertTriangle,
      tone: 'red' as const,
    },
  ]

  if (loading && rows.length === 0) return <OperationsSkeleton />

  const hasUnavailableData = Boolean(error && rows.length === 0)

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-status-success-surface text-status-success-text">
              <UsersRound size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">Acompanhamento diário da equipe</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fechamento, atividade comercial e comparação entre o registrado no sistema e o informado pelo vendedor.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm text-muted-foreground">
              <Calendar size={14} />
              {formatReferenceDate(referenceDate)}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {lastSyncAt
                ? `Atualizado às ${lastSyncAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Aguardando atualização'}
            </span>
            <button
              type="button"
              onClick={() => { void fetchRows(true) }}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {error && (
        <article className="flex flex-col gap-3 rounded-2xl border border-status-error/20 bg-status-error-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-status-error-text" size={19} />
            <div>
              <p className="font-semibold text-status-error-text">Não foi possível atualizar os dados da equipe.</p>
              <p className="mt-1 text-sm text-status-error-text">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { void fetchRows(true) }}
            className="h-9 shrink-0 rounded-xl border border-status-error/30 bg-white px-3 text-sm font-semibold text-status-error-text hover:bg-status-error-surface"
          >
            Tentar novamente
          </button>
        </article>
      )}

      {syncWarning && !error && (
        <article className="flex items-start gap-3 rounded-2xl border border-status-warning/20 bg-status-warning-surface p-4 text-sm text-status-warning-text">
          <AlertTriangle className="mt-0.5 shrink-0" size={18} />
          <p>{syncWarning}</p>
        </article>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumo do acompanhamento diário">
        {cards.map(card => (
          <SummaryCard
            key={card.label}
            label={card.label}
            value={hasUnavailableData ? '—' : card.value}
            helper={hasUnavailableData ? 'Dados indisponíveis' : card.helper}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </section>

      <article className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Vendedores da unidade</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Valores principais são os registros do sistema. O declarado aparece abaixo para conferência.
            </p>
          </div>
          {!hasUnavailableData && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-lg bg-surface-alt px-2.5 py-1.5">{summary.leads} leads</span>
              <span className="rounded-lg bg-surface-alt px-2.5 py-1.5">{summary.appointments} agendamentos</span>
              <span className="rounded-lg bg-surface-alt px-2.5 py-1.5">{summary.attendances} atendimentos</span>
              <span className="rounded-lg bg-surface-alt px-2.5 py-1.5">{summary.sales} vendas</span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm">
            <thead className="border-b border-border-subtle bg-surface-alt">
              <tr>
                {['Vendedor', 'Fechamento', 'Leads', 'Agendamentos', 'Atendimentos', 'Vendas', 'Conferência', 'Última atividade'].map(label => (
                  <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {hasUnavailableData ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Atualize novamente para carregar os vendedores e os números da unidade.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nenhum vendedor ativo está vinculado a esta unidade.
                  </td>
                </tr>
              ) : rows.map(row => {
                const presentation = getClosingPresentation(row.closing_status)
                const declaredAvailable = Boolean(
                  row.submitted_at
                  && row.closing_status !== 'draft'
                  && row.closing_status !== 'not_started',
                )
                return (
                  <tr key={row.seller_user_id} className="transition-colors hover:bg-surface-alt">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{row.seller_name}</p>
                      <p className="mt-0.5 text-caption text-muted-foreground">
                        Disciplina: {row.discipline_score ?? 'sem pontuação'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${statusClass(row.closing_status)}`}>
                        {presentation.label}
                      </span>
                      <p className="mt-1.5 text-caption text-muted-foreground">
                        {formatDateTime(row.submitted_at, 'Ainda não enviado')}
                      </p>
                    </td>
                    <MetricCell label="Leads" real={row.live_leads} declared={row.declared_leads} declaredAvailable={declaredAvailable} />
                    <MetricCell label="Agendamentos" real={row.live_appointments} declared={row.declared_appointments} declaredAvailable={declaredAvailable} />
                    <MetricCell label="Atendimentos" real={row.live_attendances} declared={row.declared_attendances} declaredAvailable={declaredAvailable} />
                    <MetricCell label="Vendas" real={row.live_sales} declared={row.declared_sales} declaredAvailable={declaredAvailable} />
                    <td className="px-4 py-3">
                      {declaredAvailable ? (
                        <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-medium ${row.has_divergence ? 'bg-status-warning-surface text-status-warning-text' : 'bg-status-success-surface text-status-success-text'}`}>
                          {row.has_divergence ? 'Revisar diferenças' : 'Dados conferem'}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-lg bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                          Aguardando fechamento
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDateTime(row.last_activity_at, 'Sem atividade registrada')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string
  value: string | number
  helper: string
  icon: typeof CheckCircle2
  tone: 'green' | 'amber' | 'blue' | 'red'
}) {
  const styles = {
    green: 'bg-status-success-surface text-status-success-text',
    amber: 'bg-status-warning-surface text-status-warning-text',
    blue: 'bg-status-info-surface text-status-info-text',
    red: 'bg-status-error-surface text-status-error-text',
  }
  return (
    <article className="flex min-h-28 items-start gap-3 rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${styles[tone]}`}>
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-caption leading-4 text-muted-foreground">{helper}</p>
      </div>
    </article>
  )
}

function OperationsSkeleton() {
  return (
    <section className="space-y-4" aria-busy="true" aria-label="Carregando acompanhamento da equipe">
      <div className="h-28 animate-pulse rounded-2xl border border-border-subtle bg-white shadow-sm" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl border border-border-subtle bg-white shadow-sm" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-border-subtle bg-white shadow-sm" />
    </section>
  )
}

export default AdminLiveOperationsPanel

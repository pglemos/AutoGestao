import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, History, Search, UsersRound, ShoppingCart, Calendar, Target, TrendingUp, AlertCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Input } from '@/components/atoms/Input'
import { Avatar } from '@/components/atoms/Avatar'
import { DataGrid, type Column } from '@/components/organisms/DataGrid'
import { Modal } from '@/components/organisms/Modal'
import { duration, easing } from '@/design/motion'
import type { RankingEntry } from '@/types/database'
import type { ViewMode } from '../hooks/useDashboardLojaData'
import { supabase } from '@/lib/supabase'
import {
  filterOfficialSellerSales,
  getOfficialSaleCompetence,
  getPeriodEndExclusive,
  type OfficialSellerSale,
} from '../lib/official-seller-sales'

type StoreRankingEntry = RankingEntry & { id: string }

type RankingSectionProps = {
  viewMode: ViewMode
  ranking: RankingEntry[]
  mixCanais: { label: string; color: string; pct: number; tone: 'success' | 'info' | 'brand' }[]
  diagnostics: { diagnostico: string; sugestao: string }
  storeId?: string | null
  periodStartDate?: string
  periodEndDate?: string
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = iso.includes('T') ? new Date(iso) : new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)
}

function canalLabel(canal: string | null): string {
  const map: Record<string, string> = {
    porta: 'Porta (Showroom)',
    ativo: 'Carteira (Ativo)',
    digital: 'Digital (Leads)',
    indicacao: 'Indicação',
  }
  return canal ? (map[canal] ?? canal) : '—'
}

/** Modal de detalhes do vendedor — mostra KPIs e lista de vendas individuais */
function SellerDetailModal({
  seller,
  storeId,
  periodStart,
  periodEnd,
  onClose,
}: {
  seller: StoreRankingEntry
  storeId: string | null | undefined
  periodStart: string
  periodEnd: string
  onClose: () => void
}) {
  const [sales, setSales] = useState<OfficialSellerSale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSales = useCallback(async () => {
    if (!storeId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const periodEndExclusive = getPeriodEndExclusive(periodEnd)
      const { data, error: fetchErr } = await supabase
        .from('eventos_comerciais')
        .select(`
          id,
          data_evento,
          data_competencia,
          canal,
          oportunidade_id,
          oportunidades (
            etapa,
            data_competencia,
            sale_date,
            valor_negociado,
            veiculo_interesse,
            placa_veiculo,
            tipo_veiculo,
            clientes ( nome )
          )
        `)
        .eq('seller_user_id', seller.user_id)
        .eq('loja_id', storeId)
        .eq('tipo_evento', 'venda_realizada')
        .or(`and(data_competencia.gte.${periodStart},data_competencia.lte.${periodEnd}),and(data_competencia.is.null,data_evento.gte.${periodStart}T00:00:00-03:00,data_evento.lt.${periodEndExclusive})`)
        .order('data_evento', { ascending: false })

      if (fetchErr) { setError(fetchErr.message); return }

      const mapped: OfficialSellerSale[] = (data || []).map((row: Record<string, unknown>) => {
        const op = row.oportunidades as Record<string, unknown> | null
        const cliente = op ? (op.clientes as Record<string, unknown> | null) : null
        return {
          id: row.id as string,
          data_evento: row.data_evento as string,
          data_competencia: row.data_competencia as string | null,
          canal: row.canal as string | null,
          oportunidade_id: row.oportunidade_id as string | null,
          oportunidade: op ? {
            etapa: op.etapa as string | null,
            data_competencia: op.data_competencia as string | null,
            sale_date: op.sale_date as string | null,
            valor_negociado: Number(op.valor_negociado) || null,
            veiculo_interesse: op.veiculo_interesse as string | null,
            placa_veiculo: op.placa_veiculo as string | null,
            tipo_veiculo: op.tipo_veiculo as string | null,
            cliente_nome: cliente ? (cliente.nome as string | null) : null,
          } : undefined,
        }
      })
      setSales(filterOfficialSellerSales(mapped, periodStart, periodEnd))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar vendas')
    } finally {
      setLoading(false)
    }
  }, [seller.user_id, storeId, periodStart, periodEnd])

  useEffect(() => { void fetchSales() }, [fetchSales])

  const attainmentPct = seller.meta > 0 ? Math.round((seller.vnd_total / seller.meta) * 100) : 0

  return (
    <Modal
      open
      onClose={onClose}
      title={seller.user_name}
      description={`Período: ${formatDate(periodStart)} — ${formatDate(periodEnd)}`}
      size="lg"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={<ShoppingCart size={16} />} label="Vendas" value={String(seller.vnd_total)} highlight />
        <KpiCard icon={<Target size={16} />} label="Meta" value={String(seller.meta ?? '—')} />
        <KpiCard
          icon={<TrendingUp size={16} />}
          label="Atingimento"
          value={seller.meta > 0 ? `${attainmentPct}%` : '—'}
          color={attainmentPct >= 100 ? 'green' : attainmentPct >= 70 ? 'amber' : 'red'}
        />
        <KpiCard icon={<Calendar size={16} />} label="Leads" value={String(seller.leads)} />
      </div>

      <div className="mt-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Vendas registradas ({loading ? '...' : sales.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <span className="animate-spin mr-2">⟳</span> Carregando vendas...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-status-error/20 bg-status-error-surface p-4 text-sm text-status-error-text">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        ) : sales.length === 0 ? (
          <div className="rounded-xl bg-surface-alt p-6 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada neste período.
          </div>
        ) : (
          <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle">
            {sales.map((sale, i) => {
              const competencia = getOfficialSaleCompetence(sale)
              return (
                <div key={sale.id} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-alt transition-colors">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-status-success-surface text-xs font-bold text-status-success-text mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {sale.oportunidade?.veiculo_interesse || sale.oportunidade?.tipo_veiculo || 'Veículo'}
                      </span>
                      {sale.oportunidade?.placa_veiculo && (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                          {sale.oportunidade.placa_veiculo}
                        </span>
                      )}
                      {sale.canal && (
                        <span className="rounded-md bg-status-info-surface px-1.5 py-0.5 text-xs font-semibold text-status-info-text">
                          {canalLabel(sale.canal)}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(competencia)}</span>
                      {sale.oportunidade?.cliente_nome && (
                        <span>Cliente: {sale.oportunidade.cliente_nome}</span>
                      )}
                      {sale.oportunidade?.valor_negociado ? (
                        <span className="font-semibold text-status-success-text">
                          {formatCurrency(sale.oportunidade.valor_negociado)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}

function KpiCard({
  icon, label, value, highlight, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
  color?: 'green' | 'amber' | 'red'
}) {
  const colorClass = color === 'green'
    ? 'text-status-success-text'
    : color === 'amber'
    ? 'text-status-warning-text'
    : color === 'red'
    ? 'text-status-error-text'
    : highlight
    ? 'text-status-success-text'
    : 'text-foreground'

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-alt p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value}</p>
    </div>
  )
}

export function RankingSection({ viewMode, ranking, mixCanais, diagnostics, storeId, periodStartDate, periodEndDate }: RankingSectionProps) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [sellerSearch, setSellerSearch] = useState('')
  const [selectedSeller, setSelectedSeller] = useState<StoreRankingEntry | null>(null)

  // Deriva o período a exibir no modal — usa o que veio via props ou calcula do mês atual
  const modalPeriodStart = periodStartDate || `${new Date().toISOString().slice(0, 7)}-01`
  const modalPeriodEnd = periodEndDate || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

  const columns = useMemo<Column<StoreRankingEntry>[]>(() => [
    {
      key: 'position',
      header: 'Posição',
      width: 'w-20',
      render: (_, index) => (
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
          {index + 1}
        </span>
      ),
    },
    {
      key: 'user_name',
      header: 'Vendedor',
      render: row => (
        <button
          type="button"
          className="flex items-center gap-3 text-left w-full group"
          onClick={() => setSelectedSeller(row)}
          title={`Ver detalhes de ${row.user_name}`}
        >
          <Avatar
            src={row.avatar_url || undefined}
            alt={`Avatar de ${row.user_name}`}
            fallback={row.user_name}
            size="md"
            className={`h-10 w-10 rounded-xl ${row.is_venda_loja ? 'bg-brand-primary text-white' : 'bg-status-success-surface text-status-success-text'}`}
          />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-foreground group-hover:text-status-success-text transition-colors">
              {row.user_name}
            </p>
            {row.is_venda_loja && <span className="mt-1 inline-flex rounded-md bg-status-success-surface px-1.5 py-0.5 text-caption font-semibold text-status-success-text">Vendas da Gestão (Apoio)</span>}
          </div>
        </button>
      ),
    },
    { key: 'leads', header: 'Leads', align: 'center', desktopOnly: true, render: row => <span className="text-sm text-muted-foreground tabular-nums">{row.leads}</span> },
    { key: 'agd_total', header: 'Agendamentos', align: 'center', desktopOnly: true, render: row => <span className="text-sm text-muted-foreground tabular-nums">{row.agd_total}</span> },
    { key: 'visitas', header: 'Visitas', align: 'center', desktopOnly: true, render: row => <span className="text-sm text-muted-foreground tabular-nums">{row.visitas}</span> },
    {
      key: 'vnd_total',
      header: 'Vendas',
      align: 'center',
      render: row => (
        <button
          type="button"
          onClick={() => setSelectedSeller(row)}
          className="text-lg font-bold text-status-success-text tabular-nums hover:underline"
          title="Ver lista de vendas"
        >
          {row.vnd_total}
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Situação',
      align: 'right',
      render: row => (
        <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${row.vnd_total > 0 ? 'bg-status-success-surface text-status-success-text' : 'bg-muted text-muted-foreground'}`}>
          {row.vnd_total > 0 ? 'Com venda' : 'Sem venda'}
        </span>
      ),
    },
  ], [])

  const filteredRanking = useMemo<StoreRankingEntry[]>(() => {
    return ranking
      .map(row => ({ ...row, id: row.user_id }))
      .filter(row => row.user_name.toLowerCase().includes(sellerSearch.toLowerCase()))
  }, [ranking, sellerSearch])

  return (
    <section className="grid grid-cols-1 gap-5 pb-24 xl:grid-cols-12" aria-labelledby="store-ranking-title">
      <article className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm xl:col-span-8">
        <header className="flex flex-col gap-4 border-b border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-success-surface text-status-success-text">
              <UsersRound size={19} />
            </span>
            <div>
              <h2 id="store-ranking-title" className="text-lg font-bold text-foreground">
                {viewMode === 'day' ? 'Resultado diário por vendedor' : 'Resultado por vendedor'}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Clique em um vendedor para ver as vendas individuais.</p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="dashboard-seller-search" className="sr-only">Buscar vendedor</label>
            <Input
              id="dashboard-seller-search"
              name="dashboard-seller-search"
              placeholder="Buscar vendedor"
              value={sellerSearch}
              onChange={event => setSellerSearch(event.target.value)}
              className="h-10 rounded-xl border-border pl-9 text-sm"
            />
          </div>
        </header>

        {sellerSearch.trim() && filteredRanking.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-surface-alt px-5 py-3">
            <p className="text-xs text-muted-foreground">Ações disponíveis para o vendedor localizado.</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton label="Ver Vendas" onClick={() => filteredRanking[0] && setSelectedSeller(filteredRanking[0])} />
              <ActionButton label="Devolutiva" onClick={() => navigate('/devolutivas')} />
              <ActionButton label="PDI" onClick={() => navigate('/pdi')} />
              <ActionButton label="Rotina" onClick={() => navigate('/rotina')} />
            </div>
          </div>
        )}

        <DataGrid
          columns={columns}
          data={filteredRanking}
          emptyMessage="Nenhum vendedor localizado."
          emptyDescription="Limpe a busca ou confirme se a equipe ativa possui registros no período."
        />
      </article>

      <aside className="flex flex-col gap-5 xl:col-span-4">
        <article className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
          <header className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-info-surface text-status-info-text">
              <BarChart3 size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Origem das vendas</h2>
              <p className="mt-1 text-sm text-muted-foreground">Participação de cada canal no resultado.</p>
            </div>
          </header>

          <div className="mt-6 space-y-5">
            {mixCanais.map(channel => (
              <div key={channel.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted-foreground">{channel.label}</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">{channel.pct}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={reduceMotion ? false : { width: 0 }}
                    animate={{ width: `${Math.min(Math.max(channel.pct, 0), 100)}%` }}
                    transition={{ duration: reduceMotion ? 0 : duration.slow, ease: easing.standard }}
                    className={`h-full rounded-full ${channel.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
          <header className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-status-info-surface text-status-info-text">
              <History size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Diagnóstico da unidade</h2>
              <p className="mt-1 text-sm text-muted-foreground">Síntese para orientar a próxima ação gerencial.</p>
            </div>
          </header>
          <div className="mt-5 rounded-xl bg-surface-alt p-4">
            <p className="text-sm leading-6 text-muted-foreground">{diagnostics.diagnostico}</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-foreground">{diagnostics.sugestao}</p>
          </div>
        </article>
      </aside>

      {/* Modal de detalhes do vendedor */}
      {selectedSeller && (
        <SellerDetailModal
          seller={selectedSeller}
          storeId={storeId}
          periodStart={modalPeriodStart}
          periodEnd={modalPeriodEnd}
          onClose={() => setSelectedSeller(null)}
        />
      )}
    </section>
  )
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-muted-foreground hover:bg-muted"
    >
      {label}
    </button>
  )
}

export default RankingSection

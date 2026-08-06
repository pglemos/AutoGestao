import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, History, Search, UsersRound } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Input } from '@/components/atoms/Input'
import { Avatar } from '@/components/atoms/Avatar'
import { DataGrid, type Column } from '@/components/organisms/DataGrid'
import { duration, easing } from '@/design/motion'
import type { RankingEntry } from '@/types/database'
import type { ViewMode } from '../hooks/useDashboardLojaData'

type StoreRankingEntry = RankingEntry & { id: string }

type RankingSectionProps = {
  viewMode: ViewMode
  ranking: RankingEntry[]
  mixCanais: { label: string; color: string; pct: number; tone: 'success' | 'info' | 'brand' }[]
  diagnostics: { diagnostico: string; sugestao: string }
}

export function RankingSection({ viewMode, ranking, mixCanais, diagnostics }: RankingSectionProps) {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const [sellerSearch, setSellerSearch] = useState('')

  const columns = useMemo<Column<StoreRankingEntry>[]>(() => [
    {
      key: 'position',
      header: 'Posição',
      width: 'w-20',
      render: (_, index) => (
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
          {index + 1}
        </span>
      ),
    },
    {
      key: 'user_name',
      header: 'Vendedor',
      render: row => (
        <div className="flex items-center gap-3">
          <Avatar
            src={row.avatar_url || undefined}
            alt={`Avatar de ${row.user_name}`}
            fallback={row.user_name}
            size="md"
            className={`h-10 w-10 rounded-xl ${row.is_venda_loja ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}
          />
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold text-gray-800">{row.user_name}</p>
            {row.is_venda_loja && <span className="mt-1 inline-flex rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Vendas da Gestão (Apoio)</span>}
          </div>
        </div>
      ),
    },
    { key: 'leads', header: 'Leads', align: 'center', desktopOnly: true, render: row => <span className="text-sm text-gray-600 tabular-nums">{row.leads}</span> },
    { key: 'agd_total', header: 'Agendamentos', align: 'center', desktopOnly: true, render: row => <span className="text-sm text-gray-600 tabular-nums">{row.agd_total}</span> },
    { key: 'visitas', header: 'Visitas', align: 'center', desktopOnly: true, render: row => <span className="text-sm text-gray-600 tabular-nums">{row.visitas}</span> },
    {
      key: 'vnd_total',
      header: 'Vendas',
      align: 'center',
      render: row => <span className="text-lg font-bold text-emerald-700 tabular-nums">{row.vnd_total}</span>,
    },
    {
      key: 'status',
      header: 'Situação',
      align: 'right',
      render: row => (
        <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${row.vnd_total > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
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
      <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm xl:col-span-8">
        <header className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <UsersRound size={19} />
            </span>
            <div>
              <h2 id="store-ranking-title" className="text-lg font-bold text-gray-800">
                {viewMode === 'day' ? 'Resultado diário por vendedor' : 'Resultado por vendedor'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">Localize rapidamente quem precisa de acompanhamento ou reconhecimento.</p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <label htmlFor="dashboard-seller-search" className="sr-only">Buscar vendedor</label>
            <Input
              id="dashboard-seller-search"
              name="dashboard-seller-search"
              placeholder="Buscar vendedor"
              value={sellerSearch}
              onChange={event => setSellerSearch(event.target.value)}
              className="h-10 rounded-xl border-gray-200 pl-9 text-sm"
            />
          </div>
        </header>

        {sellerSearch.trim() && filteredRanking.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50 px-5 py-3">
            <p className="text-xs text-gray-500">Ações disponíveis para o vendedor localizado.</p>
            <div className="flex flex-wrap gap-2">
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
        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <header className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <BarChart3 size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Origem das vendas</h2>
              <p className="mt-1 text-sm text-gray-500">Participação de cada canal no resultado.</p>
            </div>
          </header>

          <div className="mt-6 space-y-5">
            {mixCanais.map(channel => (
              <div key={channel.label}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-600">{channel.label}</p>
                  <p className="text-sm font-bold text-gray-800 tabular-nums">{channel.pct}%</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    initial={reduceMotion ? false : { width: 0 }}
                    animate={{ width: `${Math.min(Math.max(channel.pct, 0), 100)}%` }}
                    transition={{ duration: reduceMotion ? 0 : duration.slow, ease: easing.standard as [number, number, number, number] }}
                    className={`h-full rounded-full ${channel.color}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <header className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <History size={19} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Diagnóstico da unidade</h2>
              <p className="mt-1 text-sm text-gray-500">Síntese para orientar a próxima ação gerencial.</p>
            </div>
          </header>
          <div className="mt-5 rounded-xl bg-gray-50 p-4">
            <p className="text-sm leading-6 text-gray-600">{diagnostics.diagnostico}</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-gray-800">{diagnostics.sugestao}</p>
          </div>
        </article>
      </aside>
    </section>
  )
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-100"
    >
      {label}
    </button>
  )
}

export default RankingSection

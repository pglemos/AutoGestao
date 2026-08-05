import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Filter, Target, TrendingUp } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { PageHeading } from '@/components/molecules/PageHeading'
import { PageCanvas } from '@/design-system/page'
import { useAuth } from '@/hooks/useAuth'
import { useOfficialSellerPerformance } from '@/hooks/useOfficialSellerPerformance'
import { cn } from '@/lib/utils'
import {
  buildTeamGoalRows,
  buildTeamGoalTotals,
  countByStatus,
  type TeamGoalRow,
  type TeamGoalStatus,
} from '@/features/gerente/lib/team-goals'

type PeriodKey = 'current_month' | 'last_month'

const PERIOD_LABELS: Record<PeriodKey, string> = {
  current_month: 'Este mês',
  last_month: 'Mês passado',
}

const STATUS_CONFIG: Record<TeamGoalStatus, { label: string; pill: string; bar: string }> = {
  excelente: { label: 'Meta batida', pill: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
  bom: { label: 'No ritmo', pill: 'bg-sky-50 text-sky-700', bar: 'bg-sky-500' },
  atencao: { label: 'Atenção', pill: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
  critico: { label: 'Crítico', pill: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500' },
  sem_meta: { label: 'Sem meta', pill: 'bg-gray-100 text-gray-600', bar: 'bg-gray-300' },
}

const STATUS_ORDER: TeamGoalStatus[] = ['excelente', 'bom', 'atencao', 'critico', 'sem_meta']

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function resolveRange(key: PeriodKey) {
  const now = new Date()
  const offset = key === 'last_month' ? -1 : 0
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return { start: toIsoDate(start), end: toIsoDate(end) }
}

/**
 * Metas da equipe. A fonte é a RPC `vendedor_performance_oficial`, a mesma que
 * alimenta a performance individual do vendedor — meta rateada, vendas
 * realizadas e projeção saem do servidor, sem recálculo divergente no client.
 */
export default function MetasGerente() {
  const { storeId, activeStoreId, profile } = useAuth()
  const effectiveStoreId = activeStoreId || storeId || profile?.store_id || null
  const [periodKey, setPeriodKey] = useState<PeriodKey>('current_month')

  const range = useMemo(() => resolveRange(periodKey), [periodKey])
  const { rows: performance, loading, error } = useOfficialSellerPerformance(range.start, range.end, null, effectiveStoreId)

  const rows = useMemo(() => buildTeamGoalRows(performance), [performance])
  const totals = useMemo(() => buildTeamGoalTotals(rows), [rows])
  const statusCounts = useMemo(() => countByStatus(rows), [rows])

  return (
    <PageCanvas
      as="main"
      width="dashboard"
      bottomClearance="navigation"
      id="metas-gerente"
      className="flex min-h-0 flex-1 flex-col gap-mx-md"
      aria-label="Metas da Equipe"
    >
      <PageHeading
        icon={Target}
        title="Metas da Equipe"
        subtitle="Atingimento e projeção de cada vendedor da loja, com meta rateada pelas regras configuradas."
        actions={(
          <label className="inline-flex h-11 items-center gap-mx-sm rounded-xl border border-gray-100 bg-white px-mx-md text-sm font-semibold text-gray-800 shadow-sm">
            <Filter size={16} aria-hidden="true" />
            <select
              className="bg-transparent font-semibold outline-none"
              value={periodKey}
              onChange={(event) => setPeriodKey(event.target.value as PeriodKey)}
              aria-label="Período das metas"
            >
              {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        )}
      />

      {!effectiveStoreId ? (
        <Card className="border bg-white p-mx-lg text-center">
          <Typography variant="h3" className="text-gray-800">Selecione uma loja</Typography>
          <Typography variant="p" className="mt-1 text-sm font-semibold text-gray-500">
            As metas são calculadas por loja. Escolha uma no seletor de loja para ver a equipe.
          </Typography>
        </Card>
      ) : error ? (
        <Card className="border border-amber-200 bg-amber-50 p-mx-md" role="status">
          <Typography variant="p" className="text-sm font-semibold text-amber-800">
            Não foi possível carregar a performance da equipe: {error}
          </Typography>
        </Card>
      ) : loading ? (
        <Card className="border bg-white p-mx-lg">
          <Typography variant="p" className="text-sm font-semibold text-gray-500">Carregando metas da equipe…</Typography>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="border bg-white p-mx-lg text-center">
          <Typography variant="h3" className="text-gray-800">Nenhum vendedor ativo nesta loja</Typography>
          <Typography variant="p" className="mt-1 text-sm font-semibold text-gray-500">
            Vincule vendedores à loja para acompanhar metas individuais.
          </Typography>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-mx-sm sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores de meta">
            <MetricCard
              icon={Target}
              label="Meta do mês"
              value={totals.meta > 0 ? String(totals.meta) : 'não configurada'}
              hint={`soma de ${totals.comMeta} vendedor${totals.comMeta === 1 ? '' : 'es'} com meta`}
            />
            <MetricCard
              icon={CheckCircle2}
              label="Realizado"
              value={String(totals.realizado)}
              hint={totals.atingimento === null ? 'sem meta para comparar' : `${totals.atingimento}% da meta`}
              tone="emerald"
            />
            <MetricCard
              icon={TrendingUp}
              label="Projeção"
              value={String(totals.projecao)}
              hint={totals.projetado === null ? 'no ritmo atual' : `${totals.projetado}% da meta no ritmo atual`}
            />
            <MetricCard
              icon={AlertTriangle}
              label="Gap"
              value={String(totals.gap)}
              hint={totals.gap === 0 && totals.meta > 0 ? 'meta batida' : 'vendas para bater a meta'}
            />
          </section>

          <section className="grid grid-cols-2 gap-mx-sm md:grid-cols-5" aria-label="Distribuição por status">
            {STATUS_ORDER.map((status) => (
              <Card key={status} className="border bg-white p-mx-md">
                <span className={cn('inline-flex rounded-md px-3 py-0.5 text-xs font-bold uppercase tracking-tight', STATUS_CONFIG[status].pill)}>
                  {STATUS_CONFIG[status].label}
                </span>
                <Typography variant="h2" className="mt-mx-sm text-2xl tabular-nums text-gray-800">{statusCounts[status]}</Typography>
                <Typography variant="p" className="mt-1 text-xs font-semibold text-gray-500">
                  vendedor{statusCounts[status] === 1 ? '' : 'es'}
                </Typography>
              </Card>
            ))}
          </section>

          <Card className="border bg-white p-mx-md">
            <Typography variant="h2" className="text-xl text-gray-800">Meta por vendedor</Typography>
            <Typography variant="p" className="mt-1 text-sm font-semibold text-gray-500">
              Atingimento individual e ritmo projetado no período selecionado.
            </Typography>

            {/* Rolagem horizontal alcançável por teclado — mesma nota de
                FunilVendasGerente. */}
            <div className="mt-mx-md overflow-x-auto" tabIndex={0} role="region" aria-label="Metas por vendedor">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Vendedor', 'Meta', 'Realizado', 'Projeção', 'Atingimento', 'Status'].map(header => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-widest text-gray-500">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map(row => <SellerRow key={row.id} row={row} />)}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </PageCanvas>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'gray',
}: {
  icon: typeof Target
  label: string
  value: string
  hint: string
  tone?: 'gray' | 'emerald'
}) {
  return (
    <Card className="border bg-white p-mx-md">
      <div className="flex items-center gap-mx-sm">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600" aria-hidden="true">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <Typography variant="caption" tone="muted" className="block font-semibold normal-case tracking-normal">{label}</Typography>
      </div>
      <Typography variant="h2" className={cn('mt-mx-sm text-2xl tabular-nums', tone === 'emerald' ? 'text-emerald-700' : 'text-gray-800')}>
        {value}
      </Typography>
      <Typography variant="p" className="mt-1 text-xs font-semibold text-gray-500">{hint}</Typography>
    </Card>
  )
}

function SellerRow({ row }: { row: TeamGoalRow }) {
  const status = STATUS_CONFIG[row.status]
  return (
    <tr>
      <td className="px-4 py-3">
        <p className="truncate font-bold text-gray-800">{row.name}</p>
      </td>
      <td className="px-4 py-3 text-center tabular-nums text-gray-800">{row.meta > 0 ? row.meta : '—'}</td>
      <td className="px-4 py-3 text-center font-bold tabular-nums text-emerald-700">{row.realizado}</td>
      <td className="px-4 py-3 text-center tabular-nums text-gray-800">{row.projecao}</td>
      <td className="px-4 py-3">
        {row.atingimento === null ? (
          <span className="text-xs font-semibold text-gray-500">sem meta</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div className={cn('h-full rounded-full transition-all', status.bar)} style={{ width: `${Math.min(row.atingimento, 100)}%` }} />
            </div>
            <span className="w-10 text-right text-xs font-bold tabular-nums text-gray-500">{row.atingimento}%</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={cn('inline-flex rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-tight', status.pill)}>
          {status.label}
        </span>
      </td>
    </tr>
  )
}

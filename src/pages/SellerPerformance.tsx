import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Phone,
  RefreshCw,
  Search,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useGlobalRanking } from '@/hooks/useRanking'
import type { RankingEntry } from '@/types/database'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { DataGrid, type Column } from '@/components/organisms/DataGrid'
import { cn } from '@/lib/utils'
import {
  MxChartCard,
  MxEmptyState,
  MxErrorState,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
  MxSectionHeader,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'

type SellerRankingRow = RankingEntry & { id: string }

export default function SellerPerformance() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sellerId = searchParams.get('id')
  const { ranking, loading, refetch } = useGlobalRanking()
  const [isRefetching, setIsRefetching] = useState(false)
  const [search, setSearch] = useState('')

  const handleRefresh = async () => {
    setIsRefetching(true)
    try {
      await refetch()
    } finally {
      setIsRefetching(false)
    }
  }

  const seller = useMemo(
    () => (sellerId ? ranking.find((entry) => entry.user_id === sellerId) ?? null : null),
    [ranking, sellerId],
  )

  const filteredRanking = useMemo<SellerRankingRow[]>(
    () => ranking
      .filter((entry) => entry.user_name.toLowerCase().includes(search.toLowerCase()))
      .map((entry) => ({ ...entry, id: entry.user_id })),
    [ranking, search],
  )

  const attributes = useMemo(() => {
    if (!seller) return []
    const volumeRaw = seller.leads + seller.visitas
    const volumeNormalized = volumeRaw > 0 ? Math.min(volumeRaw, 100) : 0
    return [
      { subject: 'Atingimento', value: Math.min(seller.atingimento, 100), fullMark: 100 },
      { subject: 'Volume', value: volumeNormalized, fullMark: 100 },
      { subject: 'Conversão', value: seller.leads > 0 ? Math.min((seller.vnd_total / seller.leads) * 100, 100) : 0, fullMark: 100 },
      { subject: 'Ritmo', value: Math.min(seller.ritmo * 10, 100), fullMark: 100 },
      { subject: 'Visitas', value: Math.min(seller.visitas * 5, 100), fullMark: 100 },
    ]
  }, [seller])

  const columns = useMemo<Column<SellerRankingRow>[]>(
    () => [
      {
        key: 'position',
        header: 'Posição',
        width: 'w-20',
        align: 'center',
        render: (_row, index) => (
          <span className={cn('font-semibold tabular-nums', index === 0 ? 'text-amber-600' : 'text-gray-500')}>
            {index + 1}º
          </span>
        ),
      },
      {
        key: 'user_name',
        header: 'Vendedor',
        render: (row) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              src={row.avatar_url || undefined}
              alt={`Avatar de ${row.user_name}`}
              fallback={row.user_name}
              size="sm"
              className="rounded-xl bg-gray-50 text-gray-700"
            />
            <div className="min-w-0">
              <Typography variant="h4" className="truncate text-sm">{row.user_name}</Typography>
              <Typography variant="tiny" tone="muted" className="truncate">{row.store_name}</Typography>
            </div>
          </div>
        ),
      },
      {
        key: 'vnd_total',
        header: 'Vendas',
        align: 'center',
        render: (row) => <span className="text-lg font-semibold tabular-nums text-gray-800">{row.vnd_total}</span>,
      },
      {
        key: 'atingimento',
        header: 'Meta',
        align: 'center',
        render: (row) => <Badge variant={row.atingimento >= 100 ? 'success' : 'outline'}>{row.atingimento}%</Badge>,
      },
      {
        key: 'actions',
        header: 'Detalhes',
        align: 'right',
        render: (row) => (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate(`/relatorios/performance-vendedor?id=${row.user_id}`)}
            aria-label={`Abrir performance de ${row.user_name}`}
          >
            <TrendingUp size={18} aria-hidden="true" />
          </Button>
        ),
      },
    ],
    [navigate],
  )

  if (loading && ranking.length === 0) {
    return (
      <MxModulePage>
        <MxModuleHeader title="Performance por vendedor" description="Consolidando os indicadores individuais da rede." />
        <MxSectionCard><MxLoadingState label="Carregando performance dos vendedores" /></MxSectionCard>
      </MxModulePage>
    )
  }

  if (sellerId && !seller) {
    return (
      <MxModulePage>
        <MxModuleHeader title="Performance por vendedor" description="O vendedor informado não está disponível no ranking atual." />
        <MxSectionCard>
          <MxErrorState
            title="Vendedor não localizado"
            description="Volte para a lista ou atualize os dados para tentar novamente."
            retry={() => void handleRefresh()}
          />
          <div className="flex justify-center pb-5">
            <Button variant="secondary" onClick={() => navigate('/relatorios/performance-vendedor')}>Ver lista de vendedores</Button>
          </div>
        </MxSectionCard>
      </MxModulePage>
    )
  }

  if (seller) {
    const conversion = seller.leads > 0 ? Number(((seller.vnd_total / seller.leads) * 100).toFixed(1)) : 0
    return (
      <MxModulePage>
        <MxModuleHeader
          title="Performance individual"
          description={`Indicadores comerciais e evolução de ${seller.user_name}.`}
          actions={(
            <>
              <Button variant="secondary" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} aria-hidden="true" />
                Voltar
              </Button>
              <Button variant="outline" size="icon" onClick={() => void handleRefresh()} disabled={isRefetching} aria-label="Atualizar dados">
                <RefreshCw size={16} className={cn(isRefetching && 'animate-spin')} aria-hidden="true" />
              </Button>
            </>
          )}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(280px,2fr)_minmax(0,5fr)]">
          <MxSectionCard className="p-5">
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <Avatar
                  src={seller.avatar_url || undefined}
                  alt={`Avatar de ${seller.user_name}`}
                  fallback={seller.user_name}
                  className="h-28 w-28 rounded-full border-4 border-white bg-emerald-50 text-2xl text-emerald-700 shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-emerald-600 text-sm font-semibold text-white">
                  {seller.position}º
                </span>
              </div>
              <Typography as="h2" variant="h2" className="mt-5">{seller.user_name}</Typography>
              <Badge variant="outline" className="mt-2">{seller.store_name}</Badge>
            </div>

            <div className="mt-5 h-72" aria-label="Radar de desempenho">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={attributes}>
                  <PolarGrid stroke="var(--color-border-default)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} />
                  <Radar dataKey="value" stroke="var(--color-brand-primary)" fill="var(--color-brand-primary)" fillOpacity={0.18} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-gray-50 p-4 text-center">
                <Typography variant="tiny" tone="muted">Atingimento</Typography>
                <Typography variant="h2" className="mt-1 text-2xl tabular-nums">{seller.atingimento}%</Typography>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 text-center">
                <Typography variant="tiny" tone="muted">Ritmo atual</Typography>
                <Typography variant="h2" className="mt-1 text-2xl tabular-nums">{seller.ritmo} v/d</Typography>
              </div>
            </div>
          </MxSectionCard>

          <div className="space-y-5">
            <MxMetricGrid className="xl:grid-cols-3">
              <MxMetricCard title="Vendas totais" value={seller.vnd_total} detail={`Meta individual: ${seller.meta}`} icon={Zap} tone="success" />
              <MxMetricCard title="Leads captados" value={seller.leads} detail={`${conversion}% de conversão`} icon={Phone} tone="info" />
              <MxMetricCard title="Agendamentos" value={seller.agd_total} detail={`${seller.visitas} visitas realizadas`} icon={Users} tone="warning" />
            </MxMetricGrid>

            <MxChartCard title="Histórico de performance" description="Comparação entre resultado realizado e meta individual.">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Mês atual', realizado: seller.vnd_total, meta: seller.meta }]}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'var(--color-surface-alt)' }} contentStyle={{ border: '1px solid var(--color-border-default)', borderRadius: 12 }} />
                    <Bar dataKey="realizado" fill="var(--color-brand-primary)" radius={[6, 6, 0, 0]} barSize={44} />
                    <Bar dataKey="meta" fill="var(--color-border-strong)" radius={[6, 6, 0, 0]} barSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </MxChartCard>

            <div className="grid gap-4 sm:grid-cols-2">
              <MxSectionCard className="flex items-center gap-3 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={20} aria-hidden="true" /></span>
                <div>
                  <Typography variant="tiny" tone="success">Meta individual</Typography>
                  <Typography variant="h3" className="mt-1">{seller.meta} vendas</Typography>
                </div>
              </MxSectionCard>
              <MxSectionCard className="flex items-center gap-3 p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><Activity size={20} aria-hidden="true" /></span>
                <div>
                  <Typography variant="tiny" tone="info">Eficiência de conversão</Typography>
                  <Typography variant="h3" className="mt-1">{conversion}%</Typography>
                </div>
              </MxSectionCard>
            </div>
          </div>
        </div>
      </MxModulePage>
    )
  }

  const topFive = filteredRanking.slice(0, 5)
  return (
    <MxModulePage>
      <MxModuleHeader
        title="Performance por vendedor"
        description="Compare execução, vendas e atingimento de meta dos vendedores da rede."
        actions={(
          <Button variant="outline" size="icon" onClick={() => void handleRefresh()} disabled={isRefetching} aria-label="Atualizar ranking">
            <RefreshCw size={16} className={cn(isRefetching && 'animate-spin')} aria-hidden="true" />
          </Button>
        )}
      />

      <MxToolbar>
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <Input
            id="search-seller-list"
            name="search-seller-list"
            placeholder="Buscar vendedor"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
        <Typography variant="caption" tone="muted" className="sm:ml-auto">
          {filteredRanking.length} vendedores encontrados
        </Typography>
      </MxToolbar>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(300px,2fr)]">
        <MxSectionCard className="min-w-0">
          <MxSectionHeader title="Vendedores da rede" description="Selecione um vendedor para abrir o detalhamento individual." />
          {filteredRanking.length ? (
            <DataGrid columns={columns} data={filteredRanking} emptyMessage="Nenhum vendedor localizado." />
          ) : (
            <MxEmptyState icon={Search} title="Nenhum vendedor localizado" description="Ajuste o termo de busca para consultar novamente." />
          )}
        </MxSectionCard>

        <div className="space-y-5">
          <MxChartCard title="Top performance" description="Vendas dos cinco primeiros colocados.">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFive} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="user_name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 10 }} width={110} />
                  <Tooltip cursor={{ fill: 'var(--color-surface-alt)' }} contentStyle={{ border: '1px solid var(--color-border-default)', borderRadius: 12 }} />
                  <Bar dataKey="vnd_total" radius={[0, 6, 6, 0]} barSize={20}>
                    {topFive.map((entry, index) => <Cell key={entry.user_id} fill={index === 0 ? 'var(--color-brand-primary)' : 'var(--color-mx-teal-light)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </MxChartCard>

          <MxSectionCard className="p-5 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Trophy size={22} aria-hidden="true" /></span>
            <Typography variant="h3" className="mt-3">Leitura da rede</Typography>
            <Typography variant="p" tone="muted" className="mt-1">Use o detalhamento individual para orientar feedbacks, PDI e acompanhamento de meta.</Typography>
          </MxSectionCard>
        </div>
      </div>
    </MxModulePage>
  )
}

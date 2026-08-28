import { useMemo, useState } from 'react'
import { Award, BarChart3, ListOrdered, Star, TrendingUp, Trophy } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import { useStoreRankingPageData, type RankedVendedor } from '@/features/ranking/hooks/useStoreRankingPageData'
import { getPeriodoRange } from '@/features/ranking/periodos'
import { RankingErrorNotice, RankingPeriodTabs, RankingRefreshButton, RankingUnitSelect } from '@/features/ranking/components/RankingControls'
import { ManagerRankingComparison } from '@/features/ranking/manager/ManagerRankingComparison'
import { ManagerRankingPodium } from '@/features/ranking/manager/ManagerRankingPodium'
import { PageCanvas } from '@/design-system/page'
import { PageHeading } from '@/components/molecules/PageHeading'
import { ScrollableRegion } from '@/design-system/page/ScrollableRegion'

type Criterion = 'geral' | 'vendas' | 'conversao' | 'rotina'

const CRITERION_LABEL: Record<Criterion, string> = {
  geral: 'pontuação geral',
  vendas: 'volume de vendas',
  conversao: 'taxa de conversão',
  rotina: 'execução da rotina',
}

const DIA_MES_ANO = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

function formatarDia(iso: string): string {
  return DIA_MES_ANO.format(new Date(`${iso}T12:00:00`))
}

/** Colunas e textos de ajuda da classificação, na ordem do Base44. */
const RANKING_COLUMNS: Array<{ label: string; help?: string }> = [
  { label: '#' },
  { label: 'Vendedor' },
  { label: 'Vendas', help: 'Total de vendas oficiais no período selecionado.' },
  { label: 'Meta', help: 'Meta individual do vendedor no período.' },
  { label: '% Meta', help: 'Vendas realizadas divididas pela meta individual. Verde ≥ 80%, amarelo ≥ 50%, vermelho abaixo.' },
  { label: 'Agend.', help: 'Total de agendamentos confirmados no período.' },
  { label: 'Conversão', help: 'Vendas divididas pelos atendimentos e leads de internet. Mede a eficiência comercial.' },
  { label: 'Rotina', help: 'Média da execução da rotina diária no período. Sem snapshot oficial, fica sem valor.' },
  { label: 'Pontuação', help: 'Soma ponderada: 50% resultado da meta + 25% conversão + 25% rotina. Define a classificação geral.' },
]

export function ManagerRankingReference() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const data = useStoreRankingPageData({ referenceMonth: selectedMonth })
  const [criterion, setCriterion] = useState<Criterion>('geral')
  const [view, setView] = useState<'classificacao' | 'comparativo'>('classificacao')
  // "Anual" + "março/2026" não dizia nada a ninguém: o mês é a ÂNCORA e o
  // período é a janela em volta dela. Em vez de explicar a regra, a tela passa
  // a mostrar a janela que ela realmente consultou.
  const { startDate, endDate } = getPeriodoRange(data.periodo, selectedMonth)
  const janela = `${formatarDia(startDate)} a ${formatarDia(endDate)}`

  const ranking = useMemo(() => [...data.vendedores].sort((left, right) => {
    if (criterion === 'conversao') return (right.conversao ?? -1) - (left.conversao ?? -1)
    if (criterion === 'rotina') return (right.rotina ?? -1) - (left.rotina ?? -1)
    if (criterion === 'geral') return (right.pontuacao ?? -1) - (left.pontuacao ?? -1) || right.vendas - left.vendas || left.nome.localeCompare(right.nome, 'pt-BR')
    return right.vendas - left.vendas || left.nome.localeCompare(right.nome, 'pt-BR')
  }), [criterion, data.vendedores])

  const salesLeader = [...data.vendedores].sort((left, right) => right.vendas - left.vendas)[0]
  const conversionLeader = data.vendedores.filter(item => item.conversao !== null).sort((left, right) => (right.conversao || 0) - (left.conversao || 0))[0]
  const routineLeader = data.vendedores.filter(item => item.rotina !== null).sort((left, right) => (right.rotina || 0) - (left.rotina || 0))[0]
  const scoreLeader = data.vendedores.filter(item => item.pontuacao !== null).sort((left, right) => (right.pontuacao || 0) - (left.pontuacao || 0))[0]
  const highlights = [
    { label: 'Líder em Vendas', seller: salesLeader, value: salesLeader ? `${salesLeader.vendas} vendas` : 'Sem dados oficiais', icon: Trophy, tone: 'yellow' as const, help: 'Vendedor com o maior número de vendas no mês selecionado.' },
    { label: 'Maior Conversão', seller: conversionLeader, value: conversionLeader ? `${conversionLeader.conversao}%` : 'Sem dados oficiais', icon: TrendingUp, tone: 'emerald' as const, help: 'Vendedor com a melhor taxa de conversão (vendas ÷ atendimentos + leads de internet) no período.' },
    { label: 'Melhor Rotina', seller: routineLeader, value: routineLeader?.rotina === null || !routineLeader ? 'Sem snapshot oficial' : `${routineLeader.rotina}%`, icon: Star, tone: 'blue' as const, help: 'Vendedor com a maior média de execução da rotina diária no período.' },
    { label: 'Maior Pontuação', seller: scoreLeader, value: scoreLeader?.pontuacao === null || !scoreLeader ? 'Sem dados oficiais' : `${scoreLeader.pontuacao} pts`, icon: Award, tone: 'violet' as const, help: 'Soma ponderada: 50% resultado da meta, 25% conversão e 25% execução da rotina.' },
  ]

  return (
    <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="flex flex-col gap-5">
        <PageHeading
          icon={Trophy}
          title="Ranking"
          subtitle={`${data.periodo} · ${janela} · ordenado por ${CRITERION_LABEL[criterion]}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-body-sm font-semibold text-muted-foreground" htmlFor="manager-ranking-reference-month">
                <span className="sr-only sm:not-sr-only">Mês de referência</span>
                <input id="manager-ranking-reference-month" name="referenceMonth" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Mês de referência do período" className="min-h-11 rounded-xl border border-border bg-white px-3 text-body-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40" />
              </label>
              <RankingPeriodTabs value={data.periodo} onChange={data.setPeriodo} />
              <RankingUnitSelect id="manager-ranking-store" value={data.unidade} unidades={data.unidades} onChange={data.setUnidade} />
              <label className="flex items-center gap-2 text-body-sm font-semibold text-muted-foreground" htmlFor="manager-ranking-criterion">
                <span className="sr-only sm:not-sr-only">Critério</span>
                <select id="manager-ranking-criterion" name="criterion" value={criterion} onChange={(event) => setCriterion(event.target.value as Criterion)} aria-label="Critério do ranking" className="min-h-11 rounded-xl border border-border bg-white px-3 text-body-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40">
                  <option value="geral">Pontuação geral</option>
                  <option value="vendas">Vendas</option>
                  <option value="conversao">Conversão</option>
                  <option value="rotina">Rotina</option>
                </select>
              </label>
              <RankingRefreshButton onRefresh={() => void data.handleRefresh()} isRefetching={data.isRefetching} />
            </div>
          }
        />

        {data.error && <RankingErrorNotice message={data.error} onRetry={() => void data.handleRefresh()} isRetrying={data.isRefetching} />}

        {/* Toggle de visão do Base44: classificação e comparativo não convivem na mesma tela. */}
        <nav className="rounded-2xl border border-border-subtle bg-white p-3 shadow-sm" aria-label="Visão do ranking">
          <div className="flex gap-1">
            {([['classificacao', 'Classificação', ListOrdered], ['comparativo', 'Comparar vendedores', BarChart3]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                onClick={() => setView(key)}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all ${view === key ? 'bg-brand-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-surface-alt'}`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </nav>

        {view === 'comparativo' ? (
          data.vendedores.length > 1
            ? <ManagerRankingComparison sellers={data.vendedores} periodLabel={`${data.periodo} · ${janela}`} />
            : <div className="rounded-2xl border border-border-subtle bg-white p-10 text-center shadow-sm"><BarChart3 className="mx-auto mb-3 text-text-disabled" size={40} /><p className="text-sm font-medium text-muted-foreground">São necessários pelo menos dois vendedores no período para comparar.</p></div>
        ) : (
        <>
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Destaques do ranking">{highlights.map(({ label, seller, value, icon: Icon, tone, help }) => <Highlight key={label} label={label} name={seller?.nome || '—'} value={value} icon={Icon} tone={tone} help={help} />)}</section>

        {!data.loading && ranking.length >= 3 && <ManagerRankingPodium ranking={ranking} />}

        <section className="overflow-hidden rounded-2xl border border-border-subtle bg-white shadow-sm" aria-labelledby="ranking-table-title">
          <div className="border-b border-border-subtle px-5 py-4"><h2 id="ranking-table-title" className="font-semibold text-foreground">Classificação por {CRITERION_LABEL[criterion]} — {janela}</h2><p className="mt-1 text-xs text-muted-foreground">Fórmula provisória aguardando decisão do Dono: 50% resultado, 25% conversão e 25% execução da rotina. Sem execução verificável, a pontuação não é estimada.</p></div>
          {data.loading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-4 border-status-success/30 border-t-emerald-600" /></div> : ranking.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><Trophy className="mb-3 text-text-disabled" size={48} /><p className="font-medium text-muted-foreground">Ainda não há dados suficientes para montar o ranking.</p></div> : <ScrollableRegion axis="horizontal" label="Classificação por vendedor" className=""><table className="w-full min-w-[900px] text-sm"><thead className="border-b border-border-subtle bg-surface-alt"><tr>{RANKING_COLUMNS.map(({ label, help }) => <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"><span className="inline-flex items-center gap-1">{label}<HelpTooltip text={help} /></span></th>)}</tr></thead><tbody className="divide-y divide-border-subtle">{ranking.map((seller, index) => <RankingRow key={seller.id} seller={seller} index={index} />)}</tbody></table></ScrollableRegion>}
        </section>
        </>
        )}
    </PageCanvas>
  )
}

function Highlight({ label, name, value, icon: Icon, tone, help }: { label: string; name: string; value: string; icon: typeof Trophy; tone: 'yellow' | 'emerald' | 'blue' | 'violet'; help?: string }) {
  const tones = { yellow: 'border-status-warning/20 bg-status-warning-surface text-status-warning-text', emerald: 'border-status-success/20 bg-status-success-surface text-status-success-text', blue: 'border-status-info/20 bg-status-info-surface text-status-info-text', violet: 'border-brand-primary/20 bg-brand-primary-subtle text-brand-primary-hover' }
  return <article className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone].split(' ')[0]}`}><div className="mb-2 flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone].split(' ').slice(1).join(' ')}`}><Icon size={16} /></span><p className="flex items-center gap-1 text-xs text-muted-foreground">{label}<HelpTooltip text={help} /></p></div><p className="font-bold text-foreground">{name}</p><p className="text-sm text-muted-foreground">{value}</p></article>
}

function RankingRow({ seller, index }: { seller: RankedVendedor; index: number }) {
  const attainment = seller.atingimento
  const rowTone = index === 0 ? 'bg-status-warning-surface/60 font-medium' : index === 1 ? 'bg-surface-alt/80 font-medium' : index === 2 ? 'bg-status-warning-surface/40 font-medium' : ''
  const positionTone = index === 0 ? 'bg-status-warning/50 text-status-warning-foreground' : index === 1 ? 'bg-gray-400 text-status-warning-foreground' : index === 2 ? 'bg-status-warning text-status-warning-foreground' : 'bg-muted text-muted-foreground'
  const barTone = attainment === null ? 'bg-muted' : attainment >= 80 ? 'bg-status-success' : attainment >= 50 ? 'bg-status-warning' : 'bg-status-error'
  const textTone = attainment === null ? 'text-muted-foreground' : attainment >= 80 ? 'text-status-success-text' : attainment >= 50 ? 'text-status-warning-text' : 'text-status-error-text'
  return <tr className={rowTone}><td className="px-4 py-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${positionTone}`}>{index + 1}</span></td><td className="px-4 py-3 font-semibold text-foreground">{seller.nome}</td><td className="px-4 py-3 text-foreground">{seller.vendas}</td><td className="px-4 py-3 text-foreground">{seller.meta ?? '—'}</td><td className="px-4 py-3"><div className="flex min-w-[88px] items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${barTone}`} style={{ width: `${Math.min(attainment ?? 0, 100)}%` }} /></div><span className={`text-xs font-medium ${textTone}`}>{attainment === null ? '—' : `${attainment}%`}</span></div></td><td className="px-4 py-3 text-foreground">{seller.agendamentos}</td><td className="px-4 py-3 text-foreground">{seller.conversao === null ? '—' : `${seller.conversao}%`}</td><td className="px-4 py-3 text-foreground">{seller.rotina === null ? '—' : `${seller.rotina}%`}</td><td className="px-4 py-3 font-bold text-status-success-text">{seller.pontuacao ?? '—'}</td></tr>
}

export default ManagerRankingReference

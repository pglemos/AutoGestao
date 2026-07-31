import { useMemo, useState } from 'react'
import { Award, RefreshCw, Star, TrendingUp, Trophy } from 'lucide-react'
import { RANKING_PERIODOS, useStoreRankingPageData, type RankedVendedor } from '@/features/ranking/hooks/useStoreRankingPageData'

type Criterion = 'geral' | 'vendas' | 'conversao' | 'rotina'

export function ManagerRankingReference() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const data = useStoreRankingPageData({ referenceMonth: selectedMonth })
  const [criterion, setCriterion] = useState<Criterion>('geral')
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${selectedMonth}-01T12:00:00`))

  const ranking = useMemo(() => [...data.vendedores].sort((left, right) => {
    if (criterion === 'conversao') return right.conversao - left.conversao
    if (criterion === 'rotina') return (right.rotina ?? -1) - (left.rotina ?? -1)
    if (criterion === 'geral') return (right.pontuacao ?? -1) - (left.pontuacao ?? -1) || right.vendas - left.vendas || left.nome.localeCompare(right.nome, 'pt-BR')
    return right.vendas - left.vendas || left.nome.localeCompare(right.nome, 'pt-BR')
  }), [criterion, data.vendedores])

  const salesLeader = [...data.vendedores].sort((left, right) => right.vendas - left.vendas)[0]
  const conversionLeader = [...data.vendedores].sort((left, right) => right.conversao - left.conversao)[0]
  const routineLeader = data.vendedores.filter(item => item.rotina !== null).sort((left, right) => (right.rotina || 0) - (left.rotina || 0))[0]
  const scoreLeader = data.vendedores.filter(item => item.pontuacao !== null).sort((left, right) => (right.pontuacao || 0) - (left.pontuacao || 0))[0]
  const highlights = [
    { label: 'Líder em Vendas', seller: salesLeader, value: salesLeader ? `${salesLeader.vendas} vendas` : 'Sem dados oficiais', icon: Trophy, tone: 'yellow' as const },
    { label: 'Maior Conversão', seller: conversionLeader, value: conversionLeader ? `${conversionLeader.conversao}%` : 'Sem dados oficiais', icon: TrendingUp, tone: 'emerald' as const },
    { label: 'Melhor Rotina', seller: routineLeader, value: routineLeader?.rotina === null || !routineLeader ? 'Sem snapshot oficial' : `${routineLeader.rotina}%`, icon: Star, tone: 'blue' as const },
    { label: 'Maior Pontuação', seller: scoreLeader, value: scoreLeader?.pontuacao === null || !scoreLeader ? 'Sem dados oficiais' : `${scoreLeader.pontuacao} pts`, icon: Award, tone: 'violet' as const },
  ]

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-24">
        <header className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div><h1 className="text-xl font-bold text-gray-800">Ranking</h1><p className="mt-0.5 text-sm text-gray-500">Acompanhe a classificação da equipe por resultado, conversão e execução.</p></div>
            <div className="flex flex-wrap gap-2"><input id="manager-ranking-reference-month" name="referenceMonth" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Mês do ranking" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />{RANKING_PERIODOS.map(periodo => <button key={periodo} type="button" onClick={() => data.setPeriodo(periodo)} aria-pressed={data.periodo === periodo} className={`rounded-xl border px-3 py-2 text-sm transition-colors ${data.periodo === periodo ? 'border-emerald-600 bg-emerald-600 font-semibold text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>{periodo}</button>)}{data.unidades.length > 1 && <select id="manager-ranking-store" name="store" value={data.unidade} onChange={(event) => data.setUnidade(event.target.value)} aria-label="Unidade do ranking" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"><option value="todas">Todas as unidades</option>{data.unidades.map(unidade => <option key={unidade} value={unidade}>{unidade}</option>)}</select>}<select id="manager-ranking-criterion" name="criterion" value={criterion} onChange={(event) => setCriterion(event.target.value as Criterion)} aria-label="Critério do ranking" className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"><option value="geral">Pontuação geral</option><option value="vendas">Vendas</option><option value="conversao">Conversão</option><option value="rotina">Rotina</option></select><button type="button" onClick={() => void data.handleRefresh()} aria-label="Atualizar ranking" className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"><RefreshCw size={16} className={data.isRefetching ? 'animate-spin' : ''} /></button></div>
          </div>
        </header>

        {data.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{data.error}</div>}

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4" aria-label="Destaques do ranking">{highlights.map(({ label, seller, value, icon: Icon, tone }) => <Highlight key={label} label={label} name={seller?.nome || '—'} value={value} icon={Icon} tone={tone} />)}</section>

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm" aria-labelledby="ranking-table-title">
          <div className="border-b border-gray-100 px-5 py-4"><h2 id="ranking-table-title" className="font-semibold capitalize text-gray-800">Classificação — {data.periodo} · {month}</h2><p className="mt-1 text-xs text-gray-500">Fórmula provisória aguardando decisão do Dono: 50% resultado, 25% conversão e 25% execução da rotina. Sem execução verificável, a pontuação não é estimada.</p></div>
          {data.loading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" /></div> : ranking.length === 0 ? <div className="flex flex-col items-center justify-center py-16 text-center"><Trophy className="mb-3 text-gray-300" size={48} /><p className="font-medium text-gray-500">Ainda não há dados suficientes para montar o ranking.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="border-b border-gray-100 bg-gray-50"><tr>{['#', 'Vendedor', 'Vendas', 'Meta', '% Meta', 'Conversão', 'Rotina', 'Pontuação'].map(label => <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-50">{ranking.map((seller, index) => <RankingRow key={seller.id} seller={seller} index={index} />)}</tbody></table></div>}
        </section>
      </div>
    </div>
  )
}

function Highlight({ label, name, value, icon: Icon, tone }: { label: string; name: string; value: string; icon: typeof Trophy; tone: 'yellow' | 'emerald' | 'blue' | 'violet' }) {
  const tones = { yellow: 'border-yellow-100 bg-yellow-50 text-yellow-600', emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600', blue: 'border-blue-100 bg-blue-50 text-blue-600', violet: 'border-violet-100 bg-violet-50 text-violet-600' }
  return <article className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone].split(' ')[0]}`}><div className="mb-2 flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone].split(' ').slice(1).join(' ')}`}><Icon size={16} /></span><p className="text-xs text-gray-500">{label}</p></div><p className="font-bold text-gray-800">{name}</p><p className="text-sm text-gray-500">{value}</p></article>
}

function RankingRow({ seller, index }: { seller: RankedVendedor; index: number }) {
  const attainment = seller.meta > 0 ? Math.round((seller.vendas / seller.meta) * 100) : null
  const rowTone = index === 0 ? 'border-l-4 border-yellow-400 bg-yellow-50' : index === 1 ? 'border-l-4 border-gray-300 bg-gray-50' : index === 2 ? 'border-l-4 border-amber-500 bg-orange-50' : ''
  const positionTone = index === 0 ? 'bg-yellow-400 text-white' : index === 1 ? 'bg-gray-400 text-white' : index === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'
  return <tr className={rowTone}><td className="px-4 py-3"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${positionTone}`}>{index + 1}</span></td><td className="px-4 py-3 font-semibold text-gray-800">{seller.nome}</td><td className="px-4 py-3 text-gray-700">{seller.vendas}</td><td className="px-4 py-3 text-gray-700">{seller.meta || '—'}</td><td className="px-4 py-3"><span className={`rounded-lg px-2 py-1 text-xs font-medium ${attainment === null ? 'bg-gray-100 text-gray-500' : attainment >= 80 ? 'bg-emerald-100 text-emerald-700' : attainment >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{attainment === null ? '—' : `${attainment}%`}</span></td><td className="px-4 py-3 text-gray-700">{seller.conversao}%</td><td className="px-4 py-3 text-gray-700">{seller.rotina === null ? '—' : `${seller.rotina}%`}</td><td className="px-4 py-3 font-bold text-emerald-700">{seller.pontuacao ?? '—'}</td></tr>
}

export default ManagerRankingReference

import { useMemo, useState } from 'react'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { Award, Calendar, Check, ChevronDown, GitCompareArrows, MessageSquare, Percent, Phone, RefreshCw, Sparkles, Star, Target, Users } from 'lucide-react'
import { HelpTooltip } from '@/components/ui/HelpTooltip'
import type { RankedVendedor } from '@/features/ranking/hooks/useStoreRankingPageData'
import { chartTokens } from '@/lib/charts/tokens'
import {
  COMPARISON_SIDE_A,
  COMPARISON_SIDE_B,
  buildComparisonInsights,
  buildComparisonRadar,
  initials,
  resolveComparisonWinner,
} from './manager-ranking-comparison'

type Side = 'A' | 'B'

function MetricRow({
  icon: Icon,
  label,
  help,
  a,
  b,
  format = value => `${value}`,
}: {
  icon: typeof Target
  label: string
  help: string
  a: number | null
  b: number | null
  format?: (value: number) => string
}) {
  const comparable = a !== null && b !== null && a !== b
  const aWins = comparable && (a as number) > (b as number)
  const bWins = comparable && (b as number) > (a as number)

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-gray-50 py-2.5 last:border-0">
      <div className="pr-1 text-right">
        <span className={`text-base font-bold ${aWins ? 'text-status-success-text' : 'text-foreground'}`}>{a === null ? '—' : format(a)}</span>
        {aWins && <Check size={12} className="ml-1 inline text-status-success-text" />}
      </div>
      <div className="flex min-w-[108px] items-center justify-center gap-1 text-center text-muted-foreground">
        <Icon size={13} className="text-muted-foreground" />
        <span className="text-xs font-medium">{label}</span>
        <HelpTooltip text={help} />
      </div>
      <div className="pl-1 text-left">
        {bWins && <Check size={12} className="mr-1 inline text-status-info" />}
        <span className={`text-base font-bold ${bWins ? 'text-status-info-text' : 'text-foreground'}`}>{b === null ? '—' : format(b)}</span>
      </div>
    </div>
  )
}

function SellerSelect({
  side,
  sellers,
  selectedId,
  onSelect,
  color,
}: {
  side: Side
  sellers: RankedVendedor[]
  selectedId: string
  onSelect: (id: string) => void
  color: string
}) {
  const [open, setOpen] = useState(false)
  const selected = sellers.find(seller => seller.id === selectedId) || null

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Selecionar vendedor do lado ${side}`}
        onClick={() => setOpen(value => !value)}
        className={`w-full rounded-2xl border p-3 text-left transition-all ${selected ? 'border-transparent shadow-md' : 'border-border bg-white hover:border-border-strong'}`}
        style={selected ? { backgroundColor: `${color}10`, boxShadow: `inset 0 0 0 2px ${color}` } : undefined}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold" style={{ backgroundColor: `${color}22`, color }}>
            {initials(selected?.nome || '')}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{selected?.nome || `Selecionar lado ${side}`}</p>
            {selected && <p className="text-caption font-medium" style={{ color }}>Selecionado</p>}
          </div>
          <ChevronDown size={16} className="shrink-0 text-text-disabled" />
        </div>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-border bg-white shadow-lg">
          {sellers.map(seller => (
            <button
              key={seller.id}
              type="button"
              onClick={() => { onSelect(seller.id); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-alt ${seller.id === selectedId ? 'bg-surface-alt' : ''}`}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted text-caption font-bold text-muted-foreground">{initials(seller.nome)}</span>
              <span className="truncate text-foreground">{seller.nome}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ManagerRankingComparison({ sellers, periodLabel }: { sellers: RankedVendedor[]; periodLabel: string }) {
  const [idA, setIdA] = useState('')
  const [idB, setIdB] = useState('')

  const sellerA = useMemo(() => sellers.find(seller => seller.id === idA) || null, [sellers, idA])
  const sellerB = useMemo(() => sellers.find(seller => seller.id === idB) || null, [sellers, idB])
  const canCompare = Boolean(sellerA && sellerB && sellerA.id !== sellerB.id)

  const radar = useMemo(
    () => (canCompare ? buildComparisonRadar(sellerA as RankedVendedor, sellerB as RankedVendedor) : []),
    [canCompare, sellerA, sellerB],
  )
  const winner = useMemo(
    () => (canCompare ? resolveComparisonWinner(sellerA as RankedVendedor, sellerB as RankedVendedor) : null),
    [canCompare, sellerA, sellerB],
  )
  const insights = useMemo(
    () => (canCompare ? buildComparisonInsights(sellerA as RankedVendedor, sellerB as RankedVendedor) : []),
    [canCompare, sellerA, sellerB],
  )
  const winnerColor = winner ? (winner.id === sellerA?.id ? COMPARISON_SIDE_A : COMPARISON_SIDE_B) : null

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm" data-tour="ranking-comparativo" aria-labelledby="ranking-comparison-title">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-status-success-surface">
            <GitCompareArrows size={18} className="text-status-success-text" />
          </span>
          <div>
            <h2 id="ranking-comparison-title" className="font-semibold text-foreground">Comparativo de Vendedores — {periodLabel}</h2>
            <p className="text-xs text-muted-foreground">Selecione dois vendedores para cruzar resultados, volume e rotina, e gerar insights de feedback.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
          <SellerSelect side="A" sellers={sellers} selectedId={idA} onSelect={setIdA} color={COMPARISON_SIDE_A} />
          <div className="flex items-center justify-center">
            <span className="rounded-full bg-gray-900 px-3 py-1.5 text-xs font-bold tracking-wide text-white">VS</span>
          </div>
          <SellerSelect side="B" sellers={sellers} selectedId={idB} onSelect={setIdB} color={COMPARISON_SIDE_B} />
        </div>
      </section>

      {!canCompare || !sellerA || !sellerB ? (
        <div className="rounded-2xl border border-border-subtle bg-white p-10 text-center shadow-sm">
          <GitCompareArrows className="mx-auto mb-3 text-text-disabled" size={40} />
          <p className="text-sm font-medium text-muted-foreground">Selecione dois vendedores diferentes para iniciar a comparação.</p>
        </div>
      ) : (
        <>
          <div
            className="flex items-center gap-3 rounded-2xl border p-4"
            style={{
              backgroundColor: winnerColor ? `${winnerColor}12` : '#f9fafb',
              borderColor: winnerColor ? `${winnerColor}40` : '#f3f4f6',
            }}
          >
            <Award size={22} style={{ color: winnerColor || chartTokens.axisTickMuted() }} />
            <p className="text-sm text-foreground">
              {winner
                ? <>Em pontuação geral, <strong className="text-foreground">{winner.nome}</strong> está à frente neste período.</>
                : sellerA.pontuacao === null || sellerB.pontuacao === null
                  ? <>Sem execução verificável dos dois lados, a <strong className="text-foreground">pontuação geral não é comparável</strong> neste período.</>
                  : <><strong className="text-foreground">Empate</strong> — ambos têm a mesma pontuação geral no período.</>}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                Perfil de desempenho
                <HelpTooltip text="Gráfico radar com 5 dimensões normalizadas em 0–100. Meta, Conversão e Rotina já são percentuais; Agendamentos e Atendimentos são normalizados pelo maior valor entre os dois." />
              </h3>
              <p className="mb-2 text-xs text-muted-foreground">Quanto maior a área, mais completo o desempenho.</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radar} outerRadius="75%">
                  <PolarGrid stroke="#f0f0f0" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: chartTokens.axisTick() }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name={sellerA.nome} dataKey="a" stroke={COMPARISON_SIDE_A} fill={COMPARISON_SIDE_A} fillOpacity={0.25} />
                  <Radar name={sellerB.nome} dataKey="b" stroke={COMPARISON_SIDE_B} fill={COMPARISON_SIDE_B} fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COMPARISON_SIDE_A }} />{sellerA.nome.split(' ')[0]}</span>
                <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: COMPARISON_SIDE_B }} />{sellerB.nome.split(' ')[0]}</span>
              </div>
            </section>

            <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 border-b border-border-subtle pb-3">
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Vendedor A</p>
                  <p className="text-sm font-bold" style={{ color: COMPARISON_SIDE_A }}>{sellerA.nome}</p>
                </div>
                <p className="text-center text-xs font-semibold uppercase text-muted-foreground">Métrica</p>
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Vendedor B</p>
                  <p className="text-sm font-bold" style={{ color: COMPARISON_SIDE_B }}>{sellerB.nome}</p>
                </div>
              </div>

              <MetricRow icon={Target} label="Vendas" help="Total de vendas oficiais no período." a={sellerA.vendas} b={sellerB.vendas} />
              <MetricRow icon={Target} label="Meta" help="Meta individual do período." a={sellerA.meta} b={sellerB.meta} />
              <MetricRow icon={Percent} label="% da Meta" help="Vendas divididas pela meta individual." a={sellerA.atingimento} b={sellerB.atingimento} format={value => `${value}%`} />
              <MetricRow icon={RefreshCw} label="Conversão" help="Vendas sobre o volume de atendimentos e leads do período." a={sellerA.conversao} b={sellerB.conversao} format={value => `${value}%`} />
              <MetricRow icon={Star} label="Rotina" help="Execução média da rotina diária. Sem snapshot oficial, fica sem valor." a={sellerA.rotina} b={sellerB.rotina} format={value => `${value}%`} />
              <MetricRow icon={Award} label="Pontuação" help="50% resultado, 25% conversão e 25% execução da rotina." a={sellerA.pontuacao} b={sellerB.pontuacao} format={value => `${value} pts`} />
              <MetricRow icon={Calendar} label="Agendamentos" help="Agendamentos confirmados no período." a={sellerA.agendamentos} b={sellerB.agendamentos} />
              <MetricRow icon={Users} label="Atendimentos" help="Atendimentos registrados no período." a={sellerA.visitas} b={sellerB.visitas} />
              <MetricRow icon={Phone} label="Leads" help="Leads recebidos no período." a={sellerA.leads} b={sellerB.leads} />
            </section>
          </div>

          <section className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <MessageSquare size={15} className="text-muted-foreground" /> Volume de oportunidades
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[sellerA, sellerB].map(seller => (
                <div key={seller.id}>
                  <p className="mb-2 text-xs font-semibold" style={{ color: seller.id === sellerA.id ? COMPARISON_SIDE_A : COMPARISON_SIDE_B }}>
                    {seller.nome.split(' ')[0]}
                  </p>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Atendimentos</dt><dd className="font-semibold text-foreground">{seller.visitas}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Leads</dt><dd className="font-semibold text-foreground">{seller.leads}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Agendamentos</dt><dd className="font-semibold text-foreground">{seller.agendamentos}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-status-success/20 bg-gradient-to-br from-status-success-surface to-status-info-surface p-5">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Sparkles size={16} className="text-status-success-text" /> Pontos para o feedback
            </h3>
            <ul className="space-y-1.5 text-sm text-foreground">
              {insights.map(insight => (
                <li key={insight} className="flex gap-2"><span className="mt-0.5 text-status-success-text">•</span><span>{insight}</span></li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}

export default ManagerRankingComparison

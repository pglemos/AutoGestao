import { useMemo, useState } from 'react'
import { ChevronRight, Filter, Globe2, TrendingDown, Trophy, Users, Warehouse } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { Card } from '@/components/molecules/Card'
import { PageHeading } from '@/components/molecules/PageHeading'
import { PageCanvas } from '@/design-system/page'
import { cn } from '@/lib/utils'
import type { ChannelFunnel, FunnelChannel } from '@/features/crm/lib/funil-vendas-diagnostico'
import { TEAM_PERIOD_LABELS, useTeamFunnel, type TeamPeriodKey } from '@/features/gerente/hooks/useTeamFunnel'
import type { TeamRankingRow } from '@/features/gerente/lib/team-funnel'

type ChannelTone = 'emerald' | 'sky' | 'amber'

const CHANNEL_UI: Record<FunnelChannel, { description: string; icon: typeof Users; tone: ChannelTone }> = {
  Showroom: { description: 'Tráfego espontâneo na loja', icon: Warehouse, tone: 'emerald' },
  Internet: { description: 'Leads digitais, parcerias e marketing', icon: Globe2, tone: 'sky' },
  Carteira: { description: 'Clientes ativos e reativação', icon: Users, tone: 'amber' },
}

const TONE: Record<ChannelTone, { icon: string; pill: string; column: string }> = {
  emerald: { icon: 'bg-emerald-50 text-emerald-700', pill: 'bg-emerald-50 text-emerald-700', column: 'text-emerald-700' },
  sky: { icon: 'bg-sky-50 text-sky-700', pill: 'bg-sky-50 text-sky-700', column: 'text-sky-700' },
  amber: { icon: 'bg-amber-50 text-amber-700', pill: 'bg-amber-50 text-amber-700', column: 'text-amber-700' },
}

const CHANNEL_ORDER: FunnelChannel[] = ['Showroom', 'Internet', 'Carteira']

/**
 * Conversão só é exibida quando faz sentido estatístico: sem base (0) ou com
 * saída maior que a entrada — típico de venda registrada sem o atendimento
 * correspondente — devolve null e a tela mostra "—" em vez de fingir 100%.
 */
function percent(from: number, to: number) {
  if (from <= 0 || to > from) return null
  return Math.round((to / from) * 100)
}

/** Maior perda relativa entre etapas consecutivas, considerando só etapas com base. */
function findBottleneck(channels: ChannelFunnel[]) {
  let worst: { label: string; channel: FunnelChannel; conversion: number } | null = null
  for (const channel of channels) {
    channel.steps.forEach((step, index) => {
      const next = channel.steps[index + 1]
      if (!next || step.value < 3) return
      const conversion = percent(step.value, next.value)
      if (conversion === null) return
      if (!worst || conversion < worst.conversion) {
        worst = { label: `${step.label} → ${next.label}`, channel: channel.channel, conversion }
      }
    })
  }
  return worst as { label: string; channel: FunnelChannel; conversion: number } | null
}

export default function FunilVendasGerente() {
  const [periodKey, setPeriodKey] = useState<TeamPeriodKey>('current_month')
  const { dashboard, ranking, loading, error, hasEvents } = useTeamFunnel(periodKey)

  const totals = useMemo(() => {
    const entrada = dashboard.channels.reduce((acc, channel) => acc + (channel.steps[0]?.value ?? 0), 0)
    const vendas = dashboard.kpis.realizado
    return { entrada, vendas, conversao: percent(entrada, vendas) }
  }, [dashboard])

  const bottleneck = useMemo(() => findBottleneck(dashboard.channels), [dashboard.channels])
  const vendedoresComVenda = ranking.filter(row => row.total > 0).length

  return (
    <PageCanvas
      width="dashboard"
      bottomClearance="navigation"
      id="funil-vendas"
      className="flex min-h-0 flex-1 flex-col gap-mx-md"
      aria-label="Funil Comercial"
    >
      <PageHeading
        icon={Filter}
        title="Funil Comercial"
        subtitle="Desempenho da equipe por canal de origem, com dados registrados em eventos comerciais."
        actions={(
          <label className="inline-flex h-11 items-center gap-mx-sm rounded-xl border border-border-subtle bg-white px-mx-md text-sm font-semibold text-foreground shadow-sm">
            <Filter size={16} aria-hidden="true" />
            <select
              className="bg-transparent font-semibold outline-none"
              value={periodKey}
              onChange={(event) => setPeriodKey(event.target.value as TeamPeriodKey)}
              aria-label="Período do funil"
            >
              {Object.entries(TEAM_PERIOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        )}
      />

      {error && (
        <Card className="border border-amber-200 bg-amber-50 p-mx-md" role="status">
          <Typography variant="p" className="text-sm font-semibold text-amber-800">
            Não foi possível carregar os eventos comerciais: {error}
          </Typography>
        </Card>
      )}

      {loading ? (
        <Card className="border bg-white p-mx-lg">
          <Typography variant="p" className="text-sm font-semibold text-muted-foreground">Carregando dados do funil…</Typography>
        </Card>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-mx-sm sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores do funil">
            <MetricCard
              icon={Users}
              label="Entradas no funil"
              value={String(totals.entrada)}
              hint="atendimentos, oportunidades e qualificados"
            />
            <MetricCard
              icon={Trophy}
              label="Vendas realizadas"
              value={String(totals.vendas)}
              hint={dashboard.kpis.meta !== null ? `meta da loja: ${dashboard.kpis.meta}` : 'meta da loja não configurada'}
              tone="emerald"
            />
            <MetricCard
              icon={TrendingDown}
              label="Conversão geral"
              value={totals.conversao === null ? '—' : `${totals.conversao}%`}
              hint="entrada → venda"
            />
            <MetricCard
              icon={Trophy}
              label="Vendedores com venda"
              value={String(vendedoresComVenda)}
              hint={`de ${ranking.length} com registro no período`}
            />
          </section>

          {!hasEvents ? (
            <Card className="border bg-white p-mx-lg text-center">
              <Typography variant="h3" className="text-foreground">Sem eventos comerciais no período</Typography>
              <Typography variant="p" className="mt-1 text-sm font-semibold text-muted-foreground">
                O funil é alimentado pelo Fechamento Diário e pela Carteira. Assim que a equipe registrar atendimentos,
                agendamentos e vendas, os números aparecem aqui.
              </Typography>
            </Card>
          ) : (
            // Ranking em linha própria: com 5 colunas numéricas ele ficava
            // cortado quando dividia a largura com o funil por canal.
            <section className="flex flex-col gap-mx-sm" aria-label="Funil e ranking">
              <Card className="border bg-white p-mx-md">
                <Typography variant="h2" className="text-xl text-foreground">Funil por canal</Typography>
                <Typography variant="p" className="mt-1 text-sm font-semibold text-muted-foreground">
                  Cada linha mostra o ciclo até a venda na origem correspondente.
                </Typography>

                <div className="mt-mx-md flex flex-col gap-mx-sm">
                  {CHANNEL_ORDER.map((name) => {
                    const channel = dashboard.channels.find(item => item.channel === name)
                    return channel ? <ChannelRow key={name} channel={channel} /> : null
                  })}
                </div>

                <div className="mt-mx-sm rounded-xl border border-border-subtle bg-gray-50 p-mx-sm">
                  <Typography variant="caption" tone="muted" className="block font-semibold normal-case tracking-normal">
                    Principal gargalo
                  </Typography>
                  <Typography variant="p" className="mt-1 text-sm font-semibold text-foreground">
                    {bottleneck
                      ? `${bottleneck.channel}: ${bottleneck.label} converte ${bottleneck.conversion}%.`
                      : 'Ainda não há volume suficiente para apontar um gargalo estatístico.'}
                  </Typography>
                </div>
              </Card>

              <Card className="border bg-white p-mx-md">
                <Typography variant="h2" className="text-xl text-foreground">Ranking por origem</Typography>
                <Typography variant="p" className="mt-1 text-sm font-semibold text-muted-foreground">
                  Vendas da equipe por canal no período selecionado.
                </Typography>

                {/* tabIndex e role: região com rolagem horizontal precisa ser
                    alcançável por teclado, senão as colunas fora da viewport
                    ficam inacessíveis sem mouse. */}
                <div className="mt-mx-md overflow-x-auto" tabIndex={0} role="region" aria-label="Vendas da equipe por canal">
                  {ranking.length === 0 ? (
                    <Typography variant="p" className="text-sm font-semibold text-muted-foreground">
                      Nenhuma venda registrada no período.
                    </Typography>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Vendedor', 'Showroom', 'Internet', 'Carteira', 'Sem canal', 'Total'].map(header => (
                            <th key={header} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-subtle">
                        {ranking.map((row, index) => <RankingRow key={row.id} row={row} position={index + 1} />)}
                      </tbody>
                    </table>
                  )}
                </div>
              </Card>
            </section>
          )}
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
  icon: typeof Users
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
      <Typography variant="h2" className={cn('mt-mx-sm text-2xl tabular-nums', tone === 'emerald' ? 'text-emerald-700' : 'text-foreground')}>
        {value}
      </Typography>
      <Typography variant="p" className="mt-1 text-xs font-semibold text-muted-foreground">{hint}</Typography>
    </Card>
  )
}

function ChannelRow({ channel }: { channel: ChannelFunnel }) {
  const ui = CHANNEL_UI[channel.channel]
  const tone = TONE[ui.tone]
  const Icon = ui.icon
  const conversion = percent(channel.steps[0]?.value ?? 0, channel.steps[channel.steps.length - 1]?.value ?? 0)

  return (
    <div className="rounded-xl border border-border-subtle p-mx-sm">
      <div className="flex items-center justify-between gap-mx-sm">
        <div className="flex items-center gap-mx-sm">
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', tone.icon)} aria-hidden="true">
            <Icon size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <Typography variant="h3" className="text-base text-foreground">{channel.channel}</Typography>
            <Typography variant="p" className="text-xs font-semibold text-muted-foreground">{ui.description}</Typography>
          </div>
        </div>
        <span className={cn('rounded-xl px-mx-sm py-1 text-xs font-bold tabular-nums', tone.pill)}>
          {conversion === null ? 'sem base' : `${conversion}% conv.`}
        </span>
      </div>

      <div className={cn('mt-mx-sm grid gap-mx-xs', channel.steps.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2')}>
        {channel.steps.map((step, index) => {
          const previous = channel.steps[index - 1]
          const rate = previous ? percent(previous.value, step.value) : null
          return (
            <div key={step.key} className="relative">
              {index > 0 && (
                <span className="absolute -left-0.5 top-1/2 hidden -translate-y-1/2 text-muted-foreground md:block" aria-hidden="true">
                  <ChevronRight size={14} />
                </span>
              )}
              <div className="rounded-xl bg-gray-50 px-3 py-3">
                <span className="block truncate text-xs font-bold uppercase tracking-tight text-muted-foreground">{step.label}</span>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-lg font-bold tabular-nums text-foreground">{step.value}</span>
                  {rate !== null && (
                    <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums', tone.pill)}>
                      {rate}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RankingRow({ row, position }: { row: TeamRankingRow; position: number }) {
  return (
    <tr>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums',
              position === 1 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-muted-foreground',
            )}
          >
            {position}
          </span>
          <p className="truncate font-bold text-foreground">{row.name}</p>
        </div>
      </td>
      <td className={cn('px-3 py-3 text-center font-bold tabular-nums', TONE.emerald.column)}>{row.showroom}</td>
      <td className={cn('px-3 py-3 text-center font-bold tabular-nums', TONE.sky.column)}>{row.internet}</td>
      <td className={cn('px-3 py-3 text-center font-bold tabular-nums', TONE.amber.column)}>{row.carteira}</td>
      <td className="px-3 py-3 text-center font-bold tabular-nums text-muted-foreground">{row.semCanal}</td>
      <td className="px-3 py-3 text-center font-bold tabular-nums text-foreground">{row.total}</td>
    </tr>
  )
}

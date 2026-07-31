import { useMemo } from 'react'
import { ChevronRight, Filter, Users, Phone, MapPin, Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageCanvas } from '@/design-system/page'

type Tone = 'info' | 'success' | 'warning' | 'purple'

type FunnelStage = {
  label: string
  value: number
  rate?: number
}

type FunnelRow = {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  tone: Tone
  stages: FunnelStage[]
}

/**
 * O `pill` usa o tom `-text`, mais escuro, porque é texto pequeno sobre a
 * superfície do próprio estado — com o tom de preenchimento ficava no limite de
 * 4.5:1 e reprovava AA. Ícone e barra seguem no tom cheio, que é a cor do estado.
 */
const tonePalette: Record<Tone, { iconBg: string; iconText: string; barBg: string; pill: string }> = {
  info: { iconBg: 'bg-status-info-surface', iconText: 'text-status-info-text', barBg: 'bg-status-info', pill: 'bg-status-info-surface text-status-info-text' },
  success: { iconBg: 'bg-status-success-surface', iconText: 'text-status-success-text', barBg: 'bg-status-success', pill: 'bg-status-success-surface text-status-success-text' },
  warning: { iconBg: 'bg-status-warning-surface', iconText: 'text-status-warning-text', barBg: 'bg-status-warning', pill: 'bg-status-warning-surface text-status-warning-text' },
  purple: { iconBg: 'bg-purple-100', iconText: 'text-purple-800', barBg: 'bg-purple-600', pill: 'bg-purple-100 text-purple-800' },
}

const funnelData: FunnelRow[] = [
  {
    id: 'leads',
    title: 'LEADS',
    description: 'Origem digital, parcerias e marketing',
    icon: <Users size={18} />,
    tone: 'info',
    stages: [
      { label: 'Leads Recebidos', value: 320 },
      { label: 'Agendamentos', value: 96, rate: 30 },
      { label: 'Visitas', value: 58, rate: 18 },
      { label: 'Vendas', value: 19, rate: 6 },
    ],
  },
  {
    id: 'carteira',
    title: 'CARTEIRA',
    description: 'Clientes ativos e reativação',
    icon: <Phone size={18} />,
    tone: 'success',
    stages: [
      { label: 'Contatos', value: 280 },
      { label: 'Agendamentos', value: 84, rate: 30 },
      { label: 'Visitas', value: 42, rate: 15 },
      { label: 'Vendas', value: 12, rate: 4 },
    ],
  },
  {
    id: 'porta',
    title: 'PORTA',
    description: 'Tráfego espontâneo no showroom',
    icon: <MapPin size={18} />,
    tone: 'purple',
    stages: [
      { label: 'Atendimentos', value: 210 },
      { label: 'Vendas', value: 7, rate: 3 },
    ],
  },
]

const teamRanking = [
  { id: '1', name: 'João Silva', leads: 5, carteira: 2, porta: 1, total: 8 },
  { id: '2', name: 'Marcos Lima', leads: 3, carteira: 1, porta: 1, total: 5 },
  { id: '3', name: 'Ana Costa', leads: 3, carteira: 0, porta: 0, total: 3 },
  { id: '4', name: 'Carlos Souza', leads: 2, carteira: 0, porta: 0, total: 2 },
  { id: '5', name: 'Pedro Santos', leads: 0, carteira: 0, porta: 0, total: 0 },
]

export default function FunilVendasGerente() {
  const totalSales = useMemo(() => funnelData.reduce((acc, r) => acc + (r.stages[r.stages.length - 1]?.value ?? 0), 0), [])
  const totalLeads = useMemo(() => funnelData.reduce((acc, r) => acc + (r.stages[0]?.value ?? 0), 0), [])
  const conversaoGeral = totalLeads > 0 ? Math.round((totalSales / totalLeads) * 100) : 0

  return (
    <PageCanvas
      as="main"
      width="dashboard"
      bottomClearance="navigation"
      id="funil-vendas"
      className="flex min-h-0 flex-1 flex-col gap-6"
      aria-label="Funil de Vendas"
    >
      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Funil de Vendas</h1>
          <p className="text-sm text-muted-foreground">Desempenho completo da equipe por canal de origem.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="flex h-11 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-bold text-muted-foreground shadow-sm hover:bg-muted/50 transition-all">
            <Filter size={16} /> Filtros
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-info text-white shadow-sm" aria-hidden="true">
              <Users size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Total Leads</span>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums">{totalLeads}</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground normal-case">de todos os canais</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-success text-white shadow-sm" aria-hidden="true">
              <Trophy size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vendas Realizadas</span>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums">{totalSales}</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground normal-case">fechadas no período</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-warning text-white shadow-sm" aria-hidden="true">
              <TrendingUp size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Conversão Geral</span>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums">{conversaoGeral}<span className="text-2xl">%</span></p>
          <p className="mt-2 text-xs font-bold text-muted-foreground normal-case">lead → venda</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm" aria-hidden="true">
              <TrendingDown size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gargalo Principal</span>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums">Visita → Venda</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground normal-case">Conversão abaixo da meta</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold">Funil por Canal</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground normal-case">Cada linha representa o ciclo lead → venda por origem.</p>

          <div className="mt-6 flex flex-col gap-4">
            {funnelData.map((row) => {
              const palette = tonePalette[row.tone]
              return (
                <div key={row.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', palette.iconBg, palette.iconText)} aria-hidden="true">
                        {row.icon}
                      </span>
                      <div>
                        <span className={cn('text-xs font-bold uppercase tracking-widest', palette.iconText)}>{row.title}</span>
                        <p className="text-xs font-bold text-muted-foreground normal-case">{row.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className={cn('mt-4 grid gap-3', row.stages.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2')}>
                    {row.stages.map((stage, i) => (
                      <div key={stage.label} className="relative">
                        {i > 0 && (
                          <span className="absolute -left-0.5 top-1/2 hidden -translate-y-1/2 text-muted-foreground md:block" aria-hidden="true">
                            <ChevronRight size={14} />
                          </span>
                        )}
                        <div className="rounded-md bg-muted px-3 py-3">
                          <span className="block truncate text-xs font-bold uppercase tracking-tight text-muted-foreground">{stage.label}</span>
                          <div className="mt-0.5 flex items-baseline gap-2">
                            <span className="font-mono text-lg font-bold text-foreground">{stage.value}</span>
                            {typeof stage.rate === 'number' && (
                              <span className={cn('inline-flex rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums', palette.pill)}>
                                {stage.rate}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-bold">Ranking por Origem</h2>
          <p className="mt-1 text-xs font-bold text-muted-foreground normal-case">Vendas da equipe por canal (mês).</p>

          {/* tabIndex e role: uma região que rola precisa ser alcançável e
              operável por teclado — sem isso quem não usa mouse não consegue
              ver as colunas fora da viewport (§21). */}
          <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Vendas da equipe por canal">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  {['Vendedor', 'Leads', 'Carteira', 'Porta', 'Total'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teamRanking.map((member, idx) => (
                  <tr key={member.id}>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full font-bold tabular-nums text-xs', idx === 0 ? 'bg-status-warning-surface text-status-warning' : 'bg-muted text-muted-foreground')}>{idx + 1}</span>
                        <p className="truncate font-bold text-foreground">{member.name}</p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-mono tabular-nums text-status-info">{member.leads}</td>
                    <td className="px-3 py-3 text-center font-mono tabular-nums text-status-success">{member.carteira}</td>
                    <td className="px-3 py-3 text-center font-mono tabular-nums text-purple-700">{member.porta}</td>
                    <td className="px-3 py-3 text-center font-mono tabular-nums font-bold">{member.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </PageCanvas>
  )
}

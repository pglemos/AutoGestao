import { useMemo } from 'react'
import { Target, TrendingUp, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { cn } from '@/lib/utils'

type SellerMeta = {
  id: string
  name: string
  meta: number
  realizado: number
  projecao: number
  status: 'excelente' | 'bom' | 'atencao' | 'critico'
}

const teamMetas: SellerMeta[] = [
  { id: '1', name: 'João Silva', meta: 8, realizado: 8, projecao: 9, status: 'excelente' },
  { id: '2', name: 'Marcos Lima', meta: 8, realizado: 5, projecao: 7, status: 'bom' },
  { id: '3', name: 'Ana Costa', meta: 8, realizado: 4, projecao: 5, status: 'atencao' },
  { id: '4', name: 'Carlos Souza', meta: 8, realizado: 2, projecao: 3, status: 'atencao' },
  { id: '5', name: 'Pedro Santos', meta: 8, realizado: 0, projecao: 1, status: 'critico' },
]

const statusConfig: Record<SellerMeta['status'], { label: string; pill: string; bar: string }> = {
  excelente: { label: 'Excelente', pill: 'bg-status-success-surface text-status-success', bar: 'bg-status-success' },
  bom: { label: 'Bom', pill: 'bg-status-info-surface text-status-info', bar: 'bg-status-info' },
  atencao: { label: 'Atenção', pill: 'bg-status-warning-surface text-status-warning', bar: 'bg-status-warning' },
  critico: { label: 'Crítico', pill: 'bg-status-error-surface text-status-error', bar: 'bg-status-error' },
}

export default function MetasGerente() {
  const totals = useMemo(() => {
    const meta = teamMetas.reduce((acc, m) => acc + m.meta, 0)
    const realizado = teamMetas.reduce((acc, m) => acc + m.realizado, 0)
    const projecao = teamMetas.reduce((acc, m) => acc + m.projecao, 0)
    const atingimento = meta > 0 ? Math.round((realizado / meta) * 100) : 0
    const projetado = meta > 0 ? Math.round((projecao / meta) * 100) : 0
    return { meta, realizado, projecao, atingimento, projetado, gap: Math.max(meta - realizado, 0) }
  }, [])

  const tierCounts = useMemo(() => ({
    excelente: teamMetas.filter(m => m.status === 'excelente').length,
    bom: teamMetas.filter(m => m.status === 'bom').length,
    atencao: teamMetas.filter(m => m.status === 'atencao').length,
    critico: teamMetas.filter(m => m.status === 'critico').length,
  }), [])

  return (
    <main id="metas-gerente" role="main" className="flex min-h-0 flex-1 flex-col space-y-6 px-4 pb-20 lg:px-8 lg:pb-0" aria-label="Metas da Equipe">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Metas da Equipe</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o atingimento e a projeção de cada vendedor.</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-info text-white shadow-sm" aria-hidden="true">
              <Target size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Meta do Mês</span>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums">{totals.meta}</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground normal-case">veículos · soma da equipe</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-success text-white shadow-sm" aria-hidden="true">
              <CheckCircle2 size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Realizado</span>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums">{totals.realizado}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs font-black tabular-nums text-status-success">{totals.atingimento}%</span>
            <span className="text-xs font-bold text-muted-foreground normal-case">da meta</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-warning text-white shadow-sm" aria-hidden="true">
              <TrendingUp size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Projeção</span>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums">{totals.projecao}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs font-black tabular-nums text-status-warning">{totals.projetado}%</span>
            <span className="text-xs font-bold text-muted-foreground normal-case">se mantiver ritmo</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-status-error text-white shadow-sm" aria-hidden="true">
              <AlertTriangle size={18} />
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Gap</span>
          </div>
          <p className="mt-4 text-3xl font-black tabular-nums">{totals.gap}</p>
          <p className="mt-2 text-xs font-bold text-muted-foreground normal-case">faltam para bater meta</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(Object.keys(statusConfig) as Array<SellerMeta['status']>).map((tier) => (
          <div key={tier} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className={cn('inline-flex rounded-md px-3 py-0.5 text-xs font-black uppercase tracking-tight', statusConfig[tier].pill)}>
                {statusConfig[tier].label}
              </span>
              <Clock3 size={14} className="text-muted-foreground" />
            </div>
            <p className="mt-4 text-3xl font-black tabular-nums">{tierCounts[tier]}</p>
            <p className="mt-2 text-xs font-bold text-muted-foreground normal-case">vendedores</p>
          </div>
        ))}
      </section>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-black">Meta por Vendedor</h2>
        <p className="mt-1 text-xs font-bold text-muted-foreground normal-case">Atingimento individual e ritmo projetado.</p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-muted/60">
              <tr>
                {['Vendedor', 'Meta', 'Realizado', 'Projeção', 'Atingimento', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teamMetas.map((m) => {
                const att = m.meta > 0 ? Math.round((m.realizado / m.meta) * 100) : 0
                const status = statusConfig[m.status]
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <p className="truncate font-black text-foreground">{m.name}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums">{m.meta}</td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-status-success">{m.realizado}</td>
                    <td className="px-4 py-3 text-center font-mono tabular-nums text-status-warning">{m.projecao}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className={cn('h-full rounded-full transition-all', status.bar)} style={{ width: `${Math.min(att, 100)}%` }} />
                        </div>
                        <span className="w-9 text-right text-xs font-black text-muted-foreground tabular-nums">{att}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-tight', status.pill)}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

import { formatBRLWhole } from './formatBRLWhole'

function Sparkline() {
  const points = [30, 45, 35, 55, 48, 65, 80, 72, 90]
  const max = Math.max(...points)
  const w = 120
  const h = 60
  const coords = points.map((v, i) => `${(i / (points.length - 1)) * w},${h - (v / max) * h}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <defs>
        <linearGradient id="spline" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-status-success)" />
          <stop offset="100%" stopColor="var(--color-status-success)" />
        </linearGradient>
      </defs>
      <polyline points={coords} stroke="url(#spline)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type Props = {
  comissaoProjetada: number
  ganhoPotencial: number
}

export function PotentialCommissionCard({ comissaoProjetada, ganhoPotencial }: Props) {
  return (
    <div className="rounded-2xl p-6 flex flex-col justify-between" style={{ background: 'hsl(var(--mx-color-surface))', border: '1px solid var(--color-border-subtle)', minHeight: '180px' }}>
      <div>
        <div className="flex items-start justify-between">
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide max-w-[60%]">Se fechar todos os clientes quentes</p>
          <Sparkline />
        </div>
        <p className="text-muted-foreground text-sm mt-3">Sua comissão sobe para</p>
        <p className="font-bold mt-1 tabular-nums" style={{ fontSize: '2.25rem', color: 'var(--color-status-success-text)' }}>
          {formatBRLWhole(comissaoProjetada)}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'hsl(var(--mx-status-success) / 0.1)', border: '1px solid hsl(var(--mx-status-success) / 0.2)' }}>
        <span className="text-lg">🔥</span>
        <span className="text-status-success-text text-sm font-semibold">
          Potencial de ganho: <span className="font-bold">{formatBRLWhole(ganhoPotencial)}</span>
        </span>
      </div>
    </div>
  )
}

export default PotentialCommissionCard

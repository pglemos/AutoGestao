import { Target, TrendingUp, Trophy } from 'lucide-react'

type Props = {
  posicao: number
  total: number
  atingimento: number
  faltamValor: number | null
}

function formatFaltam(v: number | null) {
  if (v === null || v === undefined) return '—'
  return `${v} vendas`
}

export function SuaPosicao({ posicao, total, atingimento, faltamValor }: Props) {
  const pct = Math.round((atingimento || 0) * 100) / 100
  const posLabel = posicao ? `${posicao}º lugar` : '—'
  const proxLabel = posicao === 2 ? 'para o 1º lugar' : `para o ${(posicao || 1) - 1}º lugar`

  return (
    <div className="relative bg-white rounded-2xl border border-border shadow-sm p-5 min-w-[220px] overflow-hidden flex flex-col justify-between">
      <Trophy className="absolute right-2 top-2 opacity-[0.06]" style={{ width: 120, height: 120, color: 'var(--color-brand-primary)' }} />
      <div>
        <p className="text-body-sm font-semibold text-muted-foreground mb-1">Sua posição</p>
        <p className="text-h2 font-bold text-foreground leading-tight">{posLabel}</p>
        <p className="text-[12px] text-muted-foreground mt-0.5">de {total || '—'} vendedores</p>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-brand-primary-subtle border border-brand-primary/20 rounded-xl p-3 flex flex-col items-center gap-1">
          <Target className="w-5 h-5 text-status-success-text" />
          <p className="text-caption text-muted-foreground font-medium">Atingimento</p>
          <p className="text-h3 font-bold text-status-success-text leading-tight">{pct}%</p>
        </div>
        <div className="bg-status-info-surface border border-status-info/20 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
          <TrendingUp className="w-5 h-5 text-status-info-text" />
          <p className="text-caption text-muted-foreground font-medium">Faltam</p>
          <p className="text-[16px] font-bold text-status-info-text leading-tight">{formatFaltam(faltamValor)}</p>
          {posicao > 1 && <p className="text-caption text-muted-foreground">{proxLabel}</p>}
          {posicao === 1 && <p className="text-caption text-status-success-text font-semibold">Você lidera!</p>}
        </div>
      </div>
    </div>
  )
}

export default SuaPosicao

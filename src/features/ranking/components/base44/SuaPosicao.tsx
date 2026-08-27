import { ArrowRight, Target, TrendingUp, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'

type Props = {
  posicao: number
  total: number
  /** `null` = sem meta individual. Nunca 0-por-omissão. */
  atingimento: number | null
  faltamValor: number | null
}

function formatFaltam(v: number | null) {
  if (v === null || v === undefined) return '—'
  return `${v} ${v === 1 ? 'venda' : 'vendas'}`
}

/** A cor do atingimento sai do valor. Estava fixa em verde, então 12% aparecia
 *  em verde neste card e em vermelho na tabela, na mesma tela. */
function tomAtingimento(pct: number | null) {
  if (pct === null) return 'text-muted-foreground'
  if (pct >= 100) return 'text-status-success-text'
  if (pct >= 80) return 'text-status-warning-text'
  if (pct >= 50) return 'text-status-info-text'
  return 'text-status-error-text'
}

export function SuaPosicao({ posicao, total, atingimento, faltamValor }: Props) {
  const pct = atingimento === null ? null : Math.round(atingimento * 100) / 100
  const posLabel = posicao ? `${posicao}º lugar` : '—'
  const proxLabel = `para o ${Math.max(1, (posicao || 2) - 1)}º lugar`

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
          <Target className={`w-5 h-5 ${tomAtingimento(pct)}`} aria-hidden="true" />
          <p className="text-caption text-muted-foreground font-medium">Atingimento</p>
          <p className={`text-h3 font-bold leading-tight ${tomAtingimento(pct)}`}>{pct === null ? '—' : `${pct}%`}</p>
          {pct === null && <p className="text-caption text-muted-foreground text-center">Sem meta definida</p>}
        </div>
        <div className="bg-status-info-surface border border-status-info/20 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
          <TrendingUp className="w-5 h-5 text-status-info-text" aria-hidden="true" />
          <p className="text-caption text-muted-foreground font-medium">Faltam</p>
          <p className="text-[16px] font-bold text-status-info-text leading-tight">{formatFaltam(faltamValor)}</p>
          {posicao > 1 && <p className="text-caption text-muted-foreground">{proxLabel}</p>}
          {posicao === 1 && <p className="text-caption text-status-success-text font-semibold">Você lidera!</p>}
        </div>
      </div>
      <Link
        to="/carteira-clientes"
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 text-body-sm font-bold text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
      >
        Trabalhar minha carteira
        <ArrowRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </div>
  )
}

export default SuaPosicao

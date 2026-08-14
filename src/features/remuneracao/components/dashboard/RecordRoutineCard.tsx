import { Link } from 'react-router-dom'
import { Star, Play } from 'lucide-react'
import { formatBRLWhole } from './formatBRLWhole'

export function RecordRoutineCard({ melhorMes }: { melhorMes: number }) {
  return (
    <div className="rounded-2xl p-6 flex flex-col justify-between" style={{ background: 'hsl(var(--mx-color-surface))', border: '1px solid var(--color-border-subtle)', minHeight: '220px' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'hsl(var(--mx-status-success) / 0.15)', border: '2px solid hsl(var(--mx-status-success) / 0.3)' }}>
          <Star className="w-7 h-7" style={{ color: 'var(--color-status-success-text)' }} fill="currentColor" />
        </div>

        <p className="text-muted-foreground text-sm mb-1">Seu recorde foi</p>
        <p className="font-bold tabular-nums" style={{ fontSize: '2.25rem', color: 'var(--color-status-success-text)' }}>
          {melhorMes > 0 ? formatBRLWhole(melhorMes) : '—'}
        </p>
        <p className="text-muted-foreground text-sm mt-2">
          Vamos buscar <span style={{ color: 'var(--color-status-success-text)' }}>isso novamente?</span>
        </p>
      </div>

      <Link to="/central-execucao">
        <button
          type="button"
          className="w-full mt-5 flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-base tracking-wide transition-all hover:brightness-110 active:scale-95"
          style={{ background: 'hsl(var(--mx-color-surface))', color: 'hsl(var(--mx-color-text-primary))', boxShadow: '0 4px 20px hsl(var(--mx-status-success) / 0.35)' }}
        >
          <Play className="w-5 h-5" fill="currentColor" />
          EXECUTAR MINHA ROTINA
        </button>
      </Link>
      <p className="text-muted-foreground text-xs text-center mt-2">Acesse sua Rotina do Dia e venda mais hoje!</p>
    </div>
  )
}

export default RecordRoutineCard

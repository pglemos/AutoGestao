import { Trophy } from 'lucide-react'
import { RankingAvatar } from './RankingAvatar'
import type { RankedVendedor } from '../../hooks/useStoreRankingPageData'

const PEDESTAL = [
  { pos: 2, label: '2º', bg: 'linear-gradient(180deg,var(--color-chart-grid-strong),var(--color-chart-axis-tick-muted))', height: 56, order: 1 },
  { pos: 1, label: '1º', bg: 'linear-gradient(180deg,var(--color-status-warning-surface),var(--color-status-warning))', height: 80, order: 2 },
  { pos: 3, label: '3º', bg: 'linear-gradient(180deg,var(--color-status-warning-surface),var(--color-status-warning))', height: 40, order: 3 },
] as const

function formatVendas(v: number) {
  return `${v} vendas`
}

export function PodioRanking({ top3 }: { top3: RankedVendedor[] }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex-1">
      <h2 className="text-body font-bold text-foreground mb-4">Pódio do Período</h2>
      <div className="flex items-end justify-center gap-3 sm:gap-6 mt-2 pb-2">
        {PEDESTAL.map(({ pos, label, bg, height, order }) => {
          const v = top3[pos - 1]
          if (!v) {
            return (
              <div key={pos} className="flex flex-col items-center gap-2" style={{ order }}>
                <div className="w-14 h-14 rounded-full bg-muted border-2 border-border flex items-center justify-center">
                  <span className="text-text-disabled text-lg font-bold">{pos}</span>
                </div>
                <div className="rounded-t-md w-16 sm:w-20" style={{ height, background: bg, opacity: 0.4 }} />
              </div>
            )
          }
          return (
            <div key={pos} className="flex flex-col items-center gap-1.5" style={{ order }}>
              {pos === 1 && (
                <Trophy
                  className="w-6 h-6 mb-0.5"
                  style={{ color: 'var(--color-status-warning)', filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.5))' }}
                  fill="currentColor"
                />
              )}
              <RankingAvatar
                nome={v.nome}
                foto={v.foto}
                size={pos === 1 ? 68 : 56}
                border={pos === 1 ? '4px solid var(--color-status-warning)' : '3px solid var(--color-border-default)'}
              />
              <div className="text-center mt-1">
                <p className="text-body-sm font-bold text-foreground leading-tight">{v.nome?.split(' ')[0]}</p>
                <p className="text-caption font-semibold" style={{ color: 'var(--color-brand-primary)' }}>{formatVendas(v.vendas)}</p>
              </div>
              <div className="relative rounded-t-md flex items-center justify-center w-16 sm:w-20" style={{ height, background: bg }}>
                <span className="text-white font-bold text-xl drop-shadow">{label}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PodioRanking

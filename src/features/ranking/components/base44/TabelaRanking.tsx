import { Trophy } from 'lucide-react'
import { RankingAvatar } from './RankingAvatar'
import type { RankedVendedor } from '../../hooks/useStoreRankingPageData'

const MEDAL = [
  { color: 'var(--color-status-warning)', bg: 'var(--color-status-warning-surface)' },
  { color: 'var(--color-chart-axis-tick-muted)', bg: 'var(--color-surface-alt)' },
  { color: 'var(--color-status-warning)', bg: 'var(--color-status-warning-surface)' },
]

function StatusBadge({ pct }: { pct: number }) {
  if (pct >= 100) return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-green-100 text-green-700">Acima da meta</span>
  if (pct >= 80) return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-status-warning-surface text-status-warning-text">Próximo da meta</span>
  if (pct >= 50) return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-status-info-surface text-status-info-text">Em evolução</span>
  return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-status-error-surface text-status-error-text">Abaixo do esperado</span>
}

type Props = {
  vendedores: RankedVendedor[]
  meta: number
  meuId?: string
}

export function TabelaRanking({ vendedores, meta, meuId }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-slate-50 border-b border-border-subtle">
              {['Posição', 'Vendedor', 'Unidade', 'Vendas', 'Meta', 'Atingimento', 'Status'].map(h => (
                <th key={h} className="text-left text-caption font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendedores.map((v, i) => {
              const isMe = v.id === meuId
const vendedorMeta = v.meta || meta
const pct = vendedorMeta > 0 ? Math.round((v.vendas / vendedorMeta) * 100) : 0
              const medal = MEDAL[i] || null
              return (
                <tr
                  key={v.id}
                  className={`border-b border-slate-50 transition-colors ${isMe ? 'bg-status-info-surface/60' : 'hover:bg-slate-50/50'}`}
                  style={isMe ? { outline: '1.5px solid var(--color-chart-2)', outlineOffset: '-1px' } : undefined}
                >
                  <td className="px-4 py-3">
                    {medal ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: medal.bg }}>
                        <Trophy className="w-4 h-4" style={{ color: medal.color }} fill="currentColor" />
                      </div>
                    ) : (
                      <span className="text-[14px] font-bold text-muted-foreground">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <RankingAvatar nome={v.nome} foto={v.foto} size={32} />
                      <div className="flex items-center gap-1.5">
                        <span className="text-body-sm font-semibold text-foreground">{v.nome}</span>
                        {isMe && <span className="px-1.5 py-0.5 bg-status-info-surface text-status-info-text text-caption font-bold rounded-full">Você</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">{v.unidade || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[14px] font-bold ${isMe ? 'text-status-info-text' : 'text-status-success-text'}`}>{v.vendas}</span>
                  </td>
<td className="px-4 py-3 text-body-sm text-muted-foreground">{vendedorMeta}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[14px] font-bold ${pct >= 100 ? 'text-status-success-text' : pct >= 80 ? 'text-status-warning-text' : pct >= 50 ? 'text-status-info-text' : 'text-status-error-text'}`}>
                      {pct}%
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge pct={pct} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {vendedores.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-body-sm">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        )}
      </div>
    </div>
  )
}

export default TabelaRanking

import { Trophy } from 'lucide-react'
import { RankingAvatar } from './RankingAvatar'
import { ScrollableRegion } from '@/design-system/page/ScrollableRegion'
import type { RankedVendedor } from '../../hooks/useStoreRankingPageData'

const MEDAL = [
  { color: 'var(--color-status-warning)', bg: 'var(--color-status-warning-surface)', label: '1º lugar' },
  { color: 'var(--color-chart-axis-tick-muted)', bg: 'var(--color-surface-alt)', label: '2º lugar' },
  { color: 'var(--color-medal-bronze)', bg: 'var(--color-medal-bronze-surface)', label: '3º lugar' },
]

function StatusBadge({ pct }: { pct: number | null }) {
  // Sem meta individual não há julgamento a emitir. Antes o vendedor sem meta
  // caía no ramo `< 50` e recebia "Abaixo do esperado" em vermelho.
  if (pct === null) return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-muted text-muted-foreground">Sem meta definida</span>
  if (pct >= 100) return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-brand-primary-subtle text-brand-primary-hover">Acima da meta</span>
  if (pct >= 80) return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-status-warning-surface text-status-warning-text">Próximo da meta</span>
  if (pct >= 50) return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-status-info-surface text-status-info-text">Em evolução</span>
  return <span className="px-2.5 py-1 rounded-full text-caption font-semibold bg-status-error-surface text-status-error-text">Abaixo do esperado</span>
}

type Props = {
  vendedores: RankedVendedor[]
  meuId?: string
  onSelect?: (vendedor: RankedVendedor) => void
}

export function TabelaRanking({ vendedores, meuId, onSelect }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <ScrollableRegion axis="horizontal" label="Classificação dos vendedores" className="">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="bg-surface-alt border-b border-border-subtle">
              {['Posição', 'Vendedor', 'Unidade', 'Vendas', 'Meta', 'Atingimento', 'Status'].map(h => (
                <th key={h} className="text-left text-caption font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vendedores.map((v, i) => {
              const isMe = v.id === meuId
              const pct = v.atingimento
              const medal = MEDAL[i] || null
              const clicavel = Boolean(onSelect)
              return (
                <tr
                  key={v.id}
                  className={`border-b border-border-subtle transition-colors ${isMe ? 'bg-status-info-surface/60' : 'hover:bg-surface-alt/50'} ${clicavel ? 'focus-within:bg-surface-alt' : ''}`}
                  style={isMe ? { outline: '1.5px solid var(--color-chart-2)', outlineOffset: '-1px' } : undefined}
                >
                  <td className="px-4 py-3">
                    {medal ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: medal.bg }} title={medal.label}>
                        <Trophy className="w-4 h-4" style={{ color: medal.color }} fill="currentColor" aria-hidden="true" />
                        <span className="sr-only">{medal.label}</span>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <RankingAvatar nome={v.nome} foto={v.foto} size={32} />
                      <div className="flex items-center gap-1.5 min-w-0">
                        {clicavel ? (
                          <button
                            type="button"
                            onClick={() => onSelect?.(v)}
                            className="text-body-sm font-semibold text-foreground truncate max-w-[160px] sm:max-w-[200px] text-left rounded-sm hover:text-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40"
                            title={`Ver perfil de ${v.nome || 'vendedor'}`}
                          >{v.nome || 'Vendedor'}</button>
                        ) : (
                          <span className="text-body-sm font-semibold text-foreground truncate max-w-[160px] sm:max-w-[200px]" title={v.nome}>{v.nome || 'Vendedor'}</span>
                        )}
                        {isMe && <span className="px-1.5 py-0.5 bg-status-info-surface text-status-info-text text-caption font-bold rounded-full shrink-0">Você</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground truncate max-w-[120px]" title={v.unidade || '—'}>{v.unidade || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-bold ${isMe ? 'text-status-info-text' : 'text-status-success-text'}`}>{v.vendas}</span>
                  </td>
                  <td className="px-4 py-3 text-body-sm text-muted-foreground">{v.meta ?? '—'}</td>
                  <td className="px-4 py-3">
                    {pct === null ? (
                      <span className="text-sm font-bold text-muted-foreground">—</span>
                    ) : (
                      <span className={`text-sm font-bold ${pct >= 100 ? 'text-status-success-text' : pct >= 80 ? 'text-status-warning-text' : pct >= 50 ? 'text-status-info-text' : 'text-status-error-text'}`}>
                        {pct}%
                      </span>
                    )}
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
      </ScrollableRegion>
    </div>
  )
}

export default TabelaRanking

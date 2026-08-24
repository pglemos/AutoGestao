import { Flag, Trophy } from 'lucide-react'
import { RankingAvatar } from './RankingAvatar'
import type { RankedVendedor } from '../../hooks/useStoreRankingPageData'

type Props = {
  vendedores: RankedVendedor[]
  meta: number
  meuId?: string
}

function formatVendas(v: number) {
  return `${v} venda${v === 1 ? '' : 's'}`
}

export function CorridaPeriodo({ vendedores, meta, meuId }: Props) {
  const maxVal = Math.max(...vendedores.map(v => v.vendas), meta, 1)
  const liderVal = Math.max(...vendedores.map(v => v.vendas), 0)

  // Agrupa vendedores por volume de vendas para calcular offsets sem colisão
  const groupsByVendas = new Map<number, RankedVendedor[]>()
  vendedores.forEach(v => {
    const list = groupsByVendas.get(v.vendas) || []
    list.push(v)
    groupsByVendas.set(v.vendas, list)
  })

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-5 flex-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-status-success-text" />
            <h2 className="text-body font-bold text-foreground">Corrida do Período</h2>
          </div>
          <span className="text-[12px] font-semibold text-muted-foreground bg-surface-alt px-2.5 py-1 rounded-lg border border-border">
            Meta da loja: <strong className="text-foreground">{formatVendas(meta)}</strong>
          </span>
        </div>
        <p className="text-[12px] text-muted-foreground mb-6">
          Acompanhe o avanço em tempo real de cada vendedor rumo à meta do período.
        </p>
      </div>

      <div className="relative px-2 pt-10 pb-2">
        {/* Pista de corrida */}
        <div className="relative h-14 bg-gradient-to-r from-slate-100 via-slate-50 to-emerald-50/40 rounded-2xl border border-border overflow-visible">
          {/* Faixa de progresso do líder */}
          <div
            className="absolute left-0 top-0 h-full rounded-2xl transition-all duration-700"
            style={{
              width: `${Math.min(100, Math.max(6, (liderVal / maxVal) * 100))}%`,
              background: 'linear-gradient(90deg, rgba(0,168,150,0.18), rgba(0,168,150,0.06))',
            }}
          />

          {/* Linha de chegada */}
          <div className="absolute right-0 top-0 h-full w-2 bg-gradient-to-b from-brand-primary to-status-success rounded-r-2xl opacity-70 flex items-center justify-center">
            <Trophy className="w-3 h-3 text-white -ml-0.5 opacity-90" />
          </div>

          {/* Marcadores dos corredores (com prevenção de colisão) */}
          {vendedores.map(v => {
            const sameGroup = groupsByVendas.get(v.vendas) || [v]
            const indexInGroup = sameGroup.findIndex(item => item.id === v.id)
            const groupSize = sameGroup.length
            const isMe = v.id === meuId

            // Calcula porcentagem base e dispersão horizontal para evitar sobreposição
            const basePct = (v.vendas / maxVal) * 100
            // Clampa entre 5% e 90% para não vazar da pista
            const clampedPct = Math.max(6, Math.min(88, basePct))
            const spacing = groupSize > 1 ? 42 : 0
            const offsetPx = (indexInGroup - (groupSize - 1) / 2) * spacing

            return (
              <div
                key={v.id}
                className={`absolute flex flex-col items-center transition-all duration-500 ${isMe ? 'z-[var(--mx-z-topbar)]' : 'z-[var(--mx-z-sticky)] hover:z-[var(--mx-z-sidebar)]'}`}
                style={{
                  left: `clamp(24px, calc(${clampedPct}% + ${offsetPx}px), calc(100% - 28px))`,
                  top: '-34px',
                  transform: 'translateX(-50%)',
                }}
              >
                {/* Nome e vendas do vendedor */}
                <div className={`mb-1 px-1.5 py-0.5 rounded-md text-center whitespace-nowrap shadow-xs text-[11px] font-bold transition-transform max-w-[80px] min-w-0 ${
                  isMe
                    ? 'bg-brand-primary text-white border border-brand-primary/40'
                    : 'bg-white text-foreground border border-border'
                }`}>
                  <span className="truncate block" title={v.nome}>{v.nome?.trim().split(' ')[0] || 'Vendedor'}</span>
                  <span className={`block text-[10px] font-medium ${isMe ? 'text-white/90' : 'text-muted-foreground'}`}>
                    {formatVendas(v.vendas)}
                  </span>
                </div>

                {/* Avatar do vendedor */}
                <div className={`rounded-full transition-transform hover:scale-110 ${isMe ? 'ring-2 ring-brand-primary ring-offset-2' : ''}`}>
                  <RankingAvatar
                    nome={v.nome}
                    foto={v.foto}
                    size={34}
                    border={isMe ? '2px solid var(--color-brand-primary)' : '2px solid var(--color-border-default)'}
                  />
                </div>

                {/* Tag VOCÊ */}
                {isMe && (
                  <span className="mt-1 text-[9px] font-extrabold tracking-wider text-white bg-brand-primary px-1.5 py-0.2 rounded-full uppercase shadow-xs">
                    VOCÊ
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Marcadores de escala 0% e 100% */}
        <div className="flex justify-between mt-2 px-1">
          <span className="text-[11px] font-medium text-muted-foreground">Largada (0 vendas)</span>
          <span className="text-[11px] font-bold text-brand-primary">Chegada ({meta} {meta === 1 ? 'venda' : 'vendas'})</span>
        </div>
      </div>
    </div>
  )
}

export default CorridaPeriodo

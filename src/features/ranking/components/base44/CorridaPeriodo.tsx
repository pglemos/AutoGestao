import { Flag } from 'lucide-react'
import { RankingAvatar } from './RankingAvatar'
import type { RankedVendedor } from '../../hooks/useStoreRankingPageData'

type Props = {
  vendedores: RankedVendedor[]
  meta: number
  meuId?: string
}

function formatVendas(v: number) {
  return `${v} vendas`
}

export function CorridaPeriodo({ vendedores, meta, meuId }: Props) {
  const maxVal = Math.max(...vendedores.map(v => v.vendas), meta, 1)
  const liderVal = Math.max(...vendedores.map(v => v.vendas), 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex-1">
      <div className="flex items-center gap-2 mb-1">
        <Flag className="w-5 h-5 text-slate-700" />
        <h2 className="text-[15px] font-bold text-slate-800">Corrida do Período</h2>
      </div>
      <p className="text-[12px] text-slate-400 mb-4">
        Meta de volume: <span className="font-bold text-green-600">{formatVendas(meta)}</span>
      </p>

      <div className="relative px-4">
        <div className="relative h-16 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl border border-slate-200 overflow-visible">
          <div
            className="absolute left-0 top-0 h-full rounded-l-xl"
            style={{
              width: `${Math.min(100, (liderVal / maxVal) * 100)}%`,
              background: 'linear-gradient(90deg, rgba(0,168,150,0.15), rgba(0,168,150,0.05))',
            }}
          />
          <div className="absolute right-0 top-0 h-full w-1 bg-green-400 rounded-r-xl opacity-60" />

          {vendedores.map(v => {
            const pct = Math.min(100, (v.vendas / maxVal) * 100)
            const isMe = v.id === meuId
            return (
              <div
                key={v.id}
                className="absolute flex flex-col items-center"
                style={{ left: `calc(${pct}% - 20px)`, top: '-28px' }}
              >
                <p className={`text-[10px] font-bold mb-0.5 text-center whitespace-nowrap ${isMe ? 'text-blue-600' : 'text-slate-600'}`}>
                  {v.nome?.split(' ')[0]}
                  <br />
                  <span className={isMe ? 'text-blue-500' : 'text-slate-400'}>{formatVendas(v.vendas)}</span>
                </p>
                <RankingAvatar
                  nome={v.nome}
                  foto={v.foto}
                  size={36}
                  gradient={isMe ? 'linear-gradient(135deg,var(--color-chart-2),var(--color-chart-2))' : undefined}
                  border={isMe ? '3px solid var(--color-chart-2)' : undefined}
                />
                {isMe && (
                  <span className="mt-0.5 text-[9px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded-full">VOCÊ</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex justify-between mt-1 px-0">
          <span className="text-[10px] text-slate-400">0%</span>
          <span className="text-[10px] text-slate-400">100%</span>
        </div>
      </div>
    </div>
  )
}

export default CorridaPeriodo

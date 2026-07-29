import { TrendingUp, Info } from 'lucide-react'
import { formatBRLWhole } from './formatBRLWhole'

type Props = {
  melhorMes: number
  comissaoAtual: number
}

export function PerformanceCard({ melhorMes, comissaoAtual }: Props) {
  const pct = melhorMes > 0 ? Math.round((comissaoAtual / melhorMes) * 100) : 0
  const atualPct = melhorMes > 0 ? Math.min(100, Math.round((comissaoAtual / melhorMes) * 100)) : 0

  return (
    <div className="rounded-2xl p-6" style={{ background: '#FFFFFF', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-gray-600 text-xs font-bold uppercase tracking-wide">Seu Desempenho</span>
        <Info className="w-3.5 h-3.5 text-slate-600" />
      </div>

      {melhorMes === 0 ? (
        <p className="text-gray-500 text-sm">Seu desempenho começará a aparecer conforme suas vendas forem registradas.</p>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 text-sm">Seu melhor mês</span>
                <span className="text-emerald-700 font-bold text-sm tabular-nums">{formatBRLWhole(melhorMes)}</span>
              </div>
              <div className="w-full rounded-full h-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-3 rounded-full" style={{ width: '100%', background: '#FFFFFF', }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 text-sm">Mês atual</span>
                <span className="text-blue-700 font-bold text-sm tabular-nums">{formatBRLWhole(comissaoAtual)}</span>
              </div>
              <div className="w-full rounded-full h-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-3 rounded-full" style={{ width: `${atualPct}%`, background: '#FFFFFF', }} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            <p className="text-gray-600 text-sm">
              Você está <span className="text-emerald-700 font-bold">{pct}%</span> do seu melhor resultado!
            </p>
          </div>
        </>
      )}
    </div>
  )
}

export default PerformanceCard

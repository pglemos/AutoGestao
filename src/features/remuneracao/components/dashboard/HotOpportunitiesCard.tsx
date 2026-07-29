import { Target, Users } from 'lucide-react'
import { formatBRLWhole } from './formatBRLWhole'

type Props = {
  qtdOportunidades: number
  comissaoPotencial: number
}

export function HotOpportunitiesCard({ qtdOportunidades, comissaoPotencial }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(59,130,246,0.2)',
        minHeight: '220px',
      }}
    >
      <div className="absolute top-4 right-4 opacity-80">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: '#FFFFFF', }}
        >
          <Target className="w-7 h-7 text-gray-800" />
        </div>
      </div>

      <div className="relative z-10 flex-1">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-3">Hoje você possui</p>

        {qtdOportunidades === 0 ? (
          <p className="text-gray-500 text-sm mt-2">Nenhuma oportunidade quente encontrada neste momento.</p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-bold" style={{ fontSize: '4rem', lineHeight: 1 }}>
                {qtdOportunidades}
              </span>
              <span className="text-blue-700 text-xl font-bold">oportunidades</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">que podem gerar</p>
            <p className="font-bold mt-1" style={{ fontSize: '2rem' }}>
              {formatBRLWhole(comissaoPotencial)}
            </p>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)' }}>
        <span className="text-gray-500 text-sm">Clientes quentes na sua carteira</span>
        <div className="flex items-center gap-2">
          <span className="text-blue-700 font-bold text-lg">{qtdOportunidades}</span>
          <Users className="w-4 h-4 text-blue-700" />
        </div>
      </div>
    </div>
  )
}

export default HotOpportunitiesCard

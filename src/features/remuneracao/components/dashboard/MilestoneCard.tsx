import { Trophy } from 'lucide-react'
import { formatBRLWhole } from './formatBRLWhole'

type Props = {
  veiculosFaltam: number
  valorProjetado: number
  percentual: number
  semDados: boolean
}

export function MilestoneCard({ veiculosFaltam, valorProjetado, percentual, semDados }: Props) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: 'hsl(var(--mx-color-surface))',
        border: '1px solid hsl(var(--mx-status-warning) / 0.2)',
      }}
    >
      <div className="absolute top-4 right-4 opacity-70">
        <Trophy className="w-14 h-14" style={{ color: 'var(--color-status-warning-text)', filter: 'drop-shadow(0 0 8px hsl(var(--mx-status-warning) / 0.5))' }} />
      </div>

      <div className="relative z-[var(--mx-z-sticky)]">
        {semDados ? (
          <div>
            <p className="text-muted-foreground text-sm font-semibold">Sem vendas no período</p>
            <p className="text-muted-foreground text-xs mt-1">Registre vendas para ver seu próximo marco financeiro.</p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-wide mb-2">Faltam</p>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-foreground" style={{ fontSize: '4rem', lineHeight: 1 }}>{veiculosFaltam}</span>
              <span className="text-status-warning-text text-2xl font-bold">veículo{veiculosFaltam !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">para você ganhar</p>
            <p className="font-bold mt-1" style={{ fontSize: '2rem', color: 'var(--color-status-warning-text)', }}>
              {formatBRLWhole(valorProjetado)}
            </p>

            <div className="mt-5">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-muted-foreground text-xs">Sua meta de comissão</span>
                <span className="text-muted-foreground text-xs font-semibold">{formatBRLWhole(valorProjetado)}</span>
              </div>
              <div className="w-full rounded-full h-2.5" style={{ background: 'var(--color-muted)' }}>
                <div
                  className="h-2.5 rounded-full transition-all duration-700"
                  style={{ width: `${percentual}%`, background: 'linear-gradient(90deg, var(--color-status-warning), var(--color-status-warning))', }}
                />
              </div>
              <p className="text-right text-status-warning-text text-xs font-bold mt-1">{percentual}%</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MilestoneCard

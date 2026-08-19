import { Crown } from 'lucide-react'
import { Avatar } from '@/components/atoms/Avatar'
import { cn } from '@/lib/utils'

type PodiumEntry = {
  user_id: string
  user_name: string
  avatar_url?: string | null
  position: number
  atingimento: number
}

type Props = {
  entries: PodiumEntry[]
  onSelect: (userId: string) => void
}

/**
 * Pódio de 3 vendedores (top 3) compartilhado entre GlobalRanking e StoreRanking.
 * Preserva visual: 2º à esquerda, 1º centro elevado, 3º à direita.
 */
export function RankingPodium({ entries, onSelect }: Props) {

  return (
    <div className="flex justify-center items-end gap-mx-sm sm:gap-mx-xl relative pt-4 min-h-48 sm:min-h-56 md:min-h-mx-64">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-full max-w-xs rounded-full bg-brand-primary/10 blur-mx-huge pointer-events-none sm:h-56 sm:max-w-lg md:h-mx-64"></div>

      {entries.map((seller) => {
        const isFirst = seller.position === 1
        const isSecond = seller.position === 2

        return (
          <div
            key={seller.user_id}
            role="button"
            tabIndex={0}
            aria-label={`Ver detalhes de ${seller.user_name}`}
            onClick={() => onSelect(seller.user_id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(seller.user_id)
              }
            }}
            className={`flex flex-col items-center group cursor-pointer transition-transform duration-500 hover:-translate-y-2 z-[var(--mx-z-sticky)] ${isFirst ? '-mb-4 sm:-mb-0' : ''}`}
          >
            <div className="relative mb-3 flex flex-col items-center">
              {isFirst && <Crown className="w-mx-lg h-mx-lg text-status-warning-text mb-2 drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]" />}
              <div className={`rounded-full p-mx-tiny transition-all ${isFirst ? 'bg-gradient-to-br from-brand-primary to-status-warning shadow-mx-glow-brand' : 'bg-white shadow-xl'}`}>
                <Avatar
                  src={seller.avatar_url || undefined}
                  alt={`Avatar de ${seller.user_name}`}
                  fallback={seller.user_name}
                  className={cn(
                    'rounded-full border-4',
                    'border-white',
                    isFirst
                      ? 'w-mx-20 h-mx-20 sm:w-mx-32 sm:h-mx-32'
                      : isSecond
                        ? 'w-mx-20 h-mx-20 sm:w-mx-20 sm:h-mx-20'
                        : 'w-mx-14 h-mx-14 sm:w-mx-20 sm:h-mx-20',
                  )}
                />
              </div>
              <div className={cn(
                'absolute -bottom-3 px-3 py-1 rounded-full text-mx-micro font-bold uppercase tracking-wider shadow-lg border border-white/20 whitespace-nowrap z-[var(--mx-z-sticky)]',
                isFirst
                  ? 'bg-brand-primary text-white'
                  : 'bg-surface-alt text-foreground',
              )}>
                {isFirst ? '1º lugar' : `#${seller.position} lugar`}
              </div>
            </div>
            <div className={`w-mx-20 sm:w-mx-32 rounded-t-2xl backdrop-blur-md border-x border-t border-white/30 flex flex-col items-center justify-end pb-4 shadow-2xl relative overflow-hidden transition-all duration-700
              ${isFirst ? 'h-mx-64 bg-gradient-to-b from-brand-primary/80 to-brand-primary/5' : isSecond ? 'h-mx-48 bg-gradient-to-b from-border-strong/80 to-surface-alt/10' : 'h-mx-32 bg-gradient-to-b from-status-warning/60 to-status-warning/10'}`}>
              <div className={`font-display font-bold text-2xl sm:text-3xl mb-1 drop-shadow-sm ${isFirst ? 'text-mx-black' : 'text-foreground'}`}>{seller.atingimento}%</div>
              <div className={cn(
                'text-mx-nano sm:text-mx-micro uppercase font-bold tracking-wide sm:tracking-widest max-w-full text-center',
                isFirst ? 'text-brand-secondary' : 'text-muted-foreground',
              )}>
                <span className="sm:hidden">ATG</span>
                <span className="hidden sm:inline">ATINGIMENTO</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default RankingPodium

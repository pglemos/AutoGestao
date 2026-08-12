import { X } from 'lucide-react'
import { Avatar } from '@/components/atoms/Avatar'
import { BattleView } from '@/features/ranking/components/BattleView'
import type { RankingEntry } from '@/types/database'

type Props = {
  opponents: string[]
  ranking: RankingEntry[]
  onToggle: (id: string) => void
  onClear: () => void
  showStoreName?: boolean
}

/**
 * Tab "Comparativo" do Ranking — grid de seleção de vendedores + BattleView.
 * Compartilhado entre GlobalRanking (showStoreName=true) e StoreRanking.
 */
export function BattleSelector({
  opponents, ranking, onToggle, onClear, showStoreName = true,
}: Props) {
  return (
    <div className="animate-slide-up">
      {opponents.length < 2 && (
        <div className="mb-8 text-center animate-pulse">
          <p className="text-sm font-bold text-muted-foreground bg-white/50 inline-block px-4 py-2 rounded-full border border-white/60 shadow-sm">
            Selecione {2 - opponents.length} {2 - opponents.length === 1 ? 'vendedor' : 'vendedores'} abaixo para iniciar o comparativo
          </p>
        </div>
      )}

      <div className="relative mb-10">
        {opponents.length > 0 && (
          <button
            type="button"
            aria-label="Limpar seleção de vendedores"
            onClick={onClear}
            className="absolute top-mx-0 right-mx-0 z-50 p-mx-xs bg-white/10 text-muted-foreground hover:text-status-error hover:bg-status-error-surface rounded-full transition-colors"
          >
            <X className="w-mx-sm h-mx-sm" />
          </button>
        )}
        <BattleView opponents={opponents} ranking={ranking} />
      </div>

      <h3 className="font-display font-bold text-lg text-mx-black mb-4 px-2">Escolha os vendedores</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-mx-md">
        {ranking.map(seller => {
          const selected = opponents.includes(seller.user_id)
          return (
            <button
              type="button"
              key={seller.user_id}
              onClick={() => onToggle(seller.user_id)}
              aria-pressed={selected}
              className={`p-mx-md rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-mx-sm relative overflow-hidden group active:scale-95
                ${selected ? 'bg-gray-900 border-brand-primary shadow-xl scale-105' : 'bg-white/40 border-white/40 hover:bg-white hover:border-white'}`}
            >
              <Avatar
                src={seller.avatar_url || undefined}
                alt={`Avatar de ${seller.user_name}`}
                fallback={seller.user_name}
                className={`w-mx-14 h-mx-14 rounded-full border-2 shadow-sm ${selected ? 'border-brand-primary' : 'border-white'}`}
              />
              <span className={`font-bold text-xs ${selected ? 'text-white' : 'text-mx-black'} truncate w-full`}>{seller.user_name}</span>
              {showStoreName && (
                <span className="text-mx-micro text-muted-foreground truncate w-full">{seller.store_name}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default BattleSelector

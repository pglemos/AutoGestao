import { motion } from 'motion/react'
import { Building2, RefreshCw, X } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { StoreBattleView } from '@/features/ranking/components/StoreBattleView'
import type { NetworkMetric } from '@/hooks/useNetworkPerformance'
import { cn } from '@/lib/utils'

type StoreMetric = NetworkMetric['byStore'][number]

type Props = {
  loading: boolean
  opponents: string[]
  stores: StoreMetric[]
  onToggle: (id: string) => void
  onClear: () => void
}

/**
 * Tab "Comparativo Lojas" do GlobalRanking — grid de seleção de lojas + StoreBattleView.
 */
export function StoreArenaSelector({ loading, opponents, stores, onToggle, onClear }: Props) {
  if (loading) {
    return (
      <div className="animate-slide-up">
        <div className="flex flex-col items-center justify-center py-16">
          <RefreshCw className="w-mx-xl h-mx-xl animate-spin text-status-success-text mb-4" />
          <Typography variant="caption" tone="muted">Consolidando indicadores das lojas...</Typography>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      {opponents.length < 2 && (
        <div className="mb-8 text-center animate-pulse">
          <p className="text-sm font-bold text-muted-foreground bg-white/50 inline-block px-4 py-2 rounded-full border border-white/60 shadow-sm">
            Selecione {2 - opponents.length} {2 - opponents.length === 1 ? 'loja' : 'lojas'} abaixo para iniciar o comparativo de lojas
          </p>
        </div>
      )}

      <div className="relative mb-10">
        {opponents.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Limpar seleção de lojas"
            className="absolute top-mx-0 right-mx-0 z-50 p-mx-xs bg-white/10 text-muted-foreground hover:text-status-error-text hover:bg-status-error-surface rounded-full transition-colors"
          >
            <X className="w-mx-sm h-mx-sm" />
          </button>
        )}
        <StoreBattleView opponents={opponents} lojas={stores} />
      </div>

      <h3 className="font-display font-bold text-lg text-mx-black mb-4 px-2 flex items-center gap-mx-sm">
        <Building2 size={20} className="text-status-success-text" /> Selecione as lojas para o duelo
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-mx-md">
        {stores.map(store => {
          const selected = opponents.includes(store.storeId)
          const reachingTone = store.reaching >= 100 ? 'text-status-success-text' : store.reaching >= 80 ? 'text-status-warning-text' : 'text-status-error-text'
          return (
            <motion.button
              key={store.storeId}
              onClick={() => onToggle(store.storeId)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              aria-pressed={selected}
              className={cn(
                'p-mx-md rounded-2xl border-2 transition-all flex flex-col items-center gap-mx-sm relative overflow-hidden text-center',
                selected ? 'bg-gray-900 border-brand-primary shadow-sm scale-105' : 'bg-white/60 border-border hover:bg-white hover:border-brand-primary/40'
              )}
            >
              <div className={cn(
                'w-mx-14 h-mx-14 rounded-2xl flex items-center justify-center border-2 shrink-0',
                selected ? 'bg-brand-primary/20 border-brand-primary text-status-success-text' : 'bg-gray-50 border-border text-muted-foreground'
              )}>
                <Building2 size={22} />
              </div>
              <span className={cn('font-bold text-xs uppercase truncate w-full', selected ? 'text-white' : 'text-mx-black')}>
                {store.storeName}
              </span>
              <span className={cn('font-display font-bold text-lg tabular-nums', selected ? 'text-status-success-text' : reachingTone)}>{store.reaching}%</span>
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-mx-xs right-mx-xs w-mx-md h-mx-md rounded-full bg-brand-primary flex items-center justify-center"
                >
                  <span className="text-mx-black font-bold text-xs">{opponents.indexOf(store.storeId) + 1}</span>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

export default StoreArenaSelector

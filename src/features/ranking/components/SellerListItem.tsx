import { motion } from 'motion/react'
import { Building2, Crown, Flame, Swords, TrendingUp } from 'lucide-react'
import { Card } from '@/components/molecules/Card'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { cn } from '@/lib/utils'

type SellerEntry = {
  user_id: string
  user_name: string
  store_name?: string
  position: number
  vnd_total: number
  meta: number
  ritmo: number
  atingimento: number
}

type Props = {
  seller: SellerEntry
  index: number
  isMe: boolean
  isBattleSelected: boolean
  showStoreName?: boolean
  onSelect: (userId: string) => void
  onToggleOpponent: (userId: string) => void
}

/**
 * Item de lista de ranking — usado tanto no Global quanto no Store.
 * Quando `showStoreName=false` (StoreRanking), oculta linha da loja.
 */
export function SellerListItem({
  seller, index, isMe, isBattleSelected, showStoreName = true,
  onSelect, onToggleOpponent,
}: Props) {
  const isTop1 = seller.position === 1

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.01 }}
      onClick={() => onSelect(seller.user_id)}
      className="w-full max-w-full min-w-0 cursor-pointer transition-transform"
    >
      <Card className={cn(
        "p-mx-lg md:p-mx-xl w-full max-w-full min-w-0 flex flex-col lg:flex-row lg:items-center gap-mx-md lg:gap-mx-10 border-none shadow-sm transition-all relative overflow-hidden",
        isTop1 ? "bg-gray-900 text-white shadow-sm ring-2 ring-mx-amber-400 ring-offset-4" :
          isMe ? "bg-mx-indigo-50 border-2 border-brand-primary shadow-sm" : "bg-white"
      )}>
        <div className="flex items-start sm:items-center gap-mx-md sm:gap-mx-lg flex-1 min-w-0 max-w-full">
          <div className={cn(
            "w-mx-14 h-mx-14 sm:w-mx-20 sm:h-mx-header rounded-2xl border-4 flex items-center justify-center font-bold text-xl sm:text-3xl shadow-sm shrink-0",
            isTop1 ? "bg-mx-amber-400 border-mx-amber-300 text-mx-black rotate-3 scale-110" : "bg-gray-50 border-white text-foreground"
          )}>
            {isTop1 ? <Crown size={32} fill="currentColor" /> : <span>#{seller.position}</span>}
          </div>
          <div className="min-w-0 flex-1 space-y-mx-xs">
            <div className="flex flex-wrap items-center gap-mx-xs sm:gap-mx-sm min-w-0">
              <Typography variant="h2" tone={isTop1 ? 'white' : 'default'} className="min-w-0 max-w-full truncate text-xl sm:text-2xl md:text-3xl tracking-tight">{seller.user_name}</Typography>
              {isTop1 && <Badge variant="warning" className="animate-pulse px-3 text-mx-nano sm:text-xs">LÍDER</Badge>}
              {seller.atingimento >= 100 && !isTop1 && <Badge variant="success" className="px-3 text-mx-nano sm:text-xs"><Flame size={12} className="mr-1 inline-block" /> META BATIDA</Badge>}
              {isMe && !isTop1 && <Badge variant="brand" className="px-3 text-mx-nano sm:text-xs">VOCÊ</Badge>}
            </div>
            {showStoreName && (
              <div className="flex items-center gap-mx-xs mb-mx-xs">
                <Building2 size={12} className={cn("shrink-0", isTop1 ? 'text-white/60' : 'text-muted-foreground')} />
                <Typography variant="tiny" tone={isTop1 ? 'white' : 'muted'} className="truncate font-bold">{seller.store_name}</Typography>
              </div>
            )}
            <div className={cn("flex flex-wrap items-center gap-mx-md sm:gap-mx-10", showStoreName && "pt-2")}>
              <div className="flex flex-col">
                <Typography variant="caption" tone={isTop1 ? 'white' : 'muted'} className="text-mx-nano sm:text-mx-micro">Vendas</Typography>
                <Typography variant="h2" tone={isTop1 ? 'white' : 'default'} className="text-lg sm:text-2xl font-mono-numbers">{seller.vnd_total} v</Typography>
              </div>
              <div className="w-px h-mx-lg bg-current opacity-10 hidden sm:block" />
              <div className="flex flex-col">
                <Typography variant="caption" tone={isTop1 ? 'white' : 'muted'} className="text-mx-nano sm:text-mx-micro">Objetivo</Typography>
                <Typography variant="h2" tone={isTop1 ? 'white' : 'default'} className="text-lg sm:text-2xl font-mono-numbers">{seller.meta} v</Typography>
              </div>
              <div className="w-px h-mx-lg bg-current opacity-10 hidden sm:block" />
              <div className="flex flex-col">
                <Typography variant="caption" tone={isTop1 ? 'white' : 'muted'} className="text-mx-nano sm:text-mx-micro">Ritmo</Typography>
                <Typography variant="h2" tone={isTop1 ? 'white' : 'default'} className="text-lg sm:text-2xl font-mono-numbers">{seller.ritmo} v/d</Typography>
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-mx-md lg:gap-mx-10 shrink-0 mt-6 lg:mt-0 border-t lg:border-none border-current border-opacity-10 pt-6 lg:pt-0 w-full lg:w-auto max-w-full">
          <div className="text-left lg:text-right">
            <Typography variant="caption" tone={isTop1 ? 'white' : 'muted'} className="text-mx-micro mb-1">Atingimento</Typography>
            <div className="flex items-center gap-mx-sm">
              <Typography variant="h1" tone={isTop1 ? 'white' : 'brand'} className="text-4xl sm:text-5xl font-mono-numbers tracking-tighter leading-none">{seller.atingimento}%</Typography>
              <div className={cn(
                "w-mx-2xl h-mx-2xl rounded-2xl flex items-center justify-center border shadow-none shrink-0",
                isTop1 ? "bg-white/10 border-white/20 text-white" : "bg-gray-50 border-border text-status-success-text"
              )}>
                <TrendingUp size={28} className={cn(seller.atingimento < 50 && "rotate-180 text-status-error")} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleOpponent(seller.user_id) }}
            aria-label={`Comparar ${seller.user_name}`}
            className={`ml-0 sm:ml-4 p-mx-sm rounded-xl transition-all border group/btn sm:hover:scale-110 active:scale-95 w-full sm:w-auto flex items-center justify-center ${isBattleSelected ? 'bg-brand-primary border-brand-primary text-mx-black shadow-mx-glow-brand' : 'bg-gray-50 border-border text-muted-foreground hover:border-brand-primary hover:text-status-success-text'}`}
            title="Comparar vendedor"
          >
            <Swords className="w-mx-sm h-mx-sm" />
          </button>
        </div>
      </Card>
    </motion.li>
  )
}

export default SellerListItem

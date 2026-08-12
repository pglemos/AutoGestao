import { Building2, Eye, EyeOff, RefreshCw, Swords, Trophy } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Typography } from '@/components/atoms/Typography'
import { LastUpdated } from '@/components/molecules/LastUpdated'
import { cn } from '@/lib/utils'

export type GlobalViewMode = 'leaderboard' | 'battle' | 'store-arena'

type Props = {
  totalLojas: number
  totalVendedores: number
  filteredCount: number
  viewMode: GlobalViewMode
  onChangeViewMode: (mode: GlobalViewMode) => void
  hideStoreNames: boolean
  onToggleHideStoreNames: () => void
  onRefresh: () => void
  isRefetching: boolean
  lastUpdatedAt: Date | null
}

/**
 * Cabeçalho do GlobalRanking — título, contadores, toggle de modo
 * (Ranking / Comparativo / Comparativo Lojas), botões de privacidade
 * e refresh. Visual preservado do Ranking.tsx original.
 */
export function GlobalRankingHeader({
  totalLojas, totalVendedores, filteredCount,
  viewMode, onChangeViewMode,
  hideStoreNames, onToggleHideStoreNames,
  onRefresh, isRefetching, lastUpdatedAt,
}: Props) {
  const activeTabClass = 'bg-emerald-600 text-white shadow-sm'

  return (
    <header data-mx-module-header="" className="flex min-w-0 shrink-0 flex-col justify-between gap-mx-lg rounded-2xl border border-border-subtle bg-white p-5 shadow-sm 2xl:flex-row 2xl:items-center">
      <div className="flex flex-col gap-mx-tiny text-center lg:text-left">
        <div className="flex items-center justify-center lg:justify-start gap-mx-sm">
          <Typography variant="h1">Ranking <span className="text-mx-green-700">Global</span></Typography>
        </div>
        <Typography variant="caption" className="pl-mx-md">
          {totalLojas} UNIDADES • {totalVendedores} VENDEDORES • PERFORMANCE EM TEMPO REAL
        </Typography>
      </div>

      <div className="flex min-w-0 flex-col items-center gap-mx-sm shrink-0 w-full sm:flex-row sm:flex-wrap sm:justify-center 2xl:w-auto 2xl:justify-end">
        <div className="grid grid-cols-1 sm:flex w-full sm:w-auto bg-white p-1.5 rounded-2xl border border-border shadow-sm mr-0 sm:mr-4 gap-mx-xs" role="tablist" aria-label="Modo da classificação">
          <button type="button" role="tab" aria-selected={viewMode === 'leaderboard'} onClick={() => onChangeViewMode('leaderboard')} className={cn('px-4 py-2 rounded-xl text-mx-tiny font-bold uppercase tracking-wider transition-all flex items-center justify-center whitespace-nowrap gap-mx-xs', viewMode === 'leaderboard' ? activeTabClass : 'text-muted-foreground hover:bg-white/60')}>
            <Trophy size={14} /> Ranking
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'battle'} onClick={() => onChangeViewMode('battle')} className={cn('px-4 py-2 rounded-xl text-mx-tiny font-bold uppercase tracking-wider transition-all flex items-center justify-center whitespace-nowrap gap-mx-xs', viewMode === 'battle' ? activeTabClass : 'text-muted-foreground hover:bg-white/60')}>
            <Swords size={14} /> Comparativo
          </button>
          <button type="button" role="tab" aria-selected={viewMode === 'store-arena'} onClick={() => onChangeViewMode('store-arena')} className={cn('px-4 py-2 rounded-xl text-mx-tiny font-bold uppercase tracking-wider transition-all flex items-center justify-center whitespace-nowrap gap-mx-xs', viewMode === 'store-arena' ? activeTabClass : 'text-muted-foreground hover:bg-white/60')}>
            <Building2 size={14} /> Comparativo Lojas
          </button>
        </div>

        <div className="order-1 flex w-full min-w-0 flex-wrap items-center justify-center gap-mx-sm sm:order-none 2xl:w-auto 2xl:justify-end">
          <LastUpdated value={lastUpdatedAt} className="hidden 2xl:inline-flex" />
          <Button
            variant="outline"
            onClick={onToggleHideStoreNames}
            aria-label={hideStoreNames ? 'Mostrar lojas' : 'Ocultar lojas'}
            title={hideStoreNames ? 'Mostrar lojas' : 'Ocultar lojas'}
            className="h-mx-xl bg-white px-mx-md"
          >
            {hideStoreNames ? <EyeOff size={20} /> : <Eye size={20} />}
            {hideStoreNames ? 'Mostrar lojas' : 'Ocultar lojas'}
          </Button>
          <Button variant="outline" onClick={onRefresh} aria-label="Atualizar ranking global" className="h-mx-xl bg-white px-mx-md">
            <RefreshCw size={20} className={cn(isRefetching && 'animate-spin')} />
            Atualizar
          </Button>
          <div className="flex-1 sm:flex-none flex items-center justify-center gap-mx-sm bg-white border border-border px-6 h-mx-xl rounded-mx-full shadow-sm">
            <Trophy size={18} className="text-status-warning shrink-0" />
            <Typography variant="caption" className="whitespace-nowrap text-mx-micro">{filteredCount} no ranking</Typography>
          </div>
        </div>
      </div>
    </header>
  )
}

export default GlobalRankingHeader

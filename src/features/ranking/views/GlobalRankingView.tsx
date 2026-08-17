import { Building2, Eye, EyeOff, RefreshCw, Swords, Trophy } from 'lucide-react'
import { SellerProfileModal } from '@/features/ranking/components/SellerProfileModal'
import { RankingErrorBoundary } from '@/features/ranking/components/RankingErrorBoundary'
import { GlobalStatsCards } from '@/features/ranking/sections/GlobalStatsCards'
import { GlobalFiltersBar } from '@/features/ranking/sections/GlobalFiltersBar'
import { BattleSelector } from '@/features/ranking/sections/BattleSelector'
import { StoreArenaSelector } from '@/features/ranking/sections/StoreArenaSelector'
import { LeaderboardList } from '@/features/ranking/sections/LeaderboardList'
import { useGlobalRankingPageData } from '@/features/ranking/hooks/useGlobalRankingPageData'
import { Button } from '@/components/atoms/Button'
import { MxLoadingState, MxModuleHeader, MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
import { TabNavPill, type TabNavPillItem } from '@/components/molecules/TabNavPill'
import { LastUpdated } from '@/components/molecules/LastUpdated'
import { cn } from '@/lib/utils'

const VIEW_MODE_TABS: TabNavPillItem[] = [
  { key: 'leaderboard', label: 'Ranking', icon: Trophy },
  { key: 'battle', label: 'Comparativo', icon: Swords },
  { key: 'store-arena', label: 'Comparativo Lojas', icon: Building2 },
]

/**
 * Container slim do Ranking Global (perfis internos MX).
 * Orquestra header, stats, filtros, tabs (leaderboard/battle/store-arena)
 * e modal de profile via aggregator hook `useGlobalRankingPageData`.
 *
 * Story 2.3 — ADR-0050. Decompõe parte global de `src/pages/Ranking.tsx`.
 */
export function GlobalRankingView() {
  const data = useGlobalRankingPageData()

  if (data.loading) {
    return <MxModulePage bottomClearance="navigation"><MxLoadingState label="Consolidando ranking global" /></MxModulePage>
  }

  return (
    <RankingErrorBoundary sectionName="Ranking Global">
      <MxModulePage id="global-ranking" bottomClearance="navigation" className="min-h-full w-full min-w-0 pb-32">
        <MxModuleHeader
          title="Ranking Global"
          description={`${data.lojas.length} UNIDADES • ${data.totalVendedores} VENDEDORES • PERFORMANCE EM TEMPO REAL`}
          actions={(
            <div className="flex min-w-0 flex-wrap items-center gap-mx-sm">
              <TabNavPill
                tabs={VIEW_MODE_TABS}
                activeTab={data.viewMode}
                onTabChange={(tab) => data.setViewMode(tab as 'leaderboard' | 'battle' | 'store-arena')}
                aria-label="Modo da classificação"
              />

              <LastUpdated value={data.lastUpdatedAt} className="hidden 2xl:inline-flex" />
              <Button
                variant="outline"
                onClick={() => data.setHideStoreNames((current) => !current)}
                aria-label={data.hideStoreNames ? 'Mostrar lojas' : 'Ocultar lojas'}
                title={data.hideStoreNames ? 'Mostrar lojas' : 'Ocultar lojas'}
                className="h-mx-xl bg-white px-mx-md"
              >
                {data.hideStoreNames ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                {data.hideStoreNames ? 'Mostrar lojas' : 'Ocultar lojas'}
              </Button>
              <Button variant="outline" onClick={data.handleRefresh} aria-label="Atualizar ranking global" className="h-mx-xl bg-white px-mx-md">
                <RefreshCw size={20} className={cn(data.isRefetching && 'animate-spin')} aria-hidden="true" />
                Atualizar
              </Button>
              <div className="flex items-center gap-mx-sm bg-white border border-border px-6 h-mx-xl rounded-[var(--mx-card-radius)] shadow-sm">
                <Trophy size={20} className="text-status-warning-text shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap text-mx-micro">{data.filtered.length} no ranking</span>
              </div>
            </div>
          )}
        />

        <GlobalStatsCards
          totalVendas={data.totalVendas}
          totalLeads={data.totalLeads}
          totalAgd={data.totalAgd}
          totalVis={data.totalVis}
          totalVendedores={data.totalVendedores}
          checkinRate={data.checkinRate}
        />

        {data.error && (
          <div role="alert" className="rounded-2xl border border-status-error/20 bg-status-error-surface px-mx-md py-mx-sm text-sm font-bold text-status-error-text">
            {data.error}
          </div>
        )}

        <GlobalFiltersBar
          searchTerm={data.searchTerm}
          onSearchChange={data.setSearchTerm}
          lojas={data.lojas}
          filterStore={data.filterStore}
          onFilterStoreChange={data.setFilterStore}
          hideStoreNames={data.hideStoreNames}
          getHiddenStoreName={data.getHiddenStoreName}
        />

        <div className="min-w-0" aria-live="polite">
          {data.viewMode === 'battle' && (
            <BattleSelector
              opponents={data.battleOpponents}
              ranking={data.displayRanking}
              onToggle={data.toggleOpponent}
              onClear={() => data.setBattleOpponents([])}
              showStoreName
            />
          )}

          {data.viewMode === 'store-arena' && (
            <StoreArenaSelector
              loading={data.networkLoading}
              opponents={data.storeOpponents}
              stores={data.displayNetworkMetrics.byStore}
              onToggle={data.toggleStoreOpponent}
              onClear={() => data.setStoreOpponents([])}
            />
          )}

          {data.viewMode === 'leaderboard' && (
            <LeaderboardList
              ranking={data.displayRanking}
              podium={data.podiumOrder}
              currentUserId={data.profile?.id}
              battleOpponents={data.battleOpponents}
              showStoreName
              onSelect={data.setSelectedSeller}
              onToggleOpponent={(id) => {
                data.toggleOpponent(id)
                data.setViewMode('battle')
              }}
            />
          )}
        </div>

        {data.selectedSellerEntry && (
          <SellerProfileModal
            seller={data.selectedSellerEntry}
            onClose={() => data.setSelectedSeller(null)}
          />
        )}
      </MxModulePage>
    </RankingErrorBoundary>
  )
}

export default GlobalRankingView

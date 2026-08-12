import { SellerProfileModal } from '@/features/ranking/components/SellerProfileModal'
import { RankingErrorBoundary } from '@/features/ranking/components/RankingErrorBoundary'
import { RankingSkeleton } from '@/features/ranking/components/RankingSkeleton'
import { GlobalRankingHeader } from '@/features/ranking/sections/GlobalRankingHeader'
import { GlobalStatsCards } from '@/features/ranking/sections/GlobalStatsCards'
import { GlobalFiltersBar } from '@/features/ranking/sections/GlobalFiltersBar'
import { BattleSelector } from '@/features/ranking/sections/BattleSelector'
import { StoreArenaSelector } from '@/features/ranking/sections/StoreArenaSelector'
import { LeaderboardList } from '@/features/ranking/sections/LeaderboardList'
import { useGlobalRankingPageData } from '@/features/ranking/hooks/useGlobalRankingPageData'
import { PageCanvas } from '@/design-system/page'

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
    return <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="min-h-full"><RankingSkeleton ariaLabel="Consolidando ranking global" variant="global" /></PageCanvas>
  }

  return (
    <RankingErrorBoundary sectionName="Ranking Global">
      <PageCanvas as="div" width="dashboard" bottomClearance="navigation" className="relative flex min-h-full w-full min-w-0 flex-col gap-mx-lg bg-surface-alt pb-32">
        <GlobalRankingHeader
          totalLojas={data.lojas.length}
          totalVendedores={data.totalVendedores}
          filteredCount={data.filtered.length}
          viewMode={data.viewMode}
          onChangeViewMode={data.setViewMode}
          hideStoreNames={data.hideStoreNames}
          onToggleHideStoreNames={() => data.setHideStoreNames((current) => !current)}
          onRefresh={data.handleRefresh}
          isRefetching={data.isRefetching}
          lastUpdatedAt={data.lastUpdatedAt}
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
          <div role="alert" className="rounded-2xl border border-status-error/20 bg-status-error-surface px-mx-md py-mx-sm text-sm font-bold text-status-error">
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
      </PageCanvas>
    </RankingErrorBoundary>
  )
}

export default GlobalRankingView

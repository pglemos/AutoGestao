import { useMemo } from 'react'
import { useLojasPage } from './hooks/useLojasPage'
import { buildStoreColumns } from './data/storeColumns'
import { LojasErrorBoundary } from './components/LojasErrorBoundary'
import { LojasLoadingSkeleton } from './sections/LojasLoadingSkeleton'
import { LojasHeader } from './sections/LojasHeader'
import { OwnerExecutiveSection } from './sections/OwnerExecutiveSection'
import { CorporateMetricsSection } from './sections/CorporateMetricsSection'
import { StoresGridSection } from './sections/StoresGridSection'
import { CreateStoreModal } from './modals/CreateStoreModal'
import {
  MxModulePage,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'

export function Lojas() {
  const page = useLojasPage()

  const columns = useMemo(
    () =>
      buildStoreColumns({
        stats: page.stats,
        role: page.role,
        isOwner: page.isOwner,
        copyRegistrationLink: page.copyRegistrationLink,
        getRegistrationLink: page.getRegistrationLink,
        handleArchiveStore: page.handleArchiveStore,
        toggleStoreStatus: page.toggleStoreStatus,
      }),
    [
      page.stats,
      page.role,
      page.isOwner,
      page.copyRegistrationLink,
      page.getRegistrationLink,
      page.handleArchiveStore,
      page.toggleStoreStatus,
    ],
  )

  if (page.loading && !page.isRefetching) {
    return <LojasLoadingSkeleton />
  }

  return (
    <LojasErrorBoundary sectionName="Lojas">
      <MxModulePage>
        <LojasErrorBoundary sectionName="LojasHeader">
          <LojasHeader
            isOwner={page.isOwner}
            canManageNetwork={page.canManageNetwork}
            searchTerm={page.searchTerm}
            onSearchChange={page.setSearchTerm}
            filterActive={page.filterActive}
            onFilterChange={page.setFilterActive}
            storeStatusCounts={page.storeStatusCounts}
            isRefetching={page.isRefetching}
            lastUpdatedAt={page.lastUpdatedAt}
            onRefresh={page.handleRefresh}
            onOpenCreate={() => page.setIsCreateModalOpen(true)}
          />
        </LojasErrorBoundary>

        {page.copyError ? (
          <MxStatusBanner tone="warning" role="alert">
            {page.copyError}
          </MxStatusBanner>
        ) : null}

        {page.isOwner ? (
          <LojasErrorBoundary sectionName="OwnerExecutive">
            <OwnerExecutiveSection
              ownerActiveStores={page.ownerActiveStores}
              ownerAttentionStores={page.ownerAttentionStores}
              stats={page.stats}
            />
          </LojasErrorBoundary>
        ) : null}

        <LojasErrorBoundary sectionName="CorporateMetrics">
          <CorporateMetricsSection
            isOwner={page.isOwner}
            metrics={page.corporateMetrics}
          />
        </LojasErrorBoundary>

        <LojasErrorBoundary sectionName="StoresGrid">
          <StoresGridSection
            isOwner={page.isOwner}
            columns={columns}
            data={page.filteredStores}
          />
        </LojasErrorBoundary>

        <CreateStoreModal
          isOpen={page.isCreateModalOpen}
          modalRef={page.createModalRef}
          newStore={page.newStore}
          setNewStore={page.setNewStore}
          creating={page.creating}
          onSubmit={page.handleCreateStore}
          onClose={() => page.setIsCreateModalOpen(false)}
        />
      </MxModulePage>
    </LojasErrorBoundary>
  )
}

export default Lojas

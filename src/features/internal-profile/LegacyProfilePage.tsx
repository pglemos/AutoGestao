import { useCallback, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isAdministradorMx, isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { useStores } from '@/hooks/useStores'
import { StoreEditModal } from '@/features/admin/components/StoreEditModal'
import { StoreGoalsPanel } from '@/features/lojas/components/StoreGoalsPanel'
import { StoreTeamPanel } from '@/features/lojas/components/StoreTeamPanel'
import { ManagerTeamPerformance } from '@/features/manager/team/ManagerTeamPerformance'
import { ManagerStoreGoalReference } from '@/features/manager/meta/ManagerStoreGoalReference'
import { ManagerSellerParityHomeCanonical } from './sections/ManagerSellerParityHomeCanonical'
import { DashboardHeader, type DashboardTab } from './sections/DashboardHeader'
import { PerformanceTab } from './sections/PerformanceTab'
import { VendasFechadasLoja } from '@/features/vendas-loja/VendasFechadasLoja'
import { CreateStoreModal } from './sections/CreateStoreModal'
import {
  OwnerStoreUnavailable,
  PerformanceLoadingSkeleton,
  ResolvingStoreSpinner,
} from './sections/DashboardEmptyStates'
import { useDashboardLojaData } from './hooks/useDashboardLojaData'
import { useStoreResolution } from './hooks/useStoreResolution'
import { useStoreActions } from './hooks/useStoreActions'
import { DashboardErrorBoundary } from './components/DashboardErrorBoundary'

/**
 * Container do DashboardLoja — orquestra resolução de loja, routing por slug/query,
 * tabs (performance/metas/equipe), modais de admin e ErrorBoundaries por section.
 * Decomposição de `src/pages/DashboardLoja.tsx` (Story 2.5, ADR-0050).
 */
export function DashboardLoja() {
  const { setActiveStoreId } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { lojas, loading: storesLoading, createStore, updateStore, deleteStore, refetch: refetchStores } = useStores()
  const activeStores = useMemo(() => (lojas || []).filter(store => store.active), [lojas])

  const {
    role, isOwner, storeSlug, selectableStores,
    selectedStoreId, selectedStore,
    requestedStoreForbidden, storeResolutionIssue, resolving,
  } = useStoreResolution({ activeStores, storesLoading })

  const isAdminMx = isAdministradorMx(role)

  const [showAdminSettings, setShowAdminSettings] = useState(false)

  const activeTab = useMemo<DashboardTab>(() => {
    if (location.pathname === '/gerente/minha-equipe') return 'equipe'
    if (location.pathname === '/gerente/meta-loja') return 'metas'
    if (location.pathname === '/gerente/vendas') return 'vendas'
    const tab = new URLSearchParams(location.search).get('tab')
    return tab === 'metas' || tab === 'equipe' || tab === 'vendas' ? tab : 'performance'
  }, [location.pathname, location.search])
  const isFocusedRolePerformance = (isOwner || role === 'gerente') && activeTab === 'performance'
  const isManagerSection = role === 'gerente' && activeTab !== 'performance'

  const handleTabChange = useCallback((tab: DashboardTab) => {
    const params = new URLSearchParams(location.search)
    // ?id= eh redundante: o slug na URL ja identifica a loja unicamente
    params.delete('id')
    if (tab === 'performance') params.delete('tab')
    else params.set('tab', tab)
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' })
  }, [location.pathname, location.search, navigate])

  const data = useDashboardLojaData({
    selectedStoreId,
    selectedStoreName: selectedStore?.name || 'Unidade MX',
    managerCalendarMode: role === 'gerente' && activeTab === 'performance',
  })

  const handleManagerStoreChange = useCallback((storeId: string) => {
    setActiveStoreId(storeId)
  }, [setActiveStoreId])

  const onRefetchAll = useCallback(async () => {
    await Promise.all([refetchStores(), data.refetchStoreGoal()])
  }, [data, refetchStores])

  const actions = useStoreActions({
    selectedStoreId, selectedStore, storeSlug, role,
    updateStore, createStore, deleteStore, refetchStores,
    refetchSettings: data.fetchSettings,
  })

  // ───── early returns ─────
  if (!resolving && !storesLoading && requestedStoreForbidden && !isOwner) {
    return <Navigate to="/classificacao" replace />
  }
  if (!resolving && !storesLoading && isOwner && (requestedStoreForbidden || storeResolutionIssue || !selectedStoreId)) {
    return <OwnerStoreUnavailable requestedStoreForbidden={requestedStoreForbidden} storeResolutionIssue={storeResolutionIssue} />
  }
  if (!resolving && !storesLoading && role === 'gerente' && activeTab === 'performance' && !selectedStoreId) {
    return (
      <main className="h-full w-full overflow-y-auto bg-surface-alt no-scrollbar">
        <ManagerSellerParityHomeCanonical data={data} alerts={[]} />
      </main>
    )
  }
  if (!resolving && !storesLoading && !selectedStoreId && (isPerfilInternoMx(role) || role === 'dono')) {
    return <Navigate to="/lojas" replace />
  }
  if (resolving || (storesLoading && isPerfilInternoMx(role) && !selectedStoreId)) {
    return <ResolvingStoreSpinner />
  }
  if (activeTab === 'performance' && data.loading && !data.isRefetching) {
    return <PerformanceLoadingSkeleton />
  }

  return (
  <main className={`h-full w-full overflow-y-auto no-scrollbar ${isFocusedRolePerformance ? role === 'gerente' ? 'bg-surface-alt' : 'bg-seller-screen-bg' : isManagerSection ? 'bg-surface-alt' : 'bg-surface-alt p-mx-lg'}`}>
      {!isFocusedRolePerformance && !isManagerSection && (
        <DashboardErrorBoundary sectionName="Header">
          <DashboardHeader
            role={role}
            isOwner={isOwner}
            storeName={data.metrics.storeName}
            selectedStoreId={selectedStoreId}
            selectableStores={selectableStores}
            setActiveStoreId={setActiveStoreId}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            isRefetching={data.isRefetching}
            syncWarning={data.syncWarning}
            lastSyncAt={data.lastSyncAt}
            lastSyncLabel={data.lastSyncLabel}
            onRefresh={data.handleRefresh}
            viewMode={data.viewMode}
            setViewMode={data.setViewMode}
            referenceDate={data.referenceDate}
            startDate={data.startDate}
            setStartDate={data.setStartDate}
            endDate={data.endDate}
            setEndDate={data.setEndDate}
          />
        </DashboardErrorBoundary>
      )}

      {activeTab === 'metas' ? (
        role === 'gerente'
          ? <ManagerStoreGoalReference data={data} />
          : <StoreGoalsPanel storeId={selectedStoreId} storeName={data.metrics.storeName} />
      ) : activeTab === 'equipe' ? (
        role === 'gerente'
          ? <ManagerTeamPerformance data={data} storeName={data.metrics.storeName} selectableStores={selectableStores} onStoreChange={setActiveStoreId} />
          : <StoreTeamPanel storeId={selectedStoreId} storeName={data.metrics.storeName} />
      ) : activeTab === 'vendas' ? (
        <VendasFechadasLoja
          storeId={selectedStoreId}
          showManagerHeader={role === 'gerente'}
          selectableStores={selectableStores}
          onStoreChange={setActiveStoreId}
        />
      ) : selectedStoreId ? (
        <PerformanceTab
          role={role}
          isOwner={isOwner}
          isAdminMx={isAdminMx}
          selectedStoreId={selectedStoreId}
          selectedStore={selectedStore}
          selectableStores={selectableStores}
          onManagerStoreChange={handleManagerStoreChange}
          data={data}
          showAdminSettings={showAdminSettings}
          onToggleAdminSettings={() => setShowAdminSettings(v => !v)}
          onOpenStoreEdit={() => actions.setStoreEditOpen(true)}
          onNavigateLojas={() => navigate('/lojas')}
          onDeleteStore={actions.handleDeleteStore}
          deletingStore={actions.deletingStore}
          onRefetchAll={onRefetchAll}
        />
      ) : null}

      <StoreEditModal
        open={actions.storeEditOpen}
        store={selectedStore}
        saving={actions.savingStore}
        onClose={() => actions.setStoreEditOpen(false)}
        onSubmit={actions.handleStoreUpdate}
      />

      <CreateStoreModal
        open={actions.createStoreOpen}
        newStore={actions.newStore}
        setNewStore={actions.setNewStore}
        creating={actions.creatingStore}
        onClose={() => actions.setCreateStoreOpen(false)}
        onSubmit={actions.handleCreateStore}
      />
    </main>
  )
}

export default DashboardLoja

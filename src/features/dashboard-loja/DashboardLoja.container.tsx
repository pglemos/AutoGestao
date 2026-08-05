import { useCallback, useMemo, useState } from 'react'
import { ConditionalPageCanvas } from '@/design-system/page'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { isAdministradorMx, isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { useStores } from '@/hooks/useStores'
import { slugify } from '@/lib/utils'
import { openInNewTab } from '@/lib/ui/openInNewTab'
import { StoreEditModal } from '@/features/admin/components/StoreEditModal'
import { StoreGoalsPanel } from '@/features/lojas/components/StoreGoalsPanel'
import { StoreTeamPanel } from '@/features/lojas/components/StoreTeamPanel'
import { ManagerTeamPerformance } from '@/features/manager/team/ManagerTeamPerformance'
import { ManagerStoreGoalReference } from '@/features/manager/meta/ManagerStoreGoalReference'
import { ManagerSellerParityHomeCanonical } from './sections/ManagerSellerParityHomeCanonical'
import { DashboardHeader, type DashboardTab } from './sections/DashboardHeader'
import { PerformanceTab } from './sections/PerformanceTab'
import { CreateStoreModal } from '@/components/organisms/CreateStoreModal'
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
    if (location.pathname === '/minha-equipe') return 'equipe'
    if (location.pathname === '/meta-loja') return 'metas'
    const tab = new URLSearchParams(location.search).get('tab')
    return tab === 'metas' || tab === 'equipe' ? tab : 'performance'
  }, [location.pathname, location.search])
  const isFocusedRolePerformance = (isOwner || role === 'gerente') && activeTab === 'performance'
  /**
   * O kanban de equipe é a visão canônica de "Minha Equipe" e não pertence só ao
   * gerente: o dono acompanha a mesma tela 1:1, com seletor de unidade quando tem
   * mais de uma loja no escopo. Perfis internos MX seguem no painel de cadastro
   * (`StoreTeamPanel`), que é a ferramenta operacional de vínculo de integrantes.
   */
  const isTeamKanban = activeTab === 'equipe' && (role === 'gerente' || isOwner)
  /**
   * A Meta da Loja tem cabeçalho próprio (período, unidade, atualizar, metas).
   *
   * A tela canônica é a mesma para todo perfil de gestão — gerente, dono e
   * perfis internos MX. O interno ganha, abaixo dela, o painel de regras da
   * loja (meta mensal e benchmarks), que é ferramenta de cadastro e não existe
   * na referência.
   */
  const isStoreGoalScreen = activeTab === 'metas'
  const isManagerSection = (role === 'gerente' && activeTab !== 'performance') || isTeamKanban || isStoreGoalScreen

  /**
   * Gestão de filiais abre em aba nova: o admin costuma comparar o cadastro do
   * grupo com o dashboard da matriz, e perder o dashboard no meio da conferência
   * era o comportamento anterior (navegação no mesmo histórico para `/lojas`).
   */
  const handleManageBranches = useCallback(() => {
    if (!selectedStore) return
    openInNewTab(`/lojas/${slugify(selectedStore.name)}/filiais`)
  }, [selectedStore])

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
      <div className="h-full w-full overflow-y-auto bg-gray-50 no-scrollbar">
        <ManagerSellerParityHomeCanonical data={data} alerts={[]} />
      </div>
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
  /*
   * A margem lateral vinha de um ternário na raiz: `p-mx-lg` só no caso
   * default, nada para `isManagerSection` nem para `isFocusedRolePerformance`,
   * na expectativa de que as seções internas fornecessem a sua. Em
   * /vendas nenhuma fornecia, e o título encostava na borda da área de
   * conteúdo — medido em 0px de respiro por scripts/audit-page-gutters.mjs.
   *
   * `isFocusedRolePerformance` segue sem canvas de propósito: aquele ramo
   * renderiza componentes de performance que já trazem o próprio recuo, e
   * envolvê-los somaria as duas margens.
   */
  <div className="h-full w-full overflow-y-auto bg-gray-50 no-scrollbar">
    <ConditionalPageCanvas enabled={!isFocusedRolePerformance}>
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
        <>
          <ManagerStoreGoalReference data={data} selectableStores={selectableStores} onStoreChange={setActiveStoreId} />
          {isPerfilInternoMx(role) && (
            /**
             * Regras da loja (meta mensal e benchmarks lead→agendamento→visita
             * →venda) só aparecem para o perfil interno MX: é cadastro, não
             * acompanhamento. As metas individuais já vivem dentro da tela
             * canônica, no botão "Editar Metas".
             */
            <div className="mx-auto max-w-7xl px-4 pb-24">
              <StoreGoalsPanel storeId={selectedStoreId} storeName={data.metrics.storeName} />
            </div>
          )}
        </>
      ) : activeTab === 'equipe' ? (
        isTeamKanban
          ? <ManagerTeamPerformance data={data} storeName={data.metrics.storeName} selectableStores={selectableStores} onStoreChange={setActiveStoreId} />
          : <StoreTeamPanel storeId={selectedStoreId} storeName={data.metrics.storeName} />
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
          onManageBranches={handleManageBranches}
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
    </ConditionalPageCanvas>
    </div>
  )
}

export default DashboardLoja

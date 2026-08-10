import { isPerfilInternoMx } from '@/hooks/useAuth'
import type { UserRole, Store } from '@/types/database'
import { DashboardErrorBoundary } from '../components/DashboardErrorBoundary'
import { KpisSection } from './KpisSection'
import { PerformanceAlerts, usePerformanceAlerts } from './PerformanceAlerts'
import { FunnelSection } from './FunnelSection'
import { RankingSection } from './RankingSection'
import { AdminSettingsCard } from './AdminSettingsCard'
import { AdminLiveOperationsPanel } from './AdminLiveOperationsPanel'
import { OwnerExecutiveCockpit } from './OwnerExecutiveCockpit'
import { ManagerSellerParityHomeCanonical } from './ManagerSellerParityHomeCanonical'
import type { useDashboardLojaData } from '../hooks/useDashboardLojaData'

type DashboardData = ReturnType<typeof useDashboardLojaData>

type PerformanceTabProps = {
  role: UserRole | null
  isOwner: boolean
  isAdminMx: boolean
  selectedStoreId: string
  selectedStore: Store | null
  selectableStores: Store[]
  onManagerStoreChange: (storeId: string) => void
  data: DashboardData
  showAdminSettings: boolean
  onToggleAdminSettings: () => void
  onOpenStoreEdit: () => void
  onManageBranches: () => void
  onDeleteStore: () => void
  deletingStore: boolean
  onRefetchAll: () => Promise<void>
}

export function PerformanceTab({
  role,
  isOwner,
  isAdminMx,
  selectedStoreId,
  selectedStore,
  selectableStores,
  onManagerStoreChange,
  data,
  showAdminSettings,
  onToggleAdminSettings,
  onOpenStoreEdit,
  onManageBranches,
  onDeleteStore,
  deletingStore,
  onRefetchAll,
}: PerformanceTabProps) {
  const { alerts, mixCanais } = usePerformanceAlerts({
    role,
    isOwner,
    metrics: data.metrics,
    sellers: data.sellers,
    checkins: data.checkins,
    funilData: data.funilData,
    funnelBenchmarks: data.funnelBenchmarks,
    selectedStoreId,
  })

  if (isOwner) {
    return (
      <DashboardErrorBoundary sectionName="OwnerExecutiveCockpit">
        <OwnerExecutiveCockpit data={data} alerts={alerts} />
      </DashboardErrorBoundary>
    )
  }

  if (role === 'gerente') {
    return (
      <DashboardErrorBoundary sectionName="ManagerSellerParityHomeCanonical">
        <ManagerSellerParityHomeCanonical
          data={data}
          alerts={alerts}
          selectableStores={selectableStores}
          onStoreChange={onManagerStoreChange}
        />
      </DashboardErrorBoundary>
    )
  }

  const performanceContent = (
    <>
      {isAdminMx && selectedStore && (
        <DashboardErrorBoundary sectionName="AdminSettings">
          <AdminSettingsCard
            selectedStoreId={selectedStoreId}
            selectedStore={selectedStore}
            operational={{
              store: data.operationalStore,
              deliveryRules: data.deliveryRules,
              benchmark: data.benchmark,
              metaRules: data.operationalMetaRules,
              loading: data.operationalLoading,
              fetchSettings: data.fetchSettings,
              saveSettings: data.saveSettings,
            }}
            storeGoalProjectionMode={data.storeGoal?.projection_mode}
            showAdminSettings={showAdminSettings}
            onToggleAdminSettings={onToggleAdminSettings}
            onOpenEdit={onOpenStoreEdit}
            onManageBranches={onManageBranches}
            onDelete={onDeleteStore}
            deletingStore={deletingStore}
            onRefetchAll={onRefetchAll}
          />
        </DashboardErrorBoundary>
      )}

      {isPerfilInternoMx(role) && (
        <DashboardErrorBoundary sectionName="AdminLiveOperations">
          <AdminLiveOperationsPanel
            storeId={selectedStoreId}
            referenceDate={data.referenceDate}
          />
        </DashboardErrorBoundary>
      )}

      <DashboardErrorBoundary sectionName="KPIs">
        <KpisSection
          role={role}
          isOwner={isOwner}
          metrics={data.metrics}
          funilData={data.funilData}
          funnelBenchmarks={data.funnelBenchmarks}
          referenceDate={data.referenceDate}
          sellers={data.sellers}
          pendingDisciplineSellers={data.pendingDisciplineSellers}
          latestDRE={data.latestDRE}
        />
      </DashboardErrorBoundary>

      {(isPerfilInternoMx(role) || role === 'dono') && (
        <DashboardErrorBoundary sectionName="PerformanceAlerts">
          <PerformanceAlerts role={role} isOwner={isOwner} alerts={alerts} />
        </DashboardErrorBoundary>
      )}

      <DashboardErrorBoundary sectionName="Funnel">
        <FunnelSection funilData={data.funilData} funnelBenchmarks={data.funnelBenchmarks} />
      </DashboardErrorBoundary>

      <DashboardErrorBoundary sectionName="Ranking">
        <RankingSection
          viewMode={data.viewMode}
          ranking={data.metrics.ranking}
          mixCanais={mixCanais}
          diagnostics={data.diagnostics}
        />
      </DashboardErrorBoundary>
    </>
  )

  if (isPerfilInternoMx(role)) {
    return (
      <div className="flex flex-col gap-5 text-gray-800">
        {performanceContent}
      </div>
    )
  }

  return performanceContent
}

export default PerformanceTab

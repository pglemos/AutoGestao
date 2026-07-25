import { useAdminPerformancePage } from '../hooks/useAdminPerformancePage'
import { AdminHeader } from '../sections/AdminHeader'
import { AdminKpiCards } from '../sections/AdminKpiCards'
import { AdminSellOutEvolution } from '../sections/AdminSellOutEvolution'
import { AdminHealthCard } from '../sections/AdminHealthCard'
import { AdminTopStoresList } from '../sections/AdminTopStoresList'
import { AdminGoalCompareChart } from '../sections/AdminGoalCompareChart'
import { AdminFunnelChart } from '../sections/AdminFunnelChart'
import { AdminPeopleChart } from '../sections/AdminPeopleChart'
import { AdminConsultingCard } from '../sections/AdminConsultingCard'
import { AdminStoreMatrixTable } from '../sections/AdminStoreMatrixTable'
import { SalesPerformanceErrorBoundary } from '../components/SalesPerformanceErrorBoundary'
import { ReportPageShell } from '@/features/internal-reports/ReportPageShell'
import { MxLoadingState } from '@/components/module/MxModuleVisualPrimitives'

export function AdminPerformanceView() {
  const {
    metrics,
    loading,
    isRefetching,
    topStores,
    roleData,
    funnelData,
    consultingData,
    hasHistoricalData,
    handleRefresh,
    handleExport,
    handleStoreClick,
  } = useAdminPerformancePage()

  if (loading) {
    return (
      <ReportPageShell
        title="Performance de vendas"
        description="Consolidando indicadores comerciais, projeções e comparativos da rede."
      >
        <MxLoadingState label="Carregando matriz executiva da rede" />
      </ReportPageShell>
    )
  }

  return (
    <ReportPageShell
      title="Performance de vendas"
      description="Indicadores comerciais, conversões, projeções e comparativos por unidade."
      header={(
        <AdminHeader
          metrics={metrics}
          isRefetching={isRefetching}
          onRefresh={handleRefresh}
          onExport={handleExport}
        />
      )}
    >
      <SalesPerformanceErrorBoundary sectionName="KPIs">
        <AdminKpiCards metrics={metrics} />
      </SalesPerformanceErrorBoundary>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <section className="min-w-0 xl:col-span-8">
          <SalesPerformanceErrorBoundary sectionName="Evolução Sell-out">
            <AdminSellOutEvolution metrics={metrics} hasHistoricalData={hasHistoricalData} />
          </SalesPerformanceErrorBoundary>
        </section>
        <aside className="min-w-0 xl:col-span-4">
          <AdminHealthCard metrics={metrics} />
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <SalesPerformanceErrorBoundary sectionName="Top Lojas">
          <AdminTopStoresList topStores={topStores} onStoreClick={handleStoreClick} />
        </SalesPerformanceErrorBoundary>
        <SalesPerformanceErrorBoundary sectionName="Comparativo Meta">
          <AdminGoalCompareChart topStores={topStores} />
        </SalesPerformanceErrorBoundary>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <SalesPerformanceErrorBoundary sectionName="Funil">
          <AdminFunnelChart funnelData={funnelData} metrics={metrics} />
        </SalesPerformanceErrorBoundary>
        <SalesPerformanceErrorBoundary sectionName="Pessoas">
          <AdminPeopleChart roleData={roleData} metrics={metrics} />
        </SalesPerformanceErrorBoundary>
        <SalesPerformanceErrorBoundary sectionName="Consultoria">
          <AdminConsultingCard consultingData={consultingData} metrics={metrics} />
        </SalesPerformanceErrorBoundary>
      </div>

      <SalesPerformanceErrorBoundary sectionName="Matriz de Lojas">
        <AdminStoreMatrixTable metrics={metrics} onStoreClick={handleStoreClick} />
      </SalesPerformanceErrorBoundary>
    </ReportPageShell>
  )
}

export default AdminPerformanceView

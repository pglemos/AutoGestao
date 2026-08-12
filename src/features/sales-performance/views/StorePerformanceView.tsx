import { RefreshCw } from 'lucide-react'
import { Typography } from '@/components/atoms/Typography'
import { useStorePerformancePage } from '../hooks/useStorePerformancePage'
import { StoreHeader } from '../sections/StoreHeader'
import { StoreKpiCards } from '../sections/StoreKpiCards'
import { StoreSellOutEvolution } from '../sections/StoreSellOutEvolution'
import { StoreHealthCard } from '../sections/StoreHealthCard'
import { SalesPerformanceErrorBoundary } from '../components/SalesPerformanceErrorBoundary'
import { PageTemplate } from '@/components/templates/PageTemplate'

export function StorePerformanceView() {
  const { loading, isRefetching, metrics, chartData, handleExport, handleRefresh } =
    useStorePerformancePage()

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-surface-alt">
        <RefreshCw className="w-mx-xl h-mx-xl animate-spin text-status-success-text mb-6" />
        <Typography variant="caption" tone="muted" className="animate-pulse">
          Calculando Matriz BI...
        </Typography>
      </div>
    )
  }

  return (
    <PageTemplate as="div" width="dashboard" className="flex flex-col gap-mx-lg">
      <StoreHeader
        isRefetching={isRefetching}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <SalesPerformanceErrorBoundary sectionName="KPIs">
        <StoreKpiCards metrics={metrics} />
      </SalesPerformanceErrorBoundary>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-mx-lg shrink-0 pb-32">
        <section className="lg:col-span-8">
          <SalesPerformanceErrorBoundary sectionName="Evolução Sell-out">
            <StoreSellOutEvolution chartData={chartData} />
          </SalesPerformanceErrorBoundary>
        </section>
        <aside className="lg:col-span-4 flex flex-col gap-mx-lg">
          <StoreHealthCard reaching={metrics.reaching} />
        </aside>
      </div>
    </PageTemplate>
  )
}

export default StorePerformanceView

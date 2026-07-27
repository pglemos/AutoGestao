import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { slugify } from '@/lib/utils'
import { MxErrorState, MxLoadingState, MxModulePage, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { NetworkDashboardHeader } from './components/NetworkDashboardHeader'
import { NetworkReportActions } from './components/NetworkReportActions'
import { NetworkMetricsSection } from './sections/NetworkMetricsSection'
import { NetworkFiltersSection } from './sections/NetworkFiltersSection'
import { NetworkPrioritiesSection } from './sections/NetworkPrioritiesSection'
import { useNetworkDashboardController } from './hooks/useNetworkDashboardController'
import { canTriggerNetworkReport } from './lib/networkDashboardPolicy'

export function NetworkDashboardPage() {
  const controller = useNetworkDashboardController()
  const navigate = useNavigate()
  const { role, setActiveStoreId } = useAuth()
  const canTrigger = canTriggerNetworkReport(role)

  return (
    <MxModulePage id="internal-network-dashboard">
      <NetworkDashboardHeader refreshing={controller.refreshing} lastUpdatedAt={controller.lastUpdatedAt} realtimeStatus={controller.realtimeStatus} onRefresh={controller.refresh} />
      {controller.realtimeStatus === 'degraded' ? <MxStatusBanner tone="warning">A conexão Realtime foi interrompida. Os dados permanecem disponíveis e podem ser sincronizados pelo botão Atualizar.</MxStatusBanner> : null}
      {controller.error && controller.allRows.length > 0 ? <MxStatusBanner tone="warning">Os dados anteriores foram mantidos. {controller.error}</MxStatusBanner> : null}
      {controller.loading && controller.allRows.length === 0 ? <MxLoadingState label="Carregando rede" /> : controller.error && controller.allRows.length === 0 ? <MxErrorState description={controller.error} retry={controller.refresh} /> : (
        <>
          <NetworkMetricsSection metrics={controller.metrics} />
          <NetworkFiltersSection search={controller.search} onSearch={controller.setSearch} status={controller.status} onStatus={controller.setStatus} timeframe={controller.timeframe} onTimeframe={controller.setTimeframe} customRange={controller.customRange} onCustomRange={controller.setCustomRange} />
          <NetworkPrioritiesSection rows={controller.rows} sort={controller.sort} onSort={controller.setSort} onOpen={row => { setActiveStoreId(row.id); navigate(`/lojas/${slugify(row.name)}`) }} />
          {canTrigger ? <NetworkReportActions loading={controller.reportLoading} onTrigger={controller.triggerReport} /> : null}
        </>
      )}
    </MxModulePage>
  )
}

export default NetworkDashboardPage

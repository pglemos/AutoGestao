import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { slugify } from '@/lib/utils'
import { MxErrorState, MxLoadingState, MxModulePage, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { NetworkDashboardHeader } from './components/NetworkDashboardHeader'
import { NetworkDrilldownDrawer, type NetworkDrilldownTarget } from './components/NetworkDrilldownDrawer'
import { NetworkReportActions } from './components/NetworkReportActions'
import { NetworkMetricsSection } from './sections/NetworkMetricsSection'
import { NetworkFiltersSection } from './sections/NetworkFiltersSection'
import { NetworkPrioritiesSection } from './sections/NetworkPrioritiesSection'
import { useNetworkDashboardController } from './hooks/useNetworkDashboardController'
import { canTriggerNetworkReport } from './lib/networkDashboardPolicy'
import type { NetworkCockpitStore, PersonEvolution } from './types'

function withStore(path: string, storeId: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ storeId, ...extra })
  return `${path}?${params.toString()}`
}

export function NetworkDashboardPage() {
  const controller = useNetworkDashboardController()
  const navigate = useNavigate()
  const { role, setActiveStoreId } = useAuth()
  const [selectedStore, setSelectedStore] = useState<NetworkCockpitStore | null>(null)
  const canTrigger = canTriggerNetworkReport(role)

  const navigateStore = (target: NetworkDrilldownTarget, store: NetworkCockpitStore) => {
    setActiveStoreId(store.id)
    const slug = slugify(store.name)
    const paths = {
      store: withStore(`/lojas/${slug}`, store.id), strategic: withStore('/plano-estrategico', store.id),
      actions: withStore('/plano-acao', store.id), consulting: withStore('/consultoria', store.id), closing: withStore('/fechamento-diario', store.id),
    }
    navigate(paths[target])
  }

  const openPerson = (person: PersonEvolution, store: NetworkCockpitStore) => {
    setActiveStoreId(store.id)
    navigate(withStore(`/lojas/${slugify(store.name)}/equipe`, store.id, { userId: person.userId, role: person.role }))
  }

  return (
    <MxModulePage id="internal-network-dashboard">
      <NetworkDashboardHeader refreshing={controller.refreshing} lastUpdatedAt={controller.lastUpdatedAt} realtimeStatus={controller.realtimeStatus} onRefresh={controller.refresh} />
      {controller.realtimeStatus === 'degraded' ? <MxStatusBanner tone="warning">A conexão Realtime foi interrompida. Os dados anteriores permanecem disponíveis e serão reconciliados após a reconexão.</MxStatusBanner> : null}
      {controller.error && controller.allRows.length > 0 ? <MxStatusBanner tone="warning">Os dados anteriores foram mantidos. {controller.error}</MxStatusBanner> : null}
      {controller.loading && !controller.allRows.length ? <MxLoadingState label="Carregando rede" /> : controller.error && !controller.allRows.length ? <MxErrorState description={controller.error} retry={controller.refresh} /> : <>
        <NetworkMetricsSection metrics={controller.metrics} />
        <NetworkFiltersSection search={controller.search} onSearch={controller.setSearch} status={controller.status} onStatus={controller.setStatus} timeframe={controller.timeframe} onTimeframe={controller.setTimeframe} customRange={controller.customRange} onCustomRange={controller.setCustomRange} />
        <NetworkPrioritiesSection rows={controller.rows} sort={controller.sort} onSort={controller.setSort} onOpen={setSelectedStore} />
        {canTrigger ? <NetworkReportActions loading={controller.reportLoading} onTrigger={controller.triggerReport} /> : null}
      </>}
      <NetworkDrilldownDrawer store={selectedStore} open={Boolean(selectedStore)} onOpenChange={open => { if (!open) setSelectedStore(null) }} onNavigate={navigateStore} onOpenPerson={openPerson} />
    </MxModulePage>
  )
}

export default NetworkDashboardPage

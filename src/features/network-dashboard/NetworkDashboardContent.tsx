import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { slugify } from '@/lib/utils'
import { MxErrorState, MxLoadingState, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { NetworkDashboardHeader } from './components/NetworkDashboardHeader'
import { NetworkDrilldownDrawer, type NetworkDrilldownTarget } from './components/NetworkDrilldownDrawer'
import { NetworkReportActions } from './components/NetworkReportActions'
import { NetworkMetricsSection } from './sections/NetworkMetricsSection'
import { NetworkFiltersSection } from './sections/NetworkFiltersSection'
import { NetworkPrioritiesSection } from './sections/NetworkPrioritiesSection'
import { useNetworkDashboardController } from './hooks/useNetworkDashboardController'
import { canTriggerNetworkReport } from './lib/networkDashboardPolicy'
import type { NetworkCockpitScope } from './data/networkCockpitRepository'
import type { NetworkCockpitStore, NetworkTimeframe, PersonEvolution } from './types'

function withStore(path: string, storeId: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ storeId, ...extra })
  return `${path}?${params.toString()}`
}

function greetingForHour(date = new Date()): string {
  const hour = Number(date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Sao_Paulo' }))
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function timeframeLabel(timeframe: NetworkTimeframe, customRange: { start: string; end: string }): string {
  if (timeframe === 'hoje') return 'Hoje'
  if (timeframe === 'ontem') return 'Ontem'
  if (timeframe === 'semanal') return 'Semana atual'
  if (timeframe === 'mensal') return 'Mês atual'
  const formatDate = (value: string) => value ? value.split('-').reverse().join('/') : '—'
  return `${formatDate(customRange.start)} a ${formatDate(customRange.end)}`
}

function focusElement(id: string) {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLElement)) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  element.focus({ preventScroll: true })
}

export function NetworkDashboardContent({ scope = 'internal' }: { scope?: NetworkCockpitScope }) {
  const controller = useNetworkDashboardController(scope)
  const navigate = useNavigate()
  const { role, profile, setActiveStoreId } = useAuth()
  const [selectedStore, setSelectedStore] = useState<NetworkCockpitStore | null>(null)
  const canTrigger = canTriggerNetworkReport(role)
  const periodLabel = timeframeLabel(controller.timeframe, controller.customRange)
  const firstName = profile?.name?.trim().split(/\s+/)[0]
  const greeting = firstName ? `${greetingForHour()}, ${firstName}` : greetingForHour()

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

  const showPriorities = useCallback(() => focusElement('network-priorities'), [])
  const title = scope === 'internal' ? 'Cockpit operacional' : 'Painel Geral'
  const description = [
    `${greeting}.`,
    scope === 'internal' ? 'Vendas, metas, disciplina e prioridades da rede.' : 'Visão consolidada da rede, disciplina operacional e prioridades.',
    `Período: ${periodLabel}.`,
    controller.lastUpdatedAt
      ? `Atualizado às ${controller.lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
      : 'Aguardando a primeira sincronização.',
  ].join(' ')

  return (
    <>
      <NetworkDashboardHeader
        title={title}
        description={description}
        refreshing={controller.refreshing}
        lastUpdatedAt={controller.lastUpdatedAt}
        realtimeStatus={controller.realtimeStatus}
        onRefresh={controller.refresh}
      />
      {controller.realtimeStatus === 'degraded' ? <MxStatusBanner tone="warning">A conexão em tempo real foi interrompida. Os dados anteriores permanecem disponíveis e serão reconciliados após a reconexão.</MxStatusBanner> : null}
      {controller.error && controller.allRows.length > 0 ? <MxStatusBanner tone="warning">Leitura anterior mantida. {controller.error}</MxStatusBanner> : null}
      {controller.loading && !controller.allRows.length ? <MxLoadingState label="Carregando cockpit operacional..." /> : controller.error && !controller.allRows.length ? <MxErrorState description={controller.error} retry={controller.refresh} /> : <>
        <NetworkMetricsSection metrics={controller.metrics} periodLabel={periodLabel} onShowPriorities={showPriorities} />
        <NetworkFiltersSection search={controller.search} onSearch={controller.setSearch} status={controller.status} onStatus={controller.setStatus} timeframe={controller.timeframe} onTimeframe={controller.setTimeframe} customRange={controller.customRange} onCustomRange={controller.setCustomRange} />
        <NetworkPrioritiesSection rows={controller.rows} sort={controller.sort} onSort={controller.setSort} onOpen={setSelectedStore} />
        {canTrigger ? <NetworkReportActions loading={controller.reportLoading} onTrigger={controller.triggerReport} /> : null}
      </>}
      <NetworkDrilldownDrawer store={selectedStore} open={Boolean(selectedStore)} onOpenChange={open => { if (!open) setSelectedStore(null) }} onNavigate={navigateStore} onOpenPerson={openPerson} />
    </>
  )
}

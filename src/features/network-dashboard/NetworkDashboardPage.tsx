import { useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
import { NetworkDashboardContent } from './NetworkDashboardContent'
import type { NetworkCockpitScope } from './data/networkCockpitRepository'

export function NetworkDashboardPage({ scope = 'internal' }: { scope?: NetworkCockpitScope } = {}) {
  const location = useLocation()
  // Compartilhado por /minhas-lojas (wide) e /painel (dashboard): a largura vem
  // da metadata da rota atual (coorte C7, Padrão A).
  const { width: pageWidth, bottomClearance: pageBottomClearance } = resolveRouteLayout(location.pathname)

  return (
    <MxModulePage id="internal-network-dashboard" width={pageWidth} bottomClearance={pageBottomClearance}>
      <NetworkDashboardContent scope={scope} />
    </MxModulePage>
  )
}

export default NetworkDashboardPage

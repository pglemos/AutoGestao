import { useLocation } from 'react-router-dom'
import AdminPlanosAcaoGlobalPage from '@/features/admin-mx/AdminPlanosAcaoGlobalPage'
import ClientActionPlanPage from '@/features/admin-mx/clientes/ClientActionPlanPage'
import { useInternalMxDomainTabs } from '@/design-system/internal-mx/InternalMxDomainTabs'

type ActionPlanMode = 'biblioteca' | 'cliente'

const ACTION_PLAN_TABS = [
  { key: 'biblioteca' as const, label: 'Gestão global' },
  { key: 'cliente' as const, label: 'Execução do cliente' },
]

export default function InternalActionPlanPage() {
  const location = useLocation()
  const isClientRoute = location.pathname.startsWith('/clientes/') && location.pathname.endsWith('/plano-acao')

  if (!isClientRoute) {
    return <AdminPlanosAcaoGlobalPage />
  }

  const domain = useInternalMxDomainTabs<ActionPlanMode>({
    tabs: ACTION_PLAN_TABS,
    fallback: 'cliente',
  })

  if (domain.active === 'biblioteca') {
    return (
      <>
        {domain.tabs}
        <div id="biblioteca-panel" role="tabpanel" aria-labelledby="biblioteca-tab">
          <AdminPlanosAcaoGlobalPage />
        </div>
      </>
    )
  }

  return (
    <>
      {domain.tabs}
      <div id="cliente-panel" role="tabpanel" aria-labelledby="cliente-tab">
        <ClientActionPlanPage />
      </div>
    </>
  )
}

import { ClipboardList } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import AdminPlanosAcaoGlobalPage from '@/features/admin-mx/AdminPlanosAcaoGlobalPage'
import { useInternalMxDomainTabs } from '@/design-system/internal-mx/InternalMxDomainTabs'
import { ActionPlanWorkspace } from '@/features/action-plan/ActionPlanWorkspace'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

type ActionPlanMode = 'cliente' | 'biblioteca'

const ACTION_PLAN_TABS = [
  { key: 'biblioteca' as const, label: 'Gestão global' },
  { key: 'cliente' as const, label: 'Execução do cliente' },
]

export default function InternalActionPlanPage() {
  const store = useInternalPlanningStore()
  const location = useLocation()
  const isClientRoute = location.pathname.startsWith('/clientes/')
  // O caminho administrativo canônico abre a superfície equivalente ao
  // Base44 `/planos-acao`. A rota contextual do cliente abre diretamente a
  // execução para manter o planejamento no contexto da ficha.
  const domain = useInternalMxDomainTabs<ActionPlanMode>({
    tabs: ACTION_PLAN_TABS,
    fallback: isClientRoute ? 'cliente' : 'biblioteca',
  })

  // `/plano-acao` é a home Base44. A execução fica na ficha do cliente —
  // a aba extra nesta URL não trocava a view (URL ia para ?mode=cliente e o
  // board da rede permanecia).
  if (!isClientRoute) {
    return <AdminPlanosAcaoGlobalPage />
  }

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
        <InternalMxPlanningShell
          icon={ClipboardList}
          title="Planos de Ação"
          description="Administre ações, responsáveis, prazos, evidências, validações e impacto da loja selecionada."
          store={store}
        >
          <ActionPlanWorkspace />
        </InternalMxPlanningShell>
      </div>
    </>
  )
}

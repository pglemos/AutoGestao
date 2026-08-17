import { ClipboardList } from 'lucide-react'
import AdminPlanosAcaoGlobalPage from '@/features/admin-mx/AdminPlanosAcaoGlobalPage'
import { useInternalMxDomainTabs } from '@/design-system/internal-mx/InternalMxDomainTabs'
import { ActionPlanWorkspace } from '@/features/action-plan/ActionPlanWorkspace'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

type ActionPlanMode = 'cliente' | 'biblioteca'

const ACTION_PLAN_TABS = [
  { key: 'cliente' as const, label: 'Execução do cliente' },
  { key: 'biblioteca' as const, label: 'Biblioteca MX' },
]

export default function InternalActionPlanPage() {
  const store = useInternalPlanningStore()
  const domain = useInternalMxDomainTabs<ActionPlanMode>({ tabs: ACTION_PLAN_TABS, fallback: 'cliente' })

  if (domain.active === 'biblioteca') {
    return (
      <>
        {domain.tabs}
        <AdminPlanosAcaoGlobalPage />
      </>
    )
  }

  return (
    <>
      {domain.tabs}
      <InternalMxPlanningShell
        icon={ClipboardList}
        title="Planos de Ação"
        description="Administre ações, responsáveis, prazos, evidências, validações e impacto da loja selecionada."
        store={store}
      >
        <ActionPlanWorkspace />
      </InternalMxPlanningShell>
    </>
  )
}

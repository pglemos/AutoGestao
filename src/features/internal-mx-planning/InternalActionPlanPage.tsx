import { ClipboardList } from 'lucide-react'
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
  // O caminho administrativo canônico abre a superfície equivalente ao
  // Base44 `/planos-acao`. A execução focada continua disponível de forma
  // explícita em `?mode=cliente`.
  const domain = useInternalMxDomainTabs<ActionPlanMode>({ tabs: ACTION_PLAN_TABS, fallback: 'biblioteca' })

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

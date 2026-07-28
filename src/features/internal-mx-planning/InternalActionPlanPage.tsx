import { ActionPlanWorkspace } from '@/features/action-plan/ActionPlanWorkspace'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

export default function InternalActionPlanPage() {
  const store = useInternalPlanningStore()

  return (
    <InternalMxPlanningShell
      title="Plano de Ação"
      description="Administre ações, responsáveis, prazos, evidências, validações e impacto da loja selecionada."
      store={store}
    >
      <ActionPlanWorkspace />
    </InternalMxPlanningShell>
  )
}

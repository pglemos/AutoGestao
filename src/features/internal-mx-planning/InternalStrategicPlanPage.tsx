import { StrategicPlanWorkspace } from '@/features/strategic-plan/StrategicPlanWorkspace'
import { InternalMxPlanningShell, useInternalPlanningStore } from './InternalMxPlanningShell'

export default function InternalStrategicPlanPage() {
  const store = useInternalPlanningStore()

  return (
    <InternalMxPlanningShell
      title="Plano Estratégico"
      description="Acompanhe os 45 indicadores, metas, comparativos e ações da loja selecionada."
      store={store}
    >
      <StrategicPlanWorkspace />
    </InternalMxPlanningShell>
  )
}
